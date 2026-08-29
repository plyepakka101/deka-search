import mysql from 'mysql2/promise';

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    port: 3307,
    user: 'root',
    password: '',
    database: 'DEKA',
    charset: 'tis620'
  });

  const [rows] = await connection.execute('DESCRIBE PC_DOCUMENT');
  console.log(rows);
  connection.end();
}

main().catch(console.error);
