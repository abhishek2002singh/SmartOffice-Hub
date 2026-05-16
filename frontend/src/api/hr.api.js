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

  // Bulk import — Content-Type: undefined clears the axios default (application/json)
  // so axios auto-sets multipart/form-data with the correct boundary
  bulkImport: (formData) => api.post('/hr/candidates/bulk-import', formData, {
    headers: { 'Content-Type': undefined },
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
  uploadDocument:  (empId, fd)      => api.post(`/hr/employees/${empId}/documents`, fd, {
    headers: { 'Content-Type': undefined },
  }),
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

  // Salary Structures (Week 18)
  listSalaryStructures:   ()           => api.get('/hr/salary-structures'),
  createSalaryStructure:  (data)       => api.post('/hr/salary-structures', data),
  getSalaryStructure:     (id)         => api.get(`/hr/salary-structures/${id}`),
  updateSalaryStructure:  (id, data)   => api.patch(`/hr/salary-structures/${id}`, data),
  deleteSalaryStructure:  (id)         => api.delete(`/hr/salary-structures/${id}`),

  // Employee Salary
  assignSalary:     (empId, data)  => api.post(`/hr/employees/${empId}/salary`, data),
  getSalaryHistory: (empId)        => api.get(`/hr/employees/${empId}/salary-history`),
  getForm16:        (empId, fy)    => api.get(`/hr/employees/${empId}/form16`, { params: { fy } }),

  // Payroll Runs
  processPayroll:   (data)  => api.post('/hr/payroll/process', data),
  listPayrollRuns:  (params) => api.get('/hr/payroll', { params }),
  getPayrollRun:    (id)    => api.get(`/hr/payroll/${id}`),
  disbursePayroll:  (id)    => api.patch(`/hr/payroll/${id}/disburse`),
  getBankFile:      (id)    => api.get(`/hr/payroll/${id}/bank-file`, { responseType: 'blob' }),

  // Payslips
  listMyPayslips: ()   => api.get('/hr/me/payslips'),
  getPayslip:     (id) => api.get(`/hr/payslips/${id}`),
  getPayslipPDF:  (id) => api.get(`/hr/payslips/${id}/pdf`, { responseType: 'blob' }),

  // Reimbursements
  submitReimbursement:    (data)       => api.post('/hr/reimbursements', data),
  listReimbursements:     (params)     => api.get('/hr/reimbursements', { params }),
  reviewReimbursement:    (id, data)   => api.patch(`/hr/reimbursements/${id}/review`, data),

  // Bonuses
  createBonus:  (data)       => api.post('/hr/bonuses', data),
  listBonuses:  (params)     => api.get('/hr/bonuses', { params }),
  updateBonus:  (id, data)   => api.patch(`/hr/bonuses/${id}`, data),
  deleteBonus:  (id)         => api.delete(`/hr/bonuses/${id}`),

  // KRAs (Week 19)
  listKRAs:    (params)     => api.get('/hr/kras', { params }),
  createKRA:   (data)       => api.post('/hr/kras', data),
  updateKRA:   (id, data)   => api.patch(`/hr/kras/${id}`, data),
  deleteKRA:   (id)         => api.delete(`/hr/kras/${id}`),

  // Performance Cycles
  listCycles:   (params)     => api.get('/hr/performance-cycles', { params }),
  createCycle:  (data)       => api.post('/hr/performance-cycles', data),
  getCycle:     (id)         => api.get(`/hr/performance-cycles/${id}`),
  updateCycle:  (id, data)   => api.patch(`/hr/performance-cycles/${id}`, data),

  // Goals
  listGoals:   (empId, params) => api.get(`/hr/employees/${empId}/goals`, { params }),
  setGoals:    (empId, data)   => api.post(`/hr/employees/${empId}/goals`, data),
  updateGoal:  (empId, goalId, data) => api.patch(`/hr/employees/${empId}/goals/${goalId}`, data),
  deleteGoal:  (empId, goalId)       => api.delete(`/hr/employees/${empId}/goals/${goalId}`),

  // Self Evaluation
  getMySelfEval:  (cycleId)       => api.get(`/hr/me/evaluations/${cycleId}`),
  saveSelfEval:   (cycleId, data) => api.post(`/hr/me/evaluations/${cycleId}`, data),

  // Manager Evaluation
  saveManagerEval: (empId, cycleId, data) => api.post(`/hr/employees/${empId}/manager-evaluation/${cycleId}`, data),
  getManagerEval:  (empId, cycleId)       => api.get(`/hr/employees/${empId}/manager-evaluation/${cycleId}`),

  // Combined Performance View
  getPerformanceView: (empId, cycleId) => api.get(`/hr/employees/${empId}/performance/${cycleId}`),

  // Peer Feedback
  submitPeerFeedback: (data)   => api.post('/hr/peer-feedback', data),
  listPeerFeedback:   (empId, params) => api.get(`/hr/employees/${empId}/peer-feedback`, { params }),

  // 1-on-1 Meetings
  listOneOnOnes:   (params)     => api.get('/hr/one-on-ones', { params }),
  createOneOnOne:  (data)       => api.post('/hr/one-on-ones', data),
  updateOneOnOne:  (id, data)   => api.patch(`/hr/one-on-ones/${id}`, data),

  // PIP
  createPIP:    (data)         => api.post('/hr/pips', data),
  listPIPs:     (params)       => api.get('/hr/pips', { params }),
  getPIP:       (id)           => api.get(`/hr/pips/${id}`),
  addPIPReview: (id, data)     => api.post(`/hr/pips/${id}/reviews`, data),
  closePIP:     (id, data)     => api.patch(`/hr/pips/${id}/close`, data),

  // Reports
  getPerformanceReport:  (params) => api.get('/hr/reports/performance', { params }),
  getMyPerfHistory:      ()       => api.get('/hr/me/performance-history'),

  // Exit Management (Week 20)
  submitResignation:     (data)        => api.post('/hr/me/resignation', data),
  getExitChecklist:      (empId)       => api.get(`/hr/employees/${empId}/exit-checklist`),
  updateExitChecklist:   (empId, data) => api.patch(`/hr/employees/${empId}/exit-checklist`, data),
  saveExitInterview:     (empId, data) => api.post(`/hr/employees/${empId}/exit-interview`, data),
  getExitInterview:      (empId)       => api.get(`/hr/employees/${empId}/exit-interview`),
  calculateFnF:          (empId, data) => api.post(`/hr/employees/${empId}/full-and-final`, data),
  getFnF:                (empId)       => api.get(`/hr/employees/${empId}/full-and-final`),
  approveFnF:            (empId)       => api.patch(`/hr/employees/${empId}/full-and-final/approve`),
  disburseFnF:           (empId)       => api.patch(`/hr/employees/${empId}/full-and-final/disburse`),
  getRelievingLetter:    (empId)       => api.get(`/hr/employees/${empId}/relieving-letter`, { responseType: 'blob' }),
  getExperienceLetter:   (empId)       => api.get(`/hr/employees/${empId}/experience-letter`, { responseType: 'blob' }),

  // HR Master Dashboard
  getHRDashboard: () => api.get('/hr/hr-dashboard'),
};
