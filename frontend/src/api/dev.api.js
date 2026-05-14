import api from './axios';

export const devApi = {
  // Projects
  listProjects:  (params)     => api.get('/dev/projects', { params }),
  getProject:    (id)         => api.get(`/dev/projects/${id}`),
  createProject: (data)       => api.post('/dev/projects', data),
  updateProject: (id, data)   => api.patch(`/dev/projects/${id}`, data),
  deleteProject: (id)         => api.delete(`/dev/projects/${id}`),

  // Milestones
  listMilestones:   (projectId)          => api.get(`/dev/projects/${projectId}/milestones`),
  createMilestone:  (projectId, data)    => api.post(`/dev/projects/${projectId}/milestones`, data),
  updateMilestone:  (projectId, id, data) => api.patch(`/dev/projects/${projectId}/milestones/${id}`, data),
  deleteMilestone:  (projectId, id)      => api.delete(`/dev/projects/${projectId}/milestones/${id}`),

  // Tasks
  listTasks:      (projectId, params)       => api.get(`/dev/projects/${projectId}/tasks`, { params }),
  createTask:     (projectId, data)         => api.post(`/dev/projects/${projectId}/tasks`, data),
  updateTask:     (projectId, id, data)     => api.patch(`/dev/projects/${projectId}/tasks/${id}`, data),
  deleteTask:     (projectId, id)           => api.delete(`/dev/projects/${projectId}/tasks/${id}`),
  bulkUpdateTasks:(projectId, updates)      => api.patch(`/dev/projects/${projectId}/tasks/bulk`, { updates }),

  // Task comments
  listTaskComments: (projectId, taskId)             => api.get(`/dev/projects/${projectId}/tasks/${taskId}/comments`),
  addTaskComment:   (projectId, taskId, data)        => api.post(`/dev/projects/${projectId}/tasks/${taskId}/comments`, data),
  deleteTaskComment:(projectId, taskId, commentId)   => api.delete(`/dev/projects/${projectId}/tasks/${taskId}/comments/${commentId}`),

  // Time logs
  listTimeLogs: (projectId, taskId)     => api.get(`/dev/projects/${projectId}/tasks/${taskId}/time-logs`),
  addTimeLog:   (projectId, taskId, data) => api.post(`/dev/projects/${projectId}/tasks/${taskId}/time-logs`, data),

  // Bugs
  listBugs:   (projectId, params)     => api.get(`/dev/projects/${projectId}/bugs`, { params }),
  createBug:  (projectId, data)       => api.post(`/dev/projects/${projectId}/bugs`, data),
  updateBug:  (projectId, id, data)   => api.patch(`/dev/projects/${projectId}/bugs/${id}`, data),
  deleteBug:  (projectId, id)         => api.delete(`/dev/projects/${projectId}/bugs/${id}`),

  // Handovers
  listHandovers:       (params) => api.get('/dev/handovers', { params }),
  getHandover:         (id)     => api.get(`/dev/handovers/${id}`),
  acceptHandover:      (id, data) => api.patch(`/dev/handovers/${id}/accept`, data),
  requestClarification:(id, data) => api.patch(`/dev/handovers/${id}/clarify`, data),

  // Dashboards
  developerDashboard: () => api.get('/dev/dashboard/developer'),
  headDashboard:      () => api.get('/dev/dashboard/head'),
  reports:            (params) => api.get('/dev/reports', { params }),
};
