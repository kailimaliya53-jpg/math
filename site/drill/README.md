# 题型专项（`/drill/`）

每册三个专项：**口算卡**（自动出题 + 计时批改）、**竖式**（竖排 + 显示答案 + 打印）、**应用题**（题库 + 解析）。
纯静态、无构建：浏览器本地出题与批改，不联网、不上传。

```
drill/
├── index.html            页面（三个标签页 + 册次下拉）
├── css/drill.css         样式（含打印样式）
├── js/util.js            出题器工具：随机/不重复、分数运算与显示、G（口算题）与 V（竖式题）
├── js/books.js           12 册的出题预设（oral / vertical / note）
├── js/engine.js          页面逻辑（出题、计时、批改、竖式排版、应用题加载）
├── data/word/<册>.js     应用题题库，形如 window.DRILL_WORD['grade3-up'] = [ ... ]
├── test-generators.mjs   核对出题器（独立求值器重算每道题的算式与答案）
└── check-word.mjs        核对应用题（结构 + 把答案/解析里的算式逐个重算）
```

## 改出题规则

编辑 `js/books.js` 里对应册次的 `oral` / `vertical` 数组：每一项是 `{ name, n, make }`，
`n` 是该题型的抽题权重（题量大时按比例循环），`make()` 返回一道题：

- 口算题：`{ expr, answer }`，带选项的选择题再加 `options: [4 个互不相同的值]`（答案须在其中）。
- 有余数的除法口算：`answer` 写成 `"6余3"`（页面会渲染成「商 / 余」两个输入框）。
- 竖式题：用 `js/util.js` 里的 `V.add / V.sub / V.mul / V.div / V.decAdd / V.decSub / V.decMul / V.decDiv`，
  返回 `{ a, b, op, answer, remainder?, decimal? }`。

改完**必须**跑：

```bash
node site/drill/test-generators.mjs 200
```

它会用一份独立实现的分数/小数求值器把每道题重算一遍，并检查选项唯一且含正确答案、竖式等式成立、余数范围合法。

## 写应用题

新建/修改 `data/word/<册>.js`，只有一条声明：

```js
window.DRILL_WORD = window.DRILL_WORD || {};
window.DRILL_WORD['grade3-up'] = [
  {
    q: '学校买来 168 本图书，平均分给 6 个班，每班分到多少本？',
    a: '每班 28 本（168÷6=28）',          // 答案必须把算式写在半角括号里
    why: '把 168 本平均分成 6 份，用除法：168÷6=28（本）。',
    point: '除数是一位数的除法',            // 取 books.json 里的章节名
    diff: 2,                               // 1 基础 / 2 提高 / 3 拓展
  },
];
```

要求：每册 10~14 题、覆盖 5 个以上考点；**答案与解析里的每个算式都要算对**。校验：

```bash
node site/drill/check-word.mjs --all
```

脚本会把文本里所有 `算式=结果` 找出来重算，写错会被打回；同时检查结构、重复题、占位文本。
注意：`26÷6=4余2` 这种写法会被当成普通除法判错，请改写为可核验的形式，如
`a: '最多装 5 箱，还剩 2 个（4×5=20，22-20=2）'`。

## 从知识点站进入

各册页脚有「题型专项练习」链接，指向 `/drill/?book=<册次>`；入口页 hub 也有整站卡片。
