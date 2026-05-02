-- AlterTable
ALTER TABLE "ChromeHistory" ADD COLUMN     "hourlyPattern" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "peakHours" JSONB NOT NULL DEFAULT '[]';
