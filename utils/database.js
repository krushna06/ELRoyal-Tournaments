const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/profiles.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    gameName TEXT,
    gamerTag TEXT,
    clanName TEXT
  )`);
});

function setProfile(id, gameName, gamerTag, clanName) {
  return new Promise((resolve, reject) => {
    db.run(`INSERT OR REPLACE INTO profiles (id, gameName, gamerTag, clanName) VALUES (?, ?, ?, ?)`,
      [id, gameName, gamerTag, clanName], function(err) {
        if (err) reject(err);
        resolve();
      });
  });
}

function getProfile(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM profiles WHERE id = ?`, [id], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
}

module.exports = {
  setProfile,
  getProfile
};
