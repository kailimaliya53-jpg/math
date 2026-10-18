#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""由 site/index.html 生成多学科统一入口页 site/hub.html（只在需要改入口页时运行）"""
import io, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(BASE, 'index.html')
dst = os.path.join(BASE, 'hub.html')

html = io.open(src, encoding='utf-8').read()

# 1) 链接重写
for a, b in [
    ('href="./math-grade1-2-workshop/index.html"', 'href="./index.html"'),
    ('href="./chinese-grade1-site/index.html"', 'href="./chinese/index.html"'),
    ('href="./basic-english-workshop/index.html"', 'href="./english-workshop/index.html"'),
    ('href="./basic-english-site/index.html"', 'href="./english-basic/index.html"'),
]:
    assert a in html, '缺少链接: ' + a
    html = html.replace(a, b)

# 2) 新卡片配色
old_theme = """    .card-english-site {
      --card-color: #6D28D9;
      --card-bg: #EDE9FE;
    }"""
assert old_theme in html, '缺少配色锚点'
html = html.replace(old_theme, old_theme + """
    .card-kousuan {
      --card-color: #047857;
      --card-bg: #D1FAE5;
    }
    .card-exam {
      --card-color: #0E7490;
      --card-bg: #CFFAFE;
    }
    .card-grade2 {
      --card-color: #BE185D;
      --card-bg: #FCE7F3;
    }""")

# 3) 顶部信息
for a, b in [
    ('<div class="header-badge">🏫 mini-classroom</div>', '<div class="header-badge">🏫 小学数学 · 课后自学</div>'),
    ('<h1>小教室 <span>· 课后自学站</span></h1>', '<h1>数学小教室 <span>· 免费在线练习</span></h1>'),
    ('<title>mini-classroom — 小教室</title>', '<title>数学小教室 — 免费在线口算练习与知识点学习</title>'),
    ('轻量级小学知识点交互学习网站集合，涵盖数学、语文、英语多学科基础内容。专为家长、授课老师及小学生打造，助力课后辅导与趣味启蒙。',
     '小学数学知识点、口算练习、在线考试一站式入口，另附语文、英语基础站。纯静态、免登录、免费使用，学习进度保存在本地浏览器。'),
    ('      <div class="stat-value">4</div>\n      <div class="stat-label">学习站点</div>',
     '      <div class="stat-value">7</div>\n      <div class="stat-label">学习站点</div>'),
    ('      <div class="stat-value">850+</div>\n      <div class="stat-label">知识点/词汇</div>',
     '      <div class="stat-value">1200+</div>\n      <div class="stat-label">知识点/词汇/题</div>'),
]:
    assert a in html, '缺少锚点: ' + a[:40]
    html = html.replace(a, b)

# 4) 追加三张新卡片（插在卡片区结束标签 </div> 之前）
NEW_CARDS = """
  <!-- 口算练习 -->
  <a class="card card-kousuan" href="./kousuan/">
    <div class="card-icon">✏️</div>
    <div class="card-subject">数学 · 口算练习</div>
    <div class="card-title">口算题<br>自动生成</div>
    <div class="card-desc">加减乘除自由出题：运算步数、进退位、余数、结果范围都能调，一键生成可打印的练习卷，答案另附。</div>
    <div class="card-meta">
      <span class="tag">自定义难度</span>
      <span class="tag">可打印</span>
      <span class="tag">无限出题</span>
    </div>
    <div class="card-cta">进入站点</div>
  </a>

  <!-- 二年级上册 -->
  <a class="card card-grade2" href="./grade2/">
    <div class="card-icon">✖️</div>
    <div class="card-subject">数学 · 二年级上册</div>
    <div class="card-title">二年级上册<br>知识点汇总</div>
    <div class="card-desc">20 个知识点覆盖人教版二年级上册七大章节：长度单位、加减法、角、表内乘法、观察物体、认识时间、搭配。</div>
    <div class="card-meta">
      <span class="tag">20 知识点</span>
      <span class="tag">闪卡复习</span>
      <span class="tag">自测小测</span>
    </div>
    <div class="card-cta">进入站点</div>
  </a>

  <!-- 在线考试 -->
  <a class="card card-exam" href="./exam/">
    <div class="card-icon">📝</div>
    <div class="card-subject">数学 · 考试与错题本</div>
    <div class="card-title">在线考试<br>与错题本</div>
    <div class="card-desc">12 册题库、4 大知识领域、378 个三级考点，支持自动阅卷、组卷打印、错题本复习与成绩报表，纯前端零依赖。</div>
    <div class="card-meta">
      <span class="tag">378 考点</span>
      <span class="tag">自动阅卷</span>
      <span class="tag">错题本</span>
    </div>
    <div class="card-cta">进入站点</div>
  </a>
"""
anchor = '\n</div>\n\n<footer class="footer">'
assert anchor in html, '缺少卡片区结尾锚点'
html = html.replace(anchor, NEW_CARDS + anchor)

# 5) 页脚署名
old_footer = """    <a href="https://github.com/vista8/mini-classroom" target="_blank" rel="noopener">GitHub</a>
    &nbsp;&middot;&nbsp;
    MIT License &copy; 2026 JeetChan"""
if old_footer not in html:
    old_footer = old_footer.replace('&middot;', '·')
assert old_footer in html, '缺少页脚锚点'
html = html.replace(old_footer, """    <a href="https://github.com/kailimaliya53-jpg/math" target="_blank" rel="noopener">本站源码（GitHub）</a>
    &nbsp;·&nbsp;
    知识点站来自 <a href="https://github.com/JeetChan/mini-classroom" target="_blank" rel="noopener">mini-classroom</a>（MIT）
    &nbsp;·&nbsp;
    口算来自 <a href="https://github.com/bosichong/PrimarySchoolMathematics" target="_blank" rel="noopener">PrimarySchoolMathematics</a>（Apache-2.0）
    &nbsp;·&nbsp;
    考试平台来自 <a href="https://github.com/scott-lei/exam" target="_blank" rel="noopener">scott-lei/exam</a>""")

io.open(dst, 'w', encoding='utf-8').write(html)
print('✅ site/hub.html 已生成 (%d 字节)' % len(html.encode('utf-8')))
print('   链接:', ' '.join(sorted(set(re.findall(r'href="(\./[^"]*)"', html)))))
