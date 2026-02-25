import { useState } from 'react';
import './App.css';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Profile from './components/Profile';
import NewRound from './components/NewRound';
import ScorecardHorizontal from './components/ScorecardHorizontal';
import RoundsList from './components/RoundsList';
import Players from './components/Players';
import Courses from './components/Courses';

function AppContent() {
  const { isAuthenticated, user, logout, loading } = useAuth();
  const [view, setView] = useState('home'); // 'home', 'new-round', 'scorecard', 'history', 'players'
  const [currentRoundId, setCurrentRoundId] = useState(null);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const startNewRound = () => {
    setView('new-round');
  };

  const handleRoundCreated = (round) => {
    setCurrentRoundId(round.id);
    setView('scorecard');
  };

  const handleViewRound = (roundId) => {
    setCurrentRoundId(roundId);
    setView('scorecard');
  };

  const goHome = () => {
    setView('home');
    setCurrentRoundId(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand" onClick={goHome}>
          <img src="/caddyshtat-final2.svg" alt="Stats Tracker Logo" className="header-logo" />
          <h1>Stats Tracker</h1>
        </div>
        <nav>
          <button onClick={goHome} className={view === 'home' ? 'active' : ''}>
            Home
          </button>
          <button onClick={startNewRound} className={view === 'new-round' ? 'active' : ''}>
            New Round
          </button>
          <button onClick={() => setView('history')} className={view === 'history' ? 'active' : ''}>
            History
          </button>
          <button onClick={() => setView('players')} className={view === 'players' ? 'active' : ''}>
            Players
          </button>
          <button onClick={() => setView('courses')} className={view === 'courses' ? 'active' : ''}>
            Courses
          </button>
        </nav>
        <div className="user-menu">
          <button onClick={() => setView('profile')} className="btn-profile">
            👤 {user?.username}
          </button>
          <button onClick={logout} className="btn-logout">
            Logout
          </button>
        </div>
      </header>

      <main className="app-main">
        {view === 'home' && (
          <div className="home">
            <h2>Welcome to Stats Tracker</h2>
            <p>Track your golf rounds with detailed statistics</p>
            <div className="home-actions">
              <button onClick={startNewRound} className="btn-primary btn-large">
                Start New Round
              </button>
              <button onClick={() => setView('history')} className="btn-secondary btn-large">
                View History
              </button>
            </div>
          </div>
        )}

        {view === 'new-round' && (
          <NewRound onRoundCreated={handleRoundCreated} onCancel={goHome} />
        )}

        {view === 'scorecard' && currentRoundId && (
          <ScorecardHorizontal roundId={currentRoundId} onBack={goHome} />
        )}

        {view === 'history' && (
          <RoundsList onViewRound={handleViewRound} />
        )}

        {view === 'players' && (
          <Players />
        )}

        {view === 'courses' && (
          <Courses />
        )}

        {view === 'profile' && (
          <Profile onBack={goHome} />
        )}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
