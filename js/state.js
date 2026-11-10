/* ===== state.js — everything saved in localStorage, nothing leaves this computer ===== */
(function () {
  'use strict';

  var KEY = 'be-the-boss-v1';

  function blank() {
    return {
      level: 'ontrack',
      screen: 0,
      nickname: '',
      s1: { kind: '', sells: '', for: '', because: '', challenge: '' },
      s2: {
        name: '', adj: '', noun: '', end: 'Shop',
        shape: 'circle', icon: '', colors: ['#FF6B5B'], font: 'round', readOk: false,
        challenge: ''
      },
      s3: { trick: '', a: '', b: '', c: '', winner: '', challenge: '' },
      s4: {
        who: '', age: '', likes: '', where: '', hear: '',
        survey: [null, null, null, null, null], challenge: ''
      },
      s5: { qty: {}, price: 0, sold: 0 },
      ready: [false, false, false, false, false],
      done: { 1: false, 2: false, 3: false, 4: false, 5: false }
    };
  }

  // Merge saved values onto a fresh object so an older save never breaks the app.
  function merge(target, src) {
    if (!src || typeof src !== 'object') return target;
    Object.keys(target).forEach(function (k) {
      var v = src[k];
      if (v === undefined || v === null) return;
      if (Array.isArray(target[k])) { if (Array.isArray(v)) target[k] = v.slice(); }
      else if (typeof target[k] === 'object') merge(target[k], v);
      else if (typeof v !== 'object') target[k] = v;
    });
    return target;
  }

  var data = blank();

  // Copy one saved business onto the live data.
  function applySaved(saved) {
    merge(data, saved);
    // The supply list is a free-form map, so merge() cannot walk it.
    // Copy it over by hand and check every value before trusting it.
    data.s5.qty = {};
    var savedQty = (saved && saved.s5 && saved.s5.qty) || {};
    Object.keys(savedQty).forEach(function (id) {
      var n = Math.floor(Number(savedQty[id]) || 0);
      if (n > 0 && n <= 5 && Store.priceItem(id)) data.s5.qty[id] = n;
    });
  }

  // Does this look like a real business, rather than an empty start?
  function hasWork(d) {
    return !!(d.nickname || d.s1.kind || d.s1.sells || d.s2.name || d.s2.icon ||
      d.s3.a || d.s3.b || d.s3.c || d.s4.who || Object.keys(d.s5.qty).length);
  }

  var Store = {
    data: data,
    onSave: null,          // the app uses this to flash "Saved"

    load: function () {
      try {
        var raw = localStorage.getItem(KEY);
        if (raw) applySaved(JSON.parse(raw));
      } catch (e) { /* private mode or bad JSON: carry on with a blank slate */ }
      return data;
    },

    save: function () {
      try { localStorage.setItem(KEY, JSON.stringify(data)); }
      catch (e) { /* storage full or blocked: the app still works for this session */ }
      if (typeof Store.onSave === 'function') Store.onSave();
    },

    hasWork: function () { return hasWork(data); },

    /* ---- saving to a file, so work can move between Chromebooks ---- */
    toFile: function () {
      return JSON.stringify({
        app: 'be-the-boss',
        version: 1,
        savedOn: new Date().toISOString().slice(0, 10),
        business: data
      }, null, 2);
    },

    // Returns true if the file was a real Be the Boss file and was loaded.
    fromFile: function (text) {
      var parsed;
      try { parsed = JSON.parse(text); } catch (e) { return false; }
      if (!parsed || typeof parsed !== 'object') return false;

      // accept the wrapped file, and also a bare business object
      var biz = parsed.business || parsed;
      if (!biz || typeof biz !== 'object' || !biz.s1 || !biz.s2 || !biz.s5) return false;

      var fresh = blank();                     // start clean, not on top of this student
      Object.keys(fresh).forEach(function (k) { data[k] = fresh[k]; });
      applySaved(biz);
      Store.save();
      return true;
    },

    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      var fresh = blank();
      Object.keys(fresh).forEach(function (k) { data[k] = fresh[k]; });
      return data;
    },

    /* ---- numbers used by step 5, pitch day and the certificate ---- */
    moneyOut: function () {
      var out = 0, qty = data.s5.qty;
      Object.keys(qty).forEach(function (id) {
        var item = Store.priceItem(id);
        if (item) out += item.price * qty[id];
      });
      return out;
    },
    moneyIn: function () { return (Number(data.s5.price) || 0) * (Number(data.s5.sold) || 0); },
    profit: function () { return Store.moneyIn() - Store.moneyOut(); },
    cashLeft: function () { return Store.START_CASH - Store.moneyOut(); },

    START_CASH: 20,

    // The class price list, shared by step 5 and the "easy way" button.
    PRICES: [
      { id: 'paper',   name: 'Paper pack',             price: 2, emoji: '📄' },
      { id: 'markers', name: 'Markers',                price: 3, emoji: '🖊️' },
      { id: 'cups',    name: 'Cups',                   price: 2, emoji: '🥤' },
      { id: 'sugar',   name: 'Sugar or snacks',        price: 3, emoji: '🍬' },
      { id: 'beads',   name: 'Beads or craft pieces',  price: 4, emoji: '🧶' },
      { id: 'soap',    name: 'Soap or cleaning supplies', price: 3, emoji: '🧼' },
      { id: 'poster',  name: 'Poster board',           price: 1, emoji: '🪧' }
    ],
    priceItem: function (id) {
      return Store.PRICES.filter(function (p) { return p.id === id; })[0] || null;
    },

    /* ---- is a step finished? drives the trail map and the star burst ---- */
    isDone: function (step) {
      var d = data;
      if (step === 1) return !!(d.s1.kind && d.s1.sells.trim() && d.s1['for'].trim() && d.s1.because.trim());
      if (step === 2) return !!(d.s2.name.trim() && d.s2.icon && d.s2.shape && d.s2.colors.length >= 1);
      if (step === 3) return !!(d.s3.winner && (d.s3[d.s3.winner] || '').trim());
      if (step === 4) {
        var filled = d.s4.who.trim() && d.s4.age && d.s4.likes.trim() && d.s4.where && d.s4.hear;
        var asked = d.s4.survey.every(function (v) { return v === 'yes' || v === 'no'; });
        return !!(filled && asked);
      }
      if (step === 5) {
        return Store.moneyOut() > 0 && Number(d.s5.price) > 0 && Number(d.s5.sold) > 0;
      }
      return false;
    },

    // Business name falls back to the recipe pieces so the poster is never empty.
    bizName: function () {
      var s2 = data.s2;
      if (s2.name.trim()) return s2.name.trim();
      var parts = [s2.adj, s2.noun, s2.end].filter(Boolean);
      return parts.length > 1 ? parts.join(' ') : '';
    },
    winningSlogan: function () {
      var w = data.s3.winner;
      return w ? (data.s3[w] || '').trim() : '';
    }
  };

  window.Store = Store;
})();
