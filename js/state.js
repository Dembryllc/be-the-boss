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

    /* ---- the class price list, shared with the teacher review page ---- */
    START_CASH: window.BossPrices.START_CASH,
    PRICES: window.BossPrices.LIST,
    priceItem: function (id) { return window.BossPrices.item(id); },

    /* ---- the money maths ----
       The "...Of" versions take any business, so the teacher review page can
       add up a student's file without this app's own data being involved.
       The short names below are the same thing, for the student in front of us. */
    moneyOutOf: function (d) {
      var out = 0, qty = (d && d.s5 && d.s5.qty) || {};
      Object.keys(qty).forEach(function (id) {
        var item = window.BossPrices.item(id);
        if (item) out += item.price * qty[id];
      });
      return out;
    },
    moneyInOf: function (d) {
      return (Number(d.s5.price) || 0) * (Number(d.s5.sold) || 0);
    },
    profitOf: function (d) { return Store.moneyInOf(d) - Store.moneyOutOf(d); },
    cashLeftOf: function (d) { return Store.START_CASH - Store.moneyOutOf(d); },

    moneyOut: function () { return Store.moneyOutOf(data); },
    moneyIn: function () { return Store.moneyInOf(data); },
    profit: function () { return Store.profitOf(data); },
    cashLeft: function () { return Store.cashLeftOf(data); },

    /* ---- is a step finished? drives the trail map, the star burst, and
           the teacher review page's progress ticks ---- */
    isDoneOf: function (d, step) {
      if (!d) return false;
      if (step === 1) return !!(d.s1.kind && d.s1.sells.trim() && d.s1['for'].trim() && d.s1.because.trim());
      if (step === 2) return !!(d.s2.name.trim() && d.s2.icon && d.s2.shape && d.s2.colors.length >= 1);
      if (step === 3) return !!(d.s3.winner && (d.s3[d.s3.winner] || '').trim());
      if (step === 4) {
        var filled = d.s4.who.trim() && d.s4.age && d.s4.likes.trim() && d.s4.where && d.s4.hear;
        var asked = d.s4.survey.every(function (v) { return v === 'yes' || v === 'no'; });
        return !!(filled && asked);
      }
      if (step === 5) {
        return Store.moneyOutOf(d) > 0 && Number(d.s5.price) > 0 && Number(d.s5.sold) > 0;
      }
      return false;
    },
    isDone: function (step) { return Store.isDoneOf(data, step); },

    // Business name falls back to the recipe pieces so the poster is never empty.
    bizNameOf: function (d) {
      var s2 = d.s2;
      if ((s2.name || '').trim()) return s2.name.trim();
      var parts = [s2.adj, s2.noun, s2.end].filter(Boolean);
      return parts.length > 1 ? parts.join(' ') : '';
    },
    winningSloganOf: function (d) {
      var w = d.s3.winner;
      return w ? (d.s3[w] || '').trim() : '';
    },
    bizName: function () { return Store.bizNameOf(data); },
    winningSlogan: function () { return Store.winningSloganOf(data); },

    // Read one saved file WITHOUT disturbing this app's own data.
    // Returns a clean business, or null if the file is not ours.
    readFile: function (text) {
      var parsed;
      try { parsed = JSON.parse(text); } catch (e) { return null; }
      if (!parsed || typeof parsed !== 'object') return null;
      var biz = parsed.business || parsed;
      if (!biz || typeof biz !== 'object' || !biz.s1 || !biz.s2 || !biz.s5) return null;

      var clean = blank();
      merge(clean, biz);
      clean.s5.qty = {};
      var q = (biz.s5 && biz.s5.qty) || {};
      Object.keys(q).forEach(function (id) {
        var n = Math.floor(Number(q[id]) || 0);
        if (n > 0 && n <= 5 && window.BossPrices.item(id)) clean.s5.qty[id] = n;
      });
      return clean;
    }
  };

  window.Store = Store;
})();
