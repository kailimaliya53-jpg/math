#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""按 site/books.json 的课程数据，从一年级模板生成某一册的知识点站点。

用法：
    python3 site/new-book.py grade3-up          # 生成/重建 三年级上册 模块
    python3 site/new-book.py --all              # 重建全部（会覆盖 wordData.js！）

说明：
- 会重新生成 index.html / siteConfig.js / manifest.json 等外壳文件；
- 若 js/wordData.js 已存在且不是模板文件，默认保留（除非加 --force-content）。
"""
import argparse, io, json, os, re, shutil, sys

BASE = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(BASE, '_template')
BOOKS = os.path.join(BASE, 'books.json')

def load(book_id=None):
    data = json.load(io.open(BOOKS, encoding='utf-8'))
    origin = data['origin']
    books = data['books']
    if book_id:
        for b in books:
            if b['id'] == book_id:
                return origin, b
        sys.exit('❌ books.json 里没有 %s' % book_id)
    return origin, books

def chapter_cards(book):
    out = []
    for c in book['chapters']:
        out.append('''        <div class="chapter-card">
          <div class="chapter-icon">%s</div>
          <h3 class="chapter-title">第%d章：%s</h3>
          <p class="chapter-desc">%s</p>
        </div>''' % (c['icon'], c['no'], c['name'], c['desc']))
    return '\n'.join(out)

def cn_num(n):
    return '一二三四五六七八九十十一十二'.split('十一')[0] if False else {
        1: '一', 2: '两', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九', 10: '十',
    }.get(n, str(n))

def build(book, origin, force_content=False):
    src = TEMPLATE
    dst = os.path.join(BASE, os.path.basename(book['moduleDir']))
    canon = origin + book['outputDir'].rstrip('/')          # https://math.91stocks.com/grade3-up
    keep_content = None
    if os.path.isdir(dst):
        wd = os.path.join(dst, 'js', 'wordData.js')
        tmpl_wd = os.path.join(src, 'js', 'wordData.js')
        if os.path.exists(wd) and not force_content:
            if io.open(wd, encoding='utf-8').read() != io.open(tmpl_wd, encoding='utf-8').read():
                keep_content = io.open(wd, encoding='utf-8').read()
    shutil.rmtree(dst, ignore_errors=True)
    shutil.copytree(src, dst)
    for junk in ('sw.js', 'robots.txt', 'sitemap.xml', 'README.md', '启动网站.bat'):
        p = os.path.join(dst, junk)
        if os.path.exists(p):
            os.remove(p)
    if keep_content is not None:
        io.open(os.path.join(dst, 'js', 'wordData.js'), 'w', encoding='utf-8').write(keep_content)

    # ---------- siteConfig.js ----------
    cfg = '''const siteConfig = {
  // 基础信息
  topic: "%(topic)s",
  siteName: "%(siteName)s",
  itemName: "知识点",
  itemCount: %(count)d,

  // 首页Hero区
  hero: {
    title: [
      "%(count)d个核心知识点",
      "轻松掌握",
      "%(topic)s"
    ],
    subtitle: "%(hero)s",
    animation: {
      enabled: true,
      demoCount: 5
    }
  },

  // 统计卡片
  stats: [
    { value: "%(count)d", label: "核心知识点" },
    { value: "%(chapters)d", label: "章节覆盖" },
    { value: "每日15分", label: "轻松学习" }
  ],

  // 底部介绍
  footer: {
    tagline: "让数学学习变得简单有趣",
    description: "%(footer)s"
  },

  // 按钮文案
  cta: {
    primary: "开始学习第一个知识点 →",
    secondary: "闪卡快速复习"
  }
};
''' % {
        'topic': book['grade'] + book['term'] + '数学',
        'siteName': book['siteName'],
        'count': book['itemCount'],
        'hero': book['heroSubtitle'],
        'chapters': len(book['chapters']),
        'footer': book['description'] + '通过闪卡、渐进学习、测试等多种模式，帮助小朋友系统掌握数学知识，培养计算思维和空间观念。适合家长辅导、学生自学、老师备课使用。',
    }
    io.open(os.path.join(dst, 'js', 'siteConfig.js'), 'w', encoding='utf-8').write(cfg)

    # ---------- manifest.json ----------
    manifest = {
        'name': book['siteName'],
        'short_name': book['appShortName'],
        'description': book['description'],
        'start_url': './',
        'display': 'standalone',
        'background_color': '#FAFAFA',
        'theme_color': '#FBBF24',
        'orientation': 'portrait-primary',
        'icons': [
            {'src': './icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any maskable'},
            {'src': './icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any maskable'},
        ],
        'categories': ['education', 'books'],
        'lang': 'zh-CN',
        'dir': 'ltr',
    }
    io.open(os.path.join(dst, 'manifest.json'), 'w', encoding='utf-8').write(
        json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')

    # ---------- html ----------
    page_titles = {
        'index.html': book['siteName'],
        'learn.html': '学习 - ' + book['siteName'],
        'flashcard.html': '闪卡 - ' + book['siteName'],
        'roots.html': '知识点索引 - ' + book['siteName'],
        'root-detail.html': '知识点详情 - ' + book['siteName'],
        'progress.html': '学习进度 - ' + book['siteName'],
    }
    for name in page_titles:
        p = os.path.join(dst, name)
        if not os.path.exists(p):
            continue
        h = io.open(p, encoding='utf-8').read()
        # 标题
        h = re.sub(r'<title>[^<]*</title>', '<title>%s</title>' % page_titles[name], h)
        # meta 描述
        h = re.sub(r'(<meta name="description" content=")[^"]*(")', lambda m: m.group(1) + book['description'] + m.group(2), h)
        h = re.sub(r'(<meta property="og:description" content=")[^"]*(")', lambda m: m.group(1) + book['description'] + m.group(2), h)
        h = re.sub(r'(<meta name="twitter:description" content=")[^"]*(")', lambda m: m.group(1) + book['description'] + m.group(2), h)
        h = re.sub(r'(<meta name="keywords" content=")[^"]*(")',
                   lambda m: m.group(1) + '%s,%s数学,数学知识点,人教版,小学数学,知识点' % (book['grade'] + book['term'], book['grade']) + m.group(2), h)
        h = re.sub(r'(<meta name="apple-mobile-web-app-title" content=")[^"]*(")',
                   lambda m: m.group(1) + book['appShortName'] + m.group(2), h)
        h = re.sub(r'(<meta property="og:title" content=")[^"]*(")', lambda m: m.group(1) + page_titles[name] + m.group(2), h)
        h = re.sub(r'(<meta property="og:site_name" content=")[^"]*(")', lambda m: m.group(1) + book['siteName'] + m.group(2), h)
        h = re.sub(r'(<meta name="twitter:title" content=")[^"]*(")', lambda m: m.group(1) + page_titles[name] + m.group(2), h)
        if name == 'index.html':
            # Hero 文案与统计卡片
            h = re.sub(r'<span class="hero-line">[^<]*</span>', '<span class="hero-line">%s</span>' % ('PLACEHOLDER'), h)
            for i, line in enumerate(['%d个核心知识点' % book['itemCount'], '轻松掌握', book['grade'] + book['term'] + '数学']):
                h = h.replace('<span class="hero-line">PLACEHOLDER</span>', '<span class="hero-line">%s</span>' % line, 1)
            h = re.sub(r'<p class="hero-subtitle">[^<]*</p>', '<p class="hero-subtitle">%s</p>' % book['heroSubtitle'], h)
            h = re.sub(r'(<div class="stat-label">核心知识点</div>)', r'\1', h)
            h = re.sub(r'<div class="stat-value">\d+</div>(\s*<div class="stat-label">核心知识点</div>)',
                       '<div class="stat-value">%d</div>\\1' % book['itemCount'], h)
            h = re.sub(r'<div class="stat-value">\d+</div>(\s*<div class="stat-label">章节覆盖</div>)',
                       '<div class="stat-value">%d</div>\\1' % len(book['chapters']), h)
            # 章节卡片
            h = re.sub(r'(<div class="chapters-grid">).*?(</div>\s*</div>\s*</section>)',
                       lambda m: m.group(1) + '\n' + chapter_cards(book) + '\n      ' + m.group(2), h, flags=re.S)
            h = re.sub(r'<h2 class="section-title">[^<]*章节</h2>',
                       '<h2 class="section-title">%s大章节</h2>' % cn_num(len(book['chapters'])), h)
            h = re.sub(r'<p class="footer-desc">[^<]*</p>',
                       '<p class="footer-desc">%s</p>' % (book['description'] + '通过闪卡、渐进学习、测试等多种模式，帮助小朋友系统掌握数学知识。适合家长辅导、学生自学、老师备课使用。'), h)
            # 底部加"返回全部年级 + 题型专项"
            h = h.replace('<p class="footer-copy">', '<p class="footer-copy"><a href="../">← 返回全部年级</a> · <a href="../drill/?book=%s">题型专项练习（口算 · 竖式 · 应用题）</a><br>' % book['id'], 1)
        # 模板里残留的旧册次文案
        h = h.replace('一年级下册数学知识点汇总', book['siteName'])
        h = h.replace('一年级下册数学', book['grade'] + book['term'] + '数学')
        h = h.replace('一年级下册', book['grade'] + book['term'])
        h = h.replace('一年级数学', book['appShortName'])
        # 旧域名 -> 本站
        h = h.replace('https://math-grade1-2.vercel.app', canon)
        h = h.replace('https://math.91stocks.com/grade2', canon)
        io.open(p, 'w', encoding='utf-8').write(h)

    # 其余 js 里的旧域名
    for jf in ('siteConfig.js', 'storage.js'):
        p = os.path.join(dst, 'js', jf)
        if os.path.exists(p):
            t = io.open(p, encoding='utf-8').read().replace('https://math-grade1-2.vercel.app', canon)
            io.open(p, 'w', encoding='utf-8').write(t)
    return dst

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('book', nargs='?')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--force-content', action='store_true', help='连 wordData.js 一起重置为模板')
    args = ap.parse_args()
    origin, books = load(None)
    if args.all:
        targets = [b for b in books if b['moduleDir'].endswith('-workshop')]
    elif args.book:
        _, b = load(args.book)
        targets = [b]
    else:
        sys.exit('用法: python3 site/new-book.py <book-id> | --all')
    for b in targets:
        d = build(b, origin, args.force_content)
        print('✅ %-16s -> %s' % (b['id'], os.path.relpath(d, os.path.dirname(BASE))))

if __name__ == '__main__':
    main()
