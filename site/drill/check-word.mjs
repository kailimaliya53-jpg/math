#!/usr/bin/env node
/**
 * 校验应用题题库：site/drill/data/word/<册>.js
 *
 * 除了结构检查，还会把答案/解析里写的算式（形如 24+12=36、3.14×2²=12.56）
 * 逐个算一遍，确认等式成立——应用题难度高，靠人眼容易漏。
 *
 * 用法：node site/drill/check-word.mjs grade3-up | --all
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data', 'word');
const books = JSON.parse(fs.readFileSync(path.join(HERE, '..', 'books.json'), 'utf8'));

function loadBook(id) {
  const file = path.join(DATA, id + '.js');
  if (!fs.existsSync(file)) return { missing: true };
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  try {
    vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file });
  } catch (e) {
    return { error: 'JS 语法错误：' + e.message };
  }
  return { items: (sandbox.DRILL_WORD || {})[id] };
}

/** 把算式左边算出来（只允许数字和 + - * / ( ) . 平时运算符） */
function evalExpr(left) {
  const s = left.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '');
  if (!/^[\d+\-*/().]+$/.test(s)) return null;
  try {
    const v = Function('"use strict";return (' + s + ')')();
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  } catch { return null; }
}

/** 找出文本里所有 "算式=结果"，逐个核对 */
function checkEquations(text) {
  const bad = [];
  let found = 0;
  const re = /([\d.]+(?:\s*[+\-×÷*/]\s*[\d.]+)+)\s*=\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(text))) {
    const got = evalExpr(m[1]);
    if (got === null) continue;
    const want = Number(m[2]);
    found++;
    if (Math.abs(got - want) > 1e-6 * Math.max(1, Math.abs(want))) bad.push(`${m[1]}=${m[2]}（实际 ${Number(got.toFixed(6))}）`);
  }
  return { found, bad };
}

const arg = process.argv[2];
if (!arg) { console.error('用法: node site/drill/check-word.mjs <book-id> | --all'); process.exit(2); }
const ids = arg === '--all' ? books.books.map((b) => b.id) : [arg];

let bad = 0;
for (const id of ids) {
  const book = books.books.find((b) => b.id === id);
  const label = book ? book.grade + book.term : id;
  const r = loadBook(id);
  if (r.missing) { console.log(`—  ${id} (${label}) 还没有应用题题库`); continue; }
  if (r.error) { bad++; console.log(`❌ ${id} (${label}) ${r.error}`); continue; }
  const items = r.items;
  if (!Array.isArray(items)) { bad++; console.log(`❌ ${id} (${label}) 未导出数组（应写 window.DRILL_WORD['${id}'] = [...]）`); continue; }

  const errors = [];
  const warns = [];
  if (items.length < 10) errors.push(`题量只有 ${items.length} 题（要求 ≥ 10）`);
  if (items.length > 20) warns.push(`题量 ${items.length} 题偏多`);
  const seen = new Set();
  const chapters = new Set();
  let eqTotal = 0;

  items.forEach((it, i) => {
    const tag = `第${i + 1}题`;
    if (!it || typeof it !== 'object') return errors.push(`${tag} 不是对象`);
    if (!it.q || typeof it.q !== 'string') errors.push(`${tag} 缺少 q（题目）`);
    else if (it.q.length < 8) errors.push(`${tag} 题目太短`);
    if (!it.a || typeof it.a !== 'string') errors.push(`${tag} 缺少 a（答案）`);
    if (!it.why || typeof it.why !== 'string') errors.push(`${tag} 缺少 why（解析）`);
    if (!it.point || typeof it.point !== 'string') errors.push(`${tag} 缺少 point（考点）`);
    if (![1, 2, 3].includes(it.diff)) errors.push(`${tag} diff 必须是 1/2/3`);
    if (seen.has(it.q)) errors.push(`${tag} 题目与前面的重复`);
    seen.add(it.q);
    if (/TODO|待补|占位|xxx/i.test(JSON.stringify(it))) errors.push(`${tag} 含占位文本`);
    if (it.q && it.q.length > 240) warns.push(`${tag} 题目偏长（${it.q.length} 字）`);
    if (it.point) chapters.add(it.point);

    const text = [it.a, it.why].join('　');
    const { found, bad: badEq } = checkEquations(text);
    eqTotal += found;
    badEq.forEach((e) => errors.push(`${tag} 算式不成立：${e}`));
    if (found === 0) errors.push(`${tag} 答案里没写算式（请写成「36 个（24+12=36）」这种形式，方便核对）`);
  });

  if (chapters.size < 5) warns.push(`考点只覆盖 ${chapters.size} 个，建议多覆盖几章`);

  if (errors.length) {
    bad++;
    console.log(`❌ ${id} (${label}) ${items.length} 题，核对算式 ${eqTotal} 个 —— ${errors.length} 个错误`);
    errors.slice(0, 12).forEach((e) => console.log('   ✗ ' + e));
    if (errors.length > 12) console.log(`   ... 另有 ${errors.length - 12} 个`);
  } else {
    console.log(`✅ ${id} (${label}) ${items.length} 题，考点 ${chapters.size} 个，核对算式 ${eqTotal} 个`);
  }
  warns.slice(0, 4).forEach((w) => console.log('   ! ' + w));
}
process.exit(bad ? 1 : 0);
