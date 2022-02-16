import assert from 'assert';


class CrosswordGrid {
    content: Cell[][]

    constructor(nrows: number, ncols: number) {
        this.content = repeat(nrows,
            () => repeat(ncols, () => ({content: null})));
    }

    get(i: number, j: number) {
        return this.content[i - 1][j - 1];
    }

    fromJson({cwdata, userdata}: CrosswordGrid.Json) {
        for (let [i, vs] of Object.entries(cwdata)) {
            if (!+i) continue;
            for (let [j, cell] of Object.entries(vs)) {
                var at = this.get(+i, +j);
                assert(at);
                if (cell === 'x') at.blocked = true;
                else at.label = '' + cell;
            }
        }
        for (let [i, vs] of Object.entries(userdata ?? {})) {
            if (!+i) continue;
            for (let [j, cell] of Object.entries(vs)) {
                if (cell) {
                    var at = this.get(+i, +j);
                    assert(at);
                    at.content = cell;
                }
            }
        }
        return this;
    }

    toJson(content = this.content): CrosswordGrid.Json {
        var $ = {nrows: this.content.length, ncols: this.content[0].length};
        return {
            cwdata: {$, ...Object.fromEntries(
                content.map((vs, i) =>
                    [i + 1, Object.fromEntries(
                        vs.map((cell, j) => [j + 1, cell.blocked ? 'x' : cell.label])
                            .filter(x => x[1]))])
                .filter(x => !isEmpty(x[1])))
            },
            userdata: Object.fromEntries(
                content.map((vs, i) =>
                    [i + 1, Object.fromEntries(
                        vs.map((cell, j) => [j + 1, cell.content])
                            .filter(x => x[1]))])
                .filter(x => !isEmpty(x[1]))),
        }
    }

    static fromJson(json: CrosswordGrid.Json) {
        var {nrows, ncols} = json.cwdata.$;
        return new CrosswordGrid(nrows, ncols).fromJson(json);
    }
}

import Cell = CrosswordGrid.Cell;

namespace CrosswordGrid {
    export type Cell = {label?: string, blocked?: boolean, content: string}
    export type Json = {
        cwdata: {
            $: {nrows: number, ncols: number}
            [row: number]: {[col: number]: 'x' | number | string},
        }
        userdata?: {
            [row: number]: {[col: number]: string},
        }
    }
}

function repeat<T>(n: number, op: (index: number) => T) {
    return Array(n).fill(0).map((_,i) => op(i));
}

function isEmpty(obj: object) {
    for (let _k in obj) return false;
    return true;
}


export { CrosswordGrid }