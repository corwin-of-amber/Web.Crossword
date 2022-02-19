import $ from 'jquery';
import Vue from 'vue';
import { CrosswordGrid } from './crossword';
// @ts-ignore
import CrosswordWidget from './components/crossword.vue';

import './hints.ls';
import './main.css';
import * as server from './net/web-server';
import * as archive from './archive';

import { main as mainP2P, createEntanglement } from './net/p2p';


function reify<T>(): <S>(s: S) => S & T {
    return <S>(s: S) => s as S & T;
}

async function loadJson(url: string) {
    try {
        return JSON.parse(
            await (await fetch(url)).text());
    }
    catch { return undefined; }
}

async function restoreData() {
    var saved = localStorage['model'];
    if (saved) saved = JSON.parse(saved);

    return {
        cwdata: (await loadJson('/data/grid.json')) ?? saved?.cwdata ?? {$: {nrows: 13, ncols: 13}},
        userdata: saved?.userdata
    };
}

async function main() {
    var app = reify<{grid: any, clearAll: () => void}>()(
        Vue.createApp(CrosswordWidget).mount('#crossword'));

    var cw = CrosswordGrid.fromJson(await restoreData());

    app.grid = cw.content;

    Vue.watchEffect(() => {
        localStorage['model'] = JSON.stringify(cw.toJson(app.grid));
    });

    // toolbar
    $('#reload').on('click', () => location.reload());
    $('#import').on('click', () => window.open('/build/kremlin/cropper.html', 'cropper'));
    $('#clear').on('click', () => app.clearAll());
    $('#download').on('click', () => archive.download(cw));

    // HTTP
    if (window.location.protocol != 'http:')
        server.start();

    // P2P
    (async () => {
        var { c1 } = await mainP2P(),
            sp = new URLSearchParams(window.location.search);
        c1.sync.docs.createDoc('tab1');

        createEntanglement(c1.sync.path('tab1'), app,
            sp.get('id') || 'master');
    }); //();

    Object.assign(window, { app, cw, server });
}


document.addEventListener('DOMContentLoaded', () => main());