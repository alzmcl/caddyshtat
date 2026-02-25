const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../golf.db'));

console.log('Running Tiger 5 migration...');

try {
  // Add tiger5_short_miss column
  db.exec(`ALTER TABLE holes ADD COLUMN tiger5_short_miss INTEGER DEFAULT 0`);
  console.log('✓ Added tiger5_short_miss column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ tiger5_short_miss column already exists');
  } else {
    throw err;
  }
}

try {
  // Add tiger5_missed_updown column
  db.exec(`ALTER TABLE holes ADD COLUMN tiger5_missed_updown INTEGER DEFAULT 0`);
  console.log('✓ Added tiger5_missed_updown column');
} catch (err) {
  if (err.message.includes('duplicate column name')) {
    console.log('✓ tiger5_missed_updown column already exists');
  } else {
    throw err;
  }
}

console.log('Migration completed successfully!');
db.close();
