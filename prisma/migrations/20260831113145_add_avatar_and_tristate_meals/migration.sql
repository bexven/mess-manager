-- AlterTable
ALTER TABLE "MealEntry" ALTER COLUMN "ate" DROP NOT NULL,
ALTER COLUMN "ate" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarDataUrl" TEXT;
