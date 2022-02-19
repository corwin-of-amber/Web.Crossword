// @@@@ really got to get rid of this
function mess() {
    const {Buffer} = require('buffer'),  // for Kremlin
        process = require('process');
    if (typeof window !== 'undefined') {
        Object.assign(window, {Buffer, process});
    }
}
mess();

import { SwarmClient } from 'dat-p2p-crowd/src/net/client';
import { DocumentClient } from 'dat-p2p-crowd/src/net/client-docs';
import { DocumentSlot } from 'automerge-slots';
import { AutomergeMimic } from './crossover';


async function main() {
    var c1 = new DocumentClient(),
        c2 = new DocumentClient();

    (await c1.join('dl', SwarmClient.DirectChannel)).connectTo(
        await c2.join('dl', SwarmClient.DirectChannel));

    Object.assign(window, {c1, c2});

    return {c1, c2};
}

function createEntanglement(slot: DocumentSlot<any>, cw: {grid: any[][]}, clientName: string) {
    var amm = new AutomergeMimic({} as {grid: any[][]}, slot, clientName, clientName),
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
}


export { main, createEntanglement }