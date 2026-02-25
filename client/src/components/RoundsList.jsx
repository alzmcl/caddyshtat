import { useState, useEffect } from 'react';
import { roundsApi } from '../api/client';
import './RoundsList.css';

function RoundsList({ onViewRound }) {
  const [rounds, setRounds] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterCompetition, setFilterCompetition] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [roundsData, statsData] = await Promise.all([
        roundsApi.getAll(),
        roundsApi.getStats()
      ]);
      setRounds(roundsData);
      setStats(statsData);
      setLoading(false);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
      setLoading(false);
    }
  };

  const handleDelete = async (roundId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this round?')) return;

    try {
      await roundsApi.delete(roundId);
      await loadData();
    } catch (err) {
      setError('Failed to delete round: ' + err.message);
    }
  };

  // Get unique courses for filter
  const uniqueCourses = [...new Set(rounds.map(r => r.course_name))].sort();

  // Filter and sort rounds
  const filteredRounds = rounds
    .filter(round => {
      if (filterCourse !== 'all' && round.course_name !== filterCourse) return false;
      if (filterCompetition !== 'all' && round.competition_type !== filterCompetition) return false;
      if (searchTerm && !round.course_name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.date) - new Date(a.date);
        case 'date-asc':
          return new Date(a.date) - new Date(b.date);
        case 'score-asc':
          return (a.total_score || 999) - (b.total_score || 999);
        case 'score-desc':
          return (b.total_score || 0) - (a.total_score || 0);
        case 'course':
          return a.course_name.localeCompare(b.course_name);
        default:
          return 0;
      }
    });

  // Calculate performance relative to par
  const getPerformance = (round) => {
    if (!round.total_score || !round.course_par) return null;
    const diff = round.total_score - round.course_par;
    return {
      diff,
      label: diff === 0 ? 'E' : diff > 0 ? `+${diff}` : diff.toString(),
      class: diff < 0 ? 'under-par' : diff === 0 ? 'even-par' : 'over-par'
    };
  };

  if (loading) {
    return (
      <div className="rounds-list-container">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading rounds...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (rounds.length === 0) {
    return (
      <div className="rounds-list-container">
        <div className="rounds-list empty">
          <div className="empty-icon">⛳</div>
          <h2>No Rounds Yet</h2>
          <p>Start tracking your golf game! Record your first round to see your progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounds-list-container">
      {/* Stats Dashboard */}
      {stats && stats.totalRounds > 0 && (
        <div className="stats-dashboard">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">🏌️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalRounds}</div>
                <div className="stat-label">Total Rounds</div>
              </div>
            </div>
            
            {stats.bestScore && (
              <div className="stat-card highlight">
                <div className="stat-icon">🏆</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.bestScore}</div>
                  <div className="stat-label">Best Score</div>
                </div>
              </div>
            )}
            
            {stats.averageScore && (
              <div className="stat-card">
                <div className="stat-icon">📊</div>
                <div className="stat-content">
                  <div className="stat-value">{stats.averageScore}</div>
                  <div className="stat-label">Average Score</div>
                </div>
              </div>
            )}
            
            <div className="stat-card">
              <div className="stat-icon">⛳</div>
              <div className="stat-content">
                <div className="stat-value">{stats.coursesPlayed}</div>
                <div className="stat-label">Courses Played</div>
              </div>
            </div>
          </div>
          
          {stats.recentAchievement && (
            <div className="achievement-banner">
              <span className="achievement-icon">🎉</span>
              <span className="achievement-text">{stats.recentAchievement.description}</span>
            </div>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="rounds-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filter-group">
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
            <option value="all">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
          
          <select value={filterCompetition} onChange={(e) => setFilterCompetition(e.target.value)}>
            <option value="all">All Types</option>
            <option value="Stroke">Stroke</option>
            <option value="Stableford">Stableford</option>
            <option value="Par">Par</option>
          </select>
          
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="score-asc">Best Score</option>
            <option value="score-desc">Worst Score</option>
            <option value="course">By Course</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="results-info">
        <h2>Round History</h2>
        <span className="results-count">
          {filteredRounds.length} {filteredRounds.length === 1 ? 'round' : 'rounds'}
        </span>
      </div>

      {/* Rounds Grid */}
      {filteredRounds.length === 0 ? (
        <div className="no-results">
          <p>No rounds match your filters. Try adjusting your search criteria.</p>
        </div>
      ) : (
        <div className="rounds-grid">
          {filteredRounds.map((round, index) => {
            const performance = getPerformance(round);
            
            return (
              <div
                key={round.id}
                className={`round-card ${performance ? performance.class : ''}`}
                onClick={() => onViewRound(round.id)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Performance Badge */}
                {performance && (
                  <div className={`performance-badge ${performance.class}`}>
                    {performance.label}
                  </div>
                )}
                
                <div className="round-header">
                  <div className="course-info">
                    <div className="course-icon">⛳</div>
                    <div>
                      <h3>{round.course_name}</h3>
                      <span className="tee-name">{round.tee_name}</span>
                    </div>
                  </div>
                  <span className="round-date">
                    📅 {new Date(round.date).toLocaleDateString('en-AU', { 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                
                <div className="round-details">
                  <div className="detail-row">
                    <span className="detail-icon">🏌️</span>
                    <span className="detail-label">Player:</span>
                    <span className="detail-value">{round.player_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-icon">🏆</span>
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">{round.competition_type}</span>
                  </div>
                  {round.player_handicap > 0 && (
                    <div className="detail-row">
                      <span className="detail-icon">📈</span>
                      <span className="detail-label">Handicap:</span>
                      <span className="detail-value">{round.player_handicap}</span>
                    </div>
                  )}
                </div>
                
                <div className="round-score">
                  {round.total_score ? (
                    <div className="score-display">
                      <div className="score-main">
                        <span className="score-label">Score</span>
                        <span className="score-value">{round.total_score}</span>
                      </div>
                      {round.competition_type !== 'Stroke' && round.total_points !== null && (
                        <div className="score-secondary">
                          <span className="score-label">Points</span>
                          <span className="score-value">{round.total_points}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="score-pending">
                      <span>In Progress</span>
                    </div>
                  )}
                </div>
                
                <button
                  className="btn-delete"
                  onClick={(e) => handleDelete(round.id, e)}
                  title="Delete round"
                  aria-label="Delete round"
                >
                  🗑️
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RoundsList;
