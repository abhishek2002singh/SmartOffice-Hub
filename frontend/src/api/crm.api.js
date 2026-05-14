import api from './axios';

export const crmApi = {
  // Dashboard + Reports
  dashboard:     ()       => api.get('/crm/reports/dashboard'),
  pipeline:      ()       => api.get('/crm/reports/pipeline'),
  funnel:        ()       => api.get('/crm/reports/funnel'),
  sources:       ()       => api.get('/crm/reports/sources'),
  bdePerf:       ()       => api.get('/crm/reports/bde'),
  winLoss:       ()       => api.get('/crm/reports/win-loss'),

  // CSV
  exportLeads:   (params) => api.get('/crm/export/leads',   { params, responseType: 'blob' }),
  exportClients: ()       => api.get('/crm/export/clients', { responseType: 'blob' }),

  // Communications
  logLeadComm:      (leadId, data)   => api.post(`/crm/leads/${leadId}/communications`, data),
  listLeadComms:    (leadId)         => api.get(`/crm/leads/${leadId}/communications`),
  leadTimeline:     (leadId)         => api.get(`/crm/leads/${leadId}/timeline`),
  logClientComm:    (clientId, data) => api.post(`/crm/clients/${clientId}/communications`, data),
  listClientComms:  (clientId)       => api.get(`/crm/clients/${clientId}/communications`),
};
