import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1' })

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('accessToken')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const sopApi = {
  // Categories
  seedCategories:   ()         => api.post('/sops/categories/seed'),
  getCategories:    ()         => api.get('/sops/categories'),
  createCategory:   (data)     => api.post('/sops/categories', data),
  updateCategory:   (id, data) => api.patch(`/sops/categories/${id}`, data),
  deleteCategory:   (id)       => api.delete(`/sops/categories/${id}`),

  // SOPs
  listSOPs:         (params)   => api.get('/sops', { params }),
  createSOP:        (data)     => api.post('/sops', data),
  getSOPById:       (id)       => api.get(`/sops/${id}`),
  updateSOP:        (id, data) => api.patch(`/sops/${id}`, data),
  deleteSOP:        (id)       => api.delete(`/sops/${id}`),

  // Versioning
  getVersionHistory: (id)      => api.get(`/sops/${id}/versions`),

  // Approval workflow
  submitForApproval: (id)        => api.post(`/sops/${id}/submit-for-approval`),
  reviewApproval:    (id, data)  => api.patch(`/sops/${id}/review`, data),
  publishSOP:        (id)        => api.patch(`/sops/${id}/publish`),
  archiveSOP:        (id)        => api.patch(`/sops/${id}/archive`),
  getApprovalInbox:  ()          => api.get('/sops/approvals'),

  // Acknowledgements
  acknowledgeSOP:          (id, data) => api.post(`/sops/${id}/acknowledge`, data),
  getMyPendingSOPs:        ()         => api.get('/sops/me/pending'),
  getMyAcknowledgements:   ()         => api.get('/sops/me/acknowledgements'),
  getAcknowledgementReport:(id)       => api.get(`/sops/${id}/acknowledgement-report`),
}

export default sopApi
