import axios from 'axios'

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://time-sense.onrender.com",
})

// Automatically attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auth
export const register = (data) => API.post('/api/auth/register', data)
export const login = (data) => API.post('/api/auth/login', data)

// Tasks
export const getTasks = () => API.get('/api/tasks')
export const createTask = (data) => API.post('/api/tasks', data)
export const toggleTask = (id) => API.patch(`/api/tasks/${id}`)
export const deleteTask = (id) => API.delete(`/api/tasks/${id}`)

// Notes
export const getNotes = () => API.get('/api/notes')
export const createNote = (data) => API.post('/api/notes', data)
export const updateNote = (id, data) => API.put(`/api/notes/${id}`, data)
export const deleteNote = (id) => API.delete(`/api/notes/${id}`)

// Insights
export const uploadScreenTime = (formData) => API.post('/api/insights/read-screenshot', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})
export const uploadHealth = (formData) => API.post('/api/insights/upload-health', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// AI
export const getPlanner = () => API.post('/api/ai/planner')
export const summarizeNote = (noteId) => API.post('/api/ai/summarize', { noteId })
export const chatWithAI = (message) => API.post('/api/ai/chat', { message })
export const getTimePlan = (startTime, endTime) => API.post('/api/ai/timeplan', { startTime, endTime })