/* ===== prices.js — the class price list =====
   Kept in its own file because two pages need it: the student app (step 5)
   and the teacher review page, which re-adds up each student's budget.
   Change a price here and both agree. */
(function () {
  'use strict';

  window.BossPrices = {
    START_CASH: 20,

    LIST: [
      { id: 'paper',   name: 'Paper pack',               price: 2, emoji: '📄' },
      { id: 'markers', name: 'Markers',                  price: 3, emoji: '🖊️' },
      { id: 'cups',    name: 'Cups',                     price: 2, emoji: '🥤' },
      { id: 'sugar',   name: 'Sugar or snacks',          price: 3, emoji: '🍬' },
      { id: 'beads',   name: 'Beads or craft pieces',    price: 4, emoji: '🧶' },
      { id: 'soap',    name: 'Soap or cleaning supplies', price: 3, emoji: '🧼' },
      { id: 'poster',  name: 'Poster board',             price: 1, emoji: '🪧' }
    ],

    item: function (id) {
      var list = window.BossPrices.LIST;
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    }
  };
})();
