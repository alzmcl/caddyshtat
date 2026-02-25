const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, '../../golf.db'));

// Create users table
function createUsersTable() {
  console.log('Creating users table...');
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'player')) DEFAULT 'player',
      player_id INTEGER,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL
    )
  `);

  console.log('Users table created successfully');
}

// Create default admin user
async function createDefaultAdmin() {
  console.log('Creating default admin user...');
  
  const checkAdmin = db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?');
  const result = checkAdmin.get('admin');
  
  if (result.count > 0) {
    console.log('Admin user already exists');
    return;
  }

  // Default admin credentials
  const username = 'admin';
  const email = 'admin@summerhill.local';
  const password = 'admin123'; // CHANGE THIS AFTER FIRST LOGIN!
  
  const passwordHash = await bcrypt.hash(password, 10);
  
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  insertUser.run(username, email, passwordHash, 'admin', 1);
  
  console.log('✅ Default admin user created');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   ⚠️  CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!');
}

// Link existing player to user (optional - for Alan)
async function linkPlayerToUser() {
  console.log('Checking if Alan McLaughlin needs user account...');
  
  const checkPlayer = db.prepare('SELECT id FROM players WHERE name = ?');
  const player = checkPlayer.get('Alan McLaughlin');
  
  if (!player) {
    console.log('Alan McLaughlin not found in players table');
    return;
  }

  const checkUser = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ? OR player_id = ?');
  const result = checkUser.get('alan', player.id);
  
  if (result.count > 0) {
    console.log('User already exists for Alan McLaughlin');
    return;
  }

  const password = 'changeme123'; // CHANGE THIS!
  const passwordHash = await bcrypt.hash(password, 10);
  
  const insertUser = db.prepare(`
    INSERT INTO users (username, email, password_hash, role, player_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  insertUser.run('alan', 'alan@summerhill.local', passwordHash, 'admin', player.id, 1);
  
  console.log('✅ User account created for Alan McLaughlin');
  console.log('   Username: alan');
  console.log('   Password: changeme123');
  console.log('   ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN!');
}

// Run migration
async function migrate() {
  try {
    console.log('Starting users table migration...');
    createUsersTable();
    await createDefaultAdmin();
    await linkPlayerToUser();
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run if called directly
if (require.main === module) {
  migrate();
}

module.exports = { createUsersTable, createDefaultAdmin };
