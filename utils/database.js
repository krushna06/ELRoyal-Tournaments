const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/profiles.sqlite');

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS profiles (
      userId TEXT,
      gameName TEXT,
      gamerTag TEXT,
      clanName TEXT,
      PRIMARY KEY (userId, gameName)
    )
  `);
});

function setProfile(userId, gameName, gamerTag, clanName) {
  return new Promise((resolve, reject) => {
    const stmt = db.prepare(`
      INSERT INTO profiles (userId, gameName, gamerTag, clanName) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(userId, gameName) 
      DO UPDATE SET gamerTag=excluded.gamerTag, clanName=excluded.clanName
    `);
    stmt.run(userId, gameName, gamerTag, clanName, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
    stmt.finalize();
  });
}

function getProfileForGame(userId, gameName) {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT gamerTag, clanName 
      FROM profiles 
      WHERE userId = ? AND gameName = ?
    `, [userId, gameName], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

module.exports = { setProfile, getProfileForGame };
