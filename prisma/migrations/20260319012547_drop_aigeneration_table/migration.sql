/*
  Warnings:

  - You are about to drop the `AiGeneration` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AiGeneration" DROP CONSTRAINT "AiGeneration_viewerId_fkey";

-- DropTable
DROP TABLE "AiGeneration";
