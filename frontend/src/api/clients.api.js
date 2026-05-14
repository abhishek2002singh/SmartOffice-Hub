import api from './axios';

export const clientsApi = {
  list:   (params)        => api.get('/crm/clients', { params }),
  get:    (id)            => api.get(`/crm/clients/${id}`),
  create: (data)          => api.post('/crm/clients', data),
  update: (id, data)      => api.patch(`/crm/clients/${id}`, data),
  remove: (id)            => api.delete(`/crm/clients/${id}`),
  refreshHealth: (id)     => api.post(`/crm/clients/${id}/health`),

  listContacts:    (id)         => api.get(`/crm/clients/${id}/contacts`),
  addContact:      (id, data)   => api.post(`/crm/clients/${id}/contacts`, data),
  updateContact:   (id, cid, data) => api.patch(`/crm/clients/${id}/contacts/${cid}`, data),
  deleteContact:   (id, cid)    => api.delete(`/crm/clients/${id}/contacts/${cid}`),

  listSubscriptions: (id)        => api.get(`/crm/clients/${id}/subscriptions`),
  addSubscription:   (id, data)  => api.post(`/crm/clients/${id}/subscriptions`, data),
  updateSubscription:(id, sid, data) => api.patch(`/crm/clients/${id}/subscriptions/${sid}`, data),

  listTickets:    (id)          => api.get(`/crm/clients/${id}/tickets`),
  addTicket:      (id, data)    => api.post(`/crm/clients/${id}/tickets`, data),
  updateTicket:   (id, tid, data)  => api.patch(`/crm/clients/${id}/tickets/${tid}`, data),

  listServices:   ()            => api.get('/crm/clients/services'),
  createService:  (data)        => api.post('/crm/clients/services', data),
  updateService:  (id, data)    => api.patch(`/crm/clients/services/${id}`, data),
};
