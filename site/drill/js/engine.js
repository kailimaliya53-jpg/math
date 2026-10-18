/* ============================================================
 * 数学小教室 · 题型专项练习 · 页面逻辑
 *   - 口算卡：自动出题 → 计时作答 → 提交批改 → 错题重练
 *   - 竖式：出题 + 显示答案 + 打印练习卷
 *   - 应用题：按册加载题库，查看答案与解析
 * ============================================================ */
(function () {
  'use strict';
  const U = window.DRILL_UTIL;
  const BOOKS = window.DRILL_BOOKS;
  const $ = (s) => document.querySelector(s);

  const state = {
    bookId: null,
    tab: 'oral',
    oral: { n: 20, items: [], submitted: false, picked: {}, start: 0, timer: null, source: null },
    vert: { n: 6, items: [], shown: false },
    word: { items: null, shownAll: false, loading: false },
  };

  /* ============================ 顶栏 / 标签页 ============================ */
  function initBooks() {
    const sel = $('#bookSelect');
    Object.keys(BOOKS).forEach((id) => {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = BOOKS[id].label;
      sel.appendChild(o);
    });
    const wanted = new URLSearchParams(location.search).get('book');
    const id = wanted && BOOKS[wanted] ? wanted : 'grade1-down';
    sel.value = id;
    state.bookId = id;
    $('#bookLabel').textContent = '· ' + BOOKS[id].label;
    sel.addEventListener('change', () => {
      state.bookId = sel.value;
      $('#bookLabel').textContent = '· ' + BOOKS[sel.value].label;
      const u = new URL(location.href);
      u.searchParams.set('book', sel.value);
      history.replaceState(null, '', u);
      state.oral.items = [];
      state.oral.source = null;
      state.vert.items = [];
      state.word.items = null;
      state.word.shownAll = false;
      renderOral();
      renderVertNote();
      renderWord();
      updateNotes();
    });
  }

  function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach((t) => t.addEventListener('click', () => {
      state.tab = t.dataset.tab;
      tabs.forEach((x) => x.classList.toggle('active', x === t));
      ['oral', 'vert', 'word'].forEach((name) => {
        $('#panel-' + name).hidden = name !== state.tab;
      });
      if (state.tab === 'word' && state.word.items === null) renderWord();
    }));
  }

  function updateNotes() {
    const p = BOOKS[state.bookId];
    $('#oralNote').textContent = '本册口算范围：' + p.note;
    $('#vertNote').innerHTML = p.vertical.length
      ? '本册竖式题型：' + p.vertical.map((g) => g.name).join('、') + '。'
      : '本册以口算和应用题为主，没有需要列竖式的计算（可切到「口算卡」或回到中低年级册次练竖式）。';
    const hasVert = p.vertical.length > 0;
    $('#vertStart').disabled = !hasVert;
    $('#vertToggle').disabled = !hasVert;
    $('#vertPrint').disabled = !hasVert;
  }

  /* ============================ 口算卡 ============================ */
  function buildOral(total, only) {
    const preset = BOOKS[state.bookId];
    if (only && only.length) {
      return only.map((it) => ({ group: it.group, expr: it.expr, answer: it.answer, options: it.options, unit: it.unit || '' }));
    }
    const pool = [];
    preset.oral.forEach((g, i) => { for (let k = 0; k < (g.n || 3); k++) pool.push(i); });
    const items = [];
    const seen = new Set();
    let guard = 0;
    while (items.length < total && guard++ < total * 50) {
      const gi = pool[Math.floor(Math.random() * pool.length)];
      const gen = preset.oral[gi];
      const q = gen.make();
      const key = q.expr + '|' + q.answer;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ group: gen.name, expr: q.expr, answer: String(q.answer), options: q.options || null, unit: q.unit || '' });
    }
    return items;
  }

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function startTimer() {
    clearInterval(state.oral.timer);
    state.oral.start = Date.now();
    $('#oralTimer').textContent = '计时 00:00';
    state.oral.timer = setInterval(() => {
      $('#oralTimer').textContent = '计时 ' + fmtTime(Date.now() - state.oral.start);
    }, 500);
  }

  function stopTimer() {
    clearInterval(state.oral.timer);
    return state.oral.start ? Date.now() - state.oral.start : 0;
  }

  function renderOral() {
    const list = $('#oralList');
    list.innerHTML = '';
    const items = state.oral.items;
    $('#oralRetry').hidden = true;
    $('#oralResult').hidden = true;
    state.oral.submitted = false;
    state.oral.picked = {};
    $('#oralSubmit').disabled = items.length === 0;
    $('#oralPrintTitle').textContent = items.length
      ? BOOKS[state.bookId].label + ' · 口算卡（' + items.length + ' 题） 姓名：__________ 日期：__________ 用时：______'
      : '';

    if (!items.length) {
      list.innerHTML = '<div class="empty">选好题量后点「开始出题」，就会自动生成一套口算卡。</div>';
      return;
    }

    items.forEach((it, i) => {
      const div = document.createElement('div');
      div.className = 'q-item';
      div.dataset.i = String(i);
      div.innerHTML = '<div class="q-index">' + (i + 1) + '</div><div class="group-tag">' + it.group + '</div>';
      const body = document.createElement('div');
      body.className = 'q-body';
      body.innerHTML = '<span class="q-expr">' + it.expr + '</span><span class="q-eq">=</span>';

      if (it.options) {
        const box = document.createElement('div');
        box.className = 'choices';
        it.options.forEach((opt) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'choice';
          b.textContent = opt;
          b.dataset.v = opt;
          b.addEventListener('click', () => {
            if (state.oral.submitted) return;
            box.querySelectorAll('.choice').forEach((x) => x.classList.toggle('picked', x === b));
            state.oral.picked[i] = opt;
          });
          box.appendChild(b);
        });
        div.appendChild(body);
        div.appendChild(box);
      } else if (/余/.test(it.answer)) {
        body.innerHTML += '<input class="q-input mini" inputmode="numeric" placeholder="商" aria-label="商">' +
          '<span class="unit">余</span><input class="q-input mini" inputmode="numeric" placeholder="余" aria-label="余数">';
        div.appendChild(body);
      } else {
        body.innerHTML += '<input class="q-input" inputmode="decimal" placeholder="答案" aria-label="答案">' +
          (it.unit ? '<span class="unit">' + it.unit + '</span>' : '');
        div.appendChild(body);
      }
      const corr = document.createElement('div');
      corr.className = 'correct-ans';
      corr.hidden = true;
      div.appendChild(corr);
      list.appendChild(div);
    });
  }

  function gradeOral() {
    const items = state.oral.items;
    if (!items.length) return;
    state.oral.submitted = true;
    let right = 0;
    const wrongs = [];

    items.forEach((it, i) => {
      const box = document.querySelector('.q-item[data-i="' + i + '"]');
      let mine = '';
      let ok = false;

      if (it.options) {
        mine = state.oral.picked[i] || '';
        ok = mine === it.answer;
        box.querySelectorAll('.choice').forEach((b) => {
          if (b.dataset.v === it.answer) b.classList.add('right');
          else if (b.dataset.v === mine) b.classList.add('wrong');
          b.classList.remove('picked');
        });
      } else if (/余/.test(it.answer)) {
        const ins = box.querySelectorAll('input');
        const q = ins[0].value.trim(), r = ins[1].value.trim();
        mine = q + '余' + r;
        const m = /^(\d+)余(\d+)$/.exec(it.answer);
        ok = q !== '' && r !== '' && Number(q) === Number(m[1]) && Number(r) === Number(m[2]);
        ins.forEach((x) => { x.disabled = true; });
      } else {
        const inp = box.querySelector('input');
        mine = inp.value.trim();
        ok = mine !== '' && U.sameAnswer(mine, it.answer);
        inp.disabled = true;
      }

      const corr = box.querySelector('.correct-ans');
      if (ok) {
        right++;
        box.classList.add('ok');
      } else {
        box.classList.add('bad');
        corr.hidden = false;
        corr.textContent = '正确答案：' + it.answer;
        wrongs.push(it);
      }
    });

    const used = stopTimer();
    const total = items.length;
    const rate = Math.round((right / total) * 100);
    const res = $('#oralResult');
    res.hidden = false;
    res.innerHTML =
      '<div class="rs ok"><b>' + right + '</b>/' + total + ' 题正确</div>' +
      '<div class="rs">正确率 <b>' + rate + '%</b></div>' +
      '<div class="rs">用时 <b>' + fmtTime(used) + '</b></div>' +
      '<div class="rs">' + (wrongs.length ? '错 ' + wrongs.length + ' 题，建议点「只练错题」再做一遍' : '全对，很棒！') + '</div>';
    if (wrongs.length) {
      const btn = $('#oralRetry');
      btn.hidden = false;
      btn.onclick = () => {
        state.oral.items = buildOral(0, wrongs);
        startTimer();
        renderOral();
        $('#oralSubmit').disabled = false;
      };
    }
    $('#oralSubmit').disabled = true;
  }

  function initOral() {
    $('#oralCount').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state.oral.n = Number(b.dataset.n);
      $('#oralCount').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    });
    $('#oralStart').addEventListener('click', () => {
      state.oral.items = buildOral(state.oral.n);
      startTimer();
      renderOral();
    });
    $('#oralSubmit').addEventListener('click', gradeOral);
    $('#oralList').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); gradeOral(); }
    });
  }

  /* ============================ 竖式 ============================ */
  function buildVert(total) {
    const gens = BOOKS[state.bookId].vertical;
    const items = [];
    const seen = new Set();
    let guard = 0;
    while (items.length < total && guard++ < total * 50) {
      const gen = gens[Math.floor(Math.random() * gens.length)];
      const v = gen.make();
      const key = v.op + '|' + v.a + '|' + v.b;
      if (seen.has(key)) continue;
      seen.add(key);
      v.group = gen.name;
      items.push(v);
    }
    return items;
  }

  function alignDecimals(a, b) {
    const da = (String(a).split('.')[1] || '').length;
    const db = (String(b).split('.')[1] || '').length;
    const m = Math.max(da, db);
    return [String(a) + '\u00A0'.repeat(m - da), String(b) + '\u00A0'.repeat(m - db)];
  }

  function vsHtml(v) {
    const hide = state.vert.shown ? '' : ' hide-ans';
    if (v.op === '÷') {
      return '<div class="ld">' +
        '<div class="ld-quot' + hide + '">' + v.answer + '</div>' +
        '<div class="ld-body"><span class="ld-divisor">' + v.b + '</span>' +
        '<span class="ld-dividend">' + v.a + '</span></div>' +
        '<div class="ld-rem' + hide + '">' + (v.remainder && v.remainder !== '0' ? '余 ' + v.remainder : '') + '</div>' +
        '</div>';
    }
    let A = String(v.a), B = String(v.b);
    if (v.decimal && (v.op === '+' || v.op === '-')) {
      const p = alignDecimals(A, B);
      A = p[0]; B = p[1];
    }
    const row = (op, num, cls) => '<div class="vs-row"><span class="vs-op">' + op + '</span><span class="vs-num' + (cls || '') + '">' + num + '</span></div>';
    let html = '<div class="vs">';
    html += row('', A);
    html += row(v.op, B);
    html += '<div class="vs-line"></div>';
    if (v.op === '×' && B.length > 1 && !v.decimal) {
      B.split('').reverse().forEach((d, k) => {
        html += row('', String(Number(A) * Number(d)) + '0'.repeat(k));
      });
      html += '<div class="vs-line"></div>';
    }
    html += row('', v.answer, ' vs-ans' + hide);
    html += '</div>';
    return html;
  }

  function renderVertNote() {
    renderVert();
  }

  function renderVert() {
    const list = $('#vertList');
    list.innerHTML = '';
    const items = state.vert.items;
    $('#vertPrintTitle').textContent = items.length
      ? BOOKS[state.bookId].label + ' · 竖式计算（' + items.length + ' 题） 姓名：__________ 日期：__________'
      : '';
    if (!items.length) {
      const has = BOOKS[state.bookId].vertical.length > 0;
      list.innerHTML = '<div class="empty">' + (has ? '点「出题」生成一套竖式练习题，建议打印出来在纸上计算。' : '本册没有竖式题型，切到其他册次或改用口算卡 / 应用题。') + '</div>';
      state.vert.shown = false;
      $('#vertToggle').textContent = '显示答案';
      return;
    }
    items.forEach((v, i) => {
      const div = document.createElement('div');
      div.className = 'q-item';
      div.innerHTML = '<div class="q-index">' + (i + 1) + '</div><div class="group-tag">' + v.group + '</div>' + vsHtml(v);
      list.appendChild(div);
    });
  }

  function initVert() {
    $('#vertCount').addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      state.vert.n = Number(b.dataset.n);
      $('#vertCount').querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    });
    $('#vertStart').addEventListener('click', () => {
      state.vert.shown = false;
      state.vert.items = buildVert(state.vert.n);
      $('#vertToggle').textContent = '显示答案';
      renderVert();
    });
    $('#vertToggle').addEventListener('click', () => {
      state.vert.shown = !state.vert.shown;
      $('#vertToggle').textContent = state.vert.shown ? '隐藏答案' : '显示答案';
      renderVert();
    });
    $('#vertPrint').addEventListener('click', () => {
      const was = state.vert.shown;
      state.vert.shown = false;
      renderVert();
      window.print();
      state.vert.shown = was;
      renderVert();
    });
  }

  /* ============================ 应用题 ============================ */
  function loadWord(cb) {
    const id = state.bookId;
    if (window.DRILL_WORD && window.DRILL_WORD[id]) return cb(window.DRILL_WORD[id]);
    if (state.word.loading) return;
    state.word.loading = true;
    const s = document.createElement('script');
    s.src = 'data/word/' + id + '.js';
    s.onload = () => {
      state.word.loading = false;
      cb((window.DRILL_WORD || {})[id] || null);
    };
    s.onerror = () => {
      state.word.loading = false;
      cb(null);
    };
    document.head.appendChild(s);
  }

  function wordCard(it, i, showAnswer) {
    const diff = it.diff ? '<span class="word-diff">' + '★'.repeat(it.diff) + '</span>' : '';
    const point = it.point ? '<span class="word-point">' + it.point + '</span>' : '';
    return '<div class="word-item">' +
      '<div class="word-head"><span class="word-no">第 ' + (i + 1) + ' 题</span>' + point + diff + '</div>' +
      '<div class="word-q">' + it.q + '</div>' +
      '<button class="word-toggle" type="button">' + (showAnswer ? '收起答案' : '看答案与解析') + '</button>' +
      '<div class="word-a"' + (showAnswer ? '' : ' hidden') + '>' +
      '<div class="ans">答案：' + it.a + '</div>' +
      (it.why ? '<div class="why">解析：' + it.why + '</div>' : '') +
      '</div></div>';
  }

  function renderWord() {
    const list = $('#wordList');
    const note = $('#wordNote');
    note.textContent = '应用题按册整理，做完先自己想一想，再点「看答案与解析」核对。';
    list.innerHTML = '<div class="empty">正在加载本册应用题…</div>';
    $('#wordCount').textContent = '';
    $('#wordPrintTitle').textContent = '';
    state.word.items = [];

    loadWord((items) => {
      if (!items || !items.length) {
        list.innerHTML = '<div class="empty">本册应用题题库还没整理好，可以先练口算卡和竖式。</div>';
        return;
      }
      state.word.items = items;
      drawWord();
    });
  }

  function drawWord() {
    const items = state.word.items;
    const list = $('#wordList');
    list.innerHTML = items.map((it, i) => wordCard(it, i, state.word.shownAll)).join('');
    $('#wordCount').textContent = '共 ' + items.length + ' 题';
    $('#wordPrintTitle').textContent = BOOKS[state.bookId].label + ' · 应用题专项（' + items.length + ' 题） 姓名：__________ 日期：__________';
    list.querySelectorAll('.word-toggle').forEach((btn, i) => {
      btn.addEventListener('click', () => {
        const box = list.querySelectorAll('.word-a')[i];
        const open = box.hidden;
        box.hidden = !open;
        btn.textContent = open ? '收起答案' : '看答案与解析';
      });
    });
  }

  function initWord() {
    $('#wordAll').addEventListener('click', () => {
      state.word.shownAll = true;
      drawWord();
    });
    $('#wordNone').addEventListener('click', () => {
      state.word.shownAll = false;
      drawWord();
    });
    $('#wordRandom').addEventListener('click', () => {
      const all = window.DRILL_WORD ? window.DRILL_WORD[state.bookId] : null;
      if (!all || !all.length) { renderWord(); return; }
      const n = Math.min(10, all.length);
      const arr = all.slice();
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      state.word.items = arr.slice(0, n);
      state.word.shownAll = false;
      drawWord();
    });
    $('#wordPrint').addEventListener('click', () => {
      const was = state.word.shownAll;
      state.word.shownAll = false;
      drawWord();
      window.print();
      state.word.shownAll = was;
      drawWord();
    });
  }

  /* ============================ 启动 ============================ */
  document.addEventListener('DOMContentLoaded', () => {
    initBooks();
    initTabs();
    updateNotes();
    initOral();
    initVert();
    initWord();
    renderOral();
    renderVert();
  });
})();
