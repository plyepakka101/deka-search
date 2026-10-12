-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileName" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "Decision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "decisionNumber" TEXT NOT NULL,
    "decisionYear" INTEGER,
    "caseNumberSupreme" TEXT,
    "caseNumberLower" TEXT,
    "parties" TEXT,
    "law" TEXT,
    "shortSummary" TEXT,
    "longSummary" TEXT,
    "source" TEXT,
    "judge" TEXT,
    "court" TEXT,
    "department" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "importBatchId" TEXT,
    CONSTRAINT "Decision_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "LawBook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT,
    "lastUpdated" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Decision_decisionNumber_key" ON "Decision"("decisionNumber");

-- CreateIndex
CREATE INDEX "Decision_decisionYear_idx" ON "Decision"("decisionYear");

-- CreateIndex
CREATE INDEX "Decision_law_idx" ON "Decision"("law");

