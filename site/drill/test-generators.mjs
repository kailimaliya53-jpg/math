#!/usr/bin/env node
/**
 * 校验题型专项的出题器：site/drill/js/books.js
 *
 * 用独立实现的“分数/小数表达式求值器”核对每道题的 expr 与 answer 是否一致，
 * 并检查选项、竖式等式、余数范围等。用法：
 *   node site/drill/test-generators.mjs [每档样本数]
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const N = Number(process.argv[2] || 300);

/* ---------- 加载被测代码 ---------- */
const sandbox = { console, Math };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const f of ['js/util.js', 'js/books.js']) {
  vm.runInContext(fs.readFileSync(path.join(HERE, f), 'utf8'), sandbox, { filename: f });
}
const U = sandbox.DRILL_UTIL;
const BOOKS = sandbox.DRILL_BOOKS;

/* ---------- 独立实现的分数运算 ---------- */
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
function fr(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
const add = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const mul = (a, b) => fr(a.n * b.n, a.d * b.d);
const div = (a, b) => fr(a.n * b.d, a.d * b.n);

function parseNum(t) {
  let m = /^(\d+)又(\d+)\/(\d+)$/.exec(t);
  if (m) return fr(Number(m[1]) * Number(m[3]) + Number(m[2]), Number(m[3]));
  m = /^(\d+)\/(\d+)$/.exec(t);
  if (m) return fr(Number(m[1]), Number(m[2]));
  m = /^(\d+)\.(\d+)$/.exec(t);
  if (m) return fr(Number(m[1] + m[2]), Math.pow(10, m[2].length));
  return fr(Number(t), 1);
}

function tokenize(src) {
  const s = String(src)
    .replace(/[（）]/g, (c) => (c === '（' ? '(' : ')'))
    .replace(/＋/g, '+').replace(/－/g, '-')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/×/g, '*').replace(/÷/g, '/')
    .replace(/\s+/g, '');
  const tokens = [];
  let i = 0;
  const numRe = /^(\d+又\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)/;
  while (i < s.length) {
    const m = numRe.exec(s.slice(i));
    if (m) { tokens.push({ t: 'num', v: parseNum(m[1]) }); i += m[1].length; continue; }
    const c = s[i];
    if ('+-*/()^'.includes(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
    return null;                       // 含中文说明等，无法直接求值
  }
  return tokens;
}

function evaluate(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  function factor() {
    const tk = peek();
    if (!tk) return null;
    if (tk.t === 'op' && tk.v === '-') { pos++; const v = factor(); return v && mul(fr(-1, 1), v); }
    if (tk.t === 'num') {
      pos++;
      let v = tk.v;
      while (peek() && peek().t === 'op' && peek().v === '^') {
        pos++;
        const e = Number((tokens[pos++] || { v: fr(2, 1) }).v.n);
        let r = fr(1, 1);
        for (let k = 0; k < e; k++) r = mul(r, v);
        v = r;
      }
      return v;
    }
    if (tk.t === 'op' && (tk.v === '(' || tk.v === '+')) { pos++; const v = expr(); if (peek() && peek().v === ')') pos++; return v; }
    return null;
  }
  function term() {
    let v = factor();
    while (v && peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/')) {
      const op = tokens[pos++].v;
      const r = factor();
      if (!r) return null;
      v = op === '*' ? mul(v, r) : div(v, r);
    }
    return v;
  }
  function expr() {
    let v = term();
    while (v && peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = tokens[pos++].v;
      const r = term();
      if (!r) return null;
      v = op === '+' ? add(v, r) : (() => fr(v.n * r.d - r.n * v.d, v.d * r.d))();
    }
    return v;
  }
  const v = expr();
  if (!v || pos !== tokens.length) return null;
  return v.n / v.d;
}

/* ---------- 工具 ---------- */
const SKIP = /读作|写作|万|≈|:|\?|？/;          // 这些题的答案不是算式结果（“周长：…”等标签会先被剥掉）
const close = (a, b) => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b));
const isNum = (s) => s !== '' && !/NaN|undefined|Infinity/.test(String(s));
const answerValue = (s) => {
  const f = U.parseFraction(s);
  if (f) return f.n / f.d;
  return Number(s);
};

const problems = [];
const stats = [];
for (const [id, book] of Object.entries(BOOKS)) {
  let checked = 0, skipped = 0;
  for (const gen of book.oral) {
    for (let i = 0; i < N; i++) {
      const q = gen.make();
      const where = `${id} · ${gen.name}`;
      if (!q || typeof q.expr !== 'string' || !q.expr) { problems.push(`${where}: expr 非法 ${JSON.stringify(q)}`); continue; }
      if (!isNum(q.answer)) problems.push(`${where}: answer 非法 "${q.answer}"（题面 ${q.expr}）`);
      if (q.options) {
        if (!Array.isArray(q.options) || q.options.length !== 4) problems.push(`${where}: 选项不是 4 个（${q.expr}）`);
        else {
          if (new Set(q.options).size !== q.options.length) problems.push(`${where}: 选项重复（${q.expr} → ${q.options}）`);
          if (!q.options.includes(q.answer)) problems.push(`${where}: 选项里没有正确答案（${q.expr} → ${q.answer}）`);
          if (q.options.some((o) => !isNum(o))) problems.push(`${where}: 选项含非法值（${q.expr} → ${q.options}）`);
        }
      }
      if (SKIP.test(q.expr)) { skipped++; continue; }
      // 有余数：核对 被除数 = 除数×商 + 余数
      const m = /^(\d+)÷(\d+)$/.exec(q.expr.replace(/＋/g, '+'));
      if (/余/.test(q.answer)) {
        const mm = /^(\d+)余(\d+)$/.exec(q.answer);
        if (!m || !mm) { problems.push(`${where}: 余数题格式异常（${q.expr} → ${q.answer}）`); continue; }
        const a = Number(m[1]), b = Number(m[2]), qq = Number(mm[1]), r = Number(mm[2]);
        if (a !== b * qq + r || r <= 0 || r >= b) problems.push(`${where}: 余数错误 ${a}÷${b} → ${q.answer}`);
        checked++;
        continue;
      }
      const tokens = (() => {
        // 去掉“周长：”“底2×高4（…）”这类文字标签后再求值
        const clean = q.expr
          .replace(/^[^：]*：/, '')
          .replace(/又/g, '#')                       // 带分数里的“又”要保留
          .replace(/[\u4e00-\u9fa5]/g, '')
          .replace(/#/g, '又')
          .replace(/%/g, '/100')
          .replace(/（\s*）/g, '');
        return tokenize(clean);
      })();
      if (tokens === null) { skipped++; continue; }
      const got = evaluate(tokens);
      if (got === null) { skipped++; continue; }
      const want = answerValue(q.answer);
      if (Number.isNaN(want) || !close(got, want)) problems.push(`${where}: 算错 "${q.expr}" 应为 ${want}，答案写的是 ${q.answer}`);
      checked++;
    }
  }
  for (const gen of book.vertical) {
    for (let i = 0; i < N; i++) {
      const v = gen.make();
      const where = `${id} · 竖式·${gen.name}`;
      const a = Number(v.a), b = Number(v.b), ans = Number(v.answer);
      if (![a, b, ans].every((x) => Number.isFinite(x))) { problems.push(`${where}: 数值非法 ${JSON.stringify(v)}`); continue; }
      if (v.op === '+') { if (!close(a + b, ans)) problems.push(`${where}: ${a}+${b} 答案写成 ${v.answer}`); }
      else if (v.op === '-') {
        if (!close(a - b, ans)) problems.push(`${where}: ${a}-${b} 答案写成 ${v.answer}`);
        if (a < b) problems.push(`${where}: 减法出现小数减大数 ${a}-${b}`);
      } else if (v.op === '×') { if (!close(a * b, ans)) problems.push(`${where}: ${a}×${b} 答案写成 ${v.answer}`); }
      else if (v.op === '÷') {
        const r = Number(v.remainder || 0);
        if (!close(b * ans + r, a)) problems.push(`${where}: ${a}÷${b} 答案写成 ${v.answer}余${v.remainder}`);
        if (r < 0 || r >= b) problems.push(`${where}: ${a}÷${b} 余数超范围 ${v.remainder}`);
      } else problems.push(`${where}: 未知运算符 ${v.op}`);
      if (/NaN|undefined|Infinity/.test(String(v.a) + String(v.b) + String(v.answer))) problems.push(`${where}: 含非法数值 ${JSON.stringify(v)}`);
    }
  }
  stats.push(`${id.padEnd(12)} 口算 ${String(checked).padStart(4)} 题已核对${skipped ? `（${skipped} 题含文字说明跳过）` : ''}，竖式 ${book.vertical.reduce((s, g) => s + N, 0)} 题`);
}

console.log(stats.join('\n'));
if (problems.length) {
  console.log(`\n❌ 发现 ${problems.length} 个问题：`);
  [...new Set(problems)].slice(0, 40).forEach((p) => console.log('  ✗ ' + p));
  if (new Set(problems).size > 40) console.log(`  ... 另有 ${new Set(problems).size - 40} 类`);
  process.exit(1);
}
console.log('\n✅ 全部出题器核对通过');
