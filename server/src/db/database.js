const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../golf.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize database tables
function initializeDatabase() {
  // Players table
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      handicap REAL NOT NULL DEFAULT 0,
      email TEXT,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Courses table
  db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      rating REAL,
      slope INTEGER,
      total_distance INTEGER,
      color TEXT,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    )
  `);

  // Course holes table - stores par, distance, and stroke index for each tee
  db.exec(`
    CREATE TABLE IF NOT EXISTS course_holes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      tee_id INTEGER NOT NULL,
      hole_number INTEGER NOT NULL,
      par INTEGER NOT NULL,
      distance INTEGER NOT NULL,
      stroke_index INTEGER NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (tee_id) REFERENCES tees(id) ON DELETE CASCADE,
      UNIQUE(course_id, tee_id, hole_number)
    )
  `);

  // Rounds table
  db.exec(`
    CREATE TABLE IF NOT EXISTS rounds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      tee_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      competition_type TEXT NOT NULL CHECK(competition_type IN ('Stroke', 'Stableford', 'Par')),
      date DATE NOT NULL,
      player_name TEXT NOT NULL,
      player_handicap REAL DEFAULT 0,
      daily_handicap REAL DEFAULT 0,
      total_score INTEGER,
      total_points INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (tee_id) REFERENCES tees(id),
      FOREIGN KEY (player_id) REFERENCES players(id)
    )
  `);

  // Holes table - stores actual play data for each hole in a round
  db.exec(`
    CREATE TABLE IF NOT EXISTS holes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      round_id INTEGER NOT NULL,
      hole_number INTEGER NOT NULL,
      par INTEGER NOT NULL,
      score INTEGER,
      penalties INTEGER DEFAULT 0,
      fairway TEXT CHECK(fairway IN ('hit', 'miss', 'left', 'right', 'short', 'long', 'na')),
      gir BOOLEAN,
      up_down TEXT CHECK(up_down IN ('yes', 'no', 'chip_in', 'na')),
      first_putt_distance REAL,
      total_putts INTEGER,
      points INTEGER,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      UNIQUE(round_id, hole_number)
    )
  `);

  console.log('Database initialized successfully');
}

// Seed data - Metropolitan Golf Club and default player
function seedDatabase() {
  // Check if already seeded
  const checkCourse = db.prepare('SELECT COUNT(*) as count FROM courses WHERE name = ?');
  const courseResult = checkCourse.get('Metropolitan Golf Club');
  
  if (courseResult.count > 0) {
    console.log('Database already seeded');
    return;
  }

  // Add default player - Alan McLaughlin
  const insertPlayer = db.prepare('INSERT INTO players (name, handicap) VALUES (?, ?)');
  try {
    insertPlayer.run('Alan McLaughlin', 7.8);
    console.log('Added default player: Alan McLaughlin');
  } catch (err) {
    // Player might already exist
    console.log('Player already exists');
  }

  // Insert Metropolitan Golf Club
  const insertCourse = db.prepare('INSERT INTO courses (name, location, description) VALUES (?, ?, ?)');
  const insertResult = insertCourse.run(
    'Metropolitan Golf Club',
    'South Oakleigh, Victoria',
    'Championship golf course in Melbourne'
  );
  const courseId = insertResult.lastInsertRowid;

  // Insert Blue Tees
  const insertTee = db.prepare('INSERT INTO tees (course_id, name, rating, slope, total_distance, color) VALUES (?, ?, ?, ?, ?, ?)');
  const blueTeeResult = insertTee.run(courseId, 'Blue', 72.5, 135, 6200, '#4169E1');
  const blueTeeId = blueTeeResult.lastInsertRowid;

  // Insert White Tees
  const whiteTeeResult = insertTee.run(courseId, 'White', 70.2, 128, 5800, '#FFFFFF');
  const whiteTeeId = whiteTeeResult.lastInsertRowid;

  // Sample hole data for Blue tees (18 holes)
  const blueHoles = [
    { hole: 1, par: 4, distance: 380, index: 7 },
    { hole: 2, par: 3, distance: 165, index: 15 },
    { hole: 3, par: 4, distance: 340, index: 11 },
    { hole: 4, par: 5, distance: 480, index: 3 },
    { hole: 5, par: 4, distance: 360, index: 9 },
    { hole: 6, par: 5, distance: 510, index: 1 },
    { hole: 7, par: 3, distance: 180, index: 13 },
    { hole: 8, par: 5, distance: 490, index: 5 },
    { hole: 9, par: 4, distance: 350, index: 17 },
    { hole: 10, par: 4, distance: 370, index: 8 },
    { hole: 11, par: 3, distance: 170, index: 14 },
    { hole: 12, par: 4, distance: 345, index: 12 },
    { hole: 13, par: 3, distance: 155, index: 16 },
    { hole: 14, par: 5, distance: 505, index: 2 },
    { hole: 15, par: 4, distance: 375, index: 6 },
    { hole: 16, par: 4, distance: 365, index: 10 },
    { hole: 17, par: 4, distance: 340, index: 18 },
    { hole: 18, par: 4, distance: 390, index: 4 }
  ];

  // Sample hole data for White tees (shorter distances)
  const whiteHoles = blueHoles.map(hole => ({
    ...hole,
    distance: hole.distance - 30 // White tees are about 30m shorter per hole
  }));

  const insertHole = db.prepare('INSERT INTO course_holes (course_id, tee_id, hole_number, par, distance, stroke_index) VALUES (?, ?, ?, ?, ?, ?)');
  
  // Insert Blue tee holes
  for (const hole of blueHoles) {
    insertHole.run(courseId, blueTeeId, hole.hole, hole.par, hole.distance, hole.index);
  }

  // Insert White tee holes
  for (const hole of whiteHoles) {
    insertHole.run(courseId, whiteTeeId, hole.hole, hole.par, hole.distance, hole.index);
  }

  console.log('Database seeded with Metropolitan Golf Club');
}

// Initialize on import
initializeDatabase();
seedDatabase();

module.exports = db;
