-- CreateTable
CREATE TABLE "Cert" (
    "id" TEXT NOT NULL,
    "idNum" TEXT NOT NULL,
    "certNum" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "issuingAgency" TEXT NOT NULL,
    "expDate" TIMESTAMP(3) NOT NULL,
    "certType" TEXT NOT NULL,
    "certImageUrl" TEXT,
    "profileImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nameLeft" DOUBLE PRECISION,
    "nameTop" DOUBLE PRECISION,
    "nameScaleX" DOUBLE PRECISION,
    "nameScaleY" DOUBLE PRECISION,
    "nameAngle" DOUBLE PRECISION,
    "nameOriginX" TEXT,
    "idNumLeft" DOUBLE PRECISION,
    "idNumTop" DOUBLE PRECISION,
    "idNumScaleX" DOUBLE PRECISION,
    "idNumScaleY" DOUBLE PRECISION,
    "idNumAngle" DOUBLE PRECISION,
    "idNumOriginX" TEXT,
    "organizationLeft" DOUBLE PRECISION,
    "organizationTop" DOUBLE PRECISION,
    "organizationScaleX" DOUBLE PRECISION,
    "organizationScaleY" DOUBLE PRECISION,
    "organizationAngle" DOUBLE PRECISION,
    "organizationOriginX" TEXT,
    "certNumLeft" DOUBLE PRECISION,
    "certNumTop" DOUBLE PRECISION,
    "certNumScaleX" DOUBLE PRECISION,
    "certNumScaleY" DOUBLE PRECISION,
    "certNumAngle" DOUBLE PRECISION,
    "certNumOriginX" TEXT,
    "expDateLeft" DOUBLE PRECISION,
    "expDateTop" DOUBLE PRECISION,
    "expDateScaleX" DOUBLE PRECISION,
    "expDateScaleY" DOUBLE PRECISION,
    "expDateAngle" DOUBLE PRECISION,
    "expDateOriginX" TEXT,
    "profileLeft" DOUBLE PRECISION,
    "profileTop" DOUBLE PRECISION,
    "profileScaleX" DOUBLE PRECISION,
    "profileScaleY" DOUBLE PRECISION,
    "profileAngle" DOUBLE PRECISION,

    CONSTRAINT "Cert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cert_idNum_key" ON "Cert"("idNum");

-- CreateIndex
CREATE UNIQUE INDEX "Cert_certNum_key" ON "Cert"("certNum");
