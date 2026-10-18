# 数学小教室 · math.91stocks.com

小学数学免费在线练习站。**人教版 1~6 年级 12 册知识点（243 个知识点）** + 分册题型专项（口算卡 / 竖式 / 应用题）+ 口算题自动生成 + 在线考试与错题本，另附语文、英语基础站。纯静态、免登录、无广告，学习进度存在浏览器本地。

## 站点结构

| 路径 | 内容 | 来源 | 协议 |
|---|---|---|---|
| `/` `/hub` | 入口页（全部站点导航） | 本仓库生成 | — |
| `/grade1-up/` … `/grade6-down/` | **数学知识点 12 册**（每册含 学习/闪卡/索引/进度 四种模式） | 基于 [JeetChan/mini-classroom](https://github.com/JeetChan/mini-classroom) 模板 + 本站编写内容 | MIT |
| `/drill/` | **题型专项练习 12 册**（口算卡自动出题+计时批改、竖式排版+打印、应用题题库 150 道含解析），`/drill/?book=grade3-up` 可直接进对应册次 | 本仓库编写（纯静态，无需构建） | — |
| `/kousuan/` | **口算题自动生成**（加减乘除自定义难度，可打印） | [bosichong/PrimarySchoolMathematics](https://github.com/bosichong/PrimarySchoolMathematics) | Apache-2.0 |
| `/exam/` | **在线考试 + 错题本**（分册题库 / 378 个三级考点 / 自动阅卷 / 组卷打印） | [scott-lei/exam](https://github.com/scott-lei/exam) | 未声明 ⚠️ |
| `/chinese/` | 语文 · 一年级下册 | mini-classroom | MIT |
| `/english-basic/` | 英语 850 词汇 | mini-classroom | MIT |
| `/english-workshop/` | 英语核心词工坊（30 单元） | mini-classroom | MIT |

各册知识点数量：

| 年级 | 上册 | 下册 |
|---|---|---|
| 一年级 | 17 个 / 9 章 | 23 个 / 5 章 |
| 二年级 | 20 个 / 8 章 | 17 个 / 10 章 |
| 三年级 | 23 个 / 9 章 | 21 个 / 8 章 |
| 四年级 | 21 个 / 8 章 | 22 个 / 9 章 |
| 五年级 | 22 个 / 7 章 | 19 个 / 8 章 |
| 六年级 | 22 个 / 8 章 | 16 个 / 6 章 |

## 一键部署

```bash
# 首次：npm i -g wrangler && wrangler login（OAuth 凭证约 24 小时过期，过期后重新 login）
./deploy-pages.sh
```

脚本做的事：`build-pages.sh` 组装 `pages-dist/` → `wrangler pages deploy` 上传到 Cloudflare Pages 项目 `math-classroom`。

> 网络不通时需要走代理：`export https_proxy=http://127.0.0.1:7899 http_proxy=http://127.0.0.1:7899`

## 目录结构

```
.
├── build-pages.sh        # 组装 pages-dist（读 site/books.json 逐册部署 + 路径/外链修正 + sitemap）
├── deploy-pages.sh       # 构建 + 上传 Cloudflare Pages
├── site/
│   ├── books.json        # ★ 课程数据：每册的年级/册次/章节/知识点清单/部署路径
│   ├── new-book.py       # ★ 按 books.json 生成某一册的站点外壳（index/siteConfig/manifest）
│   ├── check-book.mjs    # ★ 校验某一册的知识点数据（结构、章节名、quiz 合法性…）
│   ├── make-hub.py       # 由 books.json 生成入口页 hub.html
│   ├── _template/        # 站点模板（来自 mini-classroom）
│   ├── grade1-up-workshop/ … grade6-down-workshop/   # 12 册内容（js/wordData.js 是知识点数据）
│   ├── drill/            # ★ 题型专项（口算卡/竖式/应用题，纯静态）
│   │   ├── index.html  css/  js/util.js  js/books.js  js/engine.js
│   │   ├── data/word/<册>.js      # 应用题题库（window.DRILL_WORD['grade3-up'] = [...]）
│   │   ├── test-generators.mjs    # 校验出题器：独立求值器重算每道口算/竖式题
│   │   └── check-word.mjs         # 校验应用题：结构 + 把答案里的算式逐个重算
│   ├── chinese-grade1-site/  basic-english-site/  basic-english-workshop/
│   └── hub.html          # 生成的入口页（不手改）
├── kousuan/              # 口算题生成器（Vue3 + Vite 源码）
└── exam/                 # 在线考试平台（纯静态，无需构建）
```

## 新增/修改一册知识点

```bash
# 1) 在 site/books.json 里补一册（章节 chapters + 知识点清单 points）
# 2) 生成站点外壳
python3 site/new-book.py grade7-up        # 或 --all 重建全部外壳
# 3) 编写知识点内容：site/<module>/js/wordData.js
#    条目结构：id / root / origin("第X章 章节名") / meaning / description / examples×3 / quiz
# 4) 校验（必须 0 错误）
node site/check-book.mjs grade7-up
# 5) 重新生成入口页并部署
./deploy-pages.sh
```

`check-book.mjs` 会检查：id 连续、字段完整、`origin` 章节名与 `books.json` 一致、每章都有知识点、`examples` 至少 3 个、`quiz` 四个选项互不重复且答案下标合法、无占位文本。

## 题型专项（`/drill/`）

每册三个专项，全部在浏览器本地出题、批改，不联网：

| 专项 | 说明 |
|---|---|
| 口算卡 | 按册出题（题量 10/20/30/40），带计时；输入答案或选选项，提交后逐题判对错、给出正确答案、统计正确率与用时，可一键「只练错题」 |
| 竖式 | 竖式竖排（小数加减按小数点对齐、乘法带部分积、除法用长除号「厂」字格），可显示/隐藏答案，一键打印练习卷 |
| 应用题 | 每册 12~14 题，含考点、难度星级、答案与解析（解析把每步算式都写出来），可逐题展开、随机抽 10 题、打印题目 |

出题规则写在 `site/drill/js/books.js`（每册的 `oral` / `vertical` 出题器与权重），题库在 `site/drill/data/word/<册>.js`。

核对（改完出题器或题库都要跑，必须 0 错误）：

```bash
node site/drill/test-generators.mjs 200   # 每个出题器抽 200 题，用独立实现的分数/小数求值器验算
node site/drill/check-word.mjs --all      # 应用题：结构检查 + 把答案/解析里的算式逐个重算
```

## 构建时做的处理

1. **子目录路径修正**：子目录里的 `manifest.json`/`icon-*.png`/`css`/`js` 绝对引用改为相对路径，否则 404。
2. **口算站路由改 hash 模式**：`kousuan/src/router/index.js` 由 `createWebHistory` 改为 `createWebHashHistory`（`--base=/kousuan/` 构建），避免需要 SPA 回退规则而影响同域名下其它站点。这是对上游源码唯一的功能性改动。
3. **移除 Google Fonts 外链**：国内常不可达且阻塞首屏；CSS 自带系统字体回退（顺带把滚动区里的字体栈也换成了系统字体）。
4. **旧域名替换**：上游硬编码的 `math-grade1-2.vercel.app`、`basic-english.vercel.app` → 本站对应路径，`canonical`/`og`/`sitemap` 一并更新。
5. **生成** `robots.txt` 与 `sitemap.xml`（68 条 URL，含每册子页面与 `/drill/`）。
6. **题型专项**：`site/drill/` 原样复制到 `/drill/`（排除 `*.mjs` 校验脚本），不需要构建。

## 内容说明（重要）

- 除 `grade1-down`（一年级下册，来自 mini-classroom 原作者内容）外，其余 11 册的知识点数据是**按人教版教材目录整理编写的**（章节名与人教版一致，描述/例子/自测题由本站编写）。**建议对照课本复核后再给小朋友使用**，发现问题直接改对应的 `js/wordData.js` 再部署即可。
- 人教版各册章节以现行教材目录为准；若你所在地区使用不同版本（如北师大版、苏教版），章节结构需要相应调整。
- `/drill/` 的口算/竖式题由程序按规则随机生成，算式和答案已用脚本逐个验算（`test-generators.mjs`）；应用题题库是**按人教版各册范围编写**的（150 题，答案里的算式已逐个重算核对），但题目表述仍建议家长/老师抽查后再给孩子用。

## 域名与部署信息

- Cloudflare Pages 项目：`math-classroom`，产线地址 `https://math-classroom.pages.dev`
- 自定义域名：`math.91stocks.com`（DNS 仍在新网，CNAME 指向 `math-classroom.pages.dev`）
- 部署方式：`wrangler pages deploy` 直传（未使用 Git 自动构建）

## 许可证

- `site/`（mini-classroom 模板与语文/英语内容）：MIT，见 `site/LICENSE`
- `kousuan/`（PrimarySchoolMathematics）：Apache-2.0，见 `kousuan/LICENSE`
- `exam/`（scott-lei/exam）：**上游仓库未声明许可证**，默认保留所有权利。个人/内部使用可以；若要做公开长期运营，建议联系作者取得授权。
- 人教版教材相关知识点为按公开目录整理的内容，请自行评估使用范围。
