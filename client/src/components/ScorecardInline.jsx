import { useState, useEffect } from 'react';
import { roundsApi, coursesApi } from '../api/client';
import './ScorecardInline.css';

// Client-side scoring functions (ported from backend)
function getHandicapStrokes(playerHandicap, strokeIndex) {
  if (!playerHandicap || playerHandicap <= 0) return 0;
  
  if (playerHandicap <= 18) {
    return strokeIndex <= playerHandicap ? 1 : 0;
  }
  
  if (playerHandicap <= 36) {
    const extraStrokes = playerHandicap - 18;
    if (strokeIndex <= extraStrokes) return 2;
    return 1;
  }
  
  const baseStrokes = Math.floor(playerHandicap / 18);
  const extraHoles = playerHandicap % 18;
  return strokeIndex <= extraHoles ? baseStrokes + 1 : baseStrokes;
}

function calculateStablefordPoints(score, par, handicapStrokes = 0) {
  if (!score) return 0;
  
  const netScore = score - handicapStrokes;
  const scoreToPar = netScore - par;
  
  if (scoreToPar <= -3) return 5; // Albatross or better
  if (scoreToPar === -2) return 4; // Eagle
  if (scoreToPar === -1) return 3; // Birdie
  if (scoreToPar === 0) return 2;  // Par
  if (scoreToPar === 1) return 1;  // Bogey
  return 0; // Double bogey or worse
}

function calculateParPoints(score, par, handicapStrokes = 0) {
  if (!score) return 0;
  
  const netScore = score - handicapStrokes;
  const scoreToPar = netScore - par;
  
  if (scoreToPar < 0) return 1;  // Better than par (win hole)
  if (scoreToPar === 0) return 0; // Par (square)
  return -1; // Worse than par (lose hole)
}

function calculateHolePoints(competitionType, score, par, strokeIndex, playerHandicap = 0) {
  if (!score) return null;
  
  const handicapStrokes = getHandicapStrokes(playerHandicap, strokeIndex);
  
  switch (competitionType) {
    case 'Stroke':
      // Return net score for stroke play
      return score - handicapStrokes;
    
    case 'Stableford':
      return calculateStablefordPoints(score, par, handicapStrokes);
    
    case 'Par':
      return calculateParPoints(score, par, handicapStrokes);
    
    default:
      return null;
  }
}

function ScorecardInline({ roundId, onBack }) {
  const [round, setRound] = useState(null);
  const [holes, setHoles] = useState([]);
  const [courseHoles, setCourseHoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadRound();
  }, [roundId]);

  const loadRound = async () => {
    try {
      setLoading(true);
      const data = await roundsApi.getById(roundId);
      setRound(data);
      setHoles(data.holes || []);
      
      const courseHoleData = await coursesApi.getHoles(data.course_id, data.tee_id);
      setCourseHoles(courseHoleData);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load round: ' + err.message);
      setLoading(false);
    }
  };

  const updateHole = (holeNumber, field, value) => {
    setHoles(prevHoles => 
      prevHoles.map(h => 
        h.hole_number === holeNumber ? { ...h, [field]: value } : h
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleScoreChange = (holeNumber, value) => {
    const numValue = value === '' ? null : parseInt(value);
    updateHole(holeNumber, 'score', numValue);
  };

  const handlePuttsChange = (holeNumber, value) => {
    const numValue = value === '' ? null : parseInt(value);
    updateHole(holeNumber, 'total_putts', numValue);
  };

  const handlePenaltiesChange = (holeNumber, value) => {
    const numValue = value === '' ? 0 : parseInt(value);
    updateHole(holeNumber, 'penalties', numValue);
  };

  const handleTiger5Change = (holeNumber, field, checked) => {
    updateHole(holeNumber, field, checked ? 1 : 0);
  };

  const handleSaveRound = async () => {
    try {
      setSaving(true);
      setError(null);
      
      const savePromises = holes.map(hole => {
        const holeData = {
          score: hole.score,
          penalties: hole.penalties || 0,
          fairway: hole.fairway,
          gir: hole.gir,
          up_down: hole.up_down,
          total_putts: hole.total_putts,
          tiger5_short_miss: hole.tiger5_short_miss || 0,
          tiger5_missed_updown: hole.tiger5_missed_updown || 0
        };
        return roundsApi.updateHole(roundId, hole.hole_number, holeData);
      });
      
      await Promise.all(savePromises);
      await loadRound();
      setHasUnsavedChanges(false);
      setSaving(false);
    } catch (err) {
      setError('Failed to save round: ' + err.message);
      setSaving(false);
    }
  };

  const handleResetChanges = async () => {
    if (window.confirm('Discard all unsaved changes?')) {
      await loadRound();
      setHasUnsavedChanges(false);
    }
  };

  if (loading) return <div className="loading">Loading scorecard...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!round) return <div className="error-message">Round not found</div>;

  const enrichedHoles = holes.map(hole => {
    const courseHole = courseHoles.find(ch => ch.hole_number === hole.hole_number);
    return { ...hole, ...courseHole };
  });

  const calculateTotals = () => {
    return enrichedHoles.reduce((acc, hole) => {
      acc.par += hole.par || 0;
      acc.score += hole.score || 0;
      
      // Calculate points in real-time
      const points = calculateHolePoints(
        round.competition_type,
        hole.score,
        hole.par,
        hole.stroke_index || 10,
        round.daily_handicap || 0
      );
      if (points !== null) {
        acc.points += points;
      }
      
      acc.putts += hole.total_putts || 0;
      if (hole.fairway === 'hit') acc.fairwaysHit++;
      if (hole.fairway && hole.fairway !== 'na' && hole.par >= 4) acc.fairwaysAttempted++;
      if (hole.gir) acc.girsHit++;
      if (hole.gir !== null) acc.girsAttempted++;
      
      // Tiger5 totals
      if (hole.par === 5 && hole.score && hole.score >= hole.par + 1) acc.tiger5_bogeyOnPar5++;
      if (hole.score && hole.par && hole.score >= hole.par + 2) acc.tiger5_doubleBogey++;
      if (hole.total_putts && hole.total_putts >= 3) acc.tiger5_threePutt++;
      if (hole.tiger5_short_miss) acc.tiger5_shortMiss++;
      if (hole.tiger5_missed_updown) acc.tiger5_missedUpDown++;
      
      return acc;
    }, { 
      par: 0, 
      score: 0, 
      points: 0, 
      putts: 0, 
      fairwaysHit: 0, 
      fairwaysAttempted: 0, 
      girsHit: 0, 
      girsAttempted: 0,
      tiger5_bogeyOnPar5: 0,
      tiger5_doubleBogey: 0,
      tiger5_threePutt: 0,
      tiger5_shortMiss: 0,
      tiger5_missedUpDown: 0
    });
  };

  const totals = calculateTotals();
  const tiger5Total = totals.tiger5_bogeyOnPar5 + totals.tiger5_doubleBogey + 
                      totals.tiger5_threePutt + totals.tiger5_shortMiss + totals.tiger5_missedUpDown;

  const getScoreClass = (score, par) => {
    if (!score || !par) return '';
    const diff = score - par;
    if (diff <= -2) return 'score-eagle';
    if (diff === -1) return 'score-birdie';
    if (diff === 0) return 'score-par';
    if (diff === 1) return 'score-bogey';
    return 'score-double';
  };

  const getPointsLabel = () => {
    if (round.competition_type === 'Stroke') return 'Net';
    if (round.competition_type === 'Stableford') return 'Points';
    if (round.competition_type === 'Par') return 'Result';
    return 'Points';
  };

  const formatParResult = (points) => {
    if (points === null || points === undefined) return '-';
    if (points > 0) return '+';
    if (points === 0) return '0';
    return '−';
  };

  return (
    <div className="scorecard-inline">
      <div className="scorecard-header">
        <button onClick={onBack} className="btn-back">← Back</button>
        <div className="round-info">
          <h2>{round.course_name} - {round.tee_name}</h2>
          <p>
            {round.player_name} | {round.competition_type} | 
            {round.daily_handicap != null && ` Daily HCP: ${round.daily_handicap} |`} {round.date}
          </p>
        </div>
        <div className="header-actions">
          {hasUnsavedChanges && (
            <>
              <button onClick={handleResetChanges} className="btn-reset" disabled={saving}>
                Reset
              </button>
              <button onClick={handleSaveRound} className="btn-save-round" disabled={saving}>
                {saving ? 'Saving...' : 'Save Round'}
              </button>
            </>
          )}
        </div>
      </div>

      {hasUnsavedChanges && !saving && (
        <div className="unsaved-indicator">
          ⚠️ You have unsaved changes
        </div>
      )}

      {saving && <div className="saving-indicator">Saving round...</div>}

      <div className="scorecard-container">
        <table className="scorecard-table-inline">
          <thead>
            <tr>
              <th className="hole-col">Hole</th>
              <th>Par</th>
              <th>Index</th>
              <th>Distance</th>
              <th className="score-col">Score</th>
              <th>Putts</th>
              <th>Penalties</th>
              <th>Fairway</th>
              <th>GIR</th>
              <th>Up&Down</th>
              <th>{getPointsLabel()}</th>
            </tr>
          </thead>
          <tbody>
            {enrichedHoles.map(hole => {
              const points = calculateHolePoints(
                round.competition_type,
                hole.score,
                hole.par,
                hole.stroke_index || 10,
                round.daily_handicap || 0
              );
              const handicapStrokes = getHandicapStrokes(round.daily_handicap || 0, hole.stroke_index || 10);
              
              return (
                <tr key={hole.hole_number} className={hole.score ? getRowClass(hole.score, hole.par) : ''}>
                  <td className="hole-number">
                    <strong>{hole.hole_number}</strong>
                    {handicapStrokes > 0 && round.competition_type === 'Par' && (
                      <span style={{fontSize: '0.7em', color: '#2e7d32'}}> +{handicapStrokes}</span>
                    )}
                  </td>
                  <td>{hole.par}</td>
                  <td className="small-text">{hole.stroke_index}</td>
                  <td className="small-text">{hole.distance}m</td>
                  <td className="score-col">
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={hole.score || ''}
                      onChange={(e) => handleScoreChange(hole.hole_number, e.target.value)}
                      className={`score-input ${getScoreClass(hole.score, hole.par)}`}
                      placeholder="-"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={hole.total_putts || ''}
                      onChange={(e) => handlePuttsChange(hole.hole_number, e.target.value)}
                      className="stat-input"
                      placeholder="-"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      value={hole.penalties || ''}
                      onChange={(e) => handlePenaltiesChange(hole.hole_number, e.target.value)}
                      className="stat-input"
                      placeholder="0"
                    />
                  </td>
                  <td>
                    <select
                      value={hole.fairway || 'na'}
                      onChange={(e) => updateHole(hole.hole_number, 'fairway', e.target.value)}
                      className="stat-select"
                      disabled={hole.par < 4}
                    >
                      <option value="na">-</option>
                      <option value="hit">Hit</option>
                      <option value="miss">Miss</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={hole.gir === null ? 'na' : hole.gir ? 'yes' : 'no'}
                      onChange={(e) => updateHole(hole.hole_number, 'gir', e.target.value === 'na' ? null : e.target.value === 'yes')}
                      className="stat-select"
                    >
                      <option value="na">-</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={hole.up_down || 'na'}
                      onChange={(e) => updateHole(hole.hole_number, 'up_down', e.target.value)}
                      className="stat-select"
                    >
                      <option value="na">-</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </td>
                  <td className="points-col">
                    {round.competition_type === 'Par' 
                      ? formatParResult(points)
                      : (points !== null ? points : '-')
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="totals-row">
              <td><strong>TOTAL</strong></td>
              <td><strong>{totals.par}</strong></td>
              <td colSpan="2"></td>
              <td className="score-col"><strong>{totals.score || '-'}</strong></td>
              <td><strong>{totals.putts || '-'}</strong></td>
              <td></td>
              <td className="small-text">{totals.fairwaysHit}/{totals.fairwaysAttempted}</td>
              <td className="small-text">{totals.girsHit}/{totals.girsAttempted}</td>
              <td></td>
              <td className="points-col"><strong>{totals.points || '-'}</strong></td>
            </tr>
            
            {/* Tiger 5 Section */}
            <tr style={{height: '10px', background: '#495057'}}>
              <td colSpan="11" style={{padding: 0}}></td>
            </tr>
            <tr style={{background: '#495057', color: 'white'}}>
              <td colSpan="11" style={{textAlign: 'center', fontWeight: 'bold', padding: '0.75rem'}}>
                TIGER 5 VIOLATIONS
              </td>
            </tr>
            
            {/* Bogey on Par 5 */}
            <tr style={{background: '#f8f9fa'}}>
              <td colSpan="4" style={{textAlign: 'left', paddingLeft: '1rem', fontWeight: '600'}}>
                1. Bogey on Par 5
              </td>
              {enrichedHoles.map(hole => (
                <td key={`t5-1-${hole.hole_number}`} style={{textAlign: 'center', fontSize: '1.2rem', color: '#d32f2f'}}>
                  {hole.par === 5 ? (
                    hole.par === 5 && hole.score && hole.score >= hole.par + 1 ? '✗' : '-'
                  ) : '-'}
                </td>
              ))}
              <td style={{fontWeight: 'bold', background: '#e9ecef'}}>{totals.tiger5_bogeyOnPar5}</td>
            </tr>
            
            {/* Double Bogey */}
            <tr style={{background: '#ffffff'}}>
              <td colSpan="4" style={{textAlign: 'left', paddingLeft: '1rem', fontWeight: '600'}}>
                2. Double Bogey+
              </td>
              {enrichedHoles.map(hole => (
                <td key={`t5-2-${hole.hole_number}`} style={{textAlign: 'center', fontSize: '1.2rem', color: '#d32f2f'}}>
                  {hole.score && hole.par && hole.score >= hole.par + 2 ? '✗' : '-'}
                </td>
              ))}
              <td style={{fontWeight: 'bold', background: '#e9ecef'}}>{totals.tiger5_doubleBogey}</td>
            </tr>
            
            {/* Three-Putt */}
            <tr style={{background: '#f8f9fa'}}>
              <td colSpan="4" style={{textAlign: 'left', paddingLeft: '1rem', fontWeight: '600'}}>
                3. Three-Putt
              </td>
              {enrichedHoles.map(hole => (
                <td key={`t5-3-${hole.hole_number}`} style={{textAlign: 'center', fontSize: '1.2rem', color: '#d32f2f'}}>
                  {hole.total_putts && hole.total_putts >= 3 ? '✗' : '-'}
                </td>
              ))}
              <td style={{fontWeight: 'bold', background: '#e9ecef'}}>{totals.tiger5_threePutt}</td>
            </tr>
            
            {/* Bogey <9 Iron (Manual) */}
            <tr style={{background: '#ffffff'}}>
              <td colSpan="4" style={{textAlign: 'left', paddingLeft: '1rem', fontWeight: '600'}}>
                4. Bogey &lt;9 Iron
              </td>
              {enrichedHoles.map(hole => (
                <td 
                  key={`t5-4-${hole.hole_number}`} 
                  style={{textAlign: 'center', fontSize: '1.2rem', color: '#d32f2f', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => handleTiger5Change(hole.hole_number, 'tiger5_short_miss', !hole.tiger5_short_miss)}
                >
                  {hole.tiger5_short_miss ? '✗' : '-'}
                </td>
              ))}
              <td style={{fontWeight: 'bold', background: '#e9ecef'}}>{totals.tiger5_shortMiss}</td>
            </tr>
            
            {/* Missed Up&Down (Manual) */}
            <tr style={{background: '#f8f9fa'}}>
              <td colSpan="4" style={{textAlign: 'left', paddingLeft: '1rem', fontWeight: '600'}}>
                5. Missed Up&Down
              </td>
              {enrichedHoles.map(hole => (
                <td 
                  key={`t5-5-${hole.hole_number}`} 
                  style={{textAlign: 'center', fontSize: '1.2rem', color: '#d32f2f', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => handleTiger5Change(hole.hole_number, 'tiger5_missed_updown', !hole.tiger5_missed_updown)}
                >
                  {hole.tiger5_missed_updown ? '✗' : '-'}
                </td>
              ))}
              <td style={{fontWeight: 'bold', background: '#e9ecef'}}>{totals.tiger5_missedUpDown}</td>
            </tr>
            
            {/* Tiger 5 Total */}
            <tr style={{background: '#495057', color: 'white', fontWeight: 'bold'}}>
              <td colSpan="4" style={{textAlign: 'left', paddingLeft: '1rem'}}>
                TIGER 5 TOTAL
              </td>
              <td colSpan="6"></td>
              <td style={{fontSize: '1.2rem'}}>{tiger5Total}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Score Legend */}
      <div className="score-legend">
        <div className="legend-title">Score Legend:</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-box legend-eagle"></div>
            <span>Eagle/Albatross (-2+)</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-birdie"></div>
            <span>Birdie (-1)</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-par"></div>
            <span>Par (0)</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-bogey"></div>
            <span>Bogey (+1)</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-double"></div>
            <span>Double+ (+2+)</span>
          </div>
        </div>
      </div>

      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-label">Total Score</div>
          <div className="stat-value">{totals.score || '-'}</div>
          <div className="stat-detail">vs Par: {totals.score ? (totals.score - totals.par > 0 ? '+' : '') + (totals.score - totals.par) : '-'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Fairways Hit</div>
          <div className="stat-value">{totals.fairwaysHit}/{totals.fairwaysAttempted}</div>
          <div className="stat-detail">{totals.fairwaysAttempted ? Math.round((totals.fairwaysHit/totals.fairwaysAttempted)*100) : 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Greens in Regulation</div>
          <div className="stat-value">{totals.girsHit}/{totals.girsAttempted}</div>
          <div className="stat-detail">{totals.girsAttempted ? Math.round((totals.girsHit/totals.girsAttempted)*100) : 0}%</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Putts</div>
          <div className="stat-value">{totals.putts || '-'}</div>
          <div className="stat-detail">Avg: {totals.putts && holes.length ? (totals.putts / holes.length).toFixed(1) : '-'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{getPointsLabel()}</div>
          <div className="stat-value">{totals.points || '-'}</div>
          <div className="stat-detail">{round.competition_type}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Tiger 5 Violations</div>
          <div className="stat-value">{tiger5Total}</div>
          <div className="stat-detail">Total mistakes</div>
        </div>
      </div>
    </div>
  );
}

function getRowClass(score, par) {
  const diff = score - par;
  if (diff <= -2) return 'row-eagle';
  if (diff === -1) return 'row-birdie';
  if (diff === 0) return 'row-par';
  if (diff === 1) return 'row-bogey';
  return 'row-double';
}

export default ScorecardInline;
