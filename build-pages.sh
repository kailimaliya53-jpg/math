#!/usr/bin/env bash
# ============================================================
# 把三个项目组装成一个可部署的静态目录 pages-dist
#
# 目录布局（部署后）：
#   /             数学知识点 · 一年级下册（人教版，自带 PWA）
#   /grade2/      数学知识点 · 二年级上册（复用同一模板，本站编写）
#   /kousuan/     口算题自动生成（bosichong/PrimarySchoolMathematics，Apache-2.0）
#   /exam/        小学数学在线考试 + 错题本（scott-lei/exam）
#   /chinese/    语文 · 一年级下册
#   /english-basic/    英语 850 词汇
#   /english-workshop/ 英语核心词工坊
#   /hub.html     全部站点入口
#
# 用法：./build-pages.sh        然后 ./deploy-pages.sh 上传
# ============================================================
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
DIST="$REPO/pages-dist"
SITE_ORIGIN="${SITE_ORIGIN:-https://math.91stocks.com}"
SKIP_KOUSUAN_BUILD="${SKIP_KOUSUAN_BUILD:-0}"

cd "$REPO"

echo "▶️  1/7 清空并重建 pages-dist"
rm -rf "$DIST"; mkdir -p "$DIST"

echo "▶️  2/7 数学知识点（一年级下册）-> 域名根目录"
rsync -a --exclude 'README.md' --exclude '*.bat' --exclude 'make-hub.py' \
  "$REPO/site/math-grade1-2-workshop/" "$DIST/"

echo "▶️  3/7 其它站点 -> 子目录"
rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/site/grade2-up-workshop/"   "$DIST/grade2/"
rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/site/chinese-grade1-site/"  "$DIST/chinese/"
rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/site/basic-english-site/"   "$DIST/english-basic/"
rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/site/basic-english-workshop/" "$DIST/english-workshop/"

echo "▶️  4/7 入口页 hub.html"
cp "$REPO/site/hub.html" "$DIST/hub.html"

echo "▶️  5/7 在线考试平台 -> /exam/"
rsync -a --exclude 'README.md' --exclude 'scripts/' "$REPO/exam/" "$DIST/exam/"

echo "▶️  6/7 口算题生成器 -> /kousuan/"
if [[ "$SKIP_KOUSUAN_BUILD" == "1" && -d "$REPO/kousuan/dist" ]]; then
  echo "    跳过构建，使用已有 kousuan/dist"
else
  ( cd "$REPO/kousuan"
    if [[ ! -d node_modules ]]; then
      echo "    安装依赖（首次较慢）..."
      pnpm install --no-frozen-lockfile >/dev/null 2>&1
    fi
    echo "    构建（base=/kousuan/）..."
    npx vite build --base=/kousuan/ >/dev/null 2>&1
  )
fi
rsync -a --delete "$REPO/kousuan/dist/" "$DIST/kousuan/"

echo "▶️  7/7 收尾处理"
# (a) 子目录里指向根路径的资源引用改成相对路径（否则会 404）
find "$DIST/grade2" "$DIST/chinese" "$DIST/english-basic" "$DIST/english-workshop" \
  \( -name '*.html' -o -name '*.js' \) -print0 |
  xargs -0 sed -i '' -E 's#(href|src)="/(manifest\.json|icon-192\.png|icon-512\.png|css/|js/)#\1="./\2#g'

# (b) 去掉 Google Fonts 外链（国内常被墙，会拖慢首屏；CSS 自带系统字体回退）
find "$DIST" -name '*.html' -print0 |
  xargs -0 sed -i '' -E '/(fonts\.googleapis\.com|fonts\.gstatic\.com)/d'

# (c) 旧域名 -> 本站域名
grep -rl 'vercel\.app\|github\.io' "$DIST" 2>/dev/null | while read -r f; do
  sed -i '' \
    -e "s#https://math-grade1-2\.vercel\.app#${SITE_ORIGIN}#g" \
    -e "s#https://basic-english\.vercel\.app#${SITE_ORIGIN}/english-workshop#g" \
    "$f"
done

# (d) 数学站首页加一个"更多站点"入口
for f in "$DIST/index.html" "$DIST/grade2/index.html"; do
  [[ -f "$f" ]] || continue
  grep -q 'href="hub.html"' "$f" || \
    sed -i '' 's#<p class="footer-copy">#<p class="footer-copy"><a href="hub.html">口算练习 / 在线考试 / 语文英语 →</a><br>#' "$f"
done
# grade2 在子目录里，链接要指到上一级
if [[ -f "$DIST/grade2/index.html" ]]; then
  sed -i '' 's#href="hub.html"#href="../hub.html"#' "$DIST/grade2/index.html"
fi

# (e) robots.txt + sitemap.xml（覆盖根目录下的旧文件）
cat > "$DIST/robots.txt" <<EOF
User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
EOF

python3 - "$DIST" "$SITE_ORIGIN" <<'PY'
import io, os, sys, datetime
dist, origin = sys.argv[1], sys.argv[2]
pages = ['/', '/hub', '/grade2/', '/grade2/learn', '/grade2/flashcard', '/grade2/roots', '/grade2/progress',
         '/kousuan/', '/exam/', '/chinese/', '/english-basic/', '/english-workshop/',
         '/learn', '/flashcard', '/roots', '/progress']
today = datetime.date.today().isoformat()
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for p in pages:
    out.append('  <url><loc>%s%s</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>%s</priority></url>'
               % (origin, p, today, '1.0' if p == '/' else '0.8'))
out.append('</urlset>')
io.open(os.path.join(dist, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')

# 数学站在子目录也要一份 robots（避免旧文件干扰）
io.open(os.path.join(dist, 'grade2', 'robots.txt'), 'w', encoding='utf-8').write(
    'User-agent: *\nAllow: /\n')
print('    sitemap.xml 写入 %d 条 URL' % len(pages))
PY

echo "▶️  附带各项目许可证"
cp "$REPO/site/LICENSE" "$DIST/LICENSE"                       # mini-classroom (MIT)
cp "$REPO/kousuan/LICENSE" "$DIST/kousuan/LICENSE"            # Apache-2.0
[[ -f "$REPO/exam/LICENSE" ]] && cp "$REPO/exam/LICENSE" "$DIST/exam/LICENSE" || true

echo
echo "✅ 完成：$DIST"
du -sh "$DIST"
echo -n "文件数: "; find "$DIST" -type f | wc -l | tr -d ' '
