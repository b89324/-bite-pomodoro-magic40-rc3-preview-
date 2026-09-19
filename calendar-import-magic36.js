/* magic36 isolated CSV and ICS importer; executed inside existing app closure */
(function () {
  'use strict';
  var pending36 = null;
  function esc36(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }
  function date36(v) {
    var m = /^(\d{4})[-\/]?(\d\d)[-\/]?(\d\d)(?:[T\s].*)?$/.exec(
      String(v || '').trim()
    );
    if (!m) return '';
    var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] &&
      d.getUTCMonth() + 1 === +m[2] &&
      d.getUTCDate() === +m[3]
      ? m[1] + '-' + m[2] + '-' + m[3]
      : '';
  }
  function rows36(text) {
    var a = [],
      r = [],
      v = '',
      q = false,
      s = String(text || '').replace(/^\uFEFF/, '');
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (q) {
        if (c === '"' && s[i + 1] === '"') {
          v += '"';
          i++;
        } else if (c === '"') q = false;
        else v += c;
      } else if (c === '"') {
        if (v.trim()) throw Error('CSV 引號格式錯誤');
        q = true;
      } else if (c === ',') {
        r.push(v.trim());
        v = '';
      } else if (c === '\r' || c === '\n') {
        if (c === '\r' && s[i + 1] === '\n') i++;
        r.push(v.trim());
        if (r.some(Boolean)) a.push(r);
        r = [];
        v = '';
        if (a.length > 501) throw Error('一次最多匯入500筆');
      } else v += c;
    }
    if (q) throw Error('CSV 引號未關閉');
    r.push(v.trim());
    if (r.some(Boolean)) a.push(r);
    return a;
  }
  function csv36(s) {
    var a = rows36(s);
    if (!a.length) throw Error('CSV沒有資料');
    var h = a.shift().map(function (x) {
      return x.toLowerCase();
    });
    function col(aliases) {
      return h.findIndex(function (x) {
        return aliases.indexOf(x) >= 0;
      });
    }
    var d = col(['日期', 'date']),
      t = col(['事項', 'title']),
      ty = col(['類型', 'type']),
      n = col(['備註', 'note']),
      st = col(['加星號', 'star']);
    if (d < 0 || t < 0) throw Error('CSV第一列需要日期和事項');
    return a.map(function (r) {
      return {
        date: date36(r[d]),
        title: r[t] || '',
        type: ty >= 0 ? r[ty] || '一般' : '一般',
        note: n >= 0 ? r[n] || '' : '',
        star: st >= 0 ? /^(是|yes|true|1|★)$/i.test(r[st] || '') : false,
      };
    });
  }
  function ics36(s) {
    var lines = String(s || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n[ \t]/g, '')
        .split('\n'),
      out = [],
      event = null;
    if (lines.indexOf('BEGIN:VCALENDAR') < 0) throw Error('無效的ICS檔案');
    lines.forEach(function (line) {
      if (line === 'BEGIN:VEVENT') event = {};
      else if (line === 'END:VEVENT') {
        if (event) {
          out.push({
            date: date36(event.DTSTART),
            title: event.SUMMARY || '',
            type: event.CATEGORIES || '一般',
            note: event.DESCRIPTION || '',
            star: false,
          });
          event = null;
        }
      } else if (event) {
        var at = line.indexOf(':');
        if (at < 0) return;
        var k = line.slice(0, at).split(';')[0].toUpperCase();
        if (
          ['DTSTART', 'SUMMARY', 'CATEGORIES', 'DESCRIPTION'].indexOf(k) >= 0 &&
          event[k] === undefined
        )
          event[k] = line
            .slice(at + 1)
            .replace(/\\([nN,;\\])/g, function (_, c) {
              return /n/i.test(c) ? '\n' : c;
            });
      }
    });
    if (!out.length) throw Error('ICS沒有事件');
    if (out.length > 500) throw Error('一次最多匯入500筆');
    return out;
  }
  function key36(x) {
    return [
      x.date,
      String(x.title || '')
        .trim()
        .normalize('NFKC')
        .toLowerCase(),
      String(x.type || '一般')
        .trim()
        .normalize('NFKC')
        .toLowerCase(),
    ].join('|');
  }
  function classify36() {
    var seen = new Set(),
      existing = new Set(
        (state.calendarEvents || [])
          .filter(function (x) {
            return !x.cancelled && !x.sourceExamId;
          })
          .map(key36)
      );
    return pending36.rows.map(function (r) {
      r.title = String(r.title || '').trim();
      r.type = String(r.type || '一般').trim() || '一般';
      r.note = String(r.note || '').trim();
      r.problem = !r.date
        ? '日期錯誤'
        : !r.title
          ? '事項不可空白'
          : r.title.length > 250
            ? '事項過長'
            : r.note.length > 2000
              ? '備註過長'
              : '';
      var k = key36(r);
      r.duplicate = !r.problem && (seen.has(k) || existing.has(k));
      if (!r.problem) seen.add(k);
      return r;
    });
  }
  function sample36(fmt) {
    var s =
      fmt === 'csv'
        ? '\uFEFF日期,類型,事項,備註,加星號\r\n2026-10-05,考試,國語第一次小考,國語第三課,是\r\n2026-10-07,作業,數學習作,第六頁,否\r\n2026-10-10,活動,校外教學,帶水壺,否\r\n'
        : 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261005\r\nSUMMARY:國語第一次小考\r\nCATEGORIES:考試\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261007\r\nSUMMARY:數學習作\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';
    var u = URL.createObjectURL(
        new Blob([s], { type: 'text/plain;charset=utf-8' })
      ),
      a = document.createElement('a');
    a.href = u;
    a.download = 'magic36_calendar_sample.' + fmt;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      URL.revokeObjectURL(u);
    }, 1000);
  }
  function panel36() {
    return '<section class="card magic36-import"><h2>📥 行事曆匯入（magic36 測試版）</h2><p>本機CSV／ICS，匯入前預覽並確認；不自動建立複習番茄鐘。</p><label>選擇檔案<input id="magic36-file" type="file" accept=".csv,.ics,text/csv,text/calendar"></label><div class="magic36-buttons"><button id="magic36-csv" type="button">下載CSV測試檔</button><button id="magic36-ics" type="button">下載ICS測試檔</button></div><p id="magic36-status" role="status">尚未選取檔案。</p><div id="magic36-preview"></div></section>';
  }
  var oldCalendar36 = calendarView;
  calendarView = function () {
    var h = oldCalendar36(),
      k = '<section class="paper calendar-paper">',
      i = h.indexOf(k);
    return i < 0 ? h + panel36() : h.slice(0, i) + panel36() + h.slice(i);
  };
  function preview36() {
    var el = document.getElementById('magic36-preview');
    if (!el || !pending36) return;
    var rr = classify36(),
      valid = rr.filter(function (r) {
        return !r.problem && !r.duplicate;
      });
    var h =
      '<h3>匯入預覽：' +
      esc36(pending36.name) +
      '</h3><p>共' +
      rr.length +
      '筆，可匯入' +
      valid.length +
      '筆，重複' +
      rr.filter(function (r) {
        return r.duplicate;
      }).length +
      '筆，錯誤' +
      rr.filter(function (r) {
        return !!r.problem;
      }).length +
      '筆。</p><div class="magic36-scroll"><table><thead><tr><th>狀態</th><th>日期</th><th>類型</th><th>事項</th><th>備註</th></tr></thead><tbody>';
    rr.forEach(function (r) {
      h +=
        '<tr><td>' +
        esc36(r.problem || (r.duplicate ? '重複略過' : '可匯入')) +
        '</td><td>' +
        esc36(r.date) +
        '</td><td>' +
        esc36(r.type) +
        '</td><td>' +
        esc36(r.title) +
        '</td><td>' +
        esc36(r.note) +
        '</td></tr>';
    });
    h +=
      '</tbody></table></div><div class="magic36-buttons"><button id="magic36-confirm" type="button" ' +
      (!valid.length ? 'disabled' : '') +
      '>確認匯入' +
      valid.length +
      '筆</button><button id="magic36-cancel" type="button">取消</button></div>';
    el.innerHTML = h;
    document.getElementById('magic36-cancel').onclick = function () {
      pending36 = null;
      document.getElementById('magic36-preview').innerHTML = '';
      document.getElementById('magic36-status').textContent =
        '已取消，未寫入資料';
    };
    document.getElementById('magic36-confirm').onclick = function () {
      var entries = classify36().filter(function (r) {
        return !r.problem && !r.duplicate;
      });
      var before = state.calendarEvents.length,
        added = 0;
      try {
        entries.forEach(function (r) {
          if (addCalendarEvent(r)) added++;
        });
        save();
        pending36 = null;
        render();
        document.getElementById('magic36-status').textContent =
          '已匯入' + added + '筆，未建立複習番茄鐘';
      } catch (e) {
        state.calendarEvents.splice(before);
        save();
        alert('匯入失敗：' + e.message);
      }
    };
  }
  var oldBind36 = bindCalendar;
  bindCalendar = function () {
    oldBind36();
    var input = document.getElementById('magic36-file');
    if (!input) return;
    document.getElementById('magic36-csv').onclick = function () {
      sample36('csv');
    };
    document.getElementById('magic36-ics').onclick = function () {
      sample36('ics');
    };
    input.onchange = function () {
      pending36 = null;
      document.getElementById('magic36-preview').innerHTML = '';
      var f = input.files && input.files[0],
        status = document.getElementById('magic36-status');
      if (!f) return;
      var type = f.name.split('.').pop().toLowerCase();
      if (type !== 'csv' && type !== 'ics') {
        status.textContent = '僅支援CSV或ICS';
        return;
      }
      if (f.size > 1048576) {
        status.textContent = '檔案不可超過1MB';
        return;
      }
      status.textContent = '讀取中';
      f.text()
        .then(function (s) {
          var rows = type === 'csv' ? csv36(s) : ics36(s);
          if (!rows.length) throw Error('檔案沒有事項');
          pending36 = { name: f.name, rows: rows };
          status.textContent = '請檢查預覽並確認';
          preview36();
        })
        .catch(function (e) {
          pending36 = null;
          status.textContent = '檔案錯誤：' + e.message;
        });
    };
    if (pending36) preview36();
  };
})();
