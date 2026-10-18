/* ============================================================
 * 数学小教室 · 题型专项 · 各册出题预设
 *
 * 每册三项：
 *   oral     口算卡出题器（n 是抽题权重，题量大时按比例循环）
 *   vertical 竖式出题器（返回 util 的 V.* 结构；空数组表示本册以口算/应用题为主）
 *   note     该册出题范围的一句话说明
 * ============================================================ */
(function (global) {
  'use strict';
  const U = global.DRILL_UTIL;
  const G = U.G, V = U.V, F = U.F;
  const int = U.int, pick = U.pick, num = U.num;

  /* 生成“商和余数”口算题：a ÷ b = q 余 r */
  function divWithRemainder(bMin, bMax, qMin, qMax, allowExact) {
    const b = int(bMin, bMax), q = int(qMin, qMax);
    const r = allowExact ? int(0, b - 1) : int(1, b - 1);
    return G.div(b * q + r, b);
  }

  /* 竖式除法：整除或有余数 */
  function vDiv(bMin, bMax, qMin, qMax, allowExact) {
    const b = int(bMin, bMax), q = int(qMin, qMax);
    const r = allowExact ? int(0, b - 1) : int(1, b - 1);
    return V.div(b * q + r, b);
  }

  /* 三数连加 / 连减 */
  function chainItem(max, step) {
    if (pick([0, 1]) === 0) {
      const a = int(2, max), b = int(1, step), c = int(1, step);
      return { expr: a + '＋' + b + '＋' + c, answer: String(a + b + c) };
    }
    const a = int(8, max + 6), b = int(1, step), c = int(1, step);
    return { expr: a + '－' + b + '－' + c, answer: String(a - b - c) };
  }

  /* 同分母分数加减（和小于 1，适合三上/五下入门） */
  function sameDenomFraction(denomMin, denomMax, allowSub) {
    const d = int(denomMin, denomMax);
    if (allowSub && pick([0, 1]) === 1) {
      const n1 = int(2, d - 1), n2 = int(1, n1 - 1);
      return G.fracSub(F(n1, d), F(n2, d));
    }
    const maxN = d - 1;
    const n1 = int(1, maxN - 1), n2 = int(1, maxN - n1);
    return G.fracAdd(F(n1, d), F(n2, d));
  }

  /* 异分母分数加减（分母互质或一方是另一方的倍数，结果可控） */
  function diffDenomFraction(mul) {
    const a = pick([2, 3, 4, 5, 6, 8]);
    const b = pick([2, 3, 4, 5, 6, 8].filter((x) => x !== a && x % a !== 0 && a % x !== 0));
    const n1 = int(1, a - 1), n2 = int(1, b - 1);
    if (mul && pick([0, 1]) === 1) {
      if (pick([0, 1]) === 0) return G.fracMul(F(n1, a), F(n2, b));
      return G.fracDiv(F(n1, a), F(n2, b));
    }
    return pick([0, 1]) === 0 ? G.fracAdd(F(n1, a), F(n2, b)) : G.fracSub(F(Math.max(n1, n2), a), F(Math.min(n1, n2), b));
  }

  /* 亿以内数的读写与近似数 */
  function bigNumberItem() {
    const kind = pick(['read', 'write', 'round']);
    if (kind === 'read') {
      const n = int(1001, 99999);
      return { expr: n + ' 读作', answer: U.numToChinese(n) };
    }
    if (kind === 'write') {
      const w = int(1, 99), r = int(1, 9999);
      return { expr: w + '万' + r + ' 写作', answer: String(w * 10000 + r) };
    }
    const n = int(1001, 99999);
    return { expr: n + ' 省略万位后面的尾数约是多少', answer: String(Math.round(n / 10000) * 10000) };
  }

  const B = {};

  /* ================= 一年级上册 ================= */
  B['grade1-up'] = {
    label: '一年级上册',
    note: '10 以内的加减法、20 以内的进位加法，都是最基础的凑十练习。',
    oral: [
      { name: '10 以内加法', n: 4, make: () => { const a = int(1, 9); return G.add(a, int(1, 10 - a)); } },
      { name: '10 以内减法', n: 4, make: () => { const a = int(2, 10); return G.sub(a, int(1, a)); } },
      { name: '20 以内进位加法（凑十法）', n: 4, make: () => { const a = int(6, 9); return G.add(a, int(11 - a, 9)); } },
      { name: '连加连减', n: 2, make: () => chainItem(6, 3) },
    ],
    vertical: [],
  };

  /* ================= 一年级下册 ================= */
  B['grade1-down'] = {
    label: '一年级下册',
    note: '20 以内退位减法、100 以内加减法（开始学写竖式）。',
    oral: [
      { name: '20 以内退位减法', n: 4, make: () => { const a = int(11, 18); return G.sub(a, int(a % 10 + 1, 9)); } },
      { name: '整十数加减整十数', n: 2, make: () => { const a = int(1, 9) * 10, b = int(1, 9) * 10; return pick([0, 1]) ? G.add(a, b) : G.sub(Math.max(a, b), Math.min(a, b)); } },
      { name: '两位数加一位数（不进位）', n: 2, make: () => { const ones = int(1, 7); return G.add(int(2, 8) * 10 + ones, int(1, 9 - ones)); } },
      { name: '两位数减一位数（不退位）', n: 2, make: () => { const a = int(2, 9) * 10 + int(2, 9); return G.sub(a, int(1, a % 10)); } },
    ],
    vertical: [
      { name: '两位数加两位数（不进位）', n: 2, make: () => V.add(11, 44, false) },
      { name: '两位数加两位数（进位）', n: 2, make: () => V.add(15, 88, true) },
      { name: '两位数减两位数（不退位）', n: 2, make: () => V.sub(21, 99, false) },
      { name: '两位数减两位数（退位）', n: 2, make: () => V.sub(21, 99, true) },
    ],
  };

  /* ================= 二年级上册 ================= */
  B['grade2-up'] = {
    label: '二年级上册',
    note: '表内乘法（2~9 的乘法口诀）、100 以内加减法竖式。',
    oral: [
      { name: '表内乘法（口诀）', n: 5, make: () => G.mul(int(2, 9), int(2, 9)) },
      { name: '两位数加两位数（口算）', n: 2, make: () => { const a = int(11, 89); return G.add(a, int(11, 99 - a)); } },
      { name: '两位数减两位数（口算）', n: 2, make: () => { const a = int(21, 95); return G.sub(a, int(11, a - 10)); } },
      { name: '乘加乘减', n: 2, make: () => { const a = int(2, 9), b = int(2, 9), c = int(1, 9); return pick([0, 1]) ? { expr: a + '×' + b + '＋' + c, answer: String(a * b + c) } : { expr: a + '×' + b + '－' + c, answer: String(a * b - c) }; } },
    ],
    vertical: [
      { name: '两位数加两位数（进位）', n: 3, make: () => V.add(15, 88, true) },
      { name: '两位数减两位数（退位）', n: 3, make: () => V.sub(21, 99, true) },
    ],
  };

  /* ================= 二年级下册 ================= */
  B['grade2-down'] = {
    label: '二年级下册',
    note: '表内除法、有余数的除法（含除法竖式）、万以内整百整千数加减。',
    oral: [
      { name: '表内除法（用口诀求商）', n: 4, make: () => { const b = int(2, 9); return G.div(b * int(2, 9), b); } },
      { name: '有余数的除法（口算）', n: 3, make: () => divWithRemainder(3, 9, 2, 9, false) },
      { name: '整百整千数加减', n: 3, make: () => { const k = pick([100, 1000]); const a = int(1, 9) * k, b = int(1, 9) * k; return pick([0, 1]) ? G.add(a, b) : G.sub(Math.max(a, b), Math.min(a, b)); } },
      { name: '混合运算（两步）', n: 2, make: () => G.mixed(2, 9) },
    ],
    vertical: [
      { name: '表内除法竖式', n: 3, make: () => { const b = int(2, 9); return V.div(b * int(2, 9), b); } },
      { name: '有余数的除法竖式', n: 3, make: () => vDiv(3, 9, 2, 9, false) },
    ],
  };

  /* ================= 三年级上册 ================= */
  B['grade3-up'] = {
    label: '三年级上册',
    note: '万以内加减法、多位数乘一位数、同分母分数加减。',
    oral: [
      { name: '两位数加两位数（口算）', n: 3, make: () => { const a = int(11, 89); return G.add(a, int(11, 99 - a)); } },
      { name: '两位数减两位数（口算）', n: 3, make: () => { const a = int(21, 95); return G.sub(a, int(11, a - 10)); } },
      { name: '整十整百数乘一位数', n: 3, make: () => { const a = pick([int(2, 9) * 10, int(2, 9) * 100]); return G.mul(a, int(2, 9)); } },
      { name: '多位数乘一位数（不进位）', n: 2, make: () => { const t = int(1, 3), o = int(1, 3), b = int(2, 3); return G.mul(t * 10 + o, b); } },
      { name: '同分母分数加减', n: 2, make: () => sameDenomFraction(4, 9, true) },
    ],
    vertical: [
      { name: '三位数加三位数（进位）', n: 2, make: () => V.add(101, 899, true) },
      { name: '三位数减三位数（退位）', n: 2, make: () => V.sub(201, 899, true) },
      { name: '多位数乘一位数', n: 3, make: () => V.mul(int(102, 989), int(2, 9)) },
      { name: '因数中间或末尾有 0 的乘法', n: 2, make: () => V.mul(pick([int(2, 9) * 100, Number(int(1, 9) + '0' + int(1, 9))]), int(2, 9)) },
    ],
  };

  /* ================= 三年级下册 ================= */
  B['grade3-down'] = {
    label: '三年级下册',
    note: '除数是一位数的除法、两位数乘两位数、简单小数加减。',
    oral: [
      { name: '除数是一位数的除法（口算）', n: 3, make: () => { const b = int(2, 9); return G.div(b * int(2, 9) * 10, b); } },
      { name: '两位数乘整十数', n: 3, make: () => G.mul(int(11, 49), int(1, 9) * 10) },
      { name: '简单小数加减', n: 3, make: () => (pick([0, 1]) === 0 ? G.decAdd(0.1, 9.9, 1) : G.decSub(0.1, 9.9, 1)) },
      { name: '一位数除两三位数（口算）', n: 2, make: () => { const b = int(2, 9); return G.div(b * int(11, 99), b); } },
    ],
    vertical: [
      { name: '两位数乘两位数', n: 3, make: () => V.mul(int(12, 99), int(12, 99)) },
      { name: '两位数乘整十数', n: 2, make: () => V.mul(int(12, 99), int(1, 9) * 10) },
      { name: '三位数除以一位数', n: 3, make: () => { const b = int(2, 9); return V.div(b * int(20, 99), b); } },
      { name: '商中间或末尾有 0 的除法', n: 2, make: () => { const b = int(2, 9); return V.div(b * (int(2, 9) * 100 + int(1, 9)), b); } },
    ],
  };

  /* ================= 四年级上册 ================= */
  B['grade4-up'] = {
    label: '四年级上册',
    note: '大数认识、三位数乘两位数、除数是两位数的除法。',
    oral: [
      { name: '整百数乘整十数', n: 2, make: () => G.mul(int(2, 9) * 100, int(1, 9) * 10) },
      { name: '除数是两位数的口算', n: 3, make: () => { const b = int(1, 9) * 10; return G.div(b * int(2, 9) * 10, b); } },
      { name: '两位数乘两位数（口算）', n: 3, make: () => G.mul(int(11, 30), int(11, 20)) },
      { name: '大数的改写与近似数', n: 2, make: () => bigNumberItem() },
    ],
    vertical: [
      { name: '三位数乘两位数', n: 3, make: () => V.mul(int(102, 989), int(12, 99)) },
      { name: '因数中间或末尾有 0 的乘法', n: 2, make: () => V.mul(pick([int(2, 9) * 100, Number(int(1, 9) + '0' + int(1, 9))]), int(12, 99)) },
      { name: '除数是两位数的除法', n: 3, make: () => { const b = int(20, 99); return V.div(b * int(11, 90), b); } },
    ],
  };

  /* ================= 四年级下册 ================= */
  B['grade4-down'] = {
    label: '四年级下册',
    note: '四则运算与运算定律、小数加减法、小数加减竖式。',
    oral: [
      { name: '小数加减法（口算）', n: 3, make: () => (pick([0, 1]) === 0 ? G.decAdd(0.1, 9.9, 1) : G.decSub(0.1, 9.9, 1)) },
      { name: '整数四则混合运算', n: 2, make: () => G.mixed(2, 12) },
      { name: '简便计算（凑整）', n: 3, make: () => { const kind = pick(['25', '125', 'round']); if (kind === '25') return G.mul(25, int(4, 20)); if (kind === '125') return G.mul(125, int(8, 12)); const a = int(21, 99); return G.add(a, 100 - a); } },
    ],
    vertical: [
      { name: '小数加法竖式', n: 3, make: () => V.decAdd(0.05, 99.9, 2) },
      { name: '小数减法竖式', n: 3, make: () => V.decSub(0.05, 99.9, 2) },
      { name: '三位数乘两位数', n: 2, make: () => V.mul(int(102, 989), int(12, 99)) },
    ],
  };

  /* ================= 五年级上册 ================= */
  B['grade5-up'] = {
    label: '五年级上册',
    note: '小数乘除法、运算定律推广到小数、多边形面积计算。',
    oral: [
      { name: '小数乘整数（口算）', n: 3, make: () => G.decMul(int(1, 9) / 10 + int(1, 9), int(2, 9)) },
      { name: '小数除法（口算）', n: 3, make: () => { const b = int(2, 9), q = int(11, 99) / 10; return G.decDiv(num(Number(num(b * q))), b); } },
      { name: '积的近似数 / 简便计算', n: 2, make: () => { const kind = pick(['25', '125', 'dec']); if (kind === '25') return G.mul(25, int(4, 16)); if (kind === '125') return G.mul(125, int(8, 12)); return G.decMul(int(1, 9) / 10, int(11, 99) / 10); } },
      { name: '多边形面积（口算）', n: 2, make: () => { const a = int(2, 9), h = int(2, 9) * 2; const t = pick(['para', 'tri', 'trap']); if (t === 'para') return { expr: '底' + a + '×高' + h + '（平行四边形面积）', answer: String(a * h) }; if (t === 'tri') return { expr: '底' + a + '×高' + h + '÷2（三角形面积）', answer: String(a * h / 2) }; const b2 = int(2, 9) * 2; return { expr: '（上底' + a + '＋下底' + b2 + '）×高' + h + '÷2（梯形面积）', answer: String((a + b2) * h / 2) }; } },
    ],
    vertical: [
      { name: '小数乘小数', n: 3, make: () => V.decMul(int(11, 99) / 10, int(11, 99) / 10) },
      { name: '除数是整数的小数除法', n: 3, make: () => { const b = int(2, 9), q = int(11, 99) / 10; return V.decDiv(num(b * q), b); } },
      { name: '除数是小数的小数除法', n: 2, make: () => { const b = int(11, 99) / 10, q = int(2, 9); return V.decDiv(num(b * q), b); } },
    ],
  };

  /* ================= 五年级下册 ================= */
  B['grade5-down'] = {
    label: '五年级下册',
    note: '因数与倍数、长方体正方体表面积体积、分数加减法。',
    oral: [
      { name: '同分母分数加减', n: 3, make: () => sameDenomFraction(5, 12, true) },
      { name: '异分母分数加减', n: 3, make: () => diffDenomFraction(false) },
      { name: '长方体体积（口算）', n: 2, make: () => { const a = int(2, 9), b = int(2, 9), c = int(2, 9); return { expr: '长' + a + '×宽' + b + '×高' + c, answer: String(a * b * c) }; } },
      { name: '整数四则混合运算', n: 2, make: () => G.mixed(2, 20) },
    ],
    vertical: [],
  };

  /* ================= 六年级上册 ================= */
  B['grade6-up'] = {
    label: '六年级上册',
    note: '分数乘除法、比与按比分配、圆周率计算、百分数。',
    oral: [
      { name: '分数乘整数 / 分数乘分数', n: 4, make: () => { const a = pick([2, 3, 4, 5, 6]); return G.fracMul(F(int(1, a - 1), a), F(int(1, 9), int(2, 9))); } },
      { name: '分数除法', n: 3, make: () => { const a = pick([2, 3, 4, 5, 6]); return G.fracDiv(F(int(1, a - 1), a), F(int(1, 9), int(2, 9))); } },
      { name: '圆的周长与面积（π 取 3.14）', n: 2, make: () => { const r = int(1, 9); return pick([0, 1]) ? { expr: '周长：2×3.14×' + r, answer: num(6.28 * r) } : { expr: '面积：3.14×' + r + '²', answer: num(3.14 * r * r) }; } },
      { name: '百分数计算', n: 2, make: () => { const a = int(1, 9) * 20, p = pick([10, 20, 25, 50, 75]); return { expr: a + '×' + p + '%', answer: num(a * p / 100) }; } },
    ],
    vertical: [],
  };

  /* ================= 六年级下册 ================= */
  B['grade6-down'] = {
    label: '六年级下册',
    note: '负数、圆柱圆锥体积表面积、比例与比例尺、毕业总复习。',
    oral: [
      { name: '分数四则混合', n: 3, make: () => { const kind = pick(['add', 'sub', 'mul']); const a = diffDenomFraction(kind === 'mul'); return a; } },
      { name: '百分数计算', n: 2, make: () => { const a = int(1, 9) * 20, p = pick([10, 20, 25, 50, 75]); return { expr: a + '×' + p + '%', answer: num(a * p / 100) }; } },
      { name: '比例求未知项', n: 2, make: () => { const a = int(2, 9), b = int(2, 9), m = int(2, 9); return { expr: a + ':' + b + '=' + a * m + ':x，x = ？', answer: String(b * m) }; } },
      { name: '圆柱圆锥计算（π 取 3.14）', n: 2, make: () => { const r = int(1, 5), h = int(2, 9); const t = pick(['side', 'vol', 'cone']); if (t === 'side') return { expr: '侧面积：2×3.14×' + r + '×' + h, answer: num(6.28 * r * h) }; if (t === 'vol') return { expr: '圆柱体积：3.14×' + r + '²×' + h, answer: num(3.14 * r * r * h) }; return { expr: '圆锥体积：3.14×' + r + '²×' + h + '÷3', answer: num(3.14 * r * r * h / 3) }; } },
    ],
    vertical: [],
  };

  global.DRILL_BOOKS = B;
})(window);
