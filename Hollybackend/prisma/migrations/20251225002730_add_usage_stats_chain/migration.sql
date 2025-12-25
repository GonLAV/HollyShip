-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('free', 'starter', 'professional', 'business', 'enterprise');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "plan" "PlanTier" NOT NULL DEFAULT 'free',
ADD COLUMN     "quotaMonth" INTEGER NOT NULL DEFAULT 20;

-- CreateTable
CREATE TABLE "UsageMeter" (
    "id" BIGSERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "shipmentsTracked" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UsageMeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrackingChain" (
    "id" BIGSERIAL NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "carrierId" TEXT,
    "trackingNumber" TEXT NOT NULL,
    "handoffIndex" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackingChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatsRollup" (
    "ts" TIMESTAMP(3) NOT NULL,
    "shipmentsPerMinute" INTEGER NOT NULL,
    "shipmentsPerHour" INTEGER NOT NULL,
    "shipmentsToday" INTEGER NOT NULL,
    "shipmentsWeek" INTEGER NOT NULL,
    "mau" INTEGER NOT NULL,

    CONSTRAINT "StatsRollup_pkey" PRIMARY KEY ("ts")
);

-- CreateIndex
CREATE INDEX "UsageMeter_userId_idx" ON "UsageMeter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageMeter_userId_periodStart_key" ON "UsageMeter"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "TrackingChain_shipmentId_idx" ON "TrackingChain"("shipmentId");

-- CreateIndex
CREATE INDEX "TrackingChain_shipmentId_isCurrent_idx" ON "TrackingChain"("shipmentId", "isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "TrackingChain_shipmentId_carrierId_trackingNumber_key" ON "TrackingChain"("shipmentId", "carrierId", "trackingNumber");

-- AddForeignKey
ALTER TABLE "UsageMeter" ADD CONSTRAINT "UsageMeter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingChain" ADD CONSTRAINT "TrackingChain_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrackingChain" ADD CONSTRAINT "TrackingChain_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
