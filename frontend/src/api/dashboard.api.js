import axios from './axios'

export const getMasterDashboard = () => axios.get('/dashboard/master').then(r => r.data.data)
