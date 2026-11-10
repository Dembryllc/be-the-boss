/* ===== app.js — navigation, trail map, read aloud, levels, celebrations ===== */
(function () {
  'use strict';

  var S = window.Store;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var LAST_SCREEN = 7;

  // where the walker stands for each step
  var STOPS = { 1: [80, 110], 2: [285, 80], 3: [490, 110], 4: [695, 80], 5: [900, 110] };

  /* ---------- toast ---------- */
  var toastTimer = null;
  function toast(msg) {
    var el = $('#toast');
    el.textContent = msg;
    el.classList.add('is-up');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-up'); }, 2600);
  }

  /* ---------- level toggle ---------- */
  function setLevel(level) {
    S.data.level = level;
    document.body.className = 'level-' + level;
    $$('.level-btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.level === level));
    });
    S.save();
  }

  /* ---------- screens ---------- */
  function go(n) {
    n = Math.max(0, Math.min(LAST_SCREEN, Number(n)));
    S.data.screen = n;
    S.save();

    $$('.screen').forEach(function (sec) {
      var on = sec.id === 'screen-' + n;
      sec.classList.toggle('is-active', on);
      if (on) sec.removeAttribute('hidden'); else sec.setAttribute('hidden', '');
    });

    window.Steps.refresh();
    paintTrail();

    var head = $('#screen-' + n + ' h2');
    if (head) {
      head.setAttribute('tabindex', '-1');
      head.focus({ preventScroll: true });
    }
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });

    var card = $('#screen-' + n + ' .card');
    if (card && !reduceMotion) {
      card.classList.remove('bounce');
      void card.offsetWidth;        // restart the animation
      card.classList.add('bounce');
    }
  }

  /* ---------- trail map ---------- */
  function paintTrail() {
    var screen = S.data.screen;
    var current = screen === 0 ? 1 : Math.min(5, screen);

    $$('.trail-stop').forEach(function (g) {
      var step = Number(g.dataset.stop);
      g.classList.toggle('is-done', !!S.data.done[step]);
      g.classList.toggle('is-current', step === current && screen >= 1 && screen <= 5);
    });

    var pos = STOPS[current] || STOPS[1];
    $('#walker').setAttribute('transform', 'translate(' + pos[0] + ',' + pos[1] + ')');
  }

  /* ---------- a step just got finished ---------- */
  function afterChange(step) {
    for (var i = 1; i <= 5; i++) {
      var nowDone = S.isDone(i);
      if (nowDone && !S.data.done[i]) {
        S.data.done[i] = true;
        starBurst(i);
        toast('Step ' + i + ' done! ⭐');
      } else if (!nowDone && S.data.done[i]) {
        S.data.done[i] = false;   // they changed their mind: let them finish it again
      }
    }
    S.save();
    paintTrail();
    void step;
  }

  /* ---------- star burst over the finished trail stop ---------- */
  function starBurst(step) {
    if (reduceMotion) return;
    var stop = $('.trail-stop[data-stop="' + step + '"]');
    if (!stop) return;
    var r = stop.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var layer = $('#burst-layer');
    var marks = ['⭐', '🌟', '✨', '⭐', '🎉', '✨'];

    marks.forEach(function (m, i) {
      var s = document.createElement('span');
      s.className = 'burst';
      s.textContent = m;
      var a = (i / marks.length) * Math.PI * 2;
      s.style.left = cx + 'px';
      s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(a) * 90 + 'px');
      s.style.setProperty('--dy', (Math.sin(a) * 90 - 20) + 'px');
      s.style.setProperty('--rot', (i % 2 ? 180 : -180) + 'deg');
      layer.appendChild(s);
      setTimeout(function () { s.remove(); }, 1000);
    });
  }

  /* ---------- confetti ---------- */
  var confettiRunning = false;
  function confetti() {
    if (reduceMotion) { toast('🎉 Hooray! You made a profit!'); return; }
    if (confettiRunning) return;
    confettiRunning = true;

    var canvas = $('#confetti-canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    var ctx = canvas.getContext('2d');
    var colors = ['#FF6B5B', '#FFC94A', '#35C9A3', '#4B7BEC', '#9B6BE8', '#FF86C8'];
    var bits = [];
    for (var i = 0; i < 110; i++) {
      bits.push({
        x: Math.random() * canvas.width,
        y: -20 - Math.random() * canvas.height * 0.4,
        w: 7 + Math.random() * 8,
        h: 10 + Math.random() * 12,
        vy: 2.2 + Math.random() * 3.2,
        vx: -1.2 + Math.random() * 2.4,
        spin: -0.14 + Math.random() * 0.28,
        a: Math.random() * Math.PI,
        c: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    var started = Date.now();
    (function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bits.forEach(function (b) {
        b.x += b.vx; b.y += b.vy; b.a += b.spin;
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.a);
        ctx.fillStyle = b.c;
        ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
        ctx.restore();
      });
      if (Date.now() - started < 3200) requestAnimationFrame(frame);
      else { ctx.clearRect(0, 0, canvas.width, canvas.height); confettiRunning = false; }
    })();
  }

  /* ---------- read aloud ---------- */
  var SPEAK_PARTS = 'h2, h3, h4, p.speak, li.speak, .privacy-note, .hint, .logo-rules, ' +
                    '.sentence-preview, .survey-msg, .profit-msg, .challenge p, .checklist li, .field-label';

  function stripEmoji(t) {
    // speech engines read emoji names out loud, so take them out
    return t.replace(/[←-⯿️‍]/g, '')
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
  }

  function cardText(card) {
    return $$(SPEAK_PARTS, card)
      .filter(function (el) { return el.offsetParent !== null; })
      .map(function (el) { return stripEmoji(el.textContent || ''); })
      .filter(Boolean)
      .join('. ')
      .replace(/\.\s*\./g, '.');
  }

  function wireReadAloud() {
    var synth = window.speechSynthesis;
    var active = null;

    function clearActive() {
      if (active) { active.classList.remove('is-speaking'); active.textContent = '🔊 Read Aloud'; }
      active = null;
    }

    $$('.read-aloud').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (!synth) { toast('Read Aloud is not available on this computer.'); return; }
        if (active === btn) { synth.cancel(); clearActive(); return; }
        synth.cancel(); clearActive();

        var text = cardText(btn.closest('.card'));
        if (!text) { toast('Nothing to read here yet.'); return; }

        var u = new SpeechSynthesisUtterance(text);
        u.rate = 0.92;
        u.pitch = 1.03;
        u.lang = 'en-US';
        var voice = (synth.getVoices() || []).filter(function (v) {
          return /^en/i.test(v.lang);
        })[0];
        if (voice) u.voice = voice;
        u.onend = clearActive;
        u.onerror = clearActive;

        active = btn;
        btn.classList.add('is-speaking');
        btn.textContent = '⏹ Stop';
        synth.speak(u);
      });
    });

    // stop talking when the student leaves the page
    window.addEventListener('pagehide', function () { if (synth) synth.cancel(); });
  }

  /* ---------- start over ---------- */
  function wireStartOver() {
    $('#start-over').addEventListener('click', function () {
      var ok = window.confirm('Start over? This erases your business and cannot be undone.');
      if (!ok) return;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      S.reset();
      location.reload();
    });
  }

  /* ---------- go ---------- */
  function init() {
    S.load();
    setLevel(S.data.level || 'ontrack');

    $$('.level-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        setLevel(b.dataset.level);
        window.Steps.refresh();
        toast(b.textContent + ' level');
      });
    });

    window.Steps.init();

    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.dataset.go); });
    });

    wireReadAloud();
    wireStartOver();

    // keep the done flags honest after a reload
    for (var i = 1; i <= 5; i++) S.data.done[i] = S.isDone(i);

    go(S.data.screen || 0);

    // Lexend arrives after the first paint, so draw the logo again once it is ready
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { window.Steps.repaintArt(); });
    }
    window.addEventListener('resize', function () {
      var c = $('#confetti-canvas');
      c.width = window.innerWidth; c.height = window.innerHeight;
    });
  }

  window.App = { go: go, toast: toast, confetti: confetti, afterChange: afterChange };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
