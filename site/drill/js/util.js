/* ============================================================
 * 数学小教室 · 题型专项 · 公共工具
 *  - 随机数 / 有理数（分数）运算 / 各种出题器
 *  出题器统一返回：{ expr, answer, options? , kind }
 *    expr   题面（字符串，如 "23+45"、"3/4×8"）
 *    answer 标准答案（字符串，整数/小数用 "12.5"，分数用 "3/4" 或 "1又3/8"）
 *    options 可选，给了就渲染成选择题（分数答案时用）
 * ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 随机 ---------- */
  function int(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  /** 不重复地生成 n 道题（make 可能重复，最多尝试 40 轮） */
  function unique(n, make) {
    const out = [], seen = new Set();
    for (let t = 0; t < n * 40 && out.length < n; t++) {
      const q = make();
      const key = q.expr + '|' + q.answer;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(q);
    }
    while (out.length < n) out.push(make());
    return out;
  }

  /* ---------- 有理数（分数）---------- */
  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  function F(n, d) { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d); return { n: n / g, d: d / g }; }
  const fadd = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
  const fsub = (a, b) => F(a.n * b.d - b.n * a.d, a.d * b.d);
  const fmul = (a, b) => F(a.n * b.n, a.d * b.d);
  const fdiv = (a, b) => F(a.n * b.d, a.d * b.n);
  /** 分数显示：整数 / 真分数 "3/4" / 带分数 "1又3/8" */
  function fstr(f) {
    if (f.d === 1) return String(f.n);
    if (Math.abs(f.n) > f.d) {
      const sign = f.n < 0 ? '-' : '';
      const abs = Math.abs(f.n), w = Math.floor(abs / f.d), r = abs - w * f.d;
      return r === 0 ? sign + w : sign + w + '又' + r + '/' + f.d;
    }
    return f.n + '/' + f.d;
  }
  /** 算式里的分数写法：3/4、1又3/8 都支持解析 */
  function parseFraction(s) {
    s = String(s).trim().replace(/／/g, '/');
    const m = /^(-?)(\d+)又(\d+)\/(\d+)$/.exec(s);
    if (m) { const w = Number(m[2]), n = Number(m[3]), d = Number(m[4]); return F((m[1] === '-' ? -1 : 1) * (w * d + n), d); }
    const m2 = /^(-?\d+)\/(\d+)$/.exec(s);
    if (m2) return F(Number(m2[1]), Number(m2[2]));
    return null;
  }

  /* ---------- 答案标准化 / 比较 ---------- */
  function toNumber(s) {
    s = String(s).trim().replace(/[，,]/g, '').replace(/／/g, '/');
    if (!s) return NaN;
    const f = parseFraction(s);
    if (f) return f.n / f.d;
    return Number(s);
  }
  function sameAnswer(input, answer) {
    const a = toNumber(input), b = toNumber(answer);
    if (Number.isNaN(a) || Number.isNaN(b)) return false;
    return Math.abs(a - b) < 1e-9;
  }

  /* ---------- 数值格式化（避免 0.30000000000000004）---------- */
  function num(x, digits) {
    const r = Number(Number(x).toFixed(digits === undefined ? 6 : digits));
    return String(r);
  }

  /* ---------- 中文数字（亿以内，用于“读作”）---------- */
  const DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const UNITS = ['', '十', '百', '千'];
  function section(n) { // 0 ~ 9999
    let s = '', zero = false;
    for (let i = 0; i < 4; i++) {
      const d = Math.floor(n / Math.pow(10, 3 - i)) % 10;
      if (d === 0) { zero = true; continue; }
      if (zero && s) s += '零';
      zero = false;
      if (!(i === 2 && d === 1 && s === '')) s += DIGITS[d];   // 十五，不写“一十五”
      s += UNITS[3 - i];
    }
    return s;
  }
  function numToChinese(n) {
    n = Math.floor(n);
    if (n === 0) return '零';
    const yi = Math.floor(n / 100000000);
    const wan = Math.floor(n / 10000) % 10000;
    const rest = n % 10000;
    let s = '';
    if (yi) s += section(yi) + '亿';
    if (wan) { if (s && wan < 1000) s += '零'; s += section(wan) + '万'; }
    if (rest) { if (s && rest < 1000) s += '零'; s += section(rest); }
    return s;
  }

  /* ---------- 选择题辅助：由正确答案生成干扰项 ---------- */
  function choice(answer, wrongs) {
    const opts = [answer].concat(wrongs.filter((w) => String(w) !== String(answer)));
    const uniq = [];
    for (const o of opts) if (!uniq.some((u) => String(u) === String(o))) uniq.push(String(o));
    return shuffle(uniq);
  }

  /* ============================================================
   * 出题器
   * ============================================================ */
  const G = {
    /* --- 整数四则 --- */
    add(a, b) { return { expr: a + '+' + b, answer: String(a + b) }; },
    sub(a, b) { return { expr: a + '-' + b, answer: String(a - b) }; },
    mul(a, b) { return { expr: a + '×' + b, answer: String(a * b) }; },
    div(a, b) {
      const q = Math.floor(a / b), r = a % b;
      if (r === 0) return { expr: a + '÷' + b, answer: String(q) };
      return { expr: a + '÷' + b, answer: q + '余' + r };
    },
    /** 生成 a+b（可控制是否进位/退位、位数范围） */
    addWith(min, max, carry) {
      for (let t = 0; t < 200; t++) {
        const a = int(min, max), b = int(min, max);
        const hasCarry = (a % 10) + (b % 10) >= 10;
        if (carry === undefined || hasCarry === carry) return G.add(a, b);
      }
      return G.add(int(min, max), int(min, max));
    },
    subWith(min, max, borrow) {
      for (let t = 0; t < 200; t++) {
        let a = int(min, max), b = int(min, max);
        if (a < b) { const t2 = a; a = b; b = t2; }
        if (a === b) continue;
        const hasBorrow = (a % 10) < (b % 10);
        if (borrow === undefined || hasBorrow === borrow) return G.sub(a, b);
      }
      return G.sub(int(min, max) + 1, int(min, max));
    },
    /** a×b 且因数含 0（末尾或中间） */
    mulWithZero(digits) {
      const a = digits <= 2 ? int(11, 99) : int(101, 999);
      const b = int(2, 9);
      const withZero = pick(['mid', 'end']);
      if (withZero === 'mid') {
        const mid = int(1, 9), tail = int(1, 9);
        const num2 = a >= 100 ? Number(mid + '0' + tail) : Number(mid + '0');
        return G.mul(num2, b);
      }
      const base = a >= 100 ? int(11, 99) * 10 : int(11, 49) * 10;
      return G.mul(base, b);
    },

    /* --- 小数 --- */
    decAdd(min, max, digits) {
      const f = Math.pow(10, digits);
      const a = int(min * f, max * f) / f, b = int(min * f, max * f) / f;
      return { expr: num(a) + '+' + num(b), answer: num(a + b) };
    },
    decSub(min, max, digits) {
      const f = Math.pow(10, digits);
      let a = int(min * f, max * f) / f, b = int(min * f, max * f) / f;
      if (a < b) { const t = a; a = b; b = t; }
      return { expr: num(a) + '-' + num(b), answer: num(a - b) };
    },
    decMul(a, b) { return { expr: num(a) + '×' + num(b), answer: num(a * b) }; },
    decDiv(a, b) { return { expr: num(a) + '÷' + num(b), answer: num(a / b) }; },

    /* --- 分数（答案用分数表示，渲染成选择题，避免输入格式麻烦）--- */
    /**
     * 分数题的干扰项：先放“常见错误算法”，不够 3 个再用数值扰动补齐，
     * 保证 3 个干扰项互不重复、也都不是正确答案。
     */
    fracWrongs(ans, variants) {
      const wrongs = [];
      const push = (f) => {
        if (!f || !Number.isFinite(f.n) || !Number.isFinite(f.d) || f.d <= 0) return;
        const s = fstr(f);
        if (s !== fstr(ans) && !wrongs.includes(s)) wrongs.push(s);
      };
      variants.forEach(push);
      let k = 1;
      while (wrongs.length < 3 && k < 80) {
        push(F(ans.n + k, ans.d));
        push(F(ans.n, ans.d + k));
        push(F(ans.n + k, ans.d + k));
        push(F(ans.n * 2, ans.d));
        k++;
      }
      return wrongs.slice(0, 3);
    },
    fracAdd(a, b) {
      const r = fadd(a, b);
      // 常见错误：分子分母都相加；把分母也加起来后约分；漏写分母
      const wrongs = G.fracWrongs(r, [F(a.n + b.n, a.d + b.d), F(a.n + b.n, b.d), F(a.n, a.d + b.d)]);
      return { expr: fstr(a) + '＋' + fstr(b), answer: fstr(r), options: choice(fstr(r), wrongs) };
    },
    fracSub(a, b) {
      const r = fsub(a, b);
      const wrongs = G.fracWrongs(r, [F(a.n - b.n, a.d - b.d), F(a.n - b.n, b.d), F(a.n - b.n, a.d + b.d)]);
      return { expr: fstr(a) + '－' + fstr(b), answer: fstr(r), options: choice(fstr(r), wrongs) };
    },
    fracMul(a, b) {
      const r = fmul(a, b);
      // 常见错误：分母也相乘后不约分、分子分母交叉相乘（当成除法）、把乘法当加法
      const wrongs = G.fracWrongs(r, [F(a.n * b.n, a.d * b.d * r.d), F(a.n * b.d, a.d * b.n), fadd(a, b)]);
      return { expr: fstr(a) + '×' + fstr(b), answer: fstr(r), options: choice(fstr(r), wrongs) };
    },
    fracDiv(a, b) {
      const r = fdiv(a, b);
      const wrongs = G.fracWrongs(r, [F(a.n * b.n, a.d * b.d), F(a.d * b.d, a.n * b.n), fsub(a, b)]);
      return { expr: fstr(a) + '÷' + fstr(b), answer: fstr(r), options: choice(fstr(r), wrongs) };
    },
    /** 分数的倒数、化简等 */
    reciprocal(a) { return { expr: fstr(a) + '的倒数', answer: fstr(F(a.d, a.n)) }; },

    /* --- 混合运算（脱式）--- */
    mixed(min, max) {
      const a = int(min, max), b = int(min, max), c = int(min, max);
      const form = int(1, 3);
      if (form === 1) return { expr: a + '+' + b + '×' + c, answer: String(a + b * c) };
      if (form === 2) return { expr: a + '×' + b + '-' + c, answer: String(a * b - c) };
      return { expr: '(' + a + '+' + b + ')×' + c, answer: String((a + b) * c) };
    },

    /* --- 单位换算 --- */
    unitConvert() {
      const table = [
        { from: '米', to: '厘米', k: 100, min: 1, max: 9 },
        { from: '千米', to: '米', k: 1000, min: 1, max: 9 },
        { from: '千克', to: '克', k: 1000, min: 1, max: 9 },
        { from: '吨', to: '千克', k: 1000, min: 1, max: 9 },
        { from: '平方米', to: '平方分米', k: 100, min: 1, max: 99 },
        { from: '平方米', to: '平方厘米', k: 10000, min: 1, max: 9 },
        { from: '公顷', to: '平方米', k: 10000, min: 1, max: 9 },
        { from: '立方分米', to: '立方厘米', k: 1000, min: 1, max: 9 },
        { from: '时', to: '分', k: 60, min: 1, max: 9 },
        { from: '分', to: '秒', k: 60, min: 1, max: 9 },
        { from: '升', to: '毫升', k: 1000, min: 1, max: 9 },
      ];
      const t = pick(table);
      const x = int(t.min, t.max);
      return { expr: x + t.from + '=' + t.to, answer: String(x * t.k), unit: t.to };
    },
  };

  /* ---------- 竖式题（供竖式排版使用）---------- */
  const V = {
    /** 加法：{a,b,op:'+'} */
    add(min, max, carry) {
      for (let t = 0; t < 300; t++) {
        const a = int(min, max), b = int(min, max);
        const cs = (a % 10) + (b % 10) >= 10;
        if (carry === undefined || cs === carry) return { a: String(a), b: String(b), op: '+', answer: String(a + b) };
      }
      const a = int(min, max), b = int(min, max);
      return { a: String(a), b: String(b), op: '+', answer: String(a + b) };
    },
    sub(min, max, borrow) {
      for (let t = 0; t < 300; t++) {
        let a = int(min, max), b = int(min, max);
        if (a <= b) continue;
        const bs = (a % 10) < (b % 10);
        if (borrow === undefined || bs === borrow) return { a: String(a), b: String(b), op: '-', answer: String(a - b) };
      }
      const a = int(min, max) + 100, b = int(min, max);
      return { a: String(a), b: String(b), op: '-', answer: String(a - b) };
    },
    mul(a, b) { return { a: String(a), b: String(b), op: '×', answer: String(a * b) }; },
    div(a, b) {
      return { a: String(a), b: String(b), op: '÷', answer: String(Math.floor(a / b)), remainder: String(a % b) };
    },
    decAdd(min, max, digits) {
      const f = Math.pow(10, digits);
      const a = int(min * f, max * f) / f, b = int(min * f, max * f) / f;
      return { a: num(a), b: num(b), op: '+', answer: num(a + b), decimal: true };
    },
    decSub(min, max, digits) {
      const f = Math.pow(10, digits);
      let a = int(min * f, max * f) / f, b = int(min * f, max * f) / f;
      if (a < b) { const t = a; a = b; b = t; }
      return { a: num(a), b: num(b), op: '-', answer: num(a - b), decimal: true };
    },
    decMul(a, b) { return { a: num(a), b: num(b), op: '×', answer: num(a * b), decimal: true }; },
    decDiv(a, b) { return { a: num(a), b: num(b), op: '÷', answer: num(a / b), decimal: true }; },
  };

  global.DRILL_UTIL = {
    int, pick, shuffle, unique, gcd, F, fadd, fsub, fmul, fdiv, fstr,
    parseFraction, toNumber, sameAnswer, num, numToChinese, choice, G, V,
  };
})(typeof window !== 'undefined' ? window : globalThis);
