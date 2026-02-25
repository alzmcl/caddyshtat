import './Tiger5Display.css';

function Tiger5Display({ tiger5Data }) {
  if (!tiger5Data) return null;

  const { byHole, totals } = tiger5Data;

  const getRuleLabel = (rule) => {
    switch (rule) {
      case 'bogeyOnPar5': return 'Bogey on Par 5';
      case 'doubleBogey': return 'Double Bogey+';
      case 'threePutt': return 'Three-Putt';
      case 'shortMiss': return 'Bogey <9 Iron';
      case 'missedUpDown': return 'Missed Up&Down';
      default: return rule;
    }
  };

  const getGradeColor = () => {
    if (totals.color === 'green') return 'tiger5-excellent';
    if (totals.color === 'yellow') return 'tiger5-good';
    return 'tiger5-needswork';
  };

  return (
    <div className="tiger5-display">
      <div className="tiger5-header">
        <h3>Tiger 5 Scorecard</h3>
        <p className="tiger5-subtitle">Violations of Tiger Woods' 5 Key Rules</p>
      </div>

      <div className="tiger5-content">
        {/* Summary Card */}
        <div className={`tiger5-summary-card ${getGradeColor()}`}>
          <div className="tiger5-score-label">TIGER 5 SCORE</div>
          <div className="tiger5-score-value">{totals.total} / {totals.maxPossible}</div>
          <div className="tiger5-score-detail">{totals.total} violations</div>
          <div className="tiger5-grade">{totals.grade}</div>
        </div>

        {/* Detailed Table */}
        <div className="tiger5-table-container">
          <table className="tiger5-table">
            <thead>
              <tr>
                <th className="tiger5-rule-col">Rule</th>
                {byHole.map(h => (
                  <th key={h.hole_number} className="tiger5-hole-col">{h.hole_number}</th>
                ))}
                <th className="tiger5-total-col">Total</th>
              </tr>
            </thead>
            <tbody>
              {['bogeyOnPar5', 'doubleBogey', 'threePutt', 'shortMiss', 'missedUpDown'].map(rule => (
                <tr key={rule}>
                  <td className="tiger5-rule-name">{getRuleLabel(rule)}</td>
                  {byHole.map(h => (
                    <td key={h.hole_number} className="tiger5-violation-cell">
                      {h[rule] ? '✗' : '-'}
                    </td>
                  ))}
                  <td className="tiger5-rule-total">{totals[rule]}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="tiger5-totals-row">
                <td><strong>TOTAL VIOLATIONS</strong></td>
                <td colSpan={byHole.length}></td>
                <td className="tiger5-grand-total"><strong>{totals.total}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Tiger5Display;
