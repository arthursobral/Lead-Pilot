-- CreateEnum
CREATE TYPE "PullRequestState" AS ENUM ('OPEN', 'CLOSED', 'MERGED');

-- CreateEnum
CREATE TYPE "ReviewState" AS ENUM ('APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ObservationType" AS ENUM ('ACHIEVEMENT', 'CUSTOMER_FEEDBACK', 'COACHING_OPPORTUNITY', 'CONCERN', 'LEADERSHIP', 'MENTORING', 'COMMUNICATION', 'INCIDENT', 'OWNERSHIP', 'CONTEXT');

-- CreateEnum
CREATE TYPE "ObservationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TimelineEntryType" AS ENUM ('SIGNAL', 'OBSERVATION', 'ACHIEVEMENT', 'INSIGHT', 'REPORT', 'MILESTONE');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('POSITIVE_SIGNAL', 'COACHING_OPPORTUNITY', 'RISK', 'GROWTH_PATTERN', 'RECOGNITION', 'WORKLOAD_SIGNAL', 'COMMUNICATION_SIGNAL', 'LEADERSHIP_SIGNAL');

-- CreateEnum
CREATE TYPE "FactConfidence" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "team_leads" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "githubLogin" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "developers" (
    "id" TEXT NOT NULL,
    "githubId" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "avatarUrl" TEXT,
    "role" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "developers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_lead_developers" (
    "teamLeadId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_lead_developers_pkey" PRIMARY KEY ("teamLeadId","developerId")
);

-- CreateTable
CREATE TABLE "pull_requests" (
    "id" TEXT NOT NULL,
    "githubNodeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "state" "PullRequestState" NOT NULL,
    "draft" BOOLEAN NOT NULL DEFAULT false,
    "repositoryName" TEXT NOT NULL,
    "repositoryFullName" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "githubCreatedAt" TIMESTAMP(3) NOT NULL,
    "githubUpdatedAt" TIMESTAMP(3) NOT NULL,
    "mergedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "additions" INTEGER NOT NULL DEFAULT 0,
    "deletions" INTEGER NOT NULL DEFAULT 0,
    "changedFiles" INTEGER NOT NULL DEFAULT 0,
    "labels" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pull_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_request_reviews" (
    "id" TEXT NOT NULL,
    "githubNodeId" TEXT NOT NULL,
    "pullRequestId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "state" "ReviewState" NOT NULL,
    "body" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pull_request_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_snapshots" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "pullRequestsOpened" INTEGER NOT NULL DEFAULT 0,
    "pullRequestsMerged" INTEGER NOT NULL DEFAULT 0,
    "pullRequestsClosed" INTEGER NOT NULL DEFAULT 0,
    "averagePrSizeLines" DOUBLE PRECISION,
    "averageMergeTimeHours" DOUBLE PRECISION,
    "reviewsGiven" INTEGER NOT NULL DEFAULT 0,
    "reviewsReceived" INTEGER NOT NULL DEFAULT 0,
    "activeRepositories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observations" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "teamLeadId" TEXT NOT NULL,
    "type" "ObservationType" NOT NULL,
    "severity" "ObservationSeverity" NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "observations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timeline_entries" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "type" "TimelineEntryType" NOT NULL,
    "summary" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "pullRequestId" TEXT,
    "pullRequestReviewId" TEXT,
    "observationId" TEXT,
    "insightId" TEXT,
    "weeklyReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facts" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "confidence" "FactConfidence" NOT NULL,
    "sources" JSONB NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "occurredAt" TIMESTAMP(3),
    "observationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insights" (
    "id" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "type" "InsightType" NOT NULL,
    "summary" TEXT NOT NULL,
    "model" TEXT,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "talking_points" (
    "id" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "talking_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fact_insights" (
    "factId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,

    CONSTRAINT "fact_insights_pkey" PRIMARY KEY ("factId","insightId")
);

-- CreateTable
CREATE TABLE "weekly_reports" (
    "id" TEXT NOT NULL,
    "teamLeadId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "content" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_report_insights" (
    "weeklyReportId" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,

    CONSTRAINT "weekly_report_insights_pkey" PRIMARY KEY ("weeklyReportId","insightId")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_leads_email_key" ON "team_leads"("email");

-- CreateIndex
CREATE UNIQUE INDEX "team_leads_githubLogin_key" ON "team_leads"("githubLogin");

-- CreateIndex
CREATE UNIQUE INDEX "developers_githubId_key" ON "developers"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "developers_githubLogin_key" ON "developers"("githubLogin");

-- CreateIndex
CREATE UNIQUE INDEX "pull_requests_githubNodeId_key" ON "pull_requests"("githubNodeId");

-- CreateIndex
CREATE INDEX "pull_requests_developerId_idx" ON "pull_requests"("developerId");

-- CreateIndex
CREATE INDEX "pull_requests_repositoryFullName_idx" ON "pull_requests"("repositoryFullName");

-- CreateIndex
CREATE INDEX "pull_requests_state_idx" ON "pull_requests"("state");

-- CreateIndex
CREATE INDEX "pull_requests_githubCreatedAt_idx" ON "pull_requests"("githubCreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pull_request_reviews_githubNodeId_key" ON "pull_request_reviews"("githubNodeId");

-- CreateIndex
CREATE INDEX "pull_request_reviews_pullRequestId_idx" ON "pull_request_reviews"("pullRequestId");

-- CreateIndex
CREATE INDEX "pull_request_reviews_developerId_idx" ON "pull_request_reviews"("developerId");

-- CreateIndex
CREATE INDEX "pull_request_reviews_submittedAt_idx" ON "pull_request_reviews"("submittedAt");

-- CreateIndex
CREATE INDEX "metric_snapshots_developerId_idx" ON "metric_snapshots"("developerId");

-- CreateIndex
CREATE INDEX "metric_snapshots_periodStart_idx" ON "metric_snapshots"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "metric_snapshots_developerId_periodStart_periodEnd_key" ON "metric_snapshots"("developerId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "observations_developerId_idx" ON "observations"("developerId");

-- CreateIndex
CREATE INDEX "observations_teamLeadId_idx" ON "observations"("teamLeadId");

-- CreateIndex
CREATE INDEX "observations_occurredAt_idx" ON "observations"("occurredAt");

-- CreateIndex
CREATE INDEX "observations_type_idx" ON "observations"("type");

-- CreateIndex
CREATE INDEX "observations_deletedAt_idx" ON "observations"("deletedAt");

-- CreateIndex
CREATE INDEX "timeline_entries_developerId_occurredAt_idx" ON "timeline_entries"("developerId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "timeline_entries_type_idx" ON "timeline_entries"("type");

-- CreateIndex
CREATE INDEX "facts_developerId_idx" ON "facts"("developerId");

-- CreateIndex
CREATE INDEX "facts_confidence_idx" ON "facts"("confidence");

-- CreateIndex
CREATE INDEX "insights_developerId_idx" ON "insights"("developerId");

-- CreateIndex
CREATE INDEX "insights_periodStart_periodEnd_idx" ON "insights"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "talking_points_insightId_idx" ON "talking_points"("insightId");

-- CreateIndex
CREATE INDEX "weekly_reports_teamLeadId_idx" ON "weekly_reports"("teamLeadId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_reports_teamLeadId_periodStart_key" ON "weekly_reports"("teamLeadId", "periodStart");

-- AddForeignKey
ALTER TABLE "team_lead_developers" ADD CONSTRAINT "team_lead_developers_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "team_leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_lead_developers" ADD CONSTRAINT "team_lead_developers_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_requests" ADD CONSTRAINT "pull_requests_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_reviews" ADD CONSTRAINT "pull_request_reviews_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_reviews" ADD CONSTRAINT "pull_request_reviews_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metric_snapshots" ADD CONSTRAINT "metric_snapshots_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observations" ADD CONSTRAINT "observations_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "team_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "pull_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_pullRequestReviewId_fkey" FOREIGN KEY ("pullRequestReviewId") REFERENCES "pull_request_reviews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timeline_entries" ADD CONSTRAINT "timeline_entries_weeklyReportId_fkey" FOREIGN KEY ("weeklyReportId") REFERENCES "weekly_reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facts" ADD CONSTRAINT "facts_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "facts" ADD CONSTRAINT "facts_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "observations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insights" ADD CONSTRAINT "insights_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "developers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "talking_points" ADD CONSTRAINT "talking_points_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_insights" ADD CONSTRAINT "fact_insights_factId_fkey" FOREIGN KEY ("factId") REFERENCES "facts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fact_insights" ADD CONSTRAINT "fact_insights_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_reports" ADD CONSTRAINT "weekly_reports_teamLeadId_fkey" FOREIGN KEY ("teamLeadId") REFERENCES "team_leads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_report_insights" ADD CONSTRAINT "weekly_report_insights_weeklyReportId_fkey" FOREIGN KEY ("weeklyReportId") REFERENCES "weekly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_report_insights" ADD CONSTRAINT "weekly_report_insights_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "insights"("id") ON DELETE CASCADE ON UPDATE CASCADE;
