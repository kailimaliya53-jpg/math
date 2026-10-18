#!/usr/bin/env bash
# 构建并部署到 Cloudflare Pages（wrangler 直传）
#
# 用法：./deploy-pages.sh
# 前置：npm i -g wrangler && wrangler login
#      网络不通时：export https_proxy=http://127.0.0.1:7899 http_proxy=http://127.0.0.1:7899
set -euo pipefail

cd "$(dirname "$0")"

PROJECT="${PAGES_PROJECT:-math-classroom}"
BRANCH="${PAGES_BRANCH:-main}"

./build-pages.sh

echo "▶️  上传到 Cloudflare Pages 项目 ${PROJECT}"
wrangler pages deploy pages-dist \
  --project-name="${PROJECT}" \
  --branch="${BRANCH}" \
  --commit-dirty=true

echo "✅ 完成：https://${PROJECT}.pages.dev （自定义域名 https://math.91stocks.com）"
