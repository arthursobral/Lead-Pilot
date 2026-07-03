-- AlterTable: add repoFocus column to metric_snapshots
ALTER TABLE "metric_snapshots" ADD COLUMN "repoFocus" JSONB NOT NULL DEFAULT '{}';
