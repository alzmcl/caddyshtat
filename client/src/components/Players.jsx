import { useState, useEffect } from 'react';
import './Players.css';

function Players() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    handicap: 0,
    email: '',
    phone: ''
  });

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players');
      if (!response.ok) throw new Error('Failed to fetch players');
      const data = await response.json();
      setPlayers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingPlayer
        ? `/api/players/${editingPlayer.id}`
        : '/api/players';
      const method = editingPlayer ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save player');

      await fetchPlayers();
      resetForm();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      handicap: player.handicap,
      email: player.email || '',
      phone: player.phone || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this player?')) return;

    try {
      const response = await fetch(`/api/players/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete player');
      await fetchPlayers();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetForm = () => {
    setFormData({ name: '', handicap: 0, email: '', phone: '' });
    setEditingPlayer(null);
    setShowForm(false);
  };

  if (loading) return <div className="loading">Loading players...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="players">
      <div className="players-header">
        <h2>Players</h2>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          Add Player
        </button>
      </div>

      {showForm && (
        <div className="player-form-card">
          <h3>{editingPlayer ? 'Edit Player' : 'New Player'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Handicap *</label>
              <input
                type="number"
                step="0.1"
                value={formData.handicap}
                onChange={(e) => setFormData({ ...formData, handicap: parseFloat(e.target.value) })}
                required
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="form-actions">
              <button type="button" className="btn-secondary" onClick={resetForm}>
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {editingPlayer ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="players-list">
        {players.length === 0 ? (
          <p>No players yet. Add your first player!</p>
        ) : (
          <table className="players-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Handicap</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td className="player-name">{player.name}</td>
                  <td>{player.handicap.toFixed(1)}</td>
                  <td>{player.email || '-'}</td>
                  <td>{player.phone || '-'}</td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEdit(player)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete-small"
                      onClick={() => handleDelete(player.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Players;
