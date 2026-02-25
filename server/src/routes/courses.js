const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/courses - List all courses
router.get('/', requireAuth, (req, res) => {
  try {
    const courses = db.prepare('SELECT * FROM courses ORDER BY name').all();
    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/courses/:id - Get course details
router.get('/:id', requireAuth, (req, res) => {
  try {
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(req.params.id);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/courses - Create new course (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { name, location, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Course name is required' });
    }
    
    const stmt = db.prepare('INSERT INTO courses (name, location, description) VALUES (?, ?, ?)');
    const result = stmt.run(name, location || null, description || null);
    
    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/courses/:id/tees - Get tees for a course
router.get('/:id/tees', requireAuth, (req, res) => {
  try {
    const tees = db.prepare('SELECT * FROM tees WHERE course_id = ? ORDER BY name').all(req.params.id);
    res.json(tees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/courses/:id/tees - Add tee to course (admin only)
router.post('/:id/tees', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { name, rating, slope, total_distance, color } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Tee name is required' });
    }
    
    const stmt = db.prepare(
      'INSERT INTO tees (course_id, name, rating, slope, total_distance, color) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const result = stmt.run(
      req.params.id,
      name,
      rating || null,
      slope || null,
      total_distance || null,
      color || null
    );
    
    const tee = db.prepare('SELECT * FROM tees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tee);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/courses/:courseId/tees/:teeId/holes - Get hole data for specific tee
router.get('/:courseId/tees/:teeId/holes', requireAuth, (req, res) => {
  try {
    const holes = db.prepare(
      'SELECT * FROM course_holes WHERE course_id = ? AND tee_id = ? ORDER BY hole_number'
    ).all(req.params.courseId, req.params.teeId);
    
    res.json(holes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/courses/:courseId/tees/:teeId/holes - Bulk add hole data (admin only)
router.post('/:courseId/tees/:teeId/holes', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { holes } = req.body;
    
    if (!Array.isArray(holes) || holes.length === 0) {
      return res.status(400).json({ error: 'Holes array is required' });
    }
    
    const stmt = db.prepare(
      'INSERT INTO course_holes (course_id, tee_id, hole_number, par, distance, stroke_index) VALUES (?, ?, ?, ?, ?, ?)'
    );
    
    const insertMany = db.transaction((holesData) => {
      for (const hole of holesData) {
        stmt.run(
          req.params.courseId,
          req.params.teeId,
          hole.hole_number,
          hole.par,
          hole.distance,
          hole.stroke_index
        );
      }
    });
    
    insertMany(holes);
    
    const insertedHoles = db.prepare(
      'SELECT * FROM course_holes WHERE course_id = ? AND tee_id = ? ORDER BY hole_number'
    ).all(req.params.courseId, req.params.teeId);
    
    res.status(201).json(insertedHoles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/courses/:courseId/tees/:teeId/holes/:holeId - Update hole (admin only)
router.put('/:courseId/tees/:teeId/holes/:holeId', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { par, distance, stroke_index } = req.body;
    
    const stmt = db.prepare(`
      UPDATE course_holes 
      SET par = COALESCE(?, par),
          distance = COALESCE(?, distance),
          stroke_index = COALESCE(?, stroke_index)
      WHERE id = ?
    `);
    
    const result = stmt.run(par, distance, stroke_index, req.params.holeId);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Hole not found' });
    }
    
    const updated = db.prepare('SELECT * FROM course_holes WHERE id = ?').get(req.params.holeId);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
