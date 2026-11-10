/* ===== steps.js — the five steps, Pitch Day and the certificate ===== */
(function () {
  'use strict';

  var S = window.Store;
  var L = window.Logo;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // Tell the app something changed: it saves, updates the trail and fires the star burst.
  function changed(step) {
    S.save();
    if (window.App && window.App.afterChange) window.App.afterChange(step);
  }

  var lastFocused = null; // for the "tap a word" word bank
  document.addEventListener('focusin', function (e) {
    if (e.target.matches('input[type=text]')) lastFocused = e.target;
  });

  /* ---------- shared: tap-a-chip fills a field ---------- */
  function wireChips() {
    $$('.choice-row').forEach(function (row) {
      var target = row.getAttribute('data-fills');
      row.addEventListener('click', function (e) {
        var chip = e.target.closest('.chip');
        if (!chip) return;
        var input = target === 'focused'
          ? (lastFocused && row.closest('.card').contains(lastFocused) ? lastFocused : null)
          : $(target);
        if (!input) { // nothing focused yet: use the first empty text field on the card
          input = $$('input[type=text]', row.closest('.card')).filter(function (i) { return !i.value; })[0]
               || $$('input[type=text]', row.closest('.card'))[0];
        }
        if (!input) return;
        if (target === 'focused') {
          // add the word to what is already there
          input.value = (input.value.trim() + ' ' + chip.textContent.trim()).trim();
        } else {
          input.value = chip.textContent.trim();
        }
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
    });
  }

  /* ---------- welcome ---------- */
  function initWelcome() {
    var n = $('#nickname');
    n.value = S.data.nickname;
    n.addEventListener('input', function () {
      S.data.nickname = n.value.replace(/\s+/g, ' ').slice(0, 18);
      changed(0);
    });
  }

  /* ---------- step 1: big idea ---------- */
  function initStep1() {
    var d = S.data.s1;

    $$('.kind-card').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.kind === d.kind));
      btn.addEventListener('click', function () {
        d.kind = btn.dataset.kind;
        $$('.kind-card').forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        changed(1);
      });
    });

    [['#s1-sells', 'sells'], ['#s1-for', 'for'], ['#s1-because', 'because'],
     ['#s1-challenge', 'challenge']].forEach(function (pair) {
      var el = $(pair[0]);
      el.value = d[pair[1]] || '';
      el.addEventListener('input', function () { d[pair[1]] = el.value; paint1(); changed(1); });
    });
    paint1();
  }

  function paint1() {
    var d = S.data.s1, box = $('#s1-preview');
    if (!d.sells && !d['for'] && !d.because) { box.textContent = ''; return; }
    box.textContent = 'My business sells ' + (d.sells || '___') +
      ' for ' + (d['for'] || '___') + ' because ' + (d.because || '___') + '.';
  }

  /* ---------- step 2: name and logo ---------- */
  function initStep2() {
    var d = S.data.s2;

    ['#s2-adj', '#s2-noun', '#s2-end'].forEach(function (sel) {
      var el = $(sel), key = sel.replace('#s2-', '');
      el.value = d[key] || el.value;
      el.addEventListener('change', function () { d[key] = el.value; changed(2); });
    });

    $('#s2-use-recipe').addEventListener('click', function () {
      var parts = [d.adj, d.noun, d.end].filter(Boolean);
      if (parts.length < 2) {
        window.App.toast('Pick a describing word and a thing word first.');
        return;
      }
      d.name = parts.join(' ');
      $('#s2-name').value = d.name;
      paint2(); changed(2);
    });

    var nameEl = $('#s2-name');
    nameEl.value = d.name || '';
    nameEl.addEventListener('input', function () { d.name = nameEl.value; paint2(); changed(2); });

    // shape picker
    var shapeBox = $('#s2-shapes');
    L.SHAPES.forEach(function (sh) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick pick-shape';
      b.innerHTML = L.shapeSvg(sh.id, '#4B7BEC');
      b.setAttribute('aria-label', sh.label);
      b.setAttribute('aria-pressed', String(d.shape === sh.id));
      b.addEventListener('click', function () {
        d.shape = sh.id;
        $$('.pick-shape', shapeBox).forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        paint2(); changed(2);
      });
      shapeBox.appendChild(b);
    });

    // icon picker (one picture only)
    var iconBox = $('#s2-icons');
    L.ICONS.forEach(function (ic) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick';
      b.textContent = ic;
      b.setAttribute('aria-label', 'picture ' + ic);
      b.setAttribute('aria-pressed', String(d.icon === ic));
      b.addEventListener('click', function () {
        d.icon = (d.icon === ic) ? '' : ic;
        $$('.pick', iconBox).forEach(function (x) {
          x.setAttribute('aria-pressed', String(x.textContent === d.icon && !!d.icon));
        });
        paint2(); changed(2);
      });
      iconBox.appendChild(b);
    });

    // colour picker, capped at 3
    var colorBox = $('#s2-colors');
    L.COLORS.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick pick-color';
      b.innerHTML = '<span style="background:' + c.hex + '"></span>';
      b.setAttribute('aria-label', 'colour ' + c.id);
      b.dataset.hex = c.hex;
      b.setAttribute('aria-pressed', String(d.colors.indexOf(c.hex) > -1));
      b.addEventListener('click', function () {
        var i = d.colors.indexOf(c.hex);
        if (i > -1) d.colors.splice(i, 1);
        else if (d.colors.length >= 3) {
          window.App.toast('3 colors is the limit. Tap a color off first.');
          return;
        } else d.colors.push(c.hex);
        b.setAttribute('aria-pressed', String(d.colors.indexOf(c.hex) > -1));
        paint2(); changed(2);
      });
      colorBox.appendChild(b);
    });

    // font picker
    var fontBox = $('#s2-fonts');
    L.FONTS.forEach(function (f) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'pick pick-font';
      b.textContent = f.label;
      b.style.font = f.css.replace('{px}', '17');
      b.setAttribute('aria-pressed', String(d.font === f.id));
      b.addEventListener('click', function () {
        d.font = f.id;
        $$('.pick-font', fontBox).forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        paint2(); changed(2);
      });
      fontBox.appendChild(b);
    });

    // the "can you read it?" checklist row is the student's own call
    var readLi = $('#s2-checklist li[data-check="read"]');
    readLi.setAttribute('role', 'checkbox');
    readLi.setAttribute('tabindex', '0');
    readLi.style.cursor = 'pointer';
    function toggleRead() { d.readOk = !d.readOk; paint2(); changed(2); }
    readLi.addEventListener('click', toggleRead);
    readLi.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggleRead(); }
    });

    $('#s2-download').addEventListener('click', downloadLogo);

    var ch = $('#s2-challenge');
    ch.value = d.challenge || '';
    ch.addEventListener('input', function () { d.challenge = ch.value; changed(2); });

    paint2();
  }

  function logoData() {
    var d = S.data.s2;
    return { shape: d.shape, icon: d.icon, colors: d.colors, font: d.font, name: S.bizName() };
  }

  function paint2() {
    var d = S.data.s2;
    L.drawLogo($('#logo-canvas'), logoData());
    $('#s2-color-count').textContent = d.colors.length + ' of 3';

    var checks = {
      name: !!S.bizName(),
      icon: !!d.icon,
      colors: d.colors.length >= 1 && d.colors.length <= 3,
      read: !!d.readOk
    };
    $$('#s2-checklist li').forEach(function (li) {
      var ok = !!checks[li.dataset.check];
      li.classList.toggle('is-done', ok);
      if (li.dataset.check === 'read') li.setAttribute('aria-checked', String(ok));
    });
  }

  /* ---- naming downloads so a teacher can tell whose is whose ---- */
  function slug(t) {
    return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function fileBase() {
    var parts = [slug(S.data.nickname), slug(S.bizName())].filter(Boolean);
    return parts.join('-').slice(0, 60) || 'my-business';
  }

  // Shared by the logo and the poster: hand the student a PNG.
  function saveCanvas(canvas, suffix, okMsg) {
    canvas.toBlob(function (blob) {
      if (!blob) { window.App.toast('Could not make the file. Try again.'); return; }
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = fileBase() + suffix;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      window.App.toast(okMsg);
    }, 'image/png');
  }

  function downloadLogo() {
    // draw at double size so the printed logo stays crisp
    var big = document.createElement('canvas');
    big.width = 880; big.height = 880;
    L.drawLogo(big, logoData());
    saveCanvas(big, '-logo.png', 'Logo saved to your Downloads! ⬇');
  }

  function downloadPoster() {
    var big = document.createElement('canvas');
    big.width = 1040; big.height = 1360;
    var ld = logoData();
    ld.slogan = S.winningSlogan();
    L.drawPoster(big, ld);
    saveCanvas(big, '-poster.png', 'Poster saved to your Downloads! ⬇');
  }

  /* ---------- step 3: slogan ---------- */
  function initStep3() {
    var d = S.data.s3;

    $$('.trick-card').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.trick === d.trick));
      btn.addEventListener('click', function () {
        d.trick = btn.dataset.trick;
        $$('.trick-card').forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
        changed(3);
      });
    });

    ['a', 'b', 'c'].forEach(function (k) {
      var el = $('#s3-' + k);
      el.value = d[k] || '';
      el.addEventListener('input', function () { d[k] = el.value; paint3(); changed(3); });
    });

    $('#s3-download').addEventListener('click', downloadPoster);

    $$('.btn-winner').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var k = btn.dataset.slogan;
        if (!(d[k] || '').trim()) { window.App.toast('Write that slogan first, then tap Winner.'); return; }
        d.winner = (d.winner === k) ? '' : k;
        paint3(); changed(3);
      });
    });

    var ch = $('#s3-challenge');
    ch.value = d.challenge || '';
    ch.addEventListener('input', function () { d.challenge = ch.value; changed(3); });

    paint3();
  }

  function paint3() {
    var d = S.data.s3;
    $$('.btn-winner').forEach(function (btn) {
      var on = d.winner === btn.dataset.slogan;
      btn.classList.toggle('is-winner', on);
      btn.textContent = on ? 'Winner!' : 'Winner?';
      btn.setAttribute('aria-pressed', String(on));
    });
    var ld = logoData();
    ld.slogan = S.winningSlogan();
    L.drawPoster($('#poster-canvas'), ld);
  }

  /* ---------- step 4: customers ---------- */
  function initStep4() {
    var d = S.data.s4;

    [['#s4-who', 'who'], ['#s4-age', 'age'], ['#s4-likes', 'likes'],
     ['#s4-where', 'where'], ['#s4-hear', 'hear'], ['#s4-challenge', 'challenge']].forEach(function (p) {
      var el = $(p[0]);
      el.value = d[p[1]] || '';
      var ev = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(ev, function () { d[p[1]] = el.value; changed(4); });
    });

    var body = $('#s4-survey tbody');
    for (var i = 0; i < 5; i++) {
      (function (idx) {
        var tr = document.createElement('tr');
        tr.innerHTML = '<th scope="row">Classmate ' + (idx + 1) + '</th>' +
          '<td><div class="yn">' +
          '<button type="button" data-v="yes" aria-pressed="false">Yes</button>' +
          '<button type="button" data-v="no" aria-pressed="false">No</button>' +
          '</div></td>';
        $$('button', tr).forEach(function (b) {
          b.addEventListener('click', function () {
            d.survey[idx] = (d.survey[idx] === b.dataset.v) ? null : b.dataset.v;
            paint4(); changed(4);
          });
        });
        body.appendChild(tr);
      })(i);
    }
    paint4();
  }

  function paint4() {
    var d = S.data.s4;
    $$('#s4-survey tbody tr').forEach(function (tr, idx) {
      $$('button', tr).forEach(function (b) {
        b.setAttribute('aria-pressed', String(d.survey[idx] === b.dataset.v));
      });
    });
    var yes = d.survey.filter(function (v) { return v === 'yes'; }).length;
    var no = d.survey.filter(function (v) { return v === 'no'; }).length;
    $('#s4-yes').textContent = yes;
    $('#s4-no').textContent = no;
    $('#s4-bar').style.width = (yes / 5 * 100) + '%';

    var msg = '';
    if (yes + no === 5) {
      if (yes >= 4) msg = 'Wow! ' + yes + ' out of 5 would buy it. Strong idea! 🌟';
      else if (yes === 3) msg = '3 out of 5 is a good start. 👍';
      else if (yes === 2) msg = '2 out of 5. Try changing one thing about your idea.';
      else msg = 'Not many yeses yet. What could you change?';
    }
    $('#s4-msg').textContent = msg;
  }

  /* ---------- step 5: budget ---------- */
  var wasProfitable = false;

  function initStep5() {
    var d = S.data.s5;
    var body = $('#s5-list tbody');

    S.PRICES.forEach(function (item) {
      var tr = document.createElement('tr');
      tr.dataset.id = item.id;
      tr.innerHTML =
        '<th scope="row">' + item.emoji + ' ' + item.name + '</th>' +
        '<td>$' + item.price + '</td>' +
        '<td><div class="qty">' +
          '<button type="button" data-d="-1" aria-label="one fewer ' + item.name + '">−</button>' +
          '<output>0</output>' +
          '<button type="button" data-d="1" aria-label="one more ' + item.name + '">+</button>' +
        '</div></td>' +
        '<td class="cost">$0</td>';
      $$('button', tr).forEach(function (b) {
        b.addEventListener('click', function () { bump(item, Number(b.dataset.d)); });
      });
      body.appendChild(tr);
    });

    ['price', 'sold'].forEach(function (key) {
      var el = $('#s5-' + key);
      el.value = d[key] || 0;
      el.addEventListener('input', function () {
        var v = Math.max(0, Math.floor(Number(el.value) || 0));
        if (key === 'price') v = Math.min(v, 20);
        if (key === 'sold') v = Math.min(v, 100);
        d[key] = v;
        paint5(); changed(5);
      });
    });

    $('#s5-easy').addEventListener('click', function () {
      d.qty = { paper: 1, markers: 1, cups: 1 };
      d.price = 2; d.sold = 10;
      $('#s5-price').value = 2;
      $('#s5-sold').value = 10;
      $('#s5-warn').textContent = '';
      paint5(); changed(5);
      window.App.toast('Filled in: 3 supplies, 10 items at $2 each.');
    });

    $('#s5-whatif').addEventListener('click', function () {
      var sold = Number(d.sold) || 0;
      if (!sold) { $('#s5-whatif-out').textContent = 'Set how many you will sell first.'; return; }
      var half = Math.floor(sold / 2);
      var inHalf = (Number(d.price) || 0) * half;
      var profitHalf = inHalf - S.moneyOut();
      $('#s5-whatif-out').textContent =
        'If you sold ' + half + ' instead of ' + sold + ': Money In $' + inHalf +
        ', Profit $' + profitHalf + '. ' +
        (profitHalf > 0 ? 'Still a profit! 🎉' : 'That would not be enough. 😮');
    });

    paint5();
  }

  // Add or remove one supply, never letting the student go past $20.
  function bump(item, delta) {
    var d = S.data.s5;
    var now = d.qty[item.id] || 0;
    var next = now + delta;
    if (next < 0) return;
    if (next > 5) { $('#s5-warn').textContent = '5 of one supply is plenty!'; return; }

    if (delta > 0 && S.moneyOut() + item.price > S.START_CASH) {
      $('#s5-warn').textContent = 'Whoa! That would cost more than your $20. Take something out first. 🙂';
      return;
    }
    $('#s5-warn').textContent = '';
    if (next === 0) delete d.qty[item.id]; else d.qty[item.id] = next;
    paint5(); changed(5);
  }

  function paint5() {
    var d = S.data.s5;

    $$('#s5-list tbody tr').forEach(function (tr) {
      var item = S.priceItem(tr.dataset.id);
      var q = d.qty[item.id] || 0;
      $('output', tr).textContent = q;
      $('.cost', tr).textContent = '$' + (q * item.price);
      tr.classList.toggle('is-picked', q > 0);
    });

    var out = S.moneyOut(), inc = S.moneyIn(), profit = inc - out;
    var left = S.START_CASH - out;

    var leftEl = $('#s5-left');
    leftEl.textContent = '$' + left;
    leftEl.parentElement.classList.toggle('is-low', left <= 3);

    var picks = Object.keys(d.qty).length;
    $('#s5-in-eq').textContent = '$' + (d.price || 0) + ' × ' + (d.sold || 0);
    $('#s5-out-eq').textContent = picks ? picks + (picks === 1 ? ' supply' : ' supplies') : 'no supplies yet';
    $('#s5-profit-eq').textContent = '$' + inc + ' − $' + out;
    $('#s5-in').textContent = '$' + inc;
    $('#s5-out').textContent = '$' + out;
    $('#s5-profit').textContent = (profit < 0 ? '−$' + Math.abs(profit) : '$' + profit);

    var row = $('.math-profit');
    row.classList.toggle('is-good', profit > 0);
    row.classList.toggle('is-bad', profit <= 0 && (inc > 0 || out > 0));

    var msg = '';
    if (inc > 0 || out > 0) {
      msg = profit > 0
        ? 'Profit! You kept $' + profit + '. 🎉'
        : 'Not yet! Try changing your price or supplies.';
    }
    $('#s5-profit-msg').textContent = msg;

    // celebrate only when profit first turns positive
    var good = profit > 0;
    if (good && !wasProfitable) window.App.confetti();
    wasProfitable = good;
  }

  /* ---------- pitch day ---------- */
  function pitchLines() {
    var d = S.data;
    var nick = d.nickname || 'the boss';
    var biz = S.bizName() || 'my business';
    var sells = d.s1.sells || 'my product';
    var who = d.s1['for'] || 'my customers';
    var slogan = S.winningSlogan();
    var cust = d.s4.who || 'my customer';
    var likes = d.s4.likes;
    var profit = S.profit();

    var lines = [
      'Hi! I am ' + nick + '.',
      'My business is called ' + biz + '.',
      'We sell ' + sells + ' for ' + who + '.'
    ];
    if (d.s1.because) lines.push('People want it because ' + d.s1.because + '.');
    if (slogan) lines.push('Our slogan is: “' + slogan + '”');
    lines.push('My customer is ' + cust + (likes ? ', who likes ' + likes : '') + '.');
    if (S.moneyIn() > 0 || S.moneyOut() > 0) {
      lines.push('I spent $' + S.moneyOut() + ' and made $' + S.moneyIn() +
        ', so my profit is ' + (profit < 0 ? '−$' + Math.abs(profit) : '$' + profit) + '.');
    }
    lines.push('Thank you! Any questions?');
    return lines;
  }

  function paintPitch() {
    var ol = $('#pitch-lines');
    ol.innerHTML = '';
    pitchLines().forEach(function (t) {
      var li = document.createElement('li');
      li.className = 'speak';
      li.textContent = t;
      ol.appendChild(li);
    });
  }

  function initPitch() {
    $$('#ready-list input').forEach(function (cb, i) {
      cb.checked = !!S.data.ready[i];
      cb.addEventListener('change', function () { S.data.ready[i] = cb.checked; changed(6); });
    });
    initTimer();
  }

  /* ---------- the one-minute timer ---------- */
  function initTimer() {
    var face = $('#timer-face'), msg = $('#timer-msg');
    var startBtn = $('#timer-start'), resetBtn = $('#timer-reset');
    var left = 60, id = null;

    function show() {
      var m = Math.floor(left / 60), s = left % 60;
      face.textContent = m + ':' + (s < 10 ? '0' + s : s);
      face.classList.toggle('is-low', left <= 10);
    }
    function stop() {
      clearInterval(id); id = null;
      startBtn.textContent = '▶ Start';
    }
    startBtn.addEventListener('click', function () {
      if (id) { stop(); msg.textContent = 'Paused.'; return; }
      if (left === 0) left = 60;
      msg.textContent = 'Go! Speak clearly. 🎤';
      startBtn.textContent = '⏸ Pause';
      id = setInterval(function () {
        left--; show();
        if (left <= 0) {
          stop();
          msg.textContent = "⏰ Time's up! Great pitch!";
          window.App.confetti();
        }
      }, 1000);
    });
    resetBtn.addEventListener('click', function () {
      stop(); left = 60; show(); msg.textContent = '';
    });
    show();
  }

  /* ---------- certificate ---------- */
  function paintCert() {
    var d = S.data;
    var profit = S.profit();
    $('#cert-nick').textContent = d.nickname || '—';
    $('#cert-biz').textContent = S.bizName() || '—';
    var sl = S.winningSlogan();
    $('#cert-slogan').textContent = sl ? '“' + sl + '”' : '';
    $('#cert-sells').textContent = d.s1.sells || '—';
    $('#cert-cust').textContent = d.s4.who
      ? d.s4.who + (d.s4.age ? ' (' + d.s4.age + ')' : '')
      : '—';
    $('#cert-in').textContent = '$' + S.moneyIn();
    $('#cert-out').textContent = '$' + S.moneyOut();
    $('#cert-profit').textContent = (profit < 0 ? '−$' + Math.abs(profit) : '$' + profit);
    L.drawLogo($('#cert-canvas'), logoData());
  }

  function initCert() {
    $('#print-btn').addEventListener('click', function () { window.print(); });
  }

  /* ---------- refresh anything derived, called on every screen change ---------- */
  function refresh() {
    paint1(); paint2(); paint3(); paint4(); paint5();
    paintPitch(); paintCert();
  }

  window.Steps = {
    init: function () {
      // set this first: a saved profit should not re-fire the confetti on load
      wasProfitable = S.profit() > 0;
      wireChips();
      initWelcome();
      initStep1(); initStep2(); initStep3(); initStep4(); initStep5();
      initPitch(); initCert();
    },
    refresh: refresh,
    repaintArt: function () { paint2(); paint3(); paintCert(); },
    fileBase: fileBase
  };
})();
