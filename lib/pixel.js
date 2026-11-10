/* lib/pixel.js – LED dot-matrix display for Heinz UI (no dependencies)
 *
 *   var p = new Heinz.Pixel(canvas, { rows: 19, pitch: 4 });   // cols follow the canvas width
 *   p.clear();
 *   p.lamp(2, 3, '#34a853');                  // round 5 x 5 LED
 *   p.text('OLLAMA 3 MODELS', 10, 3, '#8ab4f8');   // 5 x 7 pixel font, upper case, EN/DE incl. Ä Ö Ü ß
 *   p.ticker('l1', 3, 10, 'LONG TEXT ...', '#fff'); // scrolls only if it does not fit
 *   p.bars([3,5,2], 2, 12, 60, 6, '#fbbc05');       // one bar per value, scaled to the max
 *   p.spark([..], x, y, w, h, color);               // line of single pixels
 *   p.sprite(Heinz.Pixel.SPRITES.walk[0], x, y, color);  // small pixel figure (Ampelmännchen: stop, walk[0], walk[1])
 *   p.bar(x, y, w, h, 0..1, color);                  // progress bar made of LEDs
 *   p.render();                                      // draw; p.start() animates tickers, p.stop() ends it
 *
 * The panel is dark in light and dark theme (it is a lit display); switched-off LEDs stay visible as faint squares.
 */
(function () {
    'use strict';
    var Heinz = window.Heinz = window.Heinz || {};
    var FONT = {"A":[14,17,17,31,17,17,17],"B":[30,17,17,30,17,17,30],"C":[14,17,16,16,16,17,14],"D":[28,18,17,17,17,18,28],"E":[31,16,16,30,16,16,31],"F":[31,16,16,30,16,16,16],"G":[14,17,16,23,17,17,15],"H":[17,17,17,31,17,17,17],"I":[14,4,4,4,4,4,14],"J":[7,2,2,2,2,18,12],"K":[17,18,20,24,20,18,17],"L":[16,16,16,16,16,16,31],"M":[17,27,21,21,17,17,17],"N":[17,17,25,21,19,17,17],"O":[14,17,17,17,17,17,14],"P":[30,17,17,30,16,16,16],"Q":[14,17,17,17,21,18,13],"R":[30,17,17,30,20,18,17],"S":[15,16,16,14,1,1,30],"T":[31,4,4,4,4,4,4],"U":[17,17,17,17,17,17,14],"V":[17,17,17,17,17,10,4],"W":[17,17,17,21,21,21,10],"X":[17,17,10,4,10,17,17],"Y":[17,17,10,4,4,4,4],"Z":[31,1,2,4,8,16,31],"0":[14,17,19,21,25,17,14],"1":[4,12,4,4,4,4,14],"2":[14,17,1,2,4,8,31],"3":[31,2,4,2,1,17,14],"4":[2,6,10,18,31,2,2],"5":[31,16,30,1,1,17,14],"6":[6,8,16,30,17,17,14],"7":[31,1,2,4,8,8,8],"8":[14,17,17,14,17,17,14],"9":[14,17,17,15,1,2,12]," ":[0,0,0,0,0,0,0],".":[0,0,0,0,0,12,12],":":[0,12,12,0,12,12,0],"-":[0,0,0,31,0,0,0],"/":[1,1,2,4,8,16,16],"%":[24,25,2,4,8,19,3],"+":[0,4,4,31,4,4,0],",":[0,0,0,0,12,4,8],"(":[2,4,8,8,8,4,2],")":[8,4,2,2,2,4,8],"_":[0,0,0,0,0,0,31],"=":[0,0,31,0,31,0,0],"<":[2,4,8,16,8,4,2],">":[8,4,2,1,2,4,8],"!":[4,4,4,4,4,0,4],"?":[14,17,1,2,4,0,4],"'":[4,4,8,0,0,0,0],"*":[0,4,21,14,21,4,0],"#":[10,10,31,10,31,10,10],"Ä":[10,14,17,17,31,17,17],"Ö":[10,14,17,17,17,17,14],"Ü":[10,17,17,17,17,17,14],"ß":[12,18,18,28,18,18,28],"·":[0,0,4,14,4,0,0],"|":[4,4,4,4,4,4,4]};
    var OFF = '#181a1f', BG = '#0a0b0d';
    function Pixel(canvas, opt) {
        opt = opt || {};
        this.cv = canvas; this.ctx = canvas.getContext('2d');
        this.pitch = opt.pitch || 4; this.dotSize = opt.dot || Math.max(2, this.pitch - 1);   // pitch 3 -> 2 px LEDs, pitch 2 -> pass dot: 1.5
        this.rowsN = opt.rows || 9; this.fixedCols = opt.cols || 0;
        this.tickers = {}; this.timer = null;
        this.resize();
    }
    Pixel.prototype.resize = function () {
        var w = this.fixedCols ? this.fixedCols * this.pitch : (this.cv.clientWidth || this.cv.parentNode.clientWidth || 300);
        this.cols = Math.max(8, Math.floor(w / this.pitch)); this.rows = this.rowsN;
        var dpr = window.devicePixelRatio || 1, W = this.cols * this.pitch, H = this.rows * this.pitch;
        this.cv.width = Math.round(W * dpr); this.cv.height = Math.round(H * dpr);
        this.cv.style.width = W + 'px'; this.cv.style.height = H + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.clear();
    };
    Pixel.prototype.clear = function () { this.buf = new Array(this.cols * this.rows); return this; };
    Pixel.prototype.px = function (x, y, c) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && y >= 0 && x < this.cols && y < this.rows) this.buf[y * this.cols + x] = c;
        return this;
    };
    Pixel.prototype.rect = function (x, y, w, h, c) { for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) this.px(x + i, y + j, c); return this; };
    Pixel.prototype.lamp = function (x, y, c) {
        var m = ['.###.', '#####', '#####', '#####', '.###.'];
        for (var j = 0; j < 5; j++) for (var i = 0; i < 5; i++) if (m[j][i] === '#') this.px(x + i, y + j, c);
        return this;
    };
    Pixel.prototype.textWidth = function (s) { return String(s).length * 6 - 1; };
    Pixel.prototype.text = function (s, x, y, c, clipFrom, clipTo) {
        s = String(s).toUpperCase();
        for (var k = 0; k < s.length; k++) {
            var g = FONT[s[k]] || FONT['?'], gx = x + k * 6;
            for (var j = 0; j < 7; j++) for (var i = 0; i < 5; i++) {
                if (g[j] & (16 >> i)) {
                    var xx = gx + i;
                    if ((clipFrom == null || xx >= clipFrom) && (clipTo == null || xx < clipTo)) this.px(xx, y + j, c);
                }
            }
        }
        return this.textWidth(s);
    };
    // text or segments [[text, color], ...] inside the window x0 .. x1 (default: right edge).
    // default: pause, run, pause when too wide; opt.loop: endless marquee
    function segs(s, c) { return Array.isArray(s) ? s : [[String(s), c]]; }
    function segWidth(p, sg) { var w = 0; sg.forEach(function (q) { w += String(q[0]).length * 6; }); return Math.max(0, w - 1); }
    Pixel.prototype.ticker = function (id, y, x0, s, c, opt) {
        opt = opt || {};
        var x1 = opt.x1 != null ? opt.x1 : this.cols - 2, win = x1 - x0, sg = segs(s, c), key = JSON.stringify(sg);
        var w = segWidth(this, sg), t = this.tickers[id];
        if (!t || t.key !== key) t = this.tickers[id] = { key: key, off: 0, wait: 30 };
        t.w = w; t.win = win; t.loop = !!opt.loop;
        var drawAt = function (p, ox) { var x = ox; sg.forEach(function (q) { p.text(q[0], x, y, q[1], x0, x1); x += String(q[0]).length * 6; }); };
        if (w <= win && !opt.loop) { t.off = 0; drawAt(this, x0); return false; }
        if (t.loop) {
            var gap = opt.gap || 18, per = w + gap;
            drawAt(this, x0 - Math.round(t.off)); drawAt(this, x0 - Math.round(t.off) + per);
            t.per = per;
            return true;
        }
        drawAt(this, x0 - Math.round(t.off));
        return true;
    };
    Pixel.prototype.sprite = function (rows, x, y, c) {
        for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') this.px(x + i, y + j, c);
        return this;
    };
    Pixel.prototype.bar = function (x, y, w, h, f, c) {
        f = Math.max(0, Math.min(1, f || 0));
        return this.rect(x, y, Math.round(w * f), h, c);
    };
    Pixel.prototype.bars = function (vals, x, y, w, h, c) {
        if (!vals.length) return this;
        var mx = Math.max.apply(null, vals.concat([0.0001])), bw = Math.max(1, Math.floor(w / vals.length) - 1);
        for (var i = 0; i < vals.length; i++) {
            var bh = Math.max(vals[i] > 0 ? 1 : 0, Math.round(vals[i] / mx * h));
            this.rect(x + i * (bw + 1), y + h - bh, bw, bh, typeof c === 'function' ? c(i, vals[i]) : c);
        }
        return this;
    };
    Pixel.prototype.spark = function (vals, x, y, w, h, c) {
        if (vals.length < 2) return this;
        var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), r = (mx - mn) || 1;
        for (var i = 0; i < w; i++) {
            var v = vals[Math.round(i / (w - 1) * (vals.length - 1))];
            this.px(x + i, y + h - 1 - Math.round((v - mn) / r * (h - 1)), c);
        }
        return this;
    };
    Pixel.prototype.render = function () {
        var c = this.ctx, P = this.pitch, D = this.dotSize, o = (P - D) / 2;
        c.shadowBlur = 0; c.fillStyle = BG; c.fillRect(0, 0, this.cols * P, this.rows * P);
        c.fillStyle = OFF;
        for (var j = 0; j < this.rows; j++) for (var i = 0; i < this.cols; i++) if (!this.buf[j * this.cols + i]) c.fillRect(i * P + o, j * P + o, D, D);
        for (j = 0; j < this.rows; j++) for (i = 0; i < this.cols; i++) {
            var col = this.buf[j * this.cols + i]; if (!col) continue;
            c.shadowColor = col; c.shadowBlur = P * 1.4; c.fillStyle = col; c.fillRect(i * P + o, j * P + o, D, D);
        }
        c.shadowBlur = 0;
        return this;
    };
    // animation: draw(p) is called per frame (~16 fps) while something moves: an overflowing ticker, an endless marquee
    // or opt.live() returning true. p.wake() starts the loop again after a state change. Paused while the page is hidden.
    Pixel.prototype.run = function (draw, opt) {
        var self = this; this.drawFn = draw; this.liveFn = (opt && opt.live) || null; this.stop(); this.frameNo = 0;
        function moving() {
            if (self.liveFn && self.liveFn()) return true;
            for (var id in self.tickers) { var t = self.tickers[id]; if (t.loop || t.w > t.win) return true; }
            return false;
        }
        function frame() {
            if (typeof document !== 'undefined' && document.hidden) return;
            self.frameNo++;
            self.clear(); draw(self);
            for (var id in self.tickers) {
                var t = self.tickers[id]; if (!t.loop && t.w <= t.win) continue;
                if (t.loop) { t.off = (t.off + 1) % (t.per || 1); continue; }
                if (t.wait > 0) { t.wait--; continue; }
                t.off += 1; if (t.off > t.w - t.win + 4) { t.off = 0; t.wait = 30; }
            }
            self.render();
            if (self.timer && !moving()) { clearInterval(self.timer); self.timer = null; }
        }
        this.wake = function () { if (!self.timer) { frame(); if (moving()) self.timer = setInterval(frame, 60); } };
        this.redraw = function () { self.stop(); self.run(draw, opt); };
        frame();
        if (moving()) this.timer = setInterval(frame, 60);
        return this;
    };
    Pixel.prototype.stop = function () { if (this.timer) { clearInterval(this.timer); this.timer = null; } return this; };
    // Ampelmännchen: stop (red) and two walking frames (green), 7 x 9
    Pixel.SPRITES = {
        stop: ['.#####.', '..###..', '..###..', '#######', '..###..', '..###..', '..###..', '..#.#..', '..#.#..'],
        walk: [
            ['.#####.', '..###..', '..###..', '.#####.', '#.###..', '..###..', '.##.##.', '.#...#.', '##...##'],
            ['.#####.', '..###..', '..###..', '.#####.', '..###.#', '..###..', '..###..', '..#.#..', '..#.#..']
        ]
    };
    Heinz.Pixel = Pixel;
})();
