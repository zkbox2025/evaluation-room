-- CreateTable
CREATE TABLE "Viewer" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceId" TEXT NOT NULL,

    CONSTRAINT "Viewer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Like" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerId" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,

    CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "viewerId" TEXT NOT NULL,
    "personSlug" TEXT NOT NULL,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Viewer_deviceId_key" ON "Viewer"("deviceId");

-- CreateIndex
CREATE INDEX "Like_evaluationId_idx" ON "Like"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "Like_viewerId_evaluationId_key" ON "Like"("viewerId", "evaluationId");

-- CreateIndex
CREATE INDEX "Favorite_personSlug_idx" ON "Favorite"("personSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_viewerId_personSlug_key" ON "Favorite"("viewerId", "personSlug");

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_viewerId_fkey" FOREIGN KEY ("viewerId") REFERENCES "Viewer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
