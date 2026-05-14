import api from './axios';

export const dmAuditApi = {
  // Metrics master
  listMetrics:    (platformId)           => api.get(`/dm/platforms/${platformId}/audit-metrics`),
  createMetric:   (platformId, data)     => api.post(`/dm/platforms/${platformId}/audit-metrics`, data),
  updateMetric:   (platformId, metricId, data) => api.patch(`/dm/platforms/${platformId}/audit-metrics/${metricId}`, data),
  deleteMetric:   (platformId, metricId) => api.delete(`/dm/platforms/${platformId}/audit-metrics/${metricId}`),

  // Reports
  listReports:    (params)              => api.get('/dm/audit-reports', { params }),
  generateReport: (data)               => api.post('/dm/audit-reports', data),
  getReport:      (id)                 => api.get(`/dm/audit-reports/${id}`),
  saveEntries:    (id, data)           => api.patch(`/dm/audit-reports/${id}/entries`, data),
  publishReport:  (id)                 => api.patch(`/dm/audit-reports/${id}/publish`),
  deleteReport:   (id)                 => api.delete(`/dm/audit-reports/${id}`),
  compareReports: (report1Id, report2Id) => api.get('/dm/audit-reports/compare', { params: { report1Id, report2Id } }),
  exportPDF:      (id)                 => api.get(`/dm/audit-reports/${id}/export`, { responseType: 'blob' }),
};
