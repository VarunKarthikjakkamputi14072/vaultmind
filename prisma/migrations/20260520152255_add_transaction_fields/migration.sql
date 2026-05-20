-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "chainId" INTEGER,
ADD COLUMN     "fromAmount" TEXT,
ADD COLUMN     "fromToken" TEXT,
ADD COLUMN     "gasUsed" TEXT,
ADD COLUMN     "riskScoreAtTime" INTEGER,
ADD COLUMN     "toAmount" TEXT,
ADD COLUMN     "toToken" TEXT,
ADD COLUMN     "usdValueAtTime" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_chainId_idx" ON "Transaction"("chainId");
