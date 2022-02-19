import fs from 'fs';  /* @kremlin.native this only works on Node atm */
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CrosswordGrid } from "./crossword";


function download(cw: CrosswordGrid) {
    var z = new JSZip();
    z.file('data.json', JSON.stringify(cw.toJson()));
    z.file('birman.jpg', Uint8Array.from(fs.readFileSync('data/birman.jpg')));
    z.generateAsync({type: 'blob'}).then(b =>
        saveAs(b, `birman-${datestamp()}.zip`));
  
}


function datestamp() {
    var d = new Date,
        pad2 = (s: number) => ('0' + s).slice(-2);
    return `${d.getFullYear()}${pad2(d.getMonth()+1)}${pad2(d.getDate())}`;
}


export { download }