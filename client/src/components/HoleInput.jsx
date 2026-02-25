import { useState } from 'react';
import './HoleInput.css';

function HoleInput({ hole, round, onSave, onClose }) {
  const [formData, setFormData] = useState({
    score: hole.score || '',
    penalties: hole.penalties || 0,
    fairway: hole.fairway || 'na',
    gir: hole.gir || false,
    up_down: hole.up_down || 'na',
    first_putt_distance: hole.first_putt_distance || '',
    total_putts: hole.total_putts || ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const dataToSave = {
      score: formData.score ? parseInt(formData.score) : null,
      penalties: parseInt(formData.penalties) || 0,
      fairway: formData.fairway,
      gir: formData.gir === 'true' || formData.gir === true,
      up_down: formData.up_down,
      first_putt_distance: formData.first_putt_distance ? parseFloat(formData.first_putt_distance) : null,
      total_putts: formData.total_putts ? parseInt(formData.total_putts) : null
    };
    
    onSave(hole.hole_number, dataToSave);
    onClose();
  };

  return (
    <div className="hole-input-overlay" onClick={onClose}>
      <div className="hole-input-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Hole {hole.hole_number} - Par {hole.par}</h3>
            {round && (
              <p style={{fontSize: '0.9rem', color: '#666', margin: '0.25rem 0 0 0'}}>
                {round.course_name} | {round.competition_type} | {round.date}
              </p>
            )}
          </div>
          <button onClick={onClose} className="btn-close">×</button>
        </div>

        <div className="hole-details">
          {hole.distance && <p><strong>Distance:</strong> {hole.distance}m</p>}
          {hole.stroke_index && <p><strong>Stroke Index:</strong> {hole.stroke_index}</p>}
        </div>

        <form onSubmit={handleSubmit} className="hole-input-form">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="score">Score *</label>
              <input
                id="score"
                type="number"
                value={formData.score}
                onChange={(e) => handleChange('score', e.target.value)}
                min="1"
                max="15"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="penalties">Penalties</label>
              <input
                id="penalties"
                type="number"
                value={formData.penalties}
                onChange={(e) => handleChange('penalties', e.target.value)}
                min="0"
                max="5"
              />
            </div>
          </div>

          {hole.par >= 4 && (
            <div className="form-group">
              <label>Fairway</label>
              <div className="button-group">
                <button
                  type="button"
                  className={formData.fairway === 'hit' ? 'active' : ''}
                  onClick={() => handleChange('fairway', 'hit')}
                >
                  ✓ Hit
                </button>
                <button
                  type="button"
                  className={formData.fairway === 'miss' ? 'active' : ''}
                  onClick={() => handleChange('fairway', 'miss')}
                >
                  ✗ Miss
                </button>
                <button
                  type="button"
                  className={formData.fairway === 'left' ? 'active' : ''}
                  onClick={() => handleChange('fairway', 'left')}
                >
                  ← Left
                </button>
                <button
                  type="button"
                  className={formData.fairway === 'right' ? 'active' : ''}
                  onClick={() => handleChange('fairway', 'right')}
                >
                  → Right
                </button>
                <button
                  type="button"
                  className={formData.fairway === 'short' ? 'active' : ''}
                  onClick={() => handleChange('fairway', 'short')}
                >
                  ↓ Short
                </button>
                <button
                  type="button"
                  className={formData.fairway === 'long' ? 'active' : ''}
                  onClick={() => handleChange('fairway', 'long')}
                >
                  ↑ Long
                </button>
                <button
                  type="button"
                  className={formData.fairway === 'na' ? 'active' : ''}
                  onClick={() => handleChange('fairway', 'na')}
                >
                  N/A
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Green in Regulation (GIR)</label>
            <div className="button-group">
              <button
                type="button"
                className={formData.gir === true || formData.gir === 'true' ? 'active' : ''}
                onClick={() => handleChange('gir', true)}
              >
                ✓ Yes
              </button>
              <button
                type="button"
                className={formData.gir === false || formData.gir === 'false' ? 'active' : ''}
                onClick={() => handleChange('gir', false)}
              >
                ✗ No
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Up & Down</label>
            <div className="button-group">
              <button
                type="button"
                className={formData.up_down === 'yes' ? 'active' : ''}
                onClick={() => handleChange('up_down', 'yes')}
              >
                ✓ Yes
              </button>
              <button
                type="button"
                className={formData.up_down === 'no' ? 'active' : ''}
                onClick={() => handleChange('up_down', 'no')}
              >
                ✗ No
              </button>
              <button
                type="button"
                className={formData.up_down === 'chip_in' ? 'active' : ''}
                onClick={() => handleChange('up_down', 'chip_in')}
              >
                ↕ Chip-in
              </button>
              <button
                type="button"
                className={formData.up_down === 'na' ? 'active' : ''}
                onClick={() => handleChange('up_down', 'na')}
              >
                N/A
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_putt">1st Putt Distance (m)</label>
              <input
                id="first_putt"
                type="number"
                step="0.1"
                value={formData.first_putt_distance}
                onChange={(e) => handleChange('first_putt_distance', e.target.value)}
                min="0"
                max="50"
              />
            </div>

            <div className="form-group">
              <label htmlFor="putts">Total Putts</label>
              <input
                id="putts"
                type="number"
                value={formData.total_putts}
                onChange={(e) => handleChange('total_putts', e.target.value)}
                min="0"
                max="10"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HoleInput;
