import { EventEmitter } from 'events';
import $ from 'jquery';
import 'jquery-ui-dist/jquery-ui.css';

import './cropper.css';



const SVG_NS = 'http://www.w3.org/2000/svg';

function $svg(tagName) {
    return $(document.createElementNS(SVG_NS, tagName));
}

function svgDraggable($el) {
    return $el.draggable()
      .bind('drag', function(event, ui){
        event.target.setAttribute('x', ui.position.left);
        event.target.setAttribute('y', ui.position.top);
      });
}

class Knob extends EventEmitter {
    constructor(pos) {
        super();
        this.sz = {x: 10, y: 10};
        this.$el = svgDraggable($svg('rect').addClass('knob'))
            .attr({'width': this.sz.x, 'height': this.sz.y})
            .bind('drag', (ev, ui) => {
                this.at.x = ui.position.left + this.sz.x / 2;
                this.at.y = ui.position.top + this.sz.y / 2;
                this.emit('move', {target: this});
            });
        this.set(pos);
    }

    set(pos) {
        var {x: w, y: h} = this.sz;
        this.at = pos;
        this.$el.attr({'x':pos.x-w/2, 'y':pos.y-h/2});
    }
}


class Box {
    constructor(geom) {
        this.$el = $svg('rect').addClass('wire');
        this.set(geom);
    }

    set(geom) {
        this.geom = geom;
        this.$el.attr({x:geom.x, y:geom.y, width:geom.w, height:geom.h});
    }
}


class BoxControls {
    constructor(box) {
        this.box = box;
        this.knobs = {};
        for (let [k, v] of Object.entries(this.points())) {
            this.knobs[k] = this.mkKnob(k, v);
        }
    }

    points() {
        var w = this.box.geom.x, e = this.box.geom.x + this.box.geom.w,
            n = this.box.geom.y, s = this.box.geom.y + this.box.geom.h;

        return {nw: {x: w, y: n}, ne: {x: e, y: n},
                sw: {x: w, y: s}, se: {x: e, y: s}};
    }

    mkKnob(role, pos) {
        var knob = new Knob(pos);
        knob.role = role;
        knob.on('move', () => this.rewire(knob.role));
        return knob;
    }

    rewire(l) {
        var knob = this.knobs[l], update;
        switch (l) {
            case 'ne': update = {y: knob.at.y,
                                 h: this.box.geom.y + this.box.geom.h - knob.at.y,
                                 w: knob.at.x - this.box.geom.x}; break;
            case 'nw': update = {y: knob.at.y,
                                 h: this.box.geom.y + this.box.geom.h - knob.at.y,
                                 x: knob.at.x,
                                 w: this.box.geom.x + this.box.geom.w - knob.at.x}; break;
            case 'se': update = {h: knob.at.y - this.box.geom.y,
                                 w: knob.at.x - this.box.geom.x}; break;
            case 'sw': update = {x: knob.at.x,
                                 h: knob.at.y - this.box.geom.y,
                                 w: this.box.geom.x + this.box.geom.w - knob.at.x}; break;
        }
        var geom = {...this.box.geom, ...update};
        if (geom.h < 0) {
            geom.y += geom.h; geom.h = -geom.h;
            this.swap('ne', 'se'); this.swap('nw', 'sw');
        }
        if (geom.w < 0) {
            geom.x += geom.w; geom.w = -geom.w;
            this.swap('ne', 'nw'); this.swap('se', 'sw');
        }
        this.box.set(geom);
        this.reposition();
    }

    reposition() {
        for (let [k, v] of Object.entries(this.points())) {
            this.knobs[k].set(v);
        }
    }

    swap(role1, role2) {
        var k = this.knobs;
        [k[role1], k[role2]] = [k[role2], k[role1]];
        for (let role of [role1, role2])
            k[role].role = role;
    }

}

const IMAGE_URL = '/data/birman.jpg',
      IMAGE_FILENAME = IMAGE_URL.replace(/^\//, ''),
      GRID_OUTPUT_FILENAME = 'data/grid.json';


class ExtractSquareGrid {

    async extractFromAndSave(img, box, geom) {
        var json = await(this.extractFrom(img, box, geom));
        const fs = require('fs');
        fs.writeFileSync(GRID_OUTPUT_FILENAME, JSON.stringify(json));
    }

    async extractFrom(img, box, geom) {
        var txt = this.squares(IMAGE_FILENAME,
            await esg.imageBoundingBox(box.geom, img),
            geom);
        console.log(txt);
        return eval('(' + txt.replace(/#.*/g, '') + ')');  // not quite JSON :/
    }

    squares(filename, box_, geom_) {
        const child_process = require('child_process'),
              box = box_ ? [`--box=${box_.x},${box_.y}:${box_.w}x${box_.h}`] : [],
              geom = geom_ ? [`--geom=${geom_}`] : [];
        var res = child_process.spawnSync('python',
            ['src/cropper/squares.py', filename, ...box, ...geom], {encoding: 'utf-8'});
        if (res.status != 0)
            throw new Error(res.stderr);
        else
            return res.stdout;
    }

    async imageBoundingBox(boxGeom, img) {
        var scale = await this.getScale(img), scaled = {};
        for (let [k, v] of Object.entries(boxGeom))
            scaled[k] = Math.round(v * scale);
        return scaled;
    }

    async getImageSize(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = function() {
                resolve({w: this.width, h: this.height});
            }
            img.src = url;
        });
    }

    async getScale(img) {
        var sz = await this.getImageSize(img.src);
        return sz.w / img.clientWidth;
    }
}


class LocalJsonValue {
    constructor(key) { this.key = key; }
    get() {
        var v = localStorage[this.key]; 
        try { return v && JSON.parse(v); }
        catch { return undefined; } 
    }
    set(v) {
        localStorage[this.key] = JSON.stringify(v);
    }
}

const lastBox = new LocalJsonValue('last-box');


$(async () => {
    window.$ = window.jQuery = $;
    require('jquery-ui-dist/jquery-ui');
    
    var img = $('<img>').attr('src', IMAGE_URL).addClass('being-cropped');
    $(document.body).append(img);

    var svg = $svg('svg').addClass('crop-frame');

    var box = new Box(lastBox.get() || {x: 300, y: 75, w: 300, h: 300})
    var ctrl = new BoxControls(box);
    svg.append(box.$el);
    svg.append(Object.values(ctrl.knobs).map(k => k.$el));
    $(document.body).append(svg);

    var esg = new ExtractSquareGrid;
    $('button[name=crop]').on('click', async () => {
        await esg.extractFromAndSave(img[0], box, geom);
        wins = await new Promise(f => nw.Window.getAll(f));
        wins[0].focus(); wins[0].reload();
    });

    $('button[name=reload]').on('click', () => location.reload());

    var geom, sel = $('select[name=geom]'),
        _updateGeom = () => geom = sel.val();
    sel.on('change', _updateGeom);
    _updateGeom();

    window.addEventListener('beforeunload', () => lastBox.set(box.geom));

    Object.assign(window, {$, img, svg, ctrl, esg});
})

