-- CreateTable: team_metric_snapshots
CREATE TABLE "team_metric_snapshots" (
    "id" TEXT NOT NULL,
    "teamLeadId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "developerCount" INTEGER NOT NULL DEFAULT 0,
    "totalPrsOpened" INTEGER NOT NULL DEFAULT 0,
    "totalPrsMerged" INTEGER NOT NULL DEFAULT 0,
    "totalPrsClosed" INTEGER NOT NULL DEFAULT 0,
    "averageMergeTimeHours" DOUBLE PRECISION,
    "totalReviewsGiven" INTEGER NOT NULL DEFAULT 0,
    "totalReviewsReceived" INTEGER NOT NULL DEFAULT 0,
    "activeRepositories" TEXT[],
    "repoFocus" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_metric_snapshots_teamLeadId_periodStart_periodEnd_key"
    ON "team_metric_snapshots"("teamLeadId", "periodStart", "periodEnd");

CREATE INDEX "team_metric_snapshots_teamLeadId_idx"
    ON "team_metric_snapshots"("teamLeadId");

CREATE INDEX "team_metric_snapshots_periodStart_idx"
    ON "team_metric_snapshots"("periodStart");

-- AddForeignKey
ALTER TABLE "team_metric_snapshots"
    ADD CONSTRAINT "team_metric_snapshots_teamLeadId_fkey"
    FOREIGN KEY ("teamLeadId") REFERENCES "team_leads"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
