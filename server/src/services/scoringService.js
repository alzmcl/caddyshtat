/**
 * Scoring Service
 * Handles scoring calculations for different competition types
 */

/**
 * Calculate handicap strokes for each hole based on player handicap and stroke index
 * @param {number} playerHandicap - Player's handicap (e.g., 18)
 * @param {number} strokeIndex - Hole's stroke index (1-18, where 1 is hardest)
 * @returns {number} - Number of strokes to receive on this hole
 */
function getHandicapStrokes(playerHandicap, strokeIndex) {
  if (playerHandicap <= 0) return 0;
  
  // For handicaps 1-18, get 1 stroke on holes where stroke index <= handicap
  if (playerHandicap <= 18) {
    return strokeIndex <= playerHandicap ? 1 : 0;
  }
  
  // For handicaps 19-36, get 2 strokes on some holes, 1 on others
  if (playerHandicap <= 36) {
    const extraStrokes = playerHandicap - 18;
    if (strokeIndex <= extraStrokes) return 2;
    return 1;
  }
  
  // For handicaps 37+, get at least 2 strokes per hole
  const baseStrokes = Math.floor(playerHandicap / 18);
  const extraHoles = playerHandicap % 18;
  return strokeIndex <= extraHoles ? baseStrokes + 1 : baseStrokes;
}

/**
 * Calculate Stableford points for a hole
 * @param {number} score - Actual strokes taken
 * @param {number} par - Par for the hole
 * @param {number} handicapStrokes - Handicap strokes for this hole
 * @returns {number} - Stableford points
 */
function calculateStablefordPoints(score, par, handicapStrokes = 0) {
  if (!score) return 0;
  
  const netScore = score - handicapStrokes;
  const scoreToPar = netScore - par;
  
  // Stableford scoring
  if (scoreToPar <= -3) return 5; // Albatross or better
  if (scoreToPar === -2) return 4; // Eagle
  if (scoreToPar === -1) return 3; // Birdie
  if (scoreToPar === 0) return 2;  // Par
  if (scoreToPar === 1) return 1;  // Bogey
  return 0; // Double bogey or worse
}

/**
 * Calculate Par competition points for a hole
 * @param {number} score - Actual strokes taken
 * @param {number} par - Par for the hole
 * @param {number} handicapStrokes - Handicap strokes for this hole
 * @returns {number} - Par competition points (+1, 0, -1)
 */
function calculateParPoints(score, par, handicapStrokes = 0) {
  if (!score) return 0;
  
  const netScore = score - handicapStrokes;
  const scoreToPar = netScore - par;
  
  // Par competition scoring
  if (scoreToPar < 0) return 1;  // Better than par (win hole)
  if (scoreToPar === 0) return 0; // Par (square)
  return -1; // Worse than par (lose hole)
}

/**
 * Calculate points for a hole based on competition type
 * @param {string} competitionType - 'Stroke', 'Stableford', or 'Par'
 * @param {number} score - Actual strokes taken
 * @param {number} par - Par for the hole
 * @param {number} strokeIndex - Hole's stroke index
 * @param {number} playerHandicap - Player's handicap
 * @returns {number} - Points for the hole
 */
function calculateHolePoints(competitionType, score, par, strokeIndex, playerHandicap = 0) {
  if (!score) return 0;
  
  const handicapStrokes = getHandicapStrokes(playerHandicap, strokeIndex);
  
  switch (competitionType) {
    case 'Stroke':
      return 0; // Stroke play doesn't use points, just total strokes
    
    case 'Stableford':
      return calculateStablefordPoints(score, par, handicapStrokes);
    
    case 'Par':
      return calculateParPoints(score, par, handicapStrokes);
    
    default:
      return 0;
  }
}

/**
 * Calculate totals for a round
 * @param {Array} holes - Array of hole objects with score, par, strokeIndex
 * @param {string} competitionType - 'Stroke', 'Stableford', or 'Par'
 * @param {number} playerHandicap - Player's handicap
 * @returns {Object} - { totalScore, totalPoints, outScore, inScore, outPoints, inPoints }
 */
function calculateRoundTotals(holes, competitionType, playerHandicap = 0) {
  let totalScore = 0;
  let totalPoints = 0;
  let outScore = 0;  // Front 9 (holes 1-9)
  let inScore = 0;   // Back 9 (holes 10-18)
  let outPoints = 0;
  let inPoints = 0;
  
  for (const hole of holes) {
    if (hole.score) {
      totalScore += hole.score;
      
      if (hole.hole_number <= 9) {
        outScore += hole.score;
      } else {
        inScore += hole.score;
      }
      
      const points = calculateHolePoints(
        competitionType,
        hole.score,
        hole.par,
        hole.stroke_index || 10,
        playerHandicap
      );
      
      totalPoints += points;
      
      if (hole.hole_number <= 9) {
        outPoints += points;
      } else {
        inPoints += points;
      }
    }
  }
  
  return {
    totalScore,
    totalPoints,
    outScore,
    inScore,
    outPoints,
    inPoints
  };
}

/**
 * Calculate statistics from holes
 * @param {Array} holes - Array of hole objects
 * @returns {Object} - Statistics object
 */
function calculateStatistics(holes) {
  let fairwaysHit = 0;
  let fairwaysAttempted = 0;
  let girsHit = 0;
  let girsAttempted = 0;
  let upDownsSuccessful = 0;
  let upDownsAttempted = 0;
  let totalPutts = 0;
  let birdiesOrBetter = 0;
  let pars = 0;
  let bogeys = 0;
  let doubleBogeyPlus = 0;
  
  for (const hole of holes) {
    if (!hole.score) continue;
    
    // Fairway statistics (only for par 4 and 5)
    if (hole.par >= 4 && hole.fairway && hole.fairway !== 'na') {
      fairwaysAttempted++;
      if (hole.fairway === 'hit') {
        fairwaysHit++;
      }
    }
    
    // GIR statistics
    if (hole.gir !== null && hole.gir !== undefined) {
      girsAttempted++;
      if (hole.gir) {
        girsHit++;
      }
    }
    
    // Up/Down statistics
    if (hole.up_down && hole.up_down !== 'na') {
      upDownsAttempted++;
      if (hole.up_down === 'yes' || hole.up_down === 'chip_in') {
        upDownsSuccessful++;
      }
    }
    
    // Putts
    if (hole.total_putts) {
      totalPutts += hole.total_putts;
    }
    
    // Score distribution
    const scoreToPar = hole.score - hole.par;
    if (scoreToPar <= -1) birdiesOrBetter++;
    else if (scoreToPar === 0) pars++;
    else if (scoreToPar === 1) bogeys++;
    else if (scoreToPar >= 2) doubleBogeyPlus++;
  }
  
  return {
    fairwaysHit,
    fairwaysAttempted,
    fairwayPercentage: fairwaysAttempted > 0 ? Math.round((fairwaysHit / fairwaysAttempted) * 100) : 0,
    girsHit,
    girsAttempted,
    girPercentage: girsAttempted > 0 ? Math.round((girsHit / girsAttempted) * 100) : 0,
    upDownsSuccessful,
    upDownsAttempted,
    upDownPercentage: upDownsAttempted > 0 ? Math.round((upDownsSuccessful / upDownsAttempted) * 100) : 0,
    totalPutts,
    averagePutts: holes.filter(h => h.total_putts).length > 0 ? 
      (totalPutts / holes.filter(h => h.total_putts).length).toFixed(1) : 0,
    birdiesOrBetter,
    pars,
    bogeys,
    doubleBogeyPlus
  };
}

module.exports = {
  getHandicapStrokes,
  calculateStablefordPoints,
  calculateParPoints,
  calculateHolePoints,
  calculateRoundTotals,
  calculateStatistics
};
