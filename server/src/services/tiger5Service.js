/**
 * Tiger 5 Service - Calculate violations of Tiger Woods' 5 key rules
 * 
 * Rules:
 * 1. No bogeys on par 5s
 * 2. No double bogeys (or worse)
 * 3. No three-putts
 * 4. No bogeys from <9 iron (manual tracking)
 * 5. No missed easy up-and-downs (manual tracking)
 */

function calculateTiger5Violations(holes) {
  const violations = {
    byHole: [],
    totals: {
      bogeyOnPar5: 0,
      doubleBogey: 0,
      threePutt: 0,
      shortMiss: 0,
      missedUpDown: 0,
      total: 0
    }
  };

  holes.forEach(hole => {
    const holeViolations = {
      hole_number: hole.hole_number,
      bogeyOnPar5: false,
      doubleBogey: false,
      threePutt: false,
      shortMiss: false,
      missedUpDown: false
    };

    // Rule 1: No bogey on par 5
    if (hole.par === 5 && hole.score && hole.score >= hole.par + 1) {
      holeViolations.bogeyOnPar5 = true;
      violations.totals.bogeyOnPar5++;
    }

    // Rule 2: No double bogey
    if (hole.score && hole.par && hole.score >= hole.par + 2) {
      holeViolations.doubleBogey = true;
      violations.totals.doubleBogey++;
    }

    // Rule 3: No three-putt
    if (hole.total_putts && hole.total_putts >= 3) {
      holeViolations.threePutt = true;
      violations.totals.threePutt++;
    }

    // Rule 4: No bogey from <9 iron (manual)
    if (hole.tiger5_short_miss) {
      holeViolations.shortMiss = true;
      violations.totals.shortMiss++;
    }

    // Rule 5: No missed easy up-and-down (manual)
    if (hole.tiger5_missed_updown) {
      holeViolations.missedUpDown = true;
      violations.totals.missedUpDown++;
    }

    violations.byHole.push(holeViolations);
  });

  // Calculate total violations
  violations.totals.total = 
    violations.totals.bogeyOnPar5 +
    violations.totals.doubleBogey +
    violations.totals.threePutt +
    violations.totals.shortMiss +
    violations.totals.missedUpDown;

  // Calculate grade (out of max possible: 18 holes * 5 rules = 90)
  const maxPossible = holes.length * 5;
  violations.totals.maxPossible = maxPossible;
  violations.totals.percentage = ((violations.totals.total / maxPossible) * 100).toFixed(1);

  // Determine grade
  if (violations.totals.total <= 2) {
    violations.totals.grade = 'Excellent';
    violations.totals.color = 'green';
  } else if (violations.totals.total <= 5) {
    violations.totals.grade = 'Good';
    violations.totals.color = 'yellow';
  } else {
    violations.totals.grade = 'Needs Work';
    violations.totals.color = 'red';
  }

  return violations;
}

module.exports = {
  calculateTiger5Violations
};
