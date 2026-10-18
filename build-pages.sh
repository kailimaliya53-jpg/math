#!/usr/bin/env bash
# ============================================================
# 把多个开源项目 + 自建内容组装成一个可部署的静态目录 pages-dist
#
# 部署布局（站点列表来自 site/books.json）：
#   /              入口页（12 册知识点 + 口算 + 考试 + 语文英语）
#   /grade1-up/ … /grade6-down/   数学知识点（人教版 1~6 年级 12 册）
#   /kousuan/      口算题自动生成（bosichong/PrimarySchoolMathematics，Apache-2.0）
#   /exam/         小学数学在线考试 + 错题本（scott-lei/exam）
#   /chinese/      语文 · 一年级下册
#   /english-basic/    英语 850 词汇
#   /english-workshop/ 英语核心词工坊
#
# 用法：./build-pages.sh          然后 ./deploy-pages.sh 上传
# ============================================================
set -euo pipefail

REPO="$(cd "$(dirname "$0")" && pwd)"
DIST="$REPO/pages-dist"
SITE_ORIGIN="${SITE_ORIGIN:-https://math.91stocks.com}"
SKIP_KOUSUAN_BUILD="${SKIP_KOUSUAN_BUILD:-0}"

cd "$REPO"

echo "▶️  1/6 生成入口页并清空 pages-dist"
python3 site/make-hub.py
rm -rf "$DIST"; mkdir -p "$DIST"

echo "▶️  2/6 数学知识点（按 site/books.json 逐册部署）"
python3 - "$REPO" <<'PY' > /tmp/books.tsv
import json, io, sys
repo = sys.argv[1]
d = json.load(io.open(repo + '/site/books.json', encoding='utf-8'))
for b in d['books']:
    print('%s\t%s\t%s\t%s' % (b['moduleDir'], b['outputDir'], b['grade'], b['term']))
PY
while IFS=$'\t' read -r module out grade term; do
  target="$DIST${out}"
  mkdir -p "$target"
  rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/$module/" "$target/"
  echo "    ${grade}${term} -> ${out}"
done < /tmp/books.tsv

echo "▶️  3/6 入口页 -> /（同时保留 /hub）"
cp "$REPO/site/hub.html" "$DIST/index.html"
cp "$REPO/site/hub.html" "$DIST/hub.html"

echo "▶️  4/6 其它站点"
rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/site/chinese-grade1-site/"     "$DIST/chinese/"
rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/site/basic-english-site/"      "$DIST/english-basic/"
rsync -a --exclude 'README.md' --exclude '*.bat' "$REPO/site/basic-english-workshop/"  "$DIST/english-workshop/"
rsync -a --exclude 'README.md' --exclude 'scripts/' "$REPO/exam/"                      "$DIST/exam/"

echo "▶️  5/6 口算题生成器 -> /kousuan/"
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

echo "▶️  6/6 收尾处理"
# (a) 子目录里指向根路径的资源引用改成相对路径
find "$DIST" -mindepth 2 -name '*.html' -o -mindepth 2 -name '*.js' 2>/dev/null | while read -r f; do
  case "$f" in
    "$DIST/kousuan"/*) continue ;;   # 口算站按 /kousuan/ 构建，保持绝对路径
  esac
  sed -i '' -E 's#(href|src)="/(manifest\.json|icon-192\.png|icon-512\.png|css/|js/)#\1="./\2#g' "$f"
done

# (b) 去掉 Google Fonts 外链（国内常不可达且阻塞首屏）
find "$DIST" -name '*.html' -print0 | xargs -0 sed -i '' -E '/(fonts\.googleapis\.com|fonts\.gstatic\.com)/d'

# (c) 兜底检查：不应残留上游旧域名
if grep -rl 'vercel\.app\|github\.io' "$DIST" 2>/dev/null | head -1 | grep -q .; then
  echo "    ⚠️  发现残留旧域名："
  grep -rl 'vercel\.app\|github\.io' "$DIST" | head -5
else
  echo "    域名检查通过 ✅"
fi

# (d) robots.txt + sitemap.xml
cat > "$DIST/robots.txt" <<EOF
User-agent: *
Allow: /

Sitemap: ${SITE_ORIGIN}/sitemap.xml
EOF

python3 - "$DIST" "$SITE_ORIGIN" <<'PY'
import io, os, sys, json, datetime
dist, origin = sys.argv[1], sys.argv[2]
books = json.load(io.open(os.path.join(os.path.dirname(dist), 'site', 'books.json'), encoding='utf-8'))['books']
pages = [('/' + b['outputDir'].strip('/') + '/', '0.9') for b in books]
pages += [('/', '1.0'), ('/hub', '0.8'), ('/kousuan/', '0.9'), ('/exam/', '0.9'),
          ('/chinese/', '0.7'), ('/english-basic/', '0.7'), ('/english-workshop/', '0.7')]
# 每册的子页面
sub = [('learn', '0.6'), ('flashcard', '0.6'), ('roots', '0.5'), ('progress', '0.4')]
for b in books:
    base = '/' + b['outputDir'].strip('/')
    pages += [(base + '/' + s, p) for s, p in sub]
today = datetime.date.today().isoformat()
out = ['<?xml version="1.0" encoding="UTF-8"?>',
       '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for p, pri in pages:
    out.append('  <url><loc>%s%s</loc><lastmod>%s</lastmod><changefreq>weekly</changefreq><priority>%s</priority></url>'
               % (origin, p, today, pri))
out.append('</urlset>')
io.open(os.path.join(dist, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print('    sitemap.xml：%d 条 URL' % len(pages))
PY

echo "▶️  附带各项目许可证"
cp "$REPO/site/LICENSE" "$DIST/LICENSE"
cp "$REPO/kousuan/LICENSE" "$DIST/kousuan/LICENSE"
[[ -f "$REPO/exam/LICENSE" ]] && cp "$REPO/exam/LICENSE" "$DIST/exam/LICENSE" || true

echo
echo "✅ 完成：$DIST"
du -sh "$DIST"
echo -n "文件数: "; find "$DIST" -type f | wc -l | tr -d ' '
