const API_BASE_URL = '/api';

// Courses API
export const coursesApi = {
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch courses');
    return response.json();
  },
  
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch course');
    return response.json();
  },
  
  create: async (courseData) => {
    const response = await fetch(`${API_BASE_URL}/courses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(courseData)
    });
    if (!response.ok) throw new Error('Failed to create course');
    return response.json();
  },
  
  getTees: async (courseId) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch tees');
    return response.json();
  },
  
  getHoles: async (courseId, teeId) => {
    const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees/${teeId}/holes`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch holes');
    return response.json();
  }
};

// Rounds API
export const roundsApi = {
  getStats: async () => {
    const response = await fetch(`${API_BASE_URL}/rounds/stats`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch stats');
    return response.json();
  },
  
  getAll: async () => {
    const response = await fetch(`${API_BASE_URL}/rounds`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch rounds');
    return response.json();
  },
  
  getById: async (id) => {
    const response = await fetch(`${API_BASE_URL}/rounds/${id}`, {
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to fetch round');
    return response.json();
  },
  
  create: async (roundData) => {
    const response = await fetch(`${API_BASE_URL}/rounds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(roundData)
    });
    if (!response.ok) throw new Error('Failed to create round');
    return response.json();
  },
  
  updateHole: async (roundId, holeNumber, holeData) => {
    const response = await fetch(`${API_BASE_URL}/rounds/${roundId}/holes/${holeNumber}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(holeData)
    });
    if (!response.ok) throw new Error('Failed to update hole');
    return response.json();
  },
  
  delete: async (id) => {
    const response = await fetch(`${API_BASE_URL}/rounds/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    if (!response.ok) throw new Error('Failed to delete round');
    return response.json();
  }
};
