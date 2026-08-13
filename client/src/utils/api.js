import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  timeout: 10000,
})

export const createTransaction = (data) => api.post('/transactions', data)
export const getTransactions = (params) => api.get('/transactions', { params })
export const getTodayTransactions = () => api.get('/transactions/today')
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`)

export const getSummary = (period) => api.get('/analytics/summary', { params: { period } })
export const getByService = (period) => api.get('/analytics/by-service', { params: { period } })
export const getDailyTrend = (days) => api.get('/analytics/daily', { params: { days } })

export default api
