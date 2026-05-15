import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1' })

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('accessToken')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

const onboardingApi = {
  // Templates (HR/Admin)
  listTemplates:   ()              => api.get('/onboarding'),
  createTemplate:  (data)          => api.post('/onboarding', data),
  getTemplate:     (id)            => api.get(`/onboarding/${id}`),
  updateTemplate:  (id, data)      => api.patch(`/onboarding/${id}`, data),
  deleteTemplate:  (id)            => api.delete(`/onboarding/${id}`),

  // Assignment
  assignOnboarding:(data)          => api.post('/onboarding/assign', data),

  // HR views
  listAllProgress: (params)        => api.get('/onboarding/progress/all', { params }),
  getEmployeeOnboarding: (empId)   => api.get(`/onboarding/progress/employee/${empId}`),

  // Employee self
  getMyOnboarding: ()              => api.get('/onboarding/me'),
  markItemComplete:(progressId, itemId, data) => api.patch(`/onboarding/${progressId}/items/${itemId}/complete`, data),
}

export default onboardingApi
