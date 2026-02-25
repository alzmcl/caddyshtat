

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './Profile.css';

function Profile({ onBack }) {
  const { user, changePassword } = useAuth();
  const [playerInfo, setPlayerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Handicap update state
  const [handicap, setHandicap] = useState('');
  const [handicapError, setHandicapError] = useState('');
  const [handicapSuccess, setHandicapSuccess] = useState(false);
  const [handicapLoading, setHandicapLoading] = useState(false);

  // Fetch player info if user has player_id
  useEffect(() => {
    const fetchPlayerInfo = async () => {
      if (user?.player_id) {
        try {
          const response = await fetch(`/api/players/${user.player_id}`);
          if (response.ok) {
            const data = await response.json();
            setPlayerInfo(data);
            setHandicap(data.handicap || '');
          }
        } catch (error) {
          console.error('Failed to fetch player info:', error);
        }
      }
      setLoading(false);
    };

    fetchPlayerInfo();
  }, [user]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess(false);

    // Validation
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);

    try {
      await changePassword(oldPassword, newPassword);
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      setPasswordError(err.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleHandicapSubmit = async (e) => {
    e.preventDefault();
    setHandicapError('');
    setHandicapSuccess(false);

    const handicapValue = parseFloat(handicap);
    if (isNaN(handicapValue) || handicapValue < -10 || handicapValue > 54) {
      setHandicapError('Handicap must be between -10 and 54');
      return;
    }

    setHandicapLoading(true);

    try {
      const response = await fetch(`/api/players/${user.player_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: playerInfo.name,
          handicap: handicapValue
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update handicap');
      }

      setHandicapSuccess(true);
      const updatedPlayer = await response.json();
      setPlayerInfo(updatedPlayer);
      
      // Clear success message after 3 seconds
      setTimeout(() => setHandicapSuccess(false), 3000);
    } catch (err) {
      setHandicapError(err.message || 'Failed to update handicap');
    } finally {
      setHandicapLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>👤 My Profile</h2>
        <button onClick={onBack} className="btn-back">← Back</button>
      </div>

      {/* User Info Card */}
      <div className="profile-card">
        <h3>Account Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <label>Username</label>
            <span>{user?.username}</span>
          </div>
          <div className="info-item">
            <label>Email</label>
            <span>{user?.email}</span>
          </div>
          <div className="info-item">
            <label>Role</label>
            <span className="badge">{user?.role}</span>
          </div>
          {playerInfo && (
            <div className="info-item">
              <label>Linked Player</label>
              <span>{playerInfo.name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Handicap Update Card */}
      {playerInfo && (
        <div className="profile-card">
          <h3>⛳ Handicap</h3>
          <form onSubmit={handleHandicapSubmit} className="profile-form">
            <div className="form-group">
              <label htmlFor="handicap">Current Handicap</label>
              <input
                type="number"
                id="handicap"
                value={handicap}
                onChange={(e) => setHandicap(e.target.value)}
                step="0.1"
                min="-10"
                max="54"
                placeholder="Enter your handicap"
                disabled={handicapLoading}
              />
              <small>Valid range: -10 to 54</small>
            </div>

            {handicapError && (
              <div className="error-message">{handicapError}</div>
            )}

            {handicapSuccess && (
              <div className="success-message">
                ✅ Handicap updated successfully!
              </div>
            )}

            <button
              type="submit"
              className="btn-submit"
              disabled={handicapLoading}
            >
              {handicapLoading ? 'Updating...' : 'Update Handicap'}
            </button>
          </form>
        </div>
      )}

      {/* Change Password Card */}
      <div className="profile-card">
        <h3>🔒 Change Password</h3>
        <form onSubmit={handlePasswordSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="oldPassword">Current Password</label>
            <input
              type="password"
              id="oldPassword"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter current password"
              required
              disabled={passwordLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              required
              disabled={passwordLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              disabled={passwordLoading}
            />
          </div>

          {passwordError && (
            <div className="error-message">{passwordError}</div>
          )}

          {passwordSuccess && (
            <div className="success-message">
              ✅ Password changed successfully!
            </div>
          )}

          <button
            type="submit"
            className="btn-submit"
            disabled={passwordLoading}
          >
            {passwordLoading ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
