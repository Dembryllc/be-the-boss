/* ===== logo.js — draws the logo and the poster on a canvas (no files needed) ===== */
(function () {
  'use strict';

  var SHAPES = [
    { id: 'circle', label: 'Circle' },
    { id: 'square', label: 'Rounded square' },
    { id: 'star',   label: 'Star' },
    { id: 'badge',  label: 'Badge' },
    { id: 'blob',   label: 'Blob' }
  ];

  var ICONS = ['🍋','🧁','🐶','🎨','🧽','🪴','🎮','🍪','✨','🧃',
               '🦄','⚽','🎸','🌈','🧸','🚲','🔧','📚','🛝','🍕'];

  var COLORS = [
    { id: 'tomato',    hex: '#FF6B5B' },
    { id: 'sun',       hex: '#FFC94A' },
    { id: 'mint',      hex: '#35C9A3' },
    { id: 'blueberry', hex: '#4B7BEC' },
    { id: 'grape',     hex: '#9B6BE8' },
    { id: 'orange',    hex: '#FF9B42' },
    { id: 'pink',      hex: '#FF86C8' },
    { id: 'sky',       hex: '#5AC8F5' },
    { id: 'ink',       hex: '#2B2342' },
    { id: 'cream',     hex: '#FFF3DC' }
  ];

  var FONTS = [
    { id: 'round',  label: 'Round',  css: '800 {px}px Lexend, "Trebuchet MS", sans-serif' },
    { id: 'simple', label: 'Simple', css: '400 {px}px Lexend, "Trebuchet MS", sans-serif' },
    { id: 'fancy',  label: 'Fancy',  css: 'bold {px}px Georgia, "Times New Roman", serif' },
    { id: 'blocky', label: 'Blocky', css: '800 {px}px "Arial Black", Impact, sans-serif' }
  ];

  var EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

  function fontCss(id, px) {
    var f = FONTS.filter(function (x) { return x.id === id; })[0] || FONTS[0];
    return f.css.replace('{px}', px);
  }

  /* ---- shape paths, shared by canvas drawing and the picker previews ---- */
  function shapePath(ctx, shape, cx, cy, r) {
    ctx.beginPath();
    if (shape === 'square') {
      var s = r * 1.78, x = cx - s / 2, y = cy - s / 2, rad = s * 0.2;
      ctx.moveTo(x + rad, y);
      ctx.arcTo(x + s, y, x + s, y + s, rad);
      ctx.arcTo(x + s, y + s, x, y + s, rad);
      ctx.arcTo(x, y + s, x, y, rad);
      ctx.arcTo(x, y, x + s, y, rad);
    } else if (shape === 'star') {
      for (var i = 0; i < 10; i++) {
        var rr = i % 2 ? r * 0.48 : r;
        var a = -Math.PI / 2 + i * Math.PI / 5;
        var px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    } else if (shape === 'badge') {
      var w = r * 1.6, h = r * 1.5;
      ctx.moveTo(cx - w / 2, cy - h / 2 - r * 0.1);
      ctx.lineTo(cx + w / 2, cy - h / 2 - r * 0.1);
      ctx.lineTo(cx + w / 2, cy + h / 2 - r * 0.25);
      ctx.quadraticCurveTo(cx, cy + h * 0.95, cx - w / 2, cy + h / 2 - r * 0.25);
    } else if (shape === 'blob') {
      ctx.moveTo(cx, cy - r);
      ctx.bezierCurveTo(cx + r * 1.2, cy - r * 0.9, cx + r * 0.95, cy + r * 0.7, cx + r * 0.1, cy + r);
      ctx.bezierCurveTo(cx - r * 0.95, cy + r * 1.1, cx - r * 1.15, cy - r * 0.3, cx, cy - r);
    } else { // circle
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    }
    ctx.closePath();
  }

  // Tiny SVG used inside the shape picker buttons.
  function shapeSvg(shape, hex) {
    var c = document.createElement('canvas'); // measure-free: build SVG by hand
    void c;
    var paths = {
      circle: '<circle cx="16" cy="16" r="13"/>',
      square: '<rect x="4" y="4" width="24" height="24" rx="6"/>',
      star:   '<path d="M16 2 20 12 31 12 22 19 25 30 16 23 7 30 10 19 1 12 12 12Z"/>',
      badge:  '<path d="M4 3 H28 V20 Q16 32 4 20 Z"/>',
      blob:   '<path d="M16 2 Q31 4 28 17 Q25 31 13 29 Q1 27 3 15 Q5 3 16 2Z"/>'
    };
    return '<svg viewBox="0 0 32 32" aria-hidden="true" fill="' + hex + '">' +
           (paths[shape] || paths.circle) + '</svg>';
  }

  /* ---- helpers ---- */
  function pickColors(arr) {
    var c = (arr && arr.length) ? arr.slice() : ['#FF6B5B'];
    return { c1: c[0], c2: c[1] || '#2B2342', c3: c[2] || null };
  }

  // Shrink the font until the text fits the width we allow.
  function fitText(ctx, text, fontId, startPx, maxWidth) {
    var px = startPx;
    ctx.font = fontCss(fontId, px);
    while (px > 10 && ctx.measureText(text).width > maxWidth) {
      px -= 2;
      ctx.font = fontCss(fontId, px);
    }
    return px;
  }

  function wrapLines(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/).filter(Boolean), lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines;
  }

  /* ---- the logo ---- */
  function drawLogo(canvas, d) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var S = canvas.width;
    var col = pickColors(d.colors);

    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, S, S);

    var cx = S / 2, cy = S * 0.40, r = S * 0.27;

    // the one picture, sitting on the chosen shape
    shapePath(ctx, d.shape || 'circle', cx, cy, r);
    ctx.fillStyle = col.c1;
    ctx.fill();

    if (col.c3) { // third colour becomes a ring, so it stays to 3 colours
      shapePath(ctx, d.shape || 'circle', cx, cy, r * 0.86);
      ctx.strokeStyle = col.c3;
      ctx.lineWidth = Math.max(4, S * 0.022);
      ctx.stroke();
    }

    if (d.icon) {
      ctx.font = Math.round(r * 1.0) + 'px ' + EMOJI_FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(d.icon, cx, cy + r * 0.04);
    }

    var name = (d.name || '').trim();
    if (name) {
      var maxW = S * 0.88;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var px = fitText(ctx, name, d.font, Math.round(S * 0.115), maxW);
      var lines = wrapLines(ctx, name, maxW);
      if (lines.length > 2) lines = [lines.slice(0, 2).join(' '), lines.slice(2).join(' ')];
      ctx.fillStyle = col.c2;
      var startY = S * 0.80 - (lines.length - 1) * px * 0.62;
      lines.forEach(function (ln, i) {
        ctx.font = fontCss(d.font, px);
        ctx.fillText(ln, cx, startY + i * px * 1.24);
      });
    }
  }

  /* ---- the poster (logo + name + winning slogan) ---- */
  function drawPoster(canvas, d) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W = canvas.width, H = canvas.height;
    var col = pickColors(d.colors);

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, W, H);

    // border
    ctx.strokeStyle = col.c1;
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, W - 16, H - 16);

    // top band with the business name
    var bandH = 132;
    ctx.fillStyle = col.c1;
    ctx.fillRect(16, 16, W - 32, bandH);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var name = (d.name || 'My Business').trim();
    var px = fitText(ctx, name, d.font, 54, W - 70);
    var nameLines = wrapLines(ctx, name, W - 70).slice(0, 2);
    ctx.fillStyle = '#FFFFFF';
    nameLines.forEach(function (ln, i) {
      ctx.font = fontCss(d.font, px);
      ctx.fillText(ln, W / 2, 16 + bandH / 2 + (i - (nameLines.length - 1) / 2) * px * 1.15);
    });

    // the logo picture
    var cx = W / 2, cy = 300, r = 96;
    shapePath(ctx, d.shape || 'circle', cx, cy, r);
    ctx.fillStyle = col.c1;
    ctx.fill();
    if (col.c3) {
      shapePath(ctx, d.shape || 'circle', cx, cy, r * 0.86);
      ctx.strokeStyle = col.c3; ctx.lineWidth = 8; ctx.stroke();
    }
    if (d.icon) {
      ctx.font = Math.round(r * 1.0) + 'px ' + EMOJI_FONT;
      ctx.fillText(d.icon, cx, cy + 4);
    }

    // the winning slogan
    var slogan = (d.slogan || '').trim();
    if (slogan) {
      ctx.fillStyle = '#2B2342';
      var spx = 40;
      ctx.font = fontCss('round', spx);
      var lines = wrapLines(ctx, '“' + slogan + '”', W - 80);
      while (lines.length > 3 && spx > 20) {
        spx -= 4;
        ctx.font = fontCss('round', spx);
        lines = wrapLines(ctx, '“' + slogan + '”', W - 80);
      }
      lines.forEach(function (ln, i) { ctx.fillText(ln, W / 2, 470 + i * spx * 1.25); });
    } else {
      ctx.fillStyle = '#9A8F7E';
      ctx.font = fontCss('simple', 28);
      ctx.fillText('Pick a winning slogan ⭐', W / 2, 480);
    }

    // footer
    ctx.fillStyle = col.c2;
    ctx.font = fontCss('round', 26);
    ctx.fillText('Market Day — come say hi!', W / 2, H - 56);
  }

  window.Logo = {
    SHAPES: SHAPES, ICONS: ICONS, COLORS: COLORS, FONTS: FONTS,
    shapeSvg: shapeSvg, drawLogo: drawLogo, drawPoster: drawPoster
  };
})();
