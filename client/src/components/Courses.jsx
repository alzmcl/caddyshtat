import { useState, useEffect } from 'react';
import { coursesApi } from '../api/client';
import './Courses.css';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [tees, setTees] = useState([]);
  const [selectedTee, setSelectedTee] = useState(null);
  const [holes, setHoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Forms
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [showTeeForm, setShowTeeForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [editingTee, setEditingTee] = useState(null);
  
  const [courseForm, setCourseForm] = useState({ 
    name: '', 
    location: '', 
    description: '',
    holes: 18 
  });
  
  const [teeForm, setTeeForm] = useState({ 
    name: '', 
    rating: '', 
    slope: '', 
    color: '#4CAF50' 
  });

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadTees(selectedCourse.id);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedTee && selectedCourse) {
      loadHoles(selectedCourse.id, selectedTee.id);
    }
  }, [selectedTee, selectedCourse]);

  const loadCourses = async () => {
    try {
      const data = await coursesApi.getAll();
      setCourses(data);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const loadTees = async (courseId) => {
    try {
      const data = await coursesApi.getTees(courseId);
      setTees(data);
      if (data.length > 0) {
        setSelectedTee(data[0]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const loadHoles = async (courseId, teeId) => {
    try {
      const data = await coursesApi.getHoles(courseId, teeId);
      setHoles(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSelectCourse = (course) => {
    setSelectedCourse(course);
    setSelectedTee(null);
    setHoles([]);
  };

  const handleAddCourse = () => {
    setEditingCourse(null);
    setCourseForm({ name: '', location: '', description: '', holes: 18 });
    setShowCourseForm(true);
  };

  const handleEditCourse = (course, e) => {
    e.stopPropagation();
    setEditingCourse(course);
    setCourseForm({
      name: course.name,
      location: course.location || '',
      description: course.description || '',
      holes: course.holes || 18
    });
    setShowCourseForm(true);
  };

  const handleDeleteCourse = async (courseId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this course? This will also delete all tees and holes.')) {
      return;
    }
    
    try {
      await coursesApi.delete(courseId);
      if (selectedCourse?.id === courseId) {
        setSelectedCourse(null);
        setSelectedTee(null);
        setHoles([]);
      }
      await loadCourses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      if (editingCourse) {
        await coursesApi.update(editingCourse.id, courseForm);
      } else {
        await coursesApi.create(courseForm);
      }
      setShowCourseForm(false);
      await loadCourses();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddTee = () => {
    setEditingTee(null);
    setTeeForm({ name: '', rating: '', slope: '', color: '#4CAF50' });
    setShowTeeForm(true);
  };

  const handleEditTee = (tee, e) => {
    e.stopPropagation();
    setEditingTee(tee);
    setTeeForm({
      name: tee.name,
      rating: tee.rating || '',
      slope: tee.slope || '',
      color: tee.color || '#4CAF50'
    });
    setShowTeeForm(true);
  };

  const handleDeleteTee = async (teeId, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this tee? This will also delete all hole data for this tee.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/courses/${selectedCourse.id}/tees/${teeId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete tee');
      
      if (selectedTee?.id === teeId) {
        setSelectedTee(null);
        setHoles([]);
      }
      await loadTees(selectedCourse.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveTee = async (e) => {
    e.preventDefault();
    try {
      if (editingTee) {
        const response = await fetch(`/api/courses/${selectedCourse.id}/tees/${editingTee.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teeForm)
        });
        if (!response.ok) throw new Error('Failed to update tee');
      } else {
        await coursesApi.createTee(selectedCourse.id, teeForm);
      }
      setShowTeeForm(false);
      await loadTees(selectedCourse.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateHole = async (holeId, field, value) => {
    try {
      const response = await fetch(`/api/courses/${selectedCourse.id}/tees/${selectedTee.id}/holes/${holeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!response.ok) throw new Error('Failed to update hole');
      
      await loadHoles(selectedCourse.id, selectedTee.id);
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="loading">Loading courses...</div>;

  return (
    <div className="courses-manager">
      <h2>Course Management</h2>

      <div className="courses-layout">
        {/* Left: Course List */}
        <div className="courses-list-panel">
          <div className="panel-header">
            <h3>Courses</h3>
            <button className="btn-primary btn-sm" onClick={handleAddCourse}>
              + Add Course
            </button>
          </div>
          
          <div className="course-items">
            {courses.map(course => (
              <div
                key={course.id}
                className={`course-item ${selectedCourse?.id === course.id ? 'active' : ''}`}
                onClick={() => handleSelectCourse(course)}
              >
                <div className="course-content">
                  <div className="course-name">{course.name}</div>
                  <div className="course-location">{course.location}</div>
                </div>
                <div className="course-actions">
                  <button 
                    className="btn-icon"
                    onClick={(e) => handleEditCourse(course, e)}
                    title="Edit course"
                  >
                    ✏️
                  </button>
                  <button 
                    className="btn-icon btn-danger"
                    onClick={(e) => handleDeleteCourse(course.id, e)}
                    title="Delete course"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Tees for Selected Course */}
        {selectedCourse && (
          <div className="tees-panel">
            <div className="panel-header">
              <h3>Tees - {selectedCourse.name}</h3>
              <button className="btn-primary btn-sm" onClick={handleAddTee}>
                + Add Tee
              </button>
            </div>
            
            <div className="tee-items">
              {tees.map(tee => (
                <div
                  key={tee.id}
                  className={`tee-item ${selectedTee?.id === tee.id ? 'active' : ''}`}
                  onClick={() => setSelectedTee(tee)}
                  style={{ borderLeft: `4px solid ${tee.color || '#ccc'}` }}
                >
                  <div className="tee-content">
                    <div className="tee-name">{tee.name}</div>
                    <div className="tee-details">
                      {tee.rating}/{tee.slope} - {tee.total_distance}m
                    </div>
                  </div>
                  <div className="tee-actions">
                    <button 
                      className="btn-icon"
                      onClick={(e) => handleEditTee(tee, e)}
                      title="Edit tee"
                    >
                      ✏️
                    </button>
                    <button 
                      className="btn-icon btn-danger"
                      onClick={(e) => handleDeleteTee(tee.id, e)}
                      title="Delete tee"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right: Holes for Selected Tee */}
        {selectedTee && (
          <div className="holes-panel">
            <h3>Holes - {selectedTee.name} Tee</h3>
            
            <table className="holes-table">
              <thead>
                <tr>
                  <th>Hole</th>
                  <th>Par</th>
                  <th>Distance (m)</th>
                  <th>Stroke Index</th>
                </tr>
              </thead>
              <tbody>
                {holes.map(hole => (
                  <tr key={hole.id}>
                    <td className="hole-number">{hole.hole_number}</td>
                    <td>
                      <input
                        type="number"
                        min="3"
                        max="6"
                        value={hole.par}
                        onChange={(e) => handleUpdateHole(hole.id, 'par', parseInt(e.target.value))}
                        className="hole-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="50"
                        max="700"
                        value={hole.distance}
                        onChange={(e) => handleUpdateHole(hole.id, 'distance', parseInt(e.target.value))}
                        className="hole-input"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        max="18"
                        value={hole.stroke_index}
                        onChange={(e) => handleUpdateHole(hole.id, 'stroke_index', parseInt(e.target.value))}
                        className="hole-input"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td><strong>TOTAL</strong></td>
                  <td><strong>{holes.reduce((sum, h) => sum + h.par, 0)}</strong></td>
                  <td><strong>{holes.reduce((sum, h) => sum + h.distance, 0)}m</strong></td>
                  <td>-</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Course Form Modal */}
      {showCourseForm && (
        <div className="modal-overlay" onClick={() => setShowCourseForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingCourse ? 'Edit Course' : 'Add New Course'}</h3>
            <form onSubmit={handleSaveCourse}>
              <div className="form-group">
                <label>Course Name *</label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={(e) => setCourseForm({...courseForm, name: e.target.value})}
                  required
                  placeholder="e.g., Royal Melbourne"
                />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  value={courseForm.location}
                  onChange={(e) => setCourseForm({...courseForm, location: e.target.value})}
                  placeholder="e.g., Melbourne, VIC"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  placeholder="Course description..."
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Number of Holes</label>
                <select
                  value={courseForm.holes}
                  onChange={(e) => setCourseForm({...courseForm, holes: parseInt(e.target.value)})}
                >
                  <option value="9">9 Holes</option>
                  <option value="18">18 Holes</option>
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowCourseForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCourse ? 'Update Course' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tee Form Modal */}
      {showTeeForm && (
        <div className="modal-overlay" onClick={() => setShowTeeForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingTee ? 'Edit Tee' : 'Add New Tee'}</h3>
            <form onSubmit={handleSaveTee}>
              <div className="form-group">
                <label>Tee Name *</label>
                <input
                  type="text"
                  value={teeForm.name}
                  onChange={(e) => setTeeForm({...teeForm, name: e.target.value})}
                  required
                  placeholder="e.g., Championship, Men's, Ladies"
                />
              </div>
              <div className="form-group">
                <label>Course Rating</label>
                <input
                  type="number"
                  step="0.1"
                  value={teeForm.rating}
                  onChange={(e) => setTeeForm({...teeForm, rating: e.target.value})}
                  placeholder="e.g., 72.5"
                />
              </div>
              <div className="form-group">
                <label>Slope Rating</label>
                <input
                  type="number"
                  value={teeForm.slope}
                  onChange={(e) => setTeeForm({...teeForm, slope: e.target.value})}
                  placeholder="e.g., 130"
                />
              </div>
              <div className="form-group">
                <label>Tee Color</label>
                <div className="color-picker">
                  <input
                    type="color"
                    value={teeForm.color}
                    onChange={(e) => setTeeForm({...teeForm, color: e.target.value})}
                  />
                  <span>{teeForm.color}</span>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowTeeForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTee ? 'Update Tee' : 'Create Tee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

export default Courses;
