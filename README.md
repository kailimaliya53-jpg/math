# 数学小教室 · math.91stocks.com

小学数学免费在线练习站，纯静态、免登录，进度存在浏览器本地。把三个开源项目组装在一个域名下：

| 路径 | 内容 | 来源项目 | 协议 |
|---|---|---|---|
| `/` | 数学知识点 · **一年级下册**（23 个知识点，学习/闪卡/索引/进度四种模式，支持离线） | [JeetChan/mini-classroom](https://github.com/JeetChan/mini-classroom) | MIT |
| `/grade2/` | 数学知识点 · **二年级上册**（20 个知识点，人教版七大章节） | 本仓库基于 mini-classroom 模板整理 | MIT |
| `/kousuan/` | **口算题自动生成**（加减乘除自定义难度，一键出可打印练习卷） | [bosichong/PrimarySchoolMathematics](https://github.com/bosichong/PrimarySchoolMathematics) | Apache-2.0 |
| `/exam/` | **在线考试 + 错题本**（12 册题库 / 378 个三级考点 / 自动阅卷 / 组卷打印） | [scott-lei/exam](https://github.com/scott-lei/exam) | 未声明 ⚠️ |
| `/chinese/` | 语文 · 一年级下册 | mini-classroom | MIT |
| `/english-basic/` | 英语 850 词汇 | mini-classroom | MIT |
| `/english-workshop/` | 英语核心词工坊（30 单元） | mini-classroom | MIT |
| `/hub.html` | 全部站点入口（首页与二年级页脚都有入口） | — | — |

## 一键部署

```bash
# 首次：npm i -g wrangler && wrangler login   （OAuth 凭证约 24 小时过期，过期后重新 login）
./deploy-pages.sh
```

脚本做的事：`build-pages.sh` 组装 `pages-dist/` → `wrangler pages deploy` 上传到 Cloudflare Pages 项目 `math-classroom`。

> 网络不通时需要走代理：`export https_proxy=http://127.0.0.1:7899 http_proxy=http://127.0.0.1:7899`

## 目录结构

```
.
├── build-pages.sh        # 组装 pages-dist（三项目合并 + 路径/域名/外链修正）
├── deploy-pages.sh       # 构建 + 上传 Cloudflare Pages
├── site/                 # 知识点站（来自 mini-classroom）
│   ├── math-grade1-2-workshop/   → 部署到 /（它的 sw.js 用根路径，必须在根）
│   ├── grade2-up-workshop/       → /grade2/（二年级上册，自行编写内容）
│   ├── chinese-grade1-site/      → /chinese/
│   ├── basic-english-site/       → /english-basic/
│   ├── basic-english-workshop/   → /english-workshop/
│   ├── index.html                # mini-classroom 原始首页
│   ├── make-hub.py               # 由 index.html 生成 hub.html（改入口页时运行）
│   └── hub.html                  # 部署用的统一入口页（已含 7 张卡片）
├── kousuan/              # 口算题生成器（Vue3 + Vite 源码）
└── exam/                 # 在线考试平台（纯静态，无需构建）
```

## 构建时做的处理

1. **子目录路径修正**：`grade2`、`chinese`、`english-*` 里原本指向根路径的 `manifest.json` / `icon-*.png` / `css` / `js` 引用改成了相对路径，否则放在子目录会 404。
2. **数学站放在根目录**：它的 `sw.js` 和 PWA 配置使用绝对根路径，放子目录会导致离线缓存串到别的站点。
3. **口算站路由改 hash 模式**：`kousuan/src/router/index.js` 由 `createWebHistory` 改为 `createWebHashHistory`（`base=/kousuan/` 构建），避免需要 SPA 回退规则而影响同域名下其他站点。这是本仓库对上游源码的唯一功能性改动。
4. **移除 Google Fonts 外链**：国内访问常被墙且会阻塞首屏渲染，CSS 自带系统字体回退。
5. **旧域名替换**：上游硬编码的 `math-grade1-2.vercel.app` → `https://math.91stocks.com`；`basic-english.vercel.app` → `https://math.91stocks.com/english-workshop`。
6. **生成** `robots.txt` 与 `sitemap.xml`（16 条 URL）。

## 内容贡献

- `site/grade2-up-workshop/js/wordData.js`：二年级上册 20 个知识点（每个含描述、3 个例子、1 道自测题）。
  按人教版二年级上册目录整理：长度单位 / 100 以内的加法和减法（二）/ 角的初步认识 / 表内乘法（一）/ 观察物体（一）/ 表内乘法（二）/ 认识时间 / 数学广角——搭配（一）。
  **内容为根据教材大纲整理，建议对照课本复核后再给小朋友使用。**
- `site/grade2-up-workshop/js/siteConfig.js`：站点文案、章节数等。

改完 `site/` 里的内容后重新 `./deploy-pages.sh` 即可。

## 域名与部署信息

- Cloudflare Pages 项目：`math-classroom`，产线地址 `https://math-classroom.pages.dev`
- 自定义域名：`math.91stocks.com`（DNS 仍是新网，CNAME 指向 `math-classroom.pages.dev`）
- 部署方式：`wrangler pages deploy` 直传（未使用 Git 自动构建）

## 许可证

- `site/`（mini-classroom）：MIT，见 `site/LICENSE`
- `kousuan/`（PrimarySchoolMathematics）：Apache-2.0，见 `kousuan/LICENSE`
- `exam/`（scott-lei/exam）：**上游仓库未声明许可证**，默认保留所有权利。仅建议个人/内部使用；若要做公开长期运营，建议联系作者取得授权或替换为有明确许可的题库。
- 人教版教材知识点为根据公开教学大纲整理的内容，请自行评估使用范围。
