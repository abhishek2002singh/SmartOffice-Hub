import api from './axios';

export const hrApi = {
  // Config
  getConfig:    ()       => api.get('/hr/config'),
  updateConfig: (data)   => api.patch('/hr/config', data),

  // Candidates
  listCandidates:  (params) => api.get('/hr/candidates', { params }),
  getCandidate:    (id)     => api.get(`/hr/candidates/${id}`),
  createCandidate: (data)   => api.post('/hr/candidates', data),
  updateCandidate: (id, data) => api.patch(`/hr/candidates/${id}`, data),
  updateStatus:    (id, data) => api.patch(`/hr/candidates/${id}/status`, data),
  deleteCandidate: (id)     => api.delete(`/hr/candidates/${id}`),

  // Bulk import (FormData with file)
  bulkImport: (formData) => api.post('/hr/candidates/bulk-import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // Follow-ups
  listFollowups:   (candidateId)             => api.get(`/hr/candidates/${candidateId}/followups`),
  createFollowup:  (candidateId, data)       => api.post(`/hr/candidates/${candidateId}/followups`, data),
  updateFollowup:  (candidateId, id, data)   => api.patch(`/hr/candidates/${candidateId}/followups/${id}`, data),
  deleteFollowup:  (candidateId, id)         => api.delete(`/hr/candidates/${candidateId}/followups/${id}`),

  // Interviews
  listInterviews:   (candidateId)            => api.get(`/hr/candidates/${candidateId}/interviews`),
  createInterview:  (candidateId, data)      => api.post(`/hr/candidates/${candidateId}/interviews`, data),
  updateInterview:  (candidateId, id, data)  => api.patch(`/hr/candidates/${candidateId}/interviews/${id}`, data),
  deleteInterview:  (candidateId, id)        => api.delete(`/hr/candidates/${candidateId}/interviews/${id}`),

  // Scheduler + Dashboard
  interviewSchedule: (params) => api.get('/hr/interviews/schedule', { params }),
  dashboard:         ()       => api.get('/hr/dashboard'),

  // Employees (Week 16)
  onboardEmployee:  (candidateId, data) => api.post(`/hr/employees/onboard/${candidateId}`, data),
  listEmployees:    (params)  => api.get('/hr/employees', { params }),
  getEmployee:      (id)      => api.get(`/hr/employees/${id}`),
  updateEmployee:   (id, data) => api.patch(`/hr/employees/${id}`, data),
  initiateExit:     (id, data) => api.post(`/hr/employees/${id}/exit`, data),

  // Documents
  listDocuments:   (empId)          => api.get(`/hr/employees/${empId}/documents`),
  uploadDocument:  (empId, fd)      => api.post(`/hr/employees/${empId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteDocument:  (empId, docId)   => api.delete(`/hr/employees/${empId}/documents/${docId}`),

  // Family
  listFamily:      (empId)           => api.get(`/hr/employees/${empId}/family`),
  addFamilyMember: (empId, data)     => api.post(`/hr/employees/${empId}/family`, data),
  updateFamilyMember: (empId, memberId, data) => api.patch(`/hr/employees/${empId}/family/${memberId}`, data),
  deleteFamilyMember: (empId, memberId)       => api.delete(`/hr/employees/${empId}/family/${memberId}`),

  // Self-service
  getMyProfile:    () => api.get('/hr/me/profile'),
  updateMyProfile: (data) => api.patch('/hr/me/profile', data),

  // Attendance (Week 17)
  checkIn:          (data)   => api.post('/hr/attendance/check-in', data),
  checkOut:         (data)   => api.post('/hr/attendance/check-out', data),
  getMyAttendance:  (params) => api.get('/hr/attendance/me', { params }),
  getAttendance:    (params) => api.get('/hr/attendance', { params }),
  manualAttendance: (data)   => api.post('/hr/attendance/manual', data),

  // Holidays
  listHolidays:   (params)      => api.get('/hr/holidays', { params }),
  createHoliday:  (data)        => api.post('/hr/holidays', data),
  updateHoliday:  (id, data)    => api.patch(`/hr/holidays/${id}`, data),
  deleteHoliday:  (id)          => api.delete(`/hr/holidays/${id}`),

  // Leave Types
  listLeaveTypes:   ()           => api.get('/hr/leave-types'),
  createLeaveType:  (data)       => api.post('/hr/leave-types', data),
  updateLeaveType:  (id, data)   => api.patch(`/hr/leave-types/${id}`, data),
  deleteLeaveType:  (id)         => api.delete(`/hr/leave-types/${id}`),

  // Leave Balances + History
  getLeaveBalances: (empId, params) => api.get(`/hr/employees/${empId}/leave-balances`, { params }),
  getLeaveHistory:  (empId, params) => api.get(`/hr/employees/${empId}/leave-history`, { params }),

  // Leave Requests
  applyLeave:          (data)   => api.post('/hr/leave-requests', data),
  getMyLeaveRequests:  (params) => api.get('/hr/me/leave-requests', { params }),
  getTeamLeaveRequests:(params) => api.get('/hr/leave-requests/team', { params }),
  reviewLeave:         (id, data) => api.patch(`/hr/leave-requests/${id}/review`, data),
  cancelLeave:         (id)     => api.patch(`/hr/leave-requests/${id}/cancel`),
};
