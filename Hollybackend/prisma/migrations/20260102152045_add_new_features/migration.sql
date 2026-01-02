-- AlterTable
ALTER TABLE "Shipment" 
ADD COLUMN "deliveryNotes" TEXT,
ADD COLUMN "carbonFootprintKg" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "SavedAddress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "instructions" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPhoto" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "photoType" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "DeliveryPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "defaultInstructions" TEXT,
    "preferredTimeStart" TEXT,
    "preferredTimeEnd" TEXT,
    "allowReschedule" BOOLEAN NOT NULL DEFAULT true,
    "allowRedirect" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnDispatch" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnDelivery" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedAddress_userId_idx" ON "SavedAddress"("userId");

-- CreateIndex
CREATE INDEX "SavedAddress_userId_isDefault_idx" ON "SavedAddress"("userId", "isDefault");

-- CreateIndex
CREATE INDEX "DeliveryPhoto_shipmentId_idx" ON "DeliveryPhoto"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryPreferences_userId_key" ON "DeliveryPreferences"("userId");

-- CreateIndex
CREATE INDEX "DeliveryPreferences_userId_idx" ON "DeliveryPreferences"("userId");

-- AddForeignKey
ALTER TABLE "SavedAddress" ADD CONSTRAINT "SavedAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryPhoto" ADD CONSTRAINT "DeliveryPhoto_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
