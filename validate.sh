#!/bin/bash
set -e
echo '=== ChainVault Validation Pipeline ==='

echo '[1/5] TypeScript strict type check...'
npx tsc --noEmit

echo '[2/5] ESLint syntax + security audit...'
npx eslint src/ --ext .ts,.tsx

echo '[3/5] Next.js production build...'
npx next build

echo '[4/5] Prisma schema validation...'
npx prisma validate

echo '[5/5] Security: confirming .env.local is not tracked by git...'
if git ls-files --error-unmatch .env.local 2>/dev/null; then
  echo 'FAIL: .env.local is tracked by git. Run: git rm --cached .env.local'
  exit 1
fi

echo ''
echo '=== ALL CHECKS PASSED — safe to deploy ==='
