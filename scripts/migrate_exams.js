const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.DATABASE_URL.split('/?')[0],
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
  console.log('Connecting to Turso...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ExamCollection" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "category" TEXT NOT NULL,
        "year" INTEGER,
        "description" TEXT,
        "source" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created ExamCollection table');

  await client.execute(`
    CREATE TABLE IF NOT EXISTS "ExamQuestion" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "collectionId" TEXT NOT NULL,
        "questionNumber" TEXT NOT NULL,
        "title" TEXT,
        "facts" TEXT NOT NULL,
        "prompt" TEXT NOT NULL,
        "officialAnswer" TEXT NOT NULL,
        "examDate" TEXT,
        "examYear" INTEGER,
        "category" TEXT NOT NULL,
        "keyIssues" TEXT NOT NULL,
        "relatedSections" TEXT NOT NULL,
        "relatedDekas" TEXT NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ExamQuestion_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "ExamCollection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );
  `);
  console.log('Created ExamQuestion table');

  await client.execute('CREATE INDEX IF NOT EXISTS "ExamCollection_category_idx" ON "ExamCollection"("category");');
  await client.execute('CREATE INDEX IF NOT EXISTS "ExamCollection_year_idx" ON "ExamCollection"("year");');
  await client.execute('CREATE INDEX IF NOT EXISTS "ExamQuestion_category_idx" ON "ExamQuestion"("category");');
  await client.execute('CREATE INDEX IF NOT EXISTS "ExamQuestion_collectionId_idx" ON "ExamQuestion"("collectionId");');
  await client.execute('CREATE INDEX IF NOT EXISTS "ExamQuestion_examYear_idx" ON "ExamQuestion"("examYear");');

  console.log('Created all indexes successfully!');
}

migrate().then(() => {
  console.log('Migration complete!');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
