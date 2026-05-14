import api from './axios';

export const gdApi = {
  // Tasks
  listTasks:    (params)       => api.get('/gd/tasks', { params }),
  getTask:      (id)           => api.get(`/gd/tasks/${id}`),
  createTask:   (data)         => api.post('/gd/tasks', data),
  updateTask:   (id, data)     => api.patch(`/gd/tasks/${id}`, data),
  deleteTask:   (id)           => api.delete(`/gd/tasks/${id}`),

  // Status transitions
  submitTask:        (id)           => api.patch(`/gd/tasks/${id}/submit`),
  requestRevision:   (id, data)     => api.patch(`/gd/tasks/${id}/request-revision`, data),
  approveTask:       (id)           => api.patch(`/gd/tasks/${id}/approve`),
  deliverTask:       (id, data)     => api.patch(`/gd/tasks/${id}/deliver`, data),

  // Files
  uploadFile:   (id, formData) => api.post(`/gd/tasks/${id}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  deleteFile:   (id, fileId)   => api.delete(`/gd/tasks/${id}/files/${fileId}`),

  // Comments
  listComments: (id)           => api.get(`/gd/tasks/${id}/comments`),
  addComment:   (id, data)     => api.post(`/gd/tasks/${id}/comments`, data),
  deleteComment:(id, commentId)=> api.delete(`/gd/tasks/${id}/comments/${commentId}`),

  // Time logs
  addTimeLog:   (id, data)     => api.post(`/gd/tasks/${id}/time-logs`, data),

  // Dashboards
  designerDashboard: ()           => api.get('/gd/dashboard/designer'),
  headDashboard:     ()           => api.get('/gd/dashboard/head'),
  reports:           (params)     => api.get('/gd/reports', { params }),
};
