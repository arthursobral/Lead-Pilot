-- ============================================================================
-- Migration: add_fact_type_and_dedup_key
--
-- Changes to the `facts` table for Day 5 Knowledge Engine:
--   1. Create FactType enum
--   2. Rename column `sources` -> `evidence` (same Json shape, clearer name)
--   3. Drop `observationId` FK (evidence Json replaces it)
--   4. Add `type` column (FactType enum, required)
--   5. Add `dedupKey` column (unique, for idempotent fact generation)
--   6. Add `updatedAt` column
--   7. Make `periodStart` and `periodEnd` NOT NULL
--   8. Replace old single-column indexes with composite index
-- ============================================================================

-- CreateEnum
CREATE TYPE "FactType" AS ENUM (
  'ACTIVITY_SIGNAL',
  'COLLABORATION_SIGNAL',
  'METRIC_PATTERN',
  'OBSERVATION_FACT',
  'ACHIEVEMENT',
  'COACHING_SIGNAL'
);

-- Drop old FK before altering the column it references
ALTER TABLE "facts" DROP CONSTRAINT IF EXISTS "facts_observationId_fkey";

-- Rename sources -> evidence
ALTER TABLE "facts" RENAME COLUMN "sources" TO "evidence";

-- Drop observationId column
ALTER TABLE "facts" DROP COLUMN IF EXISTS "observationId";

-- Drop occurredAt (every fact is period-scoped; no point-in-time needed)
ALTER TABLE "facts" DROP COLUMN IF EXISTS "occurredAt";

-- Add type column (default to OBSERVATION_FACT for any pre-existing rows)
ALTER TABLE "facts" ADD COLUMN "type" "FactType" NOT NULL DEFAULT 'OBSERVATION_FACT';
-- Remove the default so future inserts must supply the value explicitly
ALTER TABLE "facts" ALTER COLUMN "type" DROP DEFAULT;

-- Add dedupKey column (unique, not null -- facts table is empty at this migration point)
ALTER TABLE "facts" ADD COLUMN "dedupKey" TEXT NOT NULL DEFAULT '';
-- Remove the default so future inserts must supply the value explicitly
ALTER TABLE "facts" ALTER COLUMN "dedupKey" DROP DEFAULT;
CREATE UNIQUE INDEX "facts_dedupKey_key" ON "facts"("dedupKey");

-- Add updatedAt column
ALTER TABLE "facts" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make periodStart and periodEnd NOT NULL
-- (Safe: the facts table has no application data yet.)
ALTER TABLE "facts" ALTER COLUMN "periodStart" SET NOT NULL;
ALTER TABLE "facts" ALTER COLUMN "periodEnd" SET NOT NULL;

-- Drop old indexes
DROP INDEX IF EXISTS "facts_developerId_idx";
DROP INDEX IF EXISTS "facts_confidence_idx";

-- Add new indexes
CREATE INDEX "facts_developerId_periodStart_periodEnd_idx" ON "facts"("developerId", "periodStart", "periodEnd");
CREATE INDEX "facts_type_idx" ON "facts"("type");
