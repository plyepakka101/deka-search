const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.DATABASE_URL.split('/?')[0],
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function migrate() {
  console.log('Connecting to Turso to create Admin sync tables...');

  // 1. Admin Memorize Items
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AdminMemorizeItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "deckId" TEXT NOT NULL,
      "sectionId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "sectionNumber" TEXT,
      "bookId" TEXT,
      "repetitions" INTEGER NOT NULL DEFAULT 0,
      "intervalDays" INTEGER NOT NULL DEFAULT 1,
      "easeFactor" REAL NOT NULL DEFAULT 2.5,
      "streak" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'new',
      "nextReviewAt" TEXT,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AdminMemorizeItem_deckId_sectionId_unique" UNIQUE ("deckId", "sectionId")
    );
  `);
  console.log('Created AdminMemorizeItem table');

  // 2. Admin Important Sections
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AdminImportantSection" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "bookId" TEXT,
      "sectionNumber" TEXT NOT NULL,
      "title" TEXT,
      "note" TEXT,
      "isHighlighted" INTEGER NOT NULL DEFAULT 1,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created AdminImportantSection table');

  // 3. Admin Bookmarks (Dekas)
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "AdminBookmark" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "decisionNumber" TEXT NOT NULL,
      "decisionYear" INTEGER,
      "parties" TEXT,
      "shortSummary" TEXT,
      "timestamp" INTEGER,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('Created AdminBookmark table');

  // Indexes
  await client.execute('CREATE INDEX IF NOT EXISTS "AdminMemorizeItem_deckId_idx" ON "AdminMemorizeItem"("deckId");');
  await client.execute('CREATE INDEX IF NOT EXISTS "AdminMemorizeItem_sectionId_idx" ON "AdminMemorizeItem"("sectionId");');
  await client.execute('CREATE INDEX IF NOT EXISTS "AdminImportantSection_bookId_idx" ON "AdminImportantSection"("bookId");');
  await client.execute('CREATE INDEX IF NOT EXISTS "AdminBookmark_decisionYear_idx" ON "AdminBookmark"("decisionYear");');

  console.log('Created all sync tables and indexes successfully!');
}

migrate().then(() => {
  console.log('Migration complete!');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
