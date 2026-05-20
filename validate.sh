#!/bin/bash
set -a
source .env
set +a

echo "========================================"
echo "CHAINVAULT MASTER VALIDATION PIPELINE"
echo "========================================"

echo ""
echo "[1/12] TypeScript Check..."
npx tsc --noEmit || exit 1

echo ""
echo "[2/12] ESLint Check..."
npm run lint || exit 1

echo ""
echo "[3/12] Production Build Check..."
npm run build || exit 1

echo ""
echo "[4/12] Dependency Audit..."
npm audit --audit-level=high

echo ""
echo "[5/12] Prisma Schema Validation..."
npx prisma validate || exit 1

echo ""
echo "[6/12] Prisma Migration Status..."
npx prisma migrate status || exit 1

echo ""
echo "[7/12] Environment Variable Validation..."
node -e "
const required = [
  'ONEINCH_API_KEY',
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'DATABASE_URL'
];

const missing = required.filter(v => !process.env[v]);

if (missing.length) {
  console.error('Missing ENV vars:', missing);
  process.exit(1);
}

console.log('ENV validation passed');
" || exit 1

echo ""
echo "[8/12] Search for Hardcoded Secrets..."
grep -R "ONEINCH_API_KEY\|sk_live\|PRIVATE_KEY\|SECRET" src --exclude-dir=node_modules && exit 1 || echo "No secrets found"

echo ""
echo "[9/12] Check for Console Logs in Production Code..."
grep -R "console.log" src --exclude-dir=node_modules && echo "WARNING: console.log found"

echo ""
echo "[10/12] API Route Structure Validation..."
find src/app/api -type f

echo ""
echo "[11/12] Verify Required Core Modules..."
required_files=(
  "src/lib/env.ts"
  "src/lib/wagmi-config.ts"
  "src/lib/prisma.ts"
  "src/lib/rate-limit.ts"
)

for file in "${required_files[@]}"
do
  if [ ! -f "$file" ]; then
    echo "Missing required file: $file"
    exit 1
  fi
done

echo "Core modules validated"

echo ""
echo "[12/12] Final Phase Status..."
echo "========================================"
echo "ALL VALIDATIONS COMPLETED"
echo "IF NO ERRORS ABOVE -> CURRENT PHASE PASSED"
echo "========================================"
