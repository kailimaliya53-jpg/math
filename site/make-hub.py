#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""由 site/books.json 生成统一入口页 site/hub.html（12 册知识点 + 口算/考试 + 语文英语）

改完 books.json 后运行：python3 site/make-hub.py
"""
import io, json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
data = json.load(io.open(os.path.join(BASE, 'books.json'), encoding='utf-8'))
ORIGIN = data['origin']
books = data['books']

# 每个年级一套配色
GRADE_COLORS = {
    '一年级': ('#B45309', '#FEF3C7'),
    '二年级': ('#BE185D', '#FCE7F3'),
    '三年级': ('#047857', '#D1FAE5'),
    '四年级': ('#1D4ED8', '#DBEAFE'),
    '五年级': ('#6D28D9', '#EDE9FE'),
    '六年级': ('#B91C1C', '#FEE2E2'),
}
EXTRA = [
    dict(cls='drill', subject='数学 · 题型专项', icon='✏️', title='口算卡 · 竖式<br>应用题专项',
         desc='按 1~6 年级 12 册分册出题：口算卡自动生成并计时批改，竖式排版可打印练习卷，应用题题库 150 道、含答案与解析。',
         tags=['自动出题', '计时批改', '可打印'], href='./drill/', color=('#B45309', '#FEF3C7')),
    dict(cls='kou', subject='数学 · 口算练习', icon='🧮', title='口算题<br>自动生成',
         desc='加减乘除自由出题：运算步数、进退位、余数、结果范围都能调，一键生成可打印的练习卷。',
         tags=['自定义难度', '可打印', '无限出题'], href='./kousuan/', color=('#0F766E', '#CCFBF1')),
    dict(cls='exam', subject='数学 · 考试与错题本', icon='📝', title='在线考试<br>与错题本',
         desc='各年级分册题库、4 大知识领域、378 个三级考点，支持自动阅卷、组卷打印、错题本复习与成绩报表。',
         tags=['378 考点', '自动阅卷', '错题本'], href='./exam/', color=('#334155', '#E2E8F0')),
    dict(cls='chinese', subject='语文 · 一年级下册', icon='📜', title='语文知识点<br>学习网站',
         desc='六大模块：古诗文、课文背诵、日积月累、词语积累、近反义词、句式仿写，附闪卡复习功能。',
         tags=['7 首古诗', '10 篇课文', '闪卡'], href='./chinese/', color=('#9A3412', '#FFEDD5')),
    dict(cls='english-basic', subject='英语 · 词汇练习', icon='📖', title='Basic 850<br>词汇学习站',
         desc='850 词按 5 类浏览，含 18 个核心操作动词讲解、6 种句型造句练习，附闪卡与进度记录。',
         tags=['850 词汇表', '造句练习', '语音朗读'], href='./english-basic/', color=('#4F46E5', '#E0E7FF')),
    dict(cls='english-workshop', subject='英语 · 基础词汇', icon='🌐', title='Basic English<br>核心词工坊',
         desc='Ogden 850 核心词体系，拆解为 30 个学习单元：操作词、方向词、主题词汇、造词法，系统覆盖。',
         tags=['850 词', '30 单元'], href='./english-workshop/', color=('#0369A1', '#E0F2FE')),
]

total_points = 0
book_cards = []


def count_points(module_dir):
    """从 wordData.js 里数真实条目数（避免 books.json 的 itemCount 与内容不一致）"""
    p = os.path.join(BASE, os.path.basename(module_dir), 'js', 'wordData.js')
    src = io.open(p, encoding='utf-8').read()
    return len(re.findall(r'^\s*id:\s*\d+,', src, re.M))


for b in books:
    c, bg = GRADE_COLORS[b['grade']]
    cls = 'g' + b['id'].replace('grade', '').replace('-', '')
    n_points = count_points(b['moduleDir'])
    total_points += n_points
    ch_names = [x['name'] for x in b['chapters']]
    scope = '～'.join([ch_names[0].split('（')[0], ch_names[-1].split('（')[0]]) if len(ch_names) > 1 else ch_names[0]
    book_cards.append(dict(
        cls=cls, subject='数学 · %s%s' % (b['grade'], b['term']), icon=b['chapters'][0]['icon'],
        title='%s%s<br>数学知识点' % (b['grade'], b['term']),
        desc='人教版 %s 全册：%s 等 %d 个章节，共 %d 个知识点，含闪卡复习、渐进学习、进度记录与自测小测。' % (
            b['grade'] + b['term'], scope, len(b['chapters']), n_points),
        tags=['%d 个知识点' % n_points, '%d 个章节' % len(b['chapters']), '闪卡'],
        href=b['outputDir'], color=(c, bg)))

sites_total = len(books) + len(EXTRA)


def card(d):
    tags = ''.join('\n        <span class="tag">%s</span>' % t for t in d['tags'])
    return '''  <a class="card" style="--c:%s; --bg:%s" href="%s">
    <div class="card-icon">%s</div>
    <div class="card-subject">%s</div>
    <div class="card-title">%s</div>
    <div class="card-desc">%s</div>
    <div class="card-meta">%s
    </div>
    <div class="card-cta">进入站点</div>
  </a>''' % (d['color'][0], d['color'][1], d['href'], d['icon'], d['subject'], d['title'], d['desc'], tags)


math_cards = '\n\n'.join(card(d) for d in book_cards)
extra_cards = '\n\n'.join(card(d) for d in EXTRA)

HTML = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>数学小教室 — 小学数学 1~6 年级知识点、口算练习与在线考试</title>
<meta name="description" content="人教版小学数学 1~6 年级 12 册知识点汇总（%(points)d 个知识点）、口算题自动生成、在线考试与错题本，另附语文、英语基础站。纯静态、免登录、免费使用。">
<meta name="keywords" content="小学数学,数学知识点,人教版,口算练习,口算题生成,在线考试,错题本,一年级,二年级,三年级,四年级,五年级,六年级">
<meta name="robots" content="index, follow">
<link rel="canonical" href="%(origin)s/">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧮</text></svg>">
<meta name="theme-color" content="#FBBF24">
<meta property="og:title" content="数学小教室 — 小学数学免费在线练习">
<meta property="og:description" content="人教版 1~6 年级 12 册知识点、口算练习、在线考试，全部免费。">
<meta property="og:type" content="website">
<meta property="og:url" content="%(origin)s/">
<meta property="og:locale" content="zh_CN">
<style>
  :root {
    --bg: #FAFAFA;
    --card: #FFFFFF;
    --text-primary: #111827;
    --text-secondary: #4B5563;
    --text-hint: #9CA3AF;
    --border: #E5E7EB;
    --radius: 16px;
    --radius-sm: 10px;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
    background: var(--bg);
    color: var(--text-primary);
    line-height: 1.6;
    padding: 56px 20px 40px;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1000px; margin: 0 auto; }

  /* ── Header ── */
  .header { text-align: center; margin-bottom: 40px; }
  .badge {
    display: inline-block; background: #fff; border: 1px solid var(--border);
    border-radius: 100px; padding: 4px 14px; font-size: 13px;
    color: var(--text-secondary); margin-bottom: 20px;
  }
  .header h1 { font-size: clamp(28px, 6vw, 42px); font-weight: 700; line-height: 1.15; margin-bottom: 14px; letter-spacing: -0.02em; }
  .header h1 span { color: #888; font-weight: 400; }
  .header p { font-size: 16px; color: var(--text-secondary); line-height: 1.7; max-width: 560px; margin: 0 auto; }
  .stats {
    max-width: 460px; margin: 28px auto 0; display: flex;
    background: #fff; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden;
  }
  .stat { flex: 1; padding: 14px 8px; text-align: center; border-right: 1px solid var(--border); }
  .stat:last-child { border-right: none; }
  .stat-value { font-size: 22px; font-weight: 700; line-height: 1; margin-bottom: 4px; }
  .stat-label { font-size: 12px; color: var(--text-hint); }

  /* ── Sections ── */
  .section-label {
    font-size: 12px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-hint);
    margin: 40px 0 16px;
  }
  .section-note { font-size: 13px; color: var(--text-hint); margin: -8px 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  @media (max-width: 900px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } body { padding: 32px 14px; } }

  .card {
    position: relative; display: block; background: var(--card);
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 20px; text-decoration: none; color: inherit;
    overflow: hidden; transition: transform .15s, box-shadow .15s, border-color .15s;
  }
  .card::before {
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--c); opacity: .9;
  }
  .card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.07); border-color: var(--c); }
  .card-icon {
    width: 40px; height: 40px; border-radius: 10px; background: var(--bg);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; margin-bottom: 12px;
  }
  .card-subject { font-size: 12px; font-weight: 600; color: var(--c); margin-bottom: 6px; }
  .card-title { font-size: 17px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; }
  .card-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.65; margin-bottom: 14px; }
  .card-meta { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .tag { font-size: 11px; padding: 3px 9px; border-radius: 100px; background: var(--bg); color: var(--c); white-space: nowrap; }
  .card-cta { font-size: 13px; font-weight: 600; color: var(--c); display: flex; align-items: center; gap: 4px; }
  .card-cta::after { content: "→"; transition: transform .15s; }
  .card:hover .card-cta::after { transform: translateX(3px); }

  /* ── Footer ── */
  .footer { margin-top: 56px; text-align: center; font-size: 13px; color: var(--text-hint); line-height: 1.9; }
  .footer hr { border: none; border-top: 1px solid var(--border); margin-bottom: 24px; }
  .footer a { color: var(--text-secondary); text-decoration: none; }
  .footer a:hover { text-decoration: underline; }
</style>
</head>
<body>
<div class="wrap">

  <header class="header">
    <div class="badge">🧮 小学数学 · 1~6 年级全免费</div>
    <h1>数学小教室 <span>· 免费在线练习</span></h1>
    <p>人教版小学数学 1~6 年级 12 册知识点汇总，加上口算题自动生成、在线考试与错题本。纯静态、免登录、无广告，学习进度保存在你自己的浏览器里。</p>
    <div class="stats">
      <div class="stat"><div class="stat-value">%(nbooks)d</div><div class="stat-label">数学分册</div></div>
      <div class="stat"><div class="stat-value">%(points)d</div><div class="stat-label">知识点</div></div>
      <div class="stat"><div class="stat-value">%(sites)d</div><div class="stat-label">学习站点</div></div>
      <div class="stat"><div class="stat-value">免费</div><div class="stat-label">免登录</div></div>
    </div>
  </header>

  <p class="section-label">数学知识点 · 人教版 1~6 年级</p>
  <p class="section-note">每册都有「学习 / 闪卡 / 索引 / 进度」四种模式，含知识点讲解、生活实例和自测小题。</p>
  <div class="grid">

%(math_cards)s

  </div>

  <p class="section-label">练习与考试</p>
  <div class="grid">

%(extra_cards)s

  </div>

  <footer class="footer">
    <hr>
    <p>纯静态站点，无需注册登录，学习进度保存在本地浏览器。手机上可「添加到主屏幕」当 App 用。</p>
    <p style="margin-top:8px;">
      <a href="https://github.com/kailimaliya53-jpg/math" target="_blank" rel="noopener">本站源码（GitHub）</a>
      &nbsp;·&nbsp;
      知识点站来自 <a href="https://github.com/JeetChan/mini-classroom" target="_blank" rel="noopener">mini-classroom</a>（MIT）
      &nbsp;·&nbsp;
      口算来自 <a href="https://github.com/bosichong/PrimarySchoolMathematics" target="_blank" rel="noopener">PrimarySchoolMathematics</a>（Apache-2.0）
      &nbsp;·&nbsp;
      考试平台来自 <a href="https://github.com/scott-lei/exam" target="_blank" rel="noopener">scott-lei/exam</a>
    </p>
    <p style="margin-top:8px;">知识点内容按人教版教材目录整理，请对照课本核对后使用。</p>
  </footer>

</div>
</body>
</html>
''' % {
    'points': total_points,
    'nbooks': len(books),
    'sites': sites_total,
    'origin': ORIGIN,
    'math_cards': math_cards,
    'extra_cards': extra_cards,
}

out = os.path.join(BASE, 'hub.html')
io.open(out, 'w', encoding='utf-8').write(HTML)
print('✅ site/hub.html 已生成（%d 册 / %d 个知识点 / %d 个站点）' % (len(books), total_points, sites_total))
