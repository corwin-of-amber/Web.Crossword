<template>
    <table>
        <tr v-for="row,$i in grid" :key="keyOf(row, $i)">
            <td v-for="cell,$j in cellsOf(row)" :key="$j" 
                    :class="{black: cell.blocked, highlit: highlit([$i, $j])}"
                    @dblclick="toggleDir([$i, $j])">
                <i v-if="cell.label">{{cell.label}}</i>
                <p :ref="registerInput([$i,$j])" @focus="cellFocus([$i, $j])"
                    @keypress="clear" @input="cellInput([$i,$j], $event)"
                    @keydown="cellKeydown([$i,$j], $event)">{{cell.content}}</p>
            </td>
        </tr>
    </table>
</template>

<script>
export default {
    data: () => ({grid: [], hi: [], dir: 'across'}),
    created() {
        this._p = {};
    },
    methods: {
        keyOf(row, index) { return index; },
        cellsOf(row) { return row; },
        clear(ev) { ev.target.textContent = ''; },
        registerInput(at) { return (el) => this._p[at] = el; },
        highlit(at) {
            var eq = (p1, p2) => (p1[0] == p2[0] && p1[1] == p2[1]);
            return this.hi.some(e => eq(at, e));
        },
        highlightSequence(at, dir) {
            let thru = (at, f) => {
                var cell, acc = [];
                while ((cell = this.grid[at[0]]?.[at[1]]) && !cell.blocked) {
                    acc.push(at);
                    at = f(at);
                }
                return acc;
            }
            switch (dir) {
            case 'across':
                this.hi = thru(at, ([i,j]) => [i, j - 1]).concat(
                              thru(at, ([i,j]) => [i, j + 1]));
                break;
            case 'down':
                this.hi = thru(at, ([i,j]) => [i - 1, j]).concat(
                              thru(at, ([i,j]) => [i + 1, j]));
                break;
            }
            return this.hi.length > 2;
        },
        cellFocus(at) {
            if (!this.highlightSequence(at, this.dir)) {
                this.highlightSequence(at, this._toggleDir());
            }
        },
        toggleDir(at) {
            this._toggleDir(); this.cellFocus(at);
            window.getSelection().collapseToStart();
        },
        _toggleDir() {
            return this.dir = this.dir === 'across' ? 'down' : 'across';
        },
        cellInput(at, ev) {
            if (ev.target.textContent) {
                this.cellGotoUnlessBlocked(
                    this._move(at, this.dir === 'across' ? 'w' : 's'));
            }
            this._set(at, ev.target.textContent);
        },
        cellGoto(at) {
            this._p[at]?.focus();
        },
        cellGotoUnlessBlocked(at) {
            var cell = this.grid[at[0]]?.[at[1]];
            if (cell && !cell.blocked)
                this.cellGoto(at);
        },
        cellGotoAndClearUnlessBlocked(at) {
            var cell = this.grid[at[0]]?.[at[1]];
            if (cell && !cell.blocked) {
                cell.content = '';
                this.cellGoto(at);
            }
        },
        _move([i, j], dir) {
            switch (dir) {
            case 'n': return [i - 1, j];   case 'w': return [i, j - 1];
            case 's': return [i + 1, j];   case 'e': return [i, j + 1];
            }
        },
        _set([i, j], content) { this.grid[i][j].content = content; },
        _clear(at) { this._set(at, ''); },
        cellKeydown(at, ev) {
            var step = (dir) => this.cellGoto(this._move(at, dir));
            switch (ev.code) {
            case 'ArrowLeft':   step('w'); break;
            case 'ArrowRight':  step('e'); break;
            case 'ArrowUp':     step('n'); break;
            case 'ArrowDown':   step('s'); break;
            case 'Space':       this.toggleDir(at); break;
            case 'Backspace':   
                if (ev.target.textContent)
                    this._clear(at);
                else
                    this.cellGotoAndClearUnlessBlocked(
                        this._move(at, this.dir === 'across' ? 'e' : 'n'));
                break;
            default:
                return;
            }
            ev.preventDefault();
        }
    }
}
</script>

<style scoped>
/*body { margin: 0; display: flex; align-items: stretch; height: 100%; } */

* { box-sizing: border-box; }
table {
    border-collapse: collapse; 
    margin-bottom: 3px;
}
td {
    width: 1cm; height: 1cm; 
    border: 1px solid black;
    position: relative;
}
td:focus-within {
    box-shadow: inset 0 0 3px #0007;
}
td i {
    top: 0; right: 1px; 
    position: absolute; 
    font-style: normal;
    font-size: smaller;
}
td.black { background: black; }
td.highlit { background: rgba(255,255,0,0.2); }
td p {
    margin: 0; text-align: center; 
    -webkit-user-modify: read-write;
    -moz-user-modify: read-write;
    outline: none !important;
    user-select: none;  /* for good measure, but right now has no effect with `user-modify` */
    direction: rtl;
}
</style>