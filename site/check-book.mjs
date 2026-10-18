#!/usr/bin/env node
/**
 * 校验某一册的知识点数据文件（site/<moduleDir>/js/wordData.js）
 *
 * 用法：
 *   node site/check-book.mjs grade3-up        # 校验一册
 *   node site/check-book.mjs --all            # 校验全部
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const HERE = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const books = JSON.parse(fs.readFileSync(path.join(HERE, 'books.json'), 'utf8'));

function loadWordRoots(file) {
  const src = fs.readFileSync(file, 'utf8');
  // 去掉可能的 BOM / 顶层注释，交给 Function 求值
  const fn = new Function(src + '\n return typeof WordRoots !== "undefined" ? WordRoots : null;');
  return fn();
}

function checkOne(book) {
  const errors = [];
  const warns = [];
  const file = path.join(ROOT, book.moduleDir, 'js', 'wordData.js');
  if (!fs.existsSync(file)) return { book, errors: ['缺少文件 ' + file], warns };

  let roots;
  try {
    roots = loadWordRoots(file);
  } catch (e) {
    return { book, errors: ['wordData.js 语法错误：' + e.message], warns };
  }
  if (!Array.isArray(roots)) return { book, errors: ['未找到 WordRoots 数组'], warns };

  const n = roots.length;
  const target = book.itemCount;
  if (!book.existing) {
    if (n < target - 2 || n > target + 2) errors.push(`条目数 ${n} 与预期 ${target} 偏差超过 ±2`);
  }

  const chapterNames = new Map(book.chapters.map((c) => [c.no, c.name]));
  const perChapter = {};

  roots.forEach((r, i) => {
    const tag = `#${i + 1}(${r && r.root})`;
    if (!r || typeof r !== 'object') return errors.push(`${tag} 不是对象`);
    if (r.id !== i + 1) errors.push(`${tag} id 应为 ${i + 1}，实际 ${r.id}`);
    if (!r.root) errors.push(`${tag} 缺少 root`);
    if (typeof r.root === 'string' && r.root.length > 24) warns.push(`${tag} root 偏长（${r.root.length} 字）`);
    if (!r.meaning) errors.push(`${tag} 缺少 meaning`);
    else if (r.meaning.length > 60) warns.push(`${tag} meaning 偏长`);
    if (!r.description || r.description.length < 100) errors.push(`${tag} description 太短或缺失`);
    else if (r.description.length > 700) warns.push(`${tag} description 偏长（${r.description.length} 字）`);

    const m = /^第(\d+)章\s*(.+)$/.exec(r.origin || '');
    if (!m) errors.push(`${tag} origin 格式应为 "第X章 章节名"，实际 ${JSON.stringify(r.origin)}`);
    else {
      const no = Number(m[1]);
      const name = m[2].trim();
      if (!chapterNames.has(no)) errors.push(`${tag} 章号 ${no} 不存在`);
      else if (chapterNames.get(no) !== name) errors.push(`${tag} 章节名不匹配：应为 "${chapterNames.get(no)}"，实际 "${name}"`);
      perChapter[no] = (perChapter[no] || 0) + 1;
    }

    if (!Array.isArray(r.examples) || r.examples.length < 3) errors.push(`${tag} examples 至少 3 个`);
    else r.examples.forEach((e, j) => {
      if (!e || !e.word || !e.meaning || !e.explanation) errors.push(`${tag} 例${j + 1} 字段不完整`);
      else if (!e.breakdown || e.breakdown.root !== r.root) warns.push(`${tag} 例${j + 1} breakdown.root 与 root 不一致`);
    });

    const q = r.quiz;
    if (!q || !q.question || !Array.isArray(q.options)) errors.push(`${tag} quiz 字段不完整`);
    else {
      if (q.options.length !== 4) errors.push(`${tag} quiz 选项应为 4 个，实际 ${q.options.length}`);
      const uniq = new Set(q.options.map((o) => String(o).trim()));
      if (uniq.size !== q.options.length) errors.push(`${tag} quiz 选项有重复`);
      if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer > 3) errors.push(`${tag} quiz.correctAnswer 非法`);
      const joined = q.options.join('|');
      if (/以上都|都对|本题答案|TBD|TODO/.test(joined + q.question)) errors.push(`${tag} quiz 有敷衍/占位选项`);
    }
    if (/TODO|待补|占位|xxx/i.test(JSON.stringify(r))) errors.push(`${tag} 含占位文本`);
  });

  // 章节覆盖
  for (const c of book.chapters) {
    if (!perChapter[c.no]) errors.push(`第${c.no}章「${c.name}」没有任何知识点`);
  }
  // 知识点标题覆盖（宽松：标题去掉标点后需出现在某个 root 里，或反之）
  if (book.points) {
    const norm = (s) => s.replace(/[（）()、，,。：:\s]/g, '');
    const rootsNorm = roots.map((r) => norm(r.root || ''));
    for (const p of book.points) {
      const t = norm(p.title);
      const hit = rootsNorm.some((rn) => rn.includes(t) || t.includes(rn));
      if (!hit) warns.push(`知识点「${p.title}」未找到对应条目（可能被改写或合并）`);
    }
  }
  return { book, count: n, perChapter, errors, warns };
}

const arg = process.argv[2];
if (!arg) {
  console.error('用法: node site/check-book.mjs <book-id> | --all');
  process.exit(2);
}
const targets = arg === '--all' ? books.books : books.books.filter((b) => b.id === arg);
if (!targets.length) {
  console.error('❌ books.json 里没有 ' + arg);
  process.exit(2);
}

let bad = 0;
for (const b of targets) {
  const { errors, warns, count, perChapter } = checkOne(b);
  const label = `${b.grade}${b.term}`;
  if (errors.length) {
    bad++;
    console.log(`❌ ${b.id} (${label}) 条目 ${count ?? '-'} —— ${errors.length} 个错误`);
    errors.slice(0, 12).forEach((e) => console.log('   ✗ ' + e));
    if (errors.length > 12) console.log(`   ... 另有 ${errors.length - 12} 个`);
  } else {
    console.log(`✅ ${b.id} (${label}) 条目 ${count}，章节分布 ${JSON.stringify(perChapter)}`);
  }
  warns.slice(0, 6).forEach((w) => console.log('   ! ' + w));
  if (warns.length > 6) console.log(`   ... 另有 ${warns.length - 6} 条提醒`);
}
process.exit(bad ? 1 : 0);
