require('dotenv/config');
const { createClient } = require('@libsql/client');

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

async function migrate() {
  console.log('Running DDL on Turso...');
  await client.execute(`
    CREATE TABLE IF NOT EXISTS AdminDeck (
      id TEXT NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      isBuiltin INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log('AdminDeck table created/checked.');

  try {
    await client.execute('ALTER TABLE AdminImportantSection ADD COLUMN linkedDekaIds TEXT;');
    console.log('Added linkedDekaIds to AdminImportantSection');
  } catch (e) {
    console.log('linkedDekaIds column info:', e.message);
  }

  try {
    await client.execute('ALTER TABLE AdminImportantSection ADD COLUMN textHighlights TEXT;');
    console.log('Added textHighlights to AdminImportantSection');
  } catch (e) {
    console.log('textHighlights column info:', e.message);
  }

  try {
    await client.execute('ALTER TABLE AdminMemorizeItem ADD COLUMN masteryStatus TEXT;');
    console.log('Added masteryStatus to AdminMemorizeItem');
  } catch (e) {
    console.log('masteryStatus column info:', e.message);
  }

  console.log('Migration finished successfully!');
}

migrate().catch(console.error);
