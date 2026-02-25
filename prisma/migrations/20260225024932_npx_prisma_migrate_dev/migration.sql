-- CreateTable
CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerId" TEXT NOT NULL,
    "personSlug" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "resultText" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "costUsdMicro" INTEGER,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiGeneration_viewerId_createdAt_idx" ON "AiGeneration"("viewerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiGeneration_personSlug_createdAt_idx" ON "AiGeneration"("personSlug", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AiGeneration_viewerId_personSlug_createdAt_idx" ON "AiGeneration"("viewerId", "personSlug", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "AiGeneration" ADD CONSTRAINT "AiGeneration_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
