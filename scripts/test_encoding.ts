import mysql from 'mysql2/promise';
import iconv from 'iconv-lite';

async function testConnection(charset?: string) {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3308,
    user: 'root',
    password: '',
    database: 'DEKA',
    charset: charset
  });

  const [rows] = await connection.execute(`
    SELECT 
      DKNUM, DKYEAR,
      S_TEXT,
      CAST(S_TEXT AS BINARY) as S_TEXT_BIN
    FROM PC_DOCUMENT 
    LIMIT 1
  `);
  
  const row = (rows as any[])[0];
  console.log(`\n=== Testing charset: ${charset || 'default'} ===`);
  
  console.log("Raw S_TEXT (as string):", row.S_TEXT?.toString().substring(0, 100));
  
  if (row.S_TEXT_BIN) {
    console.log("Decoded win874:", iconv.decode(row.S_TEXT_BIN, 'win874').substring(0, 100));
    console.log("Decoded tis620:", iconv.decode(row.S_TEXT_BIN, 'tis620').substring(0, 100));
    console.log("Decoded utf8:", iconv.decode(row.S_TEXT_BIN, 'utf8').substring(0, 100));
  }

  await connection.end();
}

async function main() {
  await testConnection('latin1');
  await testConnection('utf8');
  await testConnection('tis620');
}

main().catch(console.error);
