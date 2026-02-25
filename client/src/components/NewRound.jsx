import { useState, useEffect } from 'react';
import { coursesApi, roundsApi } from '../api/client';
import './NewRound.css';

function NewRound({ onRoundCreated, onCancel }) {
  const [courses, setCourses] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [tees, setTees] = useState([]);
  const [selectedTee, setSelectedTee] = useState('');
  const [competitionType, setCompetitionType] = useState('Stroke');
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [dailyHandicap, setDailyHandicap] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadTees(selectedCourse);
    } else {
      setTees([]);
      setSelectedTee('');
    }
  }, [selectedCourse]);

  // Update daily handicap when player changes - round up to whole number
  useEffect(() => {
    if (selectedPlayer) {
      const player = players.find(p => p.id === parseInt(selectedPlayer));
      if (player) {
        setDailyHandicap(Math.ceil(player.handicap).toString());
      }
    }
  }, [selectedPlayer, players]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [coursesData, playersData] = await Promise.all([
        coursesApi.getAll(),
        fetch('/api/players').then(r => r.json())
      ]);
      setCourses(coursesData);
      setPlayers(playersData);
      
      // Auto-select first player if available
      if (playersData.length > 0) {
        setSelectedPlayer(playersData[0].id.toString());
      }
      
      setLoading(false);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
      setLoading(false);
    }
  };

  const loadTees = async (courseId) => {
    try {
      const data = await coursesApi.getTees(courseId);
      setTees(data);
      if (data.length > 0) {
        setSelectedTee(data[0].id.toString());
      }
    } catch (err) {
      setError('Failed to load tees: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedCourse || !selectedTee || !selectedPlayer) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      
      const player = players.find(p => p.id === parseInt(selectedPlayer));
      
      const roundData = {
        course_id: parseInt(selectedCourse),
        tee_id: parseInt(selectedTee),
        player_id: parseInt(selectedPlayer),
        competition_type: competitionType,
        date: date,
        player_name: player.name,
        player_handicap: player.handicap,
        daily_handicap: parseFloat(dailyHandicap) || 0
      };

      const round = await roundsApi.create(roundData);
      onRoundCreated(round);
    } catch (err) {
      setError('Failed to create round: ' + err.message);
      setCreating(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const selectedCourseData = courses.find(c => c.id === parseInt(selectedCourse));
  const selectedTeeData = tees.find(t => t.id === parseInt(selectedTee));
  const selectedPlayerData = players.find(p => p.id === parseInt(selectedPlayer));

  return (
    <div className="new-round">
      <h2>Start New Round</h2>
      
      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="new-round-form">
        <div className="form-group">
          <label htmlFor="player">Player *</label>
          <select
            id="player"
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            required
          >
            <option value="">Select a player</option>
            {players.map(player => (
              <option key={player.id} value={player.id}>
                {player.name} (Handicap: {player.handicap.toFixed(1)})
              </option>
            ))}
          </select>
          {players.length === 0 && (
            <small className="help-text" style={{color: '#dc3545'}}>
              No players found. Please add a player in the Players section first.
            </small>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="dailyHandicap">Daily Handicap *</label>
          <input
            id="dailyHandicap"
            type="number"
            step="1"
            value={dailyHandicap}
            onChange={(e) => setDailyHandicap(e.target.value)}
            min="0"
            max="54"
            required
          />
          <small className="help-text">
            Playing handicap for this round (whole number, defaults to player's handicap rounded up)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="course">Course *</label>
          <select
            id="course"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            required
          >
            <option value="">Select a course</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>
                {course.name} {course.location && `- ${course.location}`}
              </option>
            ))}
          </select>
        </div>

        {tees.length > 0 && (
          <div className="form-group">
            <label htmlFor="tee">Tee *</label>
            <select
              id="tee"
              value={selectedTee}
              onChange={(e) => setSelectedTee(e.target.value)}
              required
            >
              {tees.map(tee => (
                <option key={tee.id} value={tee.id}>
                  {tee.name} {tee.rating && `(${tee.rating}/${tee.slope})`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="competition">Competition Type *</label>
          <select
            id="competition"
            value={competitionType}
            onChange={(e) => setCompetitionType(e.target.value)}
            required
          >
            <option value="Stroke">Stroke Play</option>
            <option value="Stableford">Stableford</option>
            <option value="Par">Par Competition</option>
          </select>
          <small className="help-text">
            {competitionType === 'Stroke' && 'Total strokes - lowest score wins'}
            {competitionType === 'Stableford' && 'Points per hole - highest points wins'}
            {competitionType === 'Par' && 'Win/lose/square each hole vs par'}
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="date">Date *</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {selectedCourseData && selectedTeeData && selectedPlayerData && (
          <div className="round-summary">
            <h3>Round Summary</h3>
            <p><strong>Player:</strong> {selectedPlayerData.name}</p>
            <p><strong>Daily Handicap:</strong> {dailyHandicap}</p>
            <p><strong>Course:</strong> {selectedCourseData.name}</p>
            <p><strong>Tee:</strong> {selectedTeeData.name}</p>
            <p><strong>Competition:</strong> {competitionType}</p>
          </div>
        )}

        <div className="form-actions">
          <button type="button" onClick={onCancel} className="btn-secondary" disabled={creating}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={creating || players.length === 0}>
            {creating ? 'Creating...' : 'Start Round'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewRound;
