import { useState, useEffect } from 'react';
import { roundsApi, coursesApi } from '../api/client';
import './ScorecardHorizontal.css';

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
  
  if (scoreToPar <= -3) return 5;
  if (scoreToPar === -2) return 4;
  if (scoreToPar === -1) return 3;
  if (scoreToPar === 0) return 2;
  if (scoreToPar === 1) return 1;
  return 0;
}

function calculateParPoints(score, par, handicapStrokes = 0) {
  if (!score) return 0;
  
  const netScore = score - handicapStrokes;
  const scoreToPar = netScore - par;
  
  if (scoreToPar < 0) return 1;
  if (scoreToPar === 0) return 0;
  return -1;
}

function calculateHolePoints(competitionType, score, par, strokeIndex, playerHandicap = 0) {
  if (!score) return null;
  
  const handicapStrokes = getHandicapStrokes(playerHandicap, strokeIndex);
  
  switch (competitionType) {
    case 'Stroke':
      return score - handicapStrokes;
    case 'Stableford':
      return calculateStablefordPoints(score, par, handicapStrokes);
    case 'Par':
      return calculateParPoints(score, par, handicapStrokes);
    default:
      return null;
  }
}

function ScorecardHorizontal({ roundId, onBack }) {
  const [round, setRound] = useState(null);
  const [holes, setHoles] = useState([]);
  const [courseHoles, setCourseHoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [tiger5, setTiger5] = useState(null);

  useEffect(() => {
    loadRound();
  }, [roundId]);

  const loadRound = async () => {
    try {
      setLoading(true);
      const data = await roundsApi.getById(roundId);
      setRound(data);
      setHoles(data.holes || []);
      setTiger5(data.tiger5);
      
      const courseHoleData = await coursesApi.getHoles(data.course_id, data.tee_id);
      setCourseHoles(courseHoleData);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load round: ' + err.message);
      setLoading(false);
    }
  };

  const updateHole = (holeNumber, field, value) => {
    // Update local state immediately
    setHoles(prevHoles => 
      prevHoles.map(h => 
        h.hole_number === holeNumber ? { ...h, [field]: value } : h
      )
    );
    setHasUnsavedChanges(true);
  };

  const handleSaveRound = async () => {
    try {
      setSaving(true);
      setError(null);
      
      // Save all holes in parallel for better performance
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
      
      // Reload to get recalculated points/totals
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

  const frontNine = enrichedHoles.filter(h => h.hole_number <= 9);
  const backNine = enrichedHoles.filter(h => h.hole_number > 9);

  const calcNineTotals = (nineHoles) => {
    return {
      par: nineHoles.reduce((sum, h) => sum + (h.par || 0), 0),
      score: nineHoles.reduce((sum, h) => sum + (h.score || 0), 0),
      putts: nineHoles.reduce((sum, h) => sum + (h.total_putts || 0), 0),
      fairways: `${nineHoles.filter(h => h.fairway === 'hit').length}/${nineHoles.filter(h => h.par >= 4).length}`,
      girs: `${nineHoles.filter(h => h.gir === true).length}/${nineHoles.filter(h => h.gir !== null).length}`,
      updowns: `${nineHoles.filter(h => h.up_down === 'yes').length}/${nineHoles.filter(h => h.up_down && h.up_down !== 'na').length}`,
    };
  };

  const frontTotals = calcNineTotals(frontNine);
  const backTotals = calcNineTotals(backNine);
  const grandPar = frontTotals.par + backTotals.par;
  const grandScore = frontTotals.score + backTotals.score;
  const grandPutts = frontTotals.putts + backTotals.putts;

  const getScoreClass = (score, par) => {
    if (!score || !par) return '';
    const diff = score - par;
    if (diff <= -2) return 'score-eagle';
    if (diff === -1) return 'score-birdie';
    if (diff === 0) return 'score-par';
    if (diff === 1) return 'score-bogey';
    return 'score-double';
  };

  return (
    <div className="scorecard-horizontal">
      <div className="scorecard-header">
        <button onClick={onBack} className="btn-back">← Back</button>
        <div className="round-info">
          <h2>{round.course_name} - {round.tee_name}</h2>
          <p>{round.player_name} | {round.competition_type} | Daily HCP: {round.daily_handicap} | {round.date}</p>
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

      <div className="scorecard-scroll">
        <table className="scorecard-table-horiz">
          <thead>
            <tr>
              <th className="label-col">Hole</th>
              {frontNine.map(h => <th key={h.hole_number}>{h.hole_number}</th>)}
              <th className="summary-col">OUT</th>
              {backNine.map(h => <th key={h.hole_number}>{h.hole_number}</th>)}
              <th className="summary-col">IN</th>
              <th className="total-col">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="par-row">
              <td className="label-col"><strong>Par</strong></td>
              {frontNine.map(h => <td key={h.hole_number}>{h.par}</td>)}
              <td className="summary-col">{frontTotals.par}</td>
              {backNine.map(h => <td key={h.hole_number}>{h.par}</td>)}
              <td className="summary-col">{backTotals.par}</td>
              <td className="total-col" style={{color: 'white'}}>{grandPar}</td>
            </tr>

            <tr className="index-row">
              <td className="label-col"><strong>Index</strong></td>
              {frontNine.map(h => <td key={h.hole_number} className="small-text">{h.stroke_index || '-'}</td>)}
              <td className="summary-col">-</td>
              {backNine.map(h => <td key={h.hole_number} className="small-text">{h.stroke_index || '-'}</td>)}
              <td className="summary-col">-</td>
              <td className="total-col" style={{color: 'white'}}>-</td>
            </tr>

            <tr className="score-row">
              <td className="label-col"><strong>Score</strong></td>
              {frontNine.map(h => (
                <td key={h.hole_number}>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={h.score || ''}
                    onChange={(e) => updateHole(h.hole_number, 'score', e.target.value ? parseInt(e.target.value) : null)}
                    className={`score-input ${getScoreClass(h.score, h.par)}`}
                  />
                </td>
              ))}
              <td className="summary-col">{frontTotals.score || '-'}</td>
              {backNine.map(h => (
                <td key={h.hole_number}>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={h.score || ''}
                    onChange={(e) => updateHole(h.hole_number, 'score', e.target.value ? parseInt(e.target.value) : null)}
                    className={`score-input ${getScoreClass(h.score, h.par)}`}
                  />
                </td>
              ))}
              <td className="summary-col">{backTotals.score || '-'}</td>
              <td className="total-col" style={{color: 'white'}}><strong>{grandScore || '-'}</strong></td>
            </tr>

            <tr className="points-row">
              <td className="label-col"><strong>{round.competition_type === 'Stroke' ? 'Net' : (round.competition_type === 'Par' ? 'Result' : 'Points')}</strong></td>
              {frontNine.map(h => {
                const points = calculateHolePoints(round.competition_type, h.score, h.par, h.stroke_index || 10, round.daily_handicap || 0);
                return (
                  <td key={h.hole_number} className="points-cell">
                    {round.competition_type === 'Par' 
                      ? (points > 0 ? '+' : points === 0 ? '0' : '−')
                      : (points !== null ? points : '-')
                    }
                  </td>
                );
              })}
              <td className="summary-col">
                {(() => {
                  const total = frontNine.reduce((sum, h) => {
                    const pts = calculateHolePoints(round.competition_type, h.score, h.par, h.stroke_index || 10, round.daily_handicap || 0);
                    return sum + (pts || 0);
                  }, 0);
                  if (total === 0 && round.competition_type === 'Par') return '0';
                  if (round.competition_type === 'Par' && total > 0) return `+${total}`;
                  if (round.competition_type === 'Par' && total < 0) return `${total}`;
                  return total || '-';
                })()}
              </td>
              {backNine.map(h => {
                const points = calculateHolePoints(round.competition_type, h.score, h.par, h.stroke_index || 10, round.daily_handicap || 0);
                return (
                  <td key={h.hole_number} className="points-cell">
                    {round.competition_type === 'Par' 
                      ? (points > 0 ? '+' : points === 0 ? '0' : '−')
                      : (points !== null ? points : '-')
                    }
                  </td>
                );
              })}
              <td className="summary-col">
                {(() => {
                  const total = backNine.reduce((sum, h) => {
                    const pts = calculateHolePoints(round.competition_type, h.score, h.par, h.stroke_index || 10, round.daily_handicap || 0);
                    return sum + (pts || 0);
                  }, 0);
                  if (total === 0 && round.competition_type === 'Par') return '0';
                  if (round.competition_type === 'Par' && total > 0) return `+${total}`;
                  if (round.competition_type === 'Par' && total < 0) return `${total}`;
                  return total || '-';
                })()}
              </td>
              <td className="total-col" style={{color: 'white'}}>
                <strong>
                  {(() => {
                    const total = enrichedHoles.reduce((sum, h) => {
                      const pts = calculateHolePoints(round.competition_type, h.score, h.par, h.stroke_index || 10, round.daily_handicap || 0);
                      return sum + (pts || 0);
                    }, 0);
                    if (total === 0 && round.competition_type === 'Par') return '0';
                    if (round.competition_type === 'Par' && total > 0) return `+${total}`;
                    if (round.competition_type === 'Par' && total < 0) return `${total}`;
                    return total || '-';
                  })()}
                </strong>
              </td>
            </tr>

            <tr>
              <td className="label-col">Penalties</td>
              {frontNine.map(h => (
                <td key={h.hole_number}>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={h.penalties || ''}
                    onChange={(e) => updateHole(h.hole_number, 'penalties', e.target.value ? parseInt(e.target.value) : 0)}
                    className="stat-input-small"
                  />
                </td>
              ))}
              <td className="summary-col">-</td>
              {backNine.map(h => (
                <td key={h.hole_number}>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    value={h.penalties || ''}
                    onChange={(e) => updateHole(h.hole_number, 'penalties', e.target.value ? parseInt(e.target.value) : 0)}
                    className="stat-input-small"
                  />
                </td>
              ))}
              <td className="summary-col">-</td>
              <td className="total-col" style={{color: 'white'}}>-</td>
            </tr>

            <tr>
              <td className="label-col">Fairway</td>
              {frontNine.map(h => (
                <td key={h.hole_number}>
                  {h.par >= 4 ? (
                    <select
                      value={h.fairway || 'na'}
                      onChange={(e) => updateHole(h.hole_number, 'fairway', e.target.value)}
                      className="stat-select-small"
                    >
                      <option value="na">-</option>
                      <option value="hit">✓</option>
                      <option value="left">←</option>
                      <option value="right">→</option>
                    </select>
                  ) : '-'}
                </td>
              ))}
              <td className="summary-col">{frontTotals.fairways}</td>
              {backNine.map(h => (
                <td key={h.hole_number}>
                  {h.par >= 4 ? (
                    <select
                      value={h.fairway || 'na'}
                      onChange={(e) => updateHole(h.hole_number, 'fairway', e.target.value)}
                      className="stat-select-small"
                    >
                      <option value="na">-</option>
                      <option value="hit">✓</option>
                      <option value="left">←</option>
                      <option value="right">→</option>
                    </select>
                  ) : '-'}
                </td>
              ))}
              <td className="summary-col">{backTotals.fairways}</td>
              <td className="total-col" style={{color: 'white'}}>
                {enrichedHoles.filter(h => h.fairway === 'hit').length}/
                {enrichedHoles.filter(h => h.par >= 4).length}
              </td>
            </tr>

            <tr>
              <td className="label-col">GIR</td>
              {frontNine.map(h => (
                <td key={h.hole_number}>
                  <select
                    value={h.gir === null ? 'na' : h.gir ? 'yes' : 'no'}
                    onChange={(e) => {
                      const val = e.target.value === 'na' ? null : (e.target.value === 'yes' ? 1 : 0);
                      updateHole(h.hole_number, 'gir', val);
                    }}
                    className="stat-select-small"
                  >
                    <option value="na">-</option>
                    <option value="yes">✓</option>
                    <option value="no">✗</option>
                  </select>
                </td>
              ))}
              <td className="summary-col">{frontTotals.girs}</td>
              {backNine.map(h => (
                <td key={h.hole_number}>
                  <select
                    value={h.gir === null ? 'na' : h.gir ? 'yes' : 'no'}
                    onChange={(e) => {
                      const val = e.target.value === 'na' ? null : (e.target.value === 'yes' ? 1 : 0);
                      updateHole(h.hole_number, 'gir', val);
                    }}
                    className="stat-select-small"
                  >
                    <option value="na">-</option>
                    <option value="yes">✓</option>
                    <option value="no">✗</option>
                  </select>
                </td>
              ))}
              <td className="summary-col">{backTotals.girs}</td>
              <td className="total-col" style={{color: 'white'}}>
                {enrichedHoles.filter(h => h.gir === true).length}/
                {enrichedHoles.filter(h => h.gir !== null).length}
              </td>
            </tr>

            <tr>
              <td className="label-col">Up/Down</td>
              {frontNine.map(h => (
                <td key={h.hole_number}>
                  <select
                    value={h.up_down || 'na'}
                    onChange={(e) => updateHole(h.hole_number, 'up_down', e.target.value)}
                    className="stat-select-small"
                  >
                    <option value="na">-</option>
                    <option value="yes">✓</option>
                    <option value="no">✗</option>
                  </select>
                </td>
              ))}
              <td className="summary-col">{frontTotals.updowns}</td>
              {backNine.map(h => (
                <td key={h.hole_number}>
                  <select
                    value={h.up_down || 'na'}
                    onChange={(e) => updateHole(h.hole_number, 'up_down', e.target.value)}
                    className="stat-select-small"
                  >
                    <option value="na">-</option>
                    <option value="yes">✓</option>
                    <option value="no">✗</option>
                  </select>
                </td>
              ))}
              <td className="summary-col">{backTotals.updowns}</td>
              <td className="total-col" style={{color: 'white'}}>
                {enrichedHoles.filter(h => h.up_down === 'yes').length}/
                {enrichedHoles.filter(h => h.up_down && h.up_down !== 'na').length}
              </td>
            </tr>

            <tr>
              <td className="label-col">Total Putts</td>
              {frontNine.map(h => (
                <td key={h.hole_number}>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={h.total_putts || ''}
                    onChange={(e) => updateHole(h.hole_number, 'total_putts', e.target.value ? parseInt(e.target.value) : null)}
                    className="stat-input-small"
                  />
                </td>
              ))}
              <td className="summary-col">{frontTotals.putts || '-'}</td>
              {backNine.map(h => (
                <td key={h.hole_number}>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={h.total_putts || ''}
                    onChange={(e) => updateHole(h.hole_number, 'total_putts', e.target.value ? parseInt(e.target.value) : null)}
                    className="stat-input-small"
                  />
                </td>
              ))}
              <td className="summary-col">{backTotals.putts || '-'}</td>
              <td className="total-col" style={{color: 'white'}}><strong>{grandPutts || '-'}</strong></td>
            </tr>

            {/* Tiger 5 Section Header */}
            <tr style={{background: '#495057'}}>
              <td colSpan="22" style={{padding: '2px'}}></td>
            </tr>
            <tr style={{background: '#495057', color: 'white'}}>
              <td className="label-col" style={{fontWeight: 'bold'}}>TIGER 5</td>
              <td colSpan="10" style={{textAlign: 'center', fontSize: '0.8em'}}>FRONT NINE</td>
              <td className="summary-col">OUT</td>
              <td colSpan="9" style={{textAlign: 'center', fontSize: '0.8em'}}>BACK NINE</td>
              <td className="summary-col">IN</td>
              <td className="total-col" style={{color: 'white'}}>TOTAL</td>
            </tr>

            {/* T5 Rule 1: Bogey on Par 5 */}
            <tr style={{background: '#f8f9fa'}}>
              <td className="label-col">1. Bogey Par 5</td>
              {frontNine.map(h => (
                <td key={h.hole_number} style={{fontSize: '1.2rem', color: '#d32f2f'}}>
                  {h.par === 5 ? (h.score && h.score >= h.par + 1 ? '✗' : '-') : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{frontNine.filter(h => h.par === 5 && h.score && h.score >= h.par + 1).length}</td>
              {backNine.map(h => (
                <td key={h.hole_number} style={{fontSize: '1.2rem', color: '#d32f2f'}}>
                  {h.par === 5 ? (h.score && h.score >= h.par + 1 ? '✗' : '-') : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{backNine.filter(h => h.par === 5 && h.score && h.score >= h.par + 1).length}</td>
              <td className="total-col" style={{color: 'white'}}><strong>{enrichedHoles.filter(h => h.par === 5 && h.score && h.score >= h.par + 1).length}</strong></td>
            </tr>

            {/* T5 Rule 2: Double Bogey+ */}
            <tr style={{background: '#fff'}}>
              <td className="label-col">2. Double+</td>
              {frontNine.map(h => (
                <td key={h.hole_number} style={{fontSize: '1.2rem', color: '#d32f2f'}}>
                  {h.score && h.par && h.score >= h.par + 2 ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{frontNine.filter(h => h.score && h.par && h.score >= h.par + 2).length}</td>
              {backNine.map(h => (
                <td key={h.hole_number} style={{fontSize: '1.2rem', color: '#d32f2f'}}>
                  {h.score && h.par && h.score >= h.par + 2 ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{backNine.filter(h => h.score && h.par && h.score >= h.par + 2).length}</td>
              <td className="total-col" style={{color: 'white'}}><strong>{enrichedHoles.filter(h => h.score && h.par && h.score >= h.par + 2).length}</strong></td>
            </tr>

            {/* T5 Rule 3: Three-Putt */}
            <tr style={{background: '#f8f9fa'}}>
              <td className="label-col">3. Three-Putt</td>
              {frontNine.map(h => (
                <td key={h.hole_number} style={{fontSize: '1.2rem', color: '#d32f2f'}}>
                  {h.total_putts && h.total_putts >= 3 ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{frontNine.filter(h => h.total_putts && h.total_putts >= 3).length}</td>
              {backNine.map(h => (
                <td key={h.hole_number} style={{fontSize: '1.2rem', color: '#d32f2f'}}>
                  {h.total_putts && h.total_putts >= 3 ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{backNine.filter(h => h.total_putts && h.total_putts >= 3).length}</td>
              <td className="total-col" style={{color: 'white'}}><strong>{enrichedHoles.filter(h => h.total_putts && h.total_putts >= 3).length}</strong></td>
            </tr>

            {/* T5 Rule 4: <=9 Iron Bogey (Manual) */}
            <tr style={{background: '#fff'}}>
              <td className="label-col" style={{whiteSpace: 'nowrap'}}>4. &le;9 Iron Bogey</td>
              {frontNine.map(h => (
                <td 
                  key={h.hole_number}
                  style={{fontSize: '1.2rem', color: '#d32f2f', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => updateHole(h.hole_number, 'tiger5_short_miss', h.tiger5_short_miss ? 0 : 1)}
                >
                  {h.tiger5_short_miss ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{frontNine.filter(h => h.tiger5_short_miss).length}</td>
              {backNine.map(h => (
                <td 
                  key={h.hole_number}
                  style={{fontSize: '1.2rem', color: '#d32f2f', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => updateHole(h.hole_number, 'tiger5_short_miss', h.tiger5_short_miss ? 0 : 1)}
                >
                  {h.tiger5_short_miss ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{backNine.filter(h => h.tiger5_short_miss).length}</td>
              <td className="total-col" style={{color: 'white'}}><strong>{enrichedHoles.filter(h => h.tiger5_short_miss).length}</strong></td>
            </tr>

            {/* T5 Rule 5: Blown Easy Up & Down (Manual) */}
            <tr style={{background: '#f8f9fa'}}>
              <td className="label-col" style={{whiteSpace: 'nowrap'}}>5. Blown Easy Up & Down</td>
              {frontNine.map(h => (
                <td 
                  key={h.hole_number}
                  style={{fontSize: '1.2rem', color: '#d32f2f', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => updateHole(h.hole_number, 'tiger5_missed_updown', h.tiger5_missed_updown ? 0 : 1)}
                >
                  {h.tiger5_missed_updown ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{frontNine.filter(h => h.tiger5_missed_updown).length}</td>
              {backNine.map(h => (
                <td 
                  key={h.hole_number}
                  style={{fontSize: '1.2rem', color: '#d32f2f', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => updateHole(h.hole_number, 'tiger5_missed_updown', h.tiger5_missed_updown ? 0 : 1)}
                >
                  {h.tiger5_missed_updown ? '✗' : '-'}
                </td>
              ))}
              <td className="summary-col" style={{color: '#212529'}}>{backNine.filter(h => h.tiger5_missed_updown).length}</td>
              <td className="total-col" style={{color: 'white'}}><strong>{enrichedHoles.filter(h => h.tiger5_missed_updown).length}</strong></td>
            </tr>

            {/* T5 Total Row */}
            <tr style={{background: '#495057', color: 'white', fontWeight: 'bold'}}>
              <td className="label-col">T5 TOTAL</td>
              <td colSpan="10"></td>
              <td className="summary-col">
                {frontNine.filter(h => 
                  (h.par === 5 && h.score >= h.par + 1) ||
                  (h.score && h.par && h.score >= h.par + 2) ||
                  (h.total_putts >= 3) ||
                  h.tiger5_short_miss ||
                  h.tiger5_missed_updown
                ).length}
              </td>
              <td colSpan="9"></td>
              <td className="summary-col">
                {backNine.filter(h => 
                  (h.par === 5 && h.score >= h.par + 1) ||
                  (h.score && h.par && h.score >= h.par + 2) ||
                  (h.total_putts >= 3) ||
                  h.tiger5_short_miss ||
                  h.tiger5_missed_updown
                ).length}
              </td>
              <td className="total-col" style={{fontSize: '1.2em', color: 'white'}}>
                {enrichedHoles.reduce((sum, h) => {
                  let count = 0;
                  if (h.par === 5 && h.score && h.score >= h.par + 1) count++;
                  if (h.score && h.par && h.score >= h.par + 2) count++;
                  if (h.total_putts && h.total_putts >= 3) count++;
                  if (h.tiger5_short_miss) count++;
                  if (h.tiger5_missed_updown) count++;
                  return sum + count;
                }, 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Score Legend */}
      <div className="score-legend">
        <div className="legend-title">Score Legend:</div>
        <div className="legend-items">
          <div className="legend-item">
            <div className="legend-box legend-eagle"></div>
            <span>Eagle/Albatross</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-birdie"></div>
            <span>Birdie</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-par"></div>
            <span>Par</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-bogey"></div>
            <span>Bogey</span>
          </div>
          <div className="legend-item">
            <div className="legend-box legend-double"></div>
            <span>Double+</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ScorecardHorizontal;
