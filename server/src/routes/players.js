const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { requireAuth, requireRole } = require('../middleware/auth');

// Get all players (requires auth)
router.get('/', requireAuth, (req, res) => {
  try {
    const players = db.prepare('SELECT * FROM players ORDER BY name').all();
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Failed to fetch players' });
  }
});

// Get single player (requires auth)
router.get('/:id', requireAuth, (req, res) => {
  try {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    res.json(player);
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Failed to fetch player' });
  }
});

// Create new player (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { name, handicap, email, phone } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const stmt = db.prepare('INSERT INTO players (name, handicap, email, phone) VALUES (?, ?, ?, ?)');
    const result = stmt.run(name, handicap || 0, email || null, phone || null);
    
    const newPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newPlayer);
  } catch (error) {
    console.error('Error creating player:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Player name already exists' });
    }
    res.status(500).json({ error: 'Failed to create player' });
  }
});

// Update player (admin only)
router.put('/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const { name, handicap, email, phone } = req.body;
    
    const stmt = db.prepare(`
      UPDATE players 
      SET name = ?, handicap = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    const result = stmt.run(name, handicap, email || null, phone || null, req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    const updatedPlayer = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id);
    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Player name already exists' });
    }
    res.status(500).json({ error: 'Failed to update player' });
  }
});

// Delete player (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM players WHERE id = ?');
    const result = stmt.run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Failed to delete player' });
  }
});

module.exports = router;
