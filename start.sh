#!/bin/bash
cd "$(dirname "$0")"

echo "🚀 WebHarvest Pro v2.0"
echo "━━━━━━━━━━━━━━━━━━━━━━"

if ! command -v node &> /dev/null; then
    echo "❌ Node.js غير مثبت!"
    echo "🔗 حمل من: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js موجود"
echo "📦 افتح المتصفح: http://localhost:5000"
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5000 2>/dev/null &
fi

node server.js
