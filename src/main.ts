import $ from 'jquery';
import Vue from 'vue';
import { CrosswordGrid } from './crossword';
// @ts-ignore
import CrosswordWidget from './components/crossword.vue';

import './hints.ls';
import './main.css';


function reify<T>(): <S>(s: S) => S & T {
    return <S>(s: S) => s as S & T;
}

async function main() {
    var app = reify<{grid: any}>()(
        Vue.createApp(CrosswordWidget).mount('#crossword'));

    var saved = localStorage['model'];
    if (saved) saved = JSON.parse(saved);
console.log(saved);
    var cw = CrosswordGrid.fromJson({
        cwdata: JSON.parse(
            await (await fetch('/data/grid.json')).text()),
        userdata: saved?.userdata
    });

    app.grid = cw.content;

    Vue.watchEffect(() => {
        //localStorage['model'] = JSON.stringify(cw.toJson(app.grid))
    });

    // toolbar
    $('#import').on('click', () => window.open('/build/kremlin/cropper.html', 'cropper'));


    Object.assign(window, { app, cw });
}


document.addEventListener('DOMContentLoaded', () => main());