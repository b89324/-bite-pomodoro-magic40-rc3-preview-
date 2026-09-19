/* magic38 medal collection, computed from existing session records. */
(function () {
  'use strict';
  function escape38(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function kind38(s) {
    if (!s || !s.timerId) return '';
    if (s.outcome === 'early-complete') return 'early';
    if (s.outcome === 'timeout' && s.workCompletedOnTime === true) return 'ontime';
    return '';
  }
  function earned38() {
    var ids = new Set();
    return (state.sessions || []).slice().reverse().filter(function (s) {
      if (!kind38(s)) return false;
      var id = s.id || [s.timerId,s.date,s.cycle,s.outcome].join('|');
      if (ids.has(id)) return false;
      ids.add(id);
      return true;
    });
  }
  function medal38(kind, records) {
    var early = kind === 'early';
    var title = early ? 'Good job' : 'Very good';
    var count = records.filter(function (s) { return kind38(s) === kind; }).length;
    return '<details class="magic38-medal ' + (early ? 'magic38-gold' : 'magic38-blue') +
      '"><summary><span class="magic38-seal" aria-hidden="true">★</span><span class="magic38-medal-title"><b>' +
      title + '</b><small>' + (early ? '提前完成' : '時間到完成') +
      '</small></span><span class="magic38-count">' + count +
      ' 枚</span><span aria-hidden="true">▾</span></summary><div class="magic38-details" data-magic38-kind="' +
      kind + '"></div></details>';
  }
  function details38(records, kind) {
    var rows = records.filter(function (s) { return kind38(s) === kind; });
    if (!rows.length) return '<p>尚未獲得這款勳章；完成對應任務後，紀錄將顯示在這裡。</p>';
    return '<ol>' + rows.map(function (s) {
      var title = [s.subject,s.task].filter(Boolean).join('｜') || '已完成工作';
      var mins = Math.max(0,Math.round(Number(s.seconds || 0) / 60));
      return '<li><b>' + escape38(title) + '</b><small>' +
        escape38(s.date || '日期未記錄') + ' · 專注 ' + mins + ' 分鐘</small></li>';
    }).join('') + '</ol>';
  }
  var originalStats38 = statsView;
  statsView = function () {
    var records = earned38();
    return originalStats38() + '<section class="card magic38-gallery"><header><h2>🏅 我的勳章與學習成果</h2><p>累積獲得 ' +
      records.length + ' 枚勳章。點選勳章，查看科目、完成工作、日期與實際專注時間。</p></header><div class="magic38-grid">' +
      medal38('early',records) + medal38('ontime',records) +
      '</div><p class="magic38-help">由既有番茄鐘紀錄計算，不重複儲存勳章。舊版未標記準時完成的紀錄不會補發。</p></section>';
  };
  var originalBindStats38 = bindStats;
  bindStats = function () {
    originalBindStats38();
    document.querySelectorAll('[data-magic38-kind]').forEach(function (target) {
      var wrapper = target.closest('details');
      if (!wrapper) return;
      wrapper.addEventListener('toggle',function () {
        if (wrapper.open) target.innerHTML = details38(earned38(),target.dataset.magic38Kind);
        else target.textContent = '';
      });
    });
  };
  if (view === 'stats') render();
})();