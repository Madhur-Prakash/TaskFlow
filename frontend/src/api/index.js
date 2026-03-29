import api from './client';

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const orgAPI = {
  getAll: () => api.get('/orgs'),
  getOne: (id) => api.get(`/orgs/${id}`),
  create: (data) => api.post('/orgs', data),
  delete: (id) => api.delete(`/orgs/${id}`),
  addMember: (orgId, data) => api.post(`/orgs/${orgId}/members`, data),
  removeMember: (orgId, userId) => api.delete(`/orgs/${orgId}/members/${userId}`),
  updateMemberRole: (orgId, userId, role) => api.patch(`/orgs/${orgId}/members/${userId}/role`, { role }),
};

export const taskAPI = {
  getByOrg: (orgId) => api.get(`/orgs/${orgId}/tasks`),
  create: (orgId, data) => api.post(`/orgs/${orgId}/tasks`, data),
  update: (taskId, data) => api.patch(`/tasks/${taskId}`, data),
  delete: (taskId) => api.delete(`/tasks/${taskId}`),
};

export const userAPI = {
  getAll: () => api.get('/users'),
};
