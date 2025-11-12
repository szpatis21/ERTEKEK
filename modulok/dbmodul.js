const mysql = require('mysql2');
require('dotenv').config();

// MySQL adatbázis kapcsolat
/* const db = mysql.createConnection({
    host: 'localhost',
    user: 'szpatis21',
    password: 'Ertekek0077%d',
    database: 'ertekek02'
}); */
// db.js

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  namedPlaceholders: true,
  charset: 'utf8mb4_general_ci',
});

db.on('connection', (conn) => {
  conn.query("SET SESSION sql_mode='STRICT_ALL_TABLES,NO_ENGINE_SUBSTITUTION'");
  const keyHex = process.env.AES_KEY_HEX;
  if (keyHex && /^[0-9a-fA-F]{64}$/.test(keyHex)) {
    conn.query('SET @aes_key = UNHEX(?)', [keyHex], (err) => {
      if (err) console.error('AES @aes_key beállítás hiba:', err);
    });
  } else {
    console.warn('Figyelem: AES_KEY_HEX hiányzik vagy nem 64 hex — @aes_key nem lett beállítva.');
  }
});

module.exports = db; 

