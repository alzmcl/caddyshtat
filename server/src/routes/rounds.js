const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { calculateHolePoints, calculateRoundTotals, calculateStatistics } = require('../services/scoringService');
const { calculateTiger5Violations } = require('../services/tiger5Service');
const { requireAuth, requireRole } = require('../middleware/auth');

// GET /api/rounds/stats - Get aggregate statistics (requires auth)
router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = {
      totalRounds: 0,
      bestScore: null,
      worstScore: null,
      averageScore: null,
      bestPoints: null,
      averagePoints: null,
      coursesPlayed: 0,
      recentAchievement: null
    };
    
    // Get total rounds
    const totalResult = db.prepare('SELECT COUNT(*) as count FROM rounds').get();
    stats.totalRounds = totalResult.count;
    
    if (stats.totalRounds > 0) {
      // Get score statistics (only for completed rounds)
      const scoreStats = db.prepare(`
        SELECT 
          MIN(total_score) as best,
          MAX(total_score) as worst,
          AVG(total_score) as average
        FROM rounds
        WHERE total_score IS NOT NULL
      `).get();
      
      stats.bestScore = scoreStats.best;
      stats.worstScore = scoreStats.worst;
      stats.averageScore = scoreStats.average ? Math.round(scoreStats.average * 10) / 10 : null;
      
      // Get points statistics
      const pointsStats = db.prepare(`
        SELECT 
          MAX(total_points) as best,
          AVG(total_points) as average
        FROM rounds
        WHERE total_points IS NOT NULL AND competition_type != 'Stroke'
      `).get();
      
      stats.bestPoints = pointsStats.best;
      stats.averagePoints = pointsStats.average ? Math.round(pointsStats.average * 10) / 10 : null;
      
      // Get unique courses played
      const coursesResult = db.prepare('SELECT COUNT(DISTINCT course_id) as count FROM rounds').get();
      stats.coursesPlayed = coursesResult.count;
      
      // Get recent achievement (best score in last 5 rounds)
      const recentRounds = db.prepare(`
        SELECT 
          r.*,
          c.name as course_name
        FROM rounds r
        JOIN courses c ON r.course_id = c.id
        WHERE r.total_score IS NOT NULL
        ORDER BY r.date DESC, r.created_at DESC
        LIMIT 5
      `).all();
      
      if (recentRounds.length > 0) {
        const bestRecent = recentRounds.reduce((best, round) => 
          (!best || round.total_score < best.total_score) ? round : best
        , null);
        
        if (bestRecent && bestRecent.total_score === stats.bestScore) {
          stats.recentAchievement = {
            type: 'personal_best',
            description: `New Personal Best: ${bestRecent.total_score} at ${bestRecent.course_name}!`,
            date: bestRecent.date
          };
        }
      }
    }
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rounds - List all rounds (requires auth)
router.get('/', requireAuth, (req, res) => {
  try {
    const rounds = db.prepare(`
      SELECT 
        r.*,
        c.name as course_name,
        t.name as tee_name
      FROM rounds r
      JOIN courses c ON r.course_id = c.id
      JOIN tees t ON r.tee_id = t.id
      ORDER BY r.date DESC, r.created_at DESC
    `).all();
    
    // Calculate course par for each round from course_holes
    const roundsWithPar = rounds.map(round => {
      const parSum = db.prepare(`
        SELECT SUM(par) as total_par 
        FROM course_holes 
        WHERE course_id = ? AND tee_id = ?
      `).get(round.course_id, round.tee_id);
      
      return {
        ...round,
        course_par: parSum?.total_par || null
      };
    });
    
    res.json(roundsWithPar);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rounds/:id - Get specific round with all hole data (requires auth)
router.get('/:id', requireAuth, (req, res) => {
  try {
    // Get round details
    const round = db.prepare(`
      SELECT 
        r.*,
        c.name as course_name,
        c.location as course_location,
        t.name as tee_name,
        t.rating as tee_rating,
        t.slope as tee_slope
      FROM rounds r
      JOIN courses c ON r.course_id = c.id
      JOIN tees t ON r.tee_id = t.id
      WHERE r.id = ?
    `).get(req.params.id);
    
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    // Get hole data
    const holes = db.prepare(`
      SELECT 
        h.*,
        ch.distance,
        ch.stroke_index
      FROM holes h
      LEFT JOIN course_holes ch ON 
        ch.course_id = ? AND 
        ch.tee_id = ? AND 
        ch.hole_number = h.hole_number
      WHERE h.round_id = ?
      ORDER BY h.hole_number
    `).all(round.course_id, round.tee_id, req.params.id);
    
    // Calculate totals and statistics
    const totals = calculateRoundTotals(holes, round.competition_type, round.player_handicap);
    const statistics = calculateStatistics(holes);
    const tiger5 = calculateTiger5Violations(holes);
    
    res.json({
      ...round,
      holes,
      totals,
      statistics,
      tiger5
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rounds - Create new round (requires auth)
router.post('/', requireAuth, (req, res) => {
  try {
    const { course_id, tee_id, competition_type, date, player_id, player_name, player_handicap, daily_handicap } = req.body;
    
    // Validate required fields
    if (!course_id || !tee_id || !competition_type || !date || !player_id) {
      return res.status(400).json({ 
        error: 'Missing required fields: course_id, tee_id, competition_type, date, player_id' 
      });
    }
    
    // Validate competition type
    if (!['Stroke', 'Stableford', 'Par'].includes(competition_type)) {
      return res.status(400).json({ 
        error: 'competition_type must be Stroke, Stableford, or Par' 
      });
    }
    
    // Get player info if not provided
    let finalPlayerName = player_name;
    let finalPlayerHandicap = player_handicap;
    if (!finalPlayerName) {
      const player = db.prepare('SELECT name, handicap FROM players WHERE id = ?').get(player_id);
      if (player) {
        finalPlayerName = player.name;
        finalPlayerHandicap = player.handicap;
      }
    }
    
    // Use daily_handicap if provided, otherwise use player_handicap
    const roundHandicap = daily_handicap !== undefined ? daily_handicap : (finalPlayerHandicap || 0);
    
    // Create round
    const insertRound = db.prepare(
      'INSERT INTO rounds (course_id, tee_id, player_id, competition_type, date, player_name, player_handicap, daily_handicap) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const roundResult = insertRound.run(
      course_id,
      tee_id,
      player_id,
      competition_type,
      date,
      finalPlayerName,
      finalPlayerHandicap || 0,
      roundHandicap
    );
    
    const roundId = roundResult.lastInsertRowid;
    
    // Get course holes for this tee
    const courseHoles = db.prepare(
      'SELECT * FROM course_holes WHERE course_id = ? AND tee_id = ? ORDER BY hole_number'
    ).all(course_id, tee_id);
    
    // Create hole records for the round
    const insertHole = db.prepare(
      'INSERT INTO holes (round_id, hole_number, par) VALUES (?, ?, ?)'
    );
    
    const insertHoles = db.transaction((holes) => {
      for (const hole of holes) {
        insertHole.run(roundId, hole.hole_number, hole.par);
      }
    });
    
    insertHoles(courseHoles);
    
    // Get the created round with all data
    const round = db.prepare(`
      SELECT 
        r.*,
        c.name as course_name,
        t.name as tee_name
      FROM rounds r
      JOIN courses c ON r.course_id = c.id
      JOIN tees t ON r.tee_id = t.id
      WHERE r.id = ?
    `).get(roundId);
    
    const holes = db.prepare(
      'SELECT * FROM holes WHERE round_id = ? ORDER BY hole_number'
    ).all(roundId);
    
    res.status(201).json({
      ...round,
      holes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/rounds/:roundId/holes/:holeNumber - Update hole data (requires auth)
router.put('/:roundId/holes/:holeNumber', requireAuth, (req, res) => {
  try {
    const { roundId, holeNumber } = req.params;
    const { score, penalties, fairway, gir, up_down, first_putt_distance, total_putts, tiger5_short_miss, tiger5_missed_updown } = req.body;
    
    // Get round details for scoring calculation
    const round = db.prepare('SELECT * FROM rounds WHERE id = ?').get(roundId);
    if (!round) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    // Get hole and course hole data
    const hole = db.prepare('SELECT * FROM holes WHERE round_id = ? AND hole_number = ?').get(roundId, holeNumber);
    if (!hole) {
      return res.status(404).json({ error: 'Hole not found' });
    }
    
    const courseHole = db.prepare(
      'SELECT stroke_index FROM course_holes WHERE course_id = ? AND tee_id = ? AND hole_number = ?'
    ).get(round.course_id, round.tee_id, holeNumber);
    
    // Calculate points if score is provided
    let points = null;
    if (score !== undefined && score !== null) {
      points = calculateHolePoints(
        round.competition_type,
        score,
        hole.par,
        courseHole?.stroke_index || 10,
        round.player_handicap
      );
    }
    
    // Update hole
    const updateStmt = db.prepare(`
      UPDATE holes 
      SET score = ?, 
          penalties = ?, 
          fairway = ?, 
          gir = ?, 
          up_down = ?, 
          first_putt_distance = ?, 
          total_putts = ?,
          points = ?,
          tiger5_short_miss = ?,
          tiger5_missed_updown = ?
      WHERE round_id = ? AND hole_number = ?
    `);
    
    updateStmt.run(
      score !== undefined ? score : hole.score,
      penalties !== undefined ? penalties : hole.penalties,
      fairway !== undefined ? fairway : hole.fairway,
      gir !== undefined ? gir : hole.gir,
      up_down !== undefined ? up_down : hole.up_down,
      first_putt_distance !== undefined ? first_putt_distance : hole.first_putt_distance,
      total_putts !== undefined ? total_putts : hole.total_putts,
      points,
      tiger5_short_miss !== undefined ? tiger5_short_miss : hole.tiger5_short_miss,
      tiger5_missed_updown !== undefined ? tiger5_missed_updown : hole.tiger5_missed_updown,
      roundId,
      holeNumber
    );
    
    // Get all holes and recalculate round totals
    const allHoles = db.prepare(`
      SELECT 
        h.*,
        ch.stroke_index
      FROM holes h
      LEFT JOIN course_holes ch ON 
        ch.course_id = ? AND 
        ch.tee_id = ? AND 
        ch.hole_number = h.hole_number
      WHERE h.round_id = ?
    `).all(round.course_id, round.tee_id, roundId);
    
    // Use daily_handicap for calculations if available
    const handicapForCalc = round.daily_handicap !== null ? round.daily_handicap : round.player_handicap;
    const totals = calculateRoundTotals(allHoles, round.competition_type, handicapForCalc);
    
    // Update round totals
    db.prepare('UPDATE rounds SET total_score = ?, total_points = ? WHERE id = ?')
      .run(totals.totalScore, totals.totalPoints, roundId);
    
    // Return updated hole
    const updatedHole = db.prepare('SELECT * FROM holes WHERE round_id = ? AND hole_number = ?')
      .get(roundId, holeNumber);
    
    res.json(updatedHole);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/rounds/:id - Delete a round (requires auth)
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const result = db.prepare('DELETE FROM rounds WHERE id = ?').run(req.params.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Round not found' });
    }
    
    res.json({ message: 'Round deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
