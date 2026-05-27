const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/database.sqlite');
db.run("UPDATE downloads SET status = 'queued', error = NULL WHERE name LIKE '%Ep 987%'", function(err) {
  if (err) console.error(err);
  else console.log('Updated ' + this.changes + ' rows');
});
