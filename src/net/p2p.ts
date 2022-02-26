// @@@@ really got to get rid of this
function mess() {
    const {Buffer} = require('buffer'),  // for Kremlin
        process = require('process');
    if (typeof window !== 'undefined') {
        Object.assign(window, {Buffer, process});
    }
}
mess();

import cuid from 'cuid';
import { DocumentClient } from 'dat-p2p-crowd/src/net/client-docs';
import { DocumentSlot } from 'automerge-slots';
import { AutomergeMimic } from './crossover';


class DocumentClientAug extends DocumentClient {
    sync: any
    init: () => Promise<void>
    join: (channel: string) => void
    activeChannels: Set<string> & {l: string[]}
}

class CrosswordClient extends DocumentClientAug {

    amm: AutomergeMimic<{grid: any[][]}>

    async engage(docId: string, app: {grid: any[][]}, clientName: string, isMaster?: boolean) {
        await this.init();
        this.sync.docs.createDoc(docId);
        var slot = this.sync.path(docId);  /** @todo use `.create()` ? */

        this.entangle(slot, app, clientName, isMaster);
    }

    entangle(slot: DocumentSlot<{grid: any[][]}>, view: {grid: any[][]},
             clientName: string, isMaster: boolean = clientName === 'master') {
        var amm = new AutomergeMimic({} as {grid: any[][]}, slot, cuid(), clientName),
            root = amm.root;
        if (isMaster) {
            /* copy the grid data from the app to the document */
            root.grid = [];
            for (let row of view.grid) {
                root.grid.push([]);
                for (let cell of row) {
                    root.grid[root.grid.length - 1].push(cell);
                }
            }
            view.grid = root.grid;
        }
        else view.grid = []; /** @todo why is this needed? */
        amm._byKey.set('0', view);
        this.amm = amm;
    }

    statusOf(channel: string, cb: (status: string) => void) {
        let poke = (inner: string[]) =>
            cb(inner.includes(channel) ? 'connected' : 'not connected');
        this.activeChannels.l = new Proxy(this.activeChannels.l, {
            set: (inner, k, v, receiver) => {
                inner[k] = v;
                console.log('channels', inner);
                poke(inner);
                return true;
            }
        });
        poke(this.activeChannels.l);
    }
}

function main(app, onStatus: (s: string) => void) {
    var c1 = new CrosswordClient();

    Object.assign(window, {c1});

    var sp = new URLSearchParams(window.location.search),
        chan = sp.get('c') || 'cw1',
        doc = sp.get('d') || 'tab1',
        actor = sp.get('id') || 
            (window.location.protocol != 'http:' ? 'master' : 'apprentice');

    c1.engage(doc, app, actor);

    c1.statusOf(chan, onStatus);
    c1.join(chan);

    return {c1};
}

/*
function createEntanglement(slot: DocumentSlot<any>, cw: {grid: any[][]}, clientName: string) {
    var amm = new AutomergeMimic({} as {grid: any[][]}, slot, cuid(), clientName),
        root = amm.root;
    if (clientName === 'master') {
        root.grid = [];
        for (let row of cw.grid) {
            root.grid.push([]);
            for (let cell of row) {
                root.grid[root.grid.length - 1].push(cell);
            }
        }
        cw.grid = root.grid;
    }
    else cw.grid = [];
    amm._byKey.set('0', cw);

    Object.assign(window, { amm });
}*/


export { main }