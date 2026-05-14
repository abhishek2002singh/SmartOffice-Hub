import api from './axios';

export const dmApi = {
  // Platforms
  listPlatforms:    ()                    => api.get('/dm/platforms'),
  createPlatform:   (data)               => api.post('/dm/platforms', data),
  updatePlatform:   (id, data)           => api.patch(`/dm/platforms/${id}`, data),
  deletePlatform:   (id)                 => api.delete(`/dm/platforms/${id}`),

  // Tasks per platform
  listTasks:        (platformId)         => api.get(`/dm/platforms/${platformId}/tasks`),
  createTask:       (platformId, data)   => api.post(`/dm/platforms/${platformId}/tasks`, data),
  updateTask:       (platformId, taskId, data) => api.patch(`/dm/platforms/${platformId}/tasks/${taskId}`, data),
  deleteTask:       (platformId, taskId) => api.delete(`/dm/platforms/${platformId}/tasks/${taskId}`),
  reorderTasks:     (platformId, order)  => api.patch(`/dm/platforms/${platformId}/tasks/reorder`, { order }),

  // Custom fields
  listCustomFields:  (platformId, clientId) => api.get(`/dm/platforms/${platformId}/custom-fields`, { params: clientId ? { clientId } : {} }),
  createCustomField: (platformId, data)     => api.post(`/dm/platforms/${platformId}/custom-fields`, data),
  updateCustomField: (platformId, fieldId, data) => api.patch(`/dm/platforms/${platformId}/custom-fields/${fieldId}`, data),
  deleteCustomField: (platformId, fieldId) => api.delete(`/dm/platforms/${platformId}/custom-fields/${fieldId}`),

  // Client platform mapping
  getClientPlatforms:   (clientId)              => api.get(`/dm/clients/${clientId}/platforms`),
  addClientPlatform:    (clientId, data)         => api.post(`/dm/clients/${clientId}/platforms`, data),
  updateClientPlatform: (clientId, mappingId, data) => api.patch(`/dm/clients/${clientId}/platforms/${mappingId}`, data),
  removeClientPlatform: (clientId, mappingId)    => api.delete(`/dm/clients/${clientId}/platforms/${mappingId}`),

  // Daily logs
  getDailyLogs:     (params)            => api.get('/dm/daily-logs', { params }),
  logTask:          (data)              => api.post('/dm/daily-logs', data),
  getDailyDashboard: (date)            => api.get('/dm/daily-dashboard', { params: date ? { date } : {} }),
  getHeadDashboard:  (date)            => api.get('/dm/head-dashboard', { params: date ? { date } : {} }),

  // DM ↔ GD integration
  getDMGDPipeline:  ()                  => api.get('/dm/gd-pipeline'),
  createGDTask:     (data)              => api.post('/dm/gd-tasks', data),
};
