-- CreateTable
CREATE TABLE "ChromeHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "totalVisits" INTEGER NOT NULL,
    "estimatedMinutes" DOUBLE PRECISION NOT NULL,
    "productiveRatio" DOUBLE PRECISION NOT NULL,
    "categoryTotals" JSONB NOT NULL,
    "topSites" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChromeHistory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ChromeHistory" ADD CONSTRAINT "ChromeHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
