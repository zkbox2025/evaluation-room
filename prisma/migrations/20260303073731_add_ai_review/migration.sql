-- CreateTable
CREATE TABLE "AiReview" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetKey" TEXT,
    "inputSnapshot" JSONB,
    "resultJson" JSONB,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "promptVersion" INTEGER NOT NULL DEFAULT 1,
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "costUsdMicro" INTEGER,

    CONSTRAINT "AiReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiReview_viewerId_createdAt_idx" ON "AiReview"("viewerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiReview_targetType_createdAt_idx" ON "AiReview"("targetType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiReview_targetType_targetKey_createdAt_idx" ON "AiReview"("targetType", "targetKey", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AiReview" ADD CONSTRAINT "AiReview_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
