import api from './axios';

export const leadsApi = {
  list:             (params) => api.get('/crm/leads', { params }),
  get:              (id)     => api.get(`/crm/leads/${id}`),
  create:           (data)   => api.post('/crm/leads', data),
  update:           (id, data) => api.patch(`/crm/leads/${id}`, data),
  remove:           (id)     => api.delete(`/crm/leads/${id}`),
  assign:           (id, assignedTo) => api.patch(`/crm/leads/${id}/assign`, { assignedTo }),
  autoAssign:       (id)     => api.patch(`/crm/leads/${id}/auto-assign`),
  changeStage:      (id, data) => api.patch(`/crm/leads/${id}/stage`, data),
  getActivities:    (id)     => api.get(`/crm/leads/${id}/activities`),
  addActivity:      (id, data) => api.post(`/crm/leads/${id}/activities`, data),
  getSources:       ()       => api.get('/crm/leads/sources'),
  getStats:         ()       => api.get('/crm/leads/stats'),
  bulkImport:       (data)   => api.post('/crm/leads/import', data),
  downloadTemplate: ()       => api.get('/crm/leads/import/template', { responseType: 'blob' }),
};
