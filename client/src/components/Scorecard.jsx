import { useState, useEffect } from 'react';
import { roundsApi, coursesApi } from '../api/client';
import HoleInput from './HoleInput';
import './Scorecard.css';

function Scorecard({ roundId, onBack }) {
  const [round, setRound] = useState(null);
  const [holes, setHoles] = useState([]);
  const [courseHoles, setCourseHoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedHole, setSelectedHole] = useState(null);

  useEffect(() => {
    loadRound();
  }, [roundId]);

  const loadRound = async () => {
    try {
      setLoading(true);
      const data = await roundsApi.getById(roundId);
      setRound(data);
      setHoles(data.holes || []);
      
      // Load course hole data for distances and stroke indexes
      const courseHoleData = await coursesApi.getHoles(data.course_id, data.tee_id);
      setCourseHoles(courseHoleData);
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load round: ' + err.message);
      setLoading(false);
    }
  };

  const handleHoleUpdate = async (holeNumber, holeData) => {
    try {
      await roundsApi.updateHole(roundId, holeNumber, holeData);
      await loadRound(); // Reload to get updated totals
    } catch (err) {
      setError('Failed to update hole: ' + err.message);
    }
  };

  if (loading) {
    return <div className="loading">Loading scorecard...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!round) {
    return <div className="error-message">Round not found</div>;
  }

  // Merge hole data with course hole data
  const enrichedHoles = holes.map(hole => {
    const courseHole = courseHoles.find(ch => ch.hole_number === hole.hole_number);
    return { ...hole, ...courseHole };
  });

  const frontNine = enrichedHoles.filter(h => h.hole_number <= 9);
  const backNine = enrichedHoles.filter(h => h.hole_number > 9);

  const calculateTotals = (holesList) => {
    return holesList.reduce((acc, hole) => {
      acc.par += hole.par || 0;
      acc.score += hole.score || 0;
      acc.points += hole.points || 0;
      acc.putts += hole.total_putts || 0;
      if (hole.fairway === 'hit') acc.fairwaysHit++;
      if (hole.fairway && hole.fairway !== 'na' && hole.par >= 4) acc.fairwaysAttempted++;
      if (hole.gir) acc.girsHit++;
      if (hole.gir !== null) acc.girsAttempted++;
      return acc;
    }, { par: 0, score: 0, points: 0, putts: 0, fairwaysHit: 0, fairwaysAttempted: 0, girsHit: 0, girsAttempted: 0 });
  };

  const frontTotals = calculateTotals(frontNine);
  const backTotals = calculateTotals(backNine);
  const grandTotals = calculateTotals(enrichedHoles);

  return (
    <div className="scorecard">
      <div className="scorecard-header">
        <button onClick={onBack} className="btn-back">← Back</button>
        <div className="round-info">
          <h2>{round.course_name} - {round.tee_name}</h2>
          <p>
            {round.player_name} | {round.competition_type} | 
            {round.player_handicap > 0 && ` HCP: ${round.player_handicap} |`} {round.date}
          </p>
        </div>
      </div>

      <div className="scorecard-grid-container">
        <table className="scorecard-table">
          <thead>
            <tr>
              <th>Hole</th>
              {frontNine.map(hole => <th key={hole.hole_number}>{hole.hole_number}</th>)}
              <th className="total-col">OUT</th>
              {backNine.map(hole => <th key={hole.hole_number}>{hole.hole_number}</th>)}
              <th className="total-col">IN</th>
              <th className="total-col">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr className="par-row">
              <td><strong>Par</strong></td>
              {frontNine.map(hole => <td key={hole.hole_number}>{hole.par}</td>)}
              <td className="total-col">{frontTotals.par}</td>
              {backNine.map(hole => <td key={hole.hole_number}>{hole.par}</td>)}
              <td className="total-col">{backTotals.par}</td>
              <td className="total-col">{grandTotals.par}</td>
            </tr>
            <tr className="score-row">
              <td><strong>Score</strong></td>
              {frontNine.map(hole => (
                <td 
                  key={hole.hole_number} 
                  className={`score-cell ${hole.score ? getScoreClass(hole.score, hole.par) : ''}`}
                  onClick={() => setSelectedHole(hole)}
                  style={{ cursor: 'pointer' }}
                >
                  {hole.score || '-'}
                </td>
              ))}
              <td className="total-col">{frontTotals.score || '-'}</td>
              {backNine.map(hole => (
                <td 
                  key={hole.hole_number} 
                  className={`score-cell ${hole.score ? getScoreClass(hole.score, hole.par) : ''}`}
                  onClick={() => setSelectedHole(hole)}
                  style={{ cursor: 'pointer' }}
                >
                  {hole.score || '-'}
                </td>
              ))}
              <td className="total-col">{backTotals.score || '-'}</td>
              <td className="total-col">{grandTotals.score || '-'}</td>
            </tr>
            {round.competition_type !== 'Stroke' && (
              <tr className="points-row">
                <td><strong>Points</strong></td>
                {frontNine.map(hole => <td key={hole.hole_number}>{hole.points !== null ? hole.points : '-'}</td>)}
                <td className="total-col">{frontTotals.points || '-'}</td>
                {backNine.map(hole => <td key={hole.hole_number}>{hole.points !== null ? hole.points : '-'}</td>)}
                <td className="total-col">{backTotals.points || '-'}</td>
                <td className="total-col">{grandTotals.points || '-'}</td>
              </tr>
            )}
            <tr className="distance-row">
              <td><strong>Distance (m)</strong></td>
              {frontNine.map(hole => <td key={hole.hole_number} className="small-text">{hole.distance || '-'}</td>)}
              <td className="total-col">-</td>
              {backNine.map(hole => <td key={hole.hole_number} className="small-text">{hole.distance || '-'}</td>)}
              <td className="total-col">-</td>
              <td className="total-col">-</td>
            </tr>
            <tr className="index-row">
              <td><strong>Index</strong></td>
              {frontNine.map(hole => <td key={hole.hole_number} className="small-text">{hole.stroke_index || '-'}</td>)}
              <td className="total-col">-</td>
              {backNine.map(hole => <td key={hole.hole_number} className="small-text">{hole.stroke_index || '-'}</td>)}
              <td className="total-col">-</td>
              <td className="total-col">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="stats-summary">
        <div className="stat-item">
          <span className="stat-label">Fairways:</span>
          <span className="stat-value">{grandTotals.fairwaysHit}/{grandTotals.fairwaysAttempted}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">GIR:</span>
          <span className="stat-value">{grandTotals.girsHit}/{grandTotals.girsAttempted}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Putts:</span>
          <span className="stat-value">{grandTotals.putts}</span>
        </div>
      </div>

      {selectedHole && (
        <HoleInput
          hole={selectedHole}
          round={round}
          onSave={handleHoleUpdate}
          onClose={() => setSelectedHole(null)}
        />
      )}
    </div>
  );
}

function getScoreClass(score, par) {
  const diff = score - par;
  if (diff <= -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  return 'double-bogey';
}

export default Scorecard;
