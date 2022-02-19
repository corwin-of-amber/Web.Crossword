import assert from 'assert';
import Automerge from 'automerge';
import { DocumentSlotInterface } from 'automerge-slots';


class Mimic<T extends object = object> {
    root: T  // proxy
    handler: ProxyHandler<object>
    uidgen: () => Mimic.ObjectID

    constructor(root: T, actor: string) {
        this.uidgen = Mimic.uidgen(`${actor}@`);
        this.handler = {
            set: (inner, k, v, receiver) => {
                v = promote(v);
                this.dispatch(inner[Mimic.ID], k, v);
                inner[k] = v;
                this.redispatch(inner[Mimic.ID], k, v);
                return true;
            }
        };
        const promote = (v: any) => {
            if (v && typeof v === 'object' && v[Mimic.ID] === undefined) {
                return this._wrap(v, this.uidgen());
            }
            else return v;
        }
        this.root = this._wrap(root, '0');
    }

    dispatch(objectId: Mimic.ObjectID, key: any, value: any) {
        console.log(objectId, key, value);
    }
    redispatch(objectId: Mimic.ObjectID, key: any, value: any) {
    }

    _wrap<T extends object>(obj: T, id: Mimic.ObjectID): T {
        obj[Mimic.ID] = id;
        return new Proxy<T>(obj, this.handler);
    }

    static ID = Symbol('Mimic.ID');
}

namespace Mimic {
    export type ObjectID = string

    export function uidgen(prefix = '') {
        var it = (function*(i: number) { for(;;) yield i++; })(0);
        return () => `${prefix}${it.next().value}`;
    }
}



class AutomergeMimic<T extends object> extends Mimic<T> {
    slot: DocumentSlotInterface<any, any>
    _rev: Automerge.Doc<any>

    _byKey = new Map<Mimic.ObjectID, object>()
    _hold: boolean = false;

    constructor(root: T, slot: DocumentSlotInterface<any, any>, actor: string, public label: string) {
        super(root, actor);
        this.slot = slot;
        this._byKey.set(this.root[Mimic.ID], this.root);
        this._change(d => { d[root[Mimic.ID]] = this.root; });
        this.slot.docSlot.docSet.observe(this.slot.docSlot.docId, this.slot.get(),
            (diff, before, after, isLocal, changes) => this._update(diff, after, isLocal));
        //this.slot.registerHandler(d => this._update(d));
    }

    dispatch(objectId: Mimic.ObjectID, key: any, value: any): void {
        if (this._hold) return; // change is initiated by `_update`

        if (typeof value === 'object') {
            var toId = value[Mimic.ID];
            if (!this._byKey.has(toId))
                this._byKey.set(toId, value);
            this._change(d => {
                d[toId] ??= value; // @todo flatten
                d[objectId][key] = [toId];
            });
        }
        else {
            this._change(d => {
                d[objectId][key] = value;
            });
        }
    }

    redispatch(objectId: string, key: any, value: any): void {
        if (typeof(value) === 'object') {
            this._revaluate(value, this._byKey.get(objectId)[key]);
        }
    }

    _change(op: Automerge.ChangeFn<any>) {
        this._rev = this.slot.change(op);
    }

    _update(diff: Diff, d: Automerge.Doc<any>, isLocal: boolean) {
        //console.log('+-', this.label, diff);

        try {
            this._hold = true;
            this._replay(diff, d, isLocal);
        }
        finally { this._hold = false; }
        /*
       
        var be = Automerge.Frontend.getBackendState(this._rev);
        be.frozen = false;
        
        for (let patch of Automerge.Backend.applyChanges(be, Automerge.getChanges(this._rev, d))[1])
            console.log('+-', patch);*/
        this._rev = d;
    }

    _replay(diff: Diff, d: Automerge.Doc<any>, dryrun: boolean) {
        assert(diff.type === 'map');
        /* first create all new objects if any */
        for (let [k, v] of Object.entries(diff.props)) {
            for (let op of Object.values(v)) {
                assert (op.type !== 'value');  /* entries in toplevel map must be objects */
                //console.log('object #', k, op.type);
                if (!this._byKey.has(k))
                    this._byKey.set(k, this._createObject(k, op.type))
            }
        }
        /* then apply diffs to the individual objects*/
        for (let [k, v] of Object.entries(diff.props)) {
            for (let op of Object.values(v)) {
                assert (op.type !== 'value');
                this._replayOnObject(this._byKey.get(k), op, d, dryrun)
            }
        }
    }

    _replayOnObject(obj: object, diff: Diff, d: Automerge.Doc<any>, dryrun: boolean) {
        assert(obj);
        switch (diff.type) {
        case 'map':
            for (let [k, v] of Object.entries(diff.props)) {
                for (let op of Object.values(v)) {
                    //console.log('map @', obj, k, op);
                    dryrun || this._propSet(obj, k, this._valueOf(op, d));
                }
            }
            break;
        case 'list':
            assert(Array.isArray(obj));
            for (let op of diff.edits) {
                //console.log('list @', op.index, obj);
                switch (op.action) {
                case 'insert':
                    //console.log(op.action, op.value);
                    dryrun || this._elemInsert(obj, op.index, this._valueOf(op.value, d));
                    break;
                case 'multi-insert':
                    //console.log(op.action, op.values, dryrun);
                    dryrun || obj.splice(0, 0, ...op.values);
                    break;
                }
            }
            break;
        default:
            console.log(diff.type);
        }
    }

    _createObject(id: Mimic.ObjectID, type: CollectionType) {
        assert(type === 'map' || type === 'list');
        console.log(this.label, 'create', type, id);
        var v = type === 'map' ? {} : [];
        return this._wrap(v, id);
    }

    _valueOf(value: Diff, doc: Automerge.Doc<any>) {
        switch (value.type) {
        case 'list':  /* indicates an internal reference */
            try {
                console.log(doc, value.objectId);
                return this._deref(Automerge.getObjectById(doc, value.objectId) as Ref);
            }
            catch (e) { console.warn(`cannot deref ${value.objectId};`, e); break; }
        case 'value':
            return value.value;
        default:
            console.warn(`unexpected value type '${value.type}' in Automerge patch`);
        }
    }

    _deref(value: Ref | Atom) {
        if (Array.isArray(value)) return this._byKey.get(value[0]);
        else return value;
    }

    _asObject(value: any) {
        assert(typeof(value) === 'object');
        return value;
    }

    _propSet(obj: object, key: string, value: any) {
        obj[key] = value;
        if (typeof(value) === 'object')
            this._revaluate(value, obj[key]);
    }

    _elemInsert(arr: any[], index: number, value: any) {
        arr.splice(index, 0, value);
        if (typeof(value) === 'object')
            this._revaluate(value, arr[index]);
    }

    /** required to interop with other reactive proxies, e.g. Vue 3 */
    _revaluate(value: object, revalue: object) {
        if (revalue && revalue !== value)
            this._byKey.set(revalue[Mimic.ID], revalue);
    }
}

/* some internal types */
type Diff = Automerge.MapDiff | Automerge.ListDiff | Automerge.ValueDiff;
type CollectionType = 'map' | 'list' | 'table' | 'text';
type Atom = number | string;
type Ref = [Mimic.ObjectID];


export { Mimic, AutomergeMimic }