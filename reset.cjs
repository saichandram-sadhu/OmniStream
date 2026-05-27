const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('data/app.db');
db.run("UPDATE downloads SET status = 'queued', error = NULL WHERE status = 'error'", function(err) {
  if (err) console.error(err);
  else console.log('Updated ' + this.changes + ' rows');
});
