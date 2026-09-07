-- Attribute guest meals to a specific household member (the "host"), who is
-- now billed for that guest's meal cost instead of it being an unattributed
-- shared cost. Safe to run against existing data:
--   1. Add the column nullable first.
--   2. Drop any pre-existing zero-count rows (leftover placeholders from the
--      old one-row-per-date/mealType model; they carry no information).
--   3. Any remaining rows (a real guest count was recorded under the old
--      model, which had no concept of "whose guest") are attributed to the
--      admin account, since that's the only reasonable default — review
--      Admin -> Backup export or the Meals page for the affected date if a
--      different host should get credit.
--   4. Only then enforce NOT NULL + the foreign key + the new unique index.

-- AlterTable
ALTER TABLE "GuestMeal" ADD COLUMN "hostUserId" TEXT;

-- DataMigration: drop meaningless zero-count placeholder rows
DELETE FROM "GuestMeal" WHERE "count" = 0;

-- DataMigration: backfill any remaining real guest counts to the admin user
UPDATE "GuestMeal"
SET "hostUserId" = (SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1)
WHERE "hostUserId" IS NULL;

UPDATE "GuestMeal"
SET "hostUserId" = (SELECT "id" FROM "User" ORDER BY "createdAt" ASC LIMIT 1)
WHERE "hostUserId" IS NULL;

-- Anything still unresolved (no users exist at all) can't satisfy the new
-- NOT NULL + FK constraint, so drop it rather than fail the deploy.
DELETE FROM "GuestMeal" WHERE "hostUserId" IS NULL;

-- AlterTable
ALTER TABLE "GuestMeal" ALTER COLUMN "hostUserId" SET NOT NULL;

-- DropIndex
DROP INDEX "GuestMeal_date_mealType_key";

-- CreateIndex
CREATE UNIQUE INDEX "GuestMeal_date_mealType_hostUserId_key" ON "GuestMeal"("date", "mealType", "hostUserId");

-- AddForeignKey
ALTER TABLE "GuestMeal" ADD CONSTRAINT "GuestMeal_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
