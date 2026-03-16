import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8000/api'
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
export const register = (data) => API.post('/auth/register', data)
export const login = (data) => API.post('/auth/login', data)

// Tasks
export const getTasks = () => API.get('/tasks')
export const createTask = (data) => API.post('/tasks', data)
export const toggleTask = (id) => API.patch(`/tasks/${id}`)
export const deleteTask = (id) => API.delete(`/tasks/${id}`)

// Notes
export const getNotes = () => API.get('/notes')
export const createNote = (data) => API.post('/notes', data)
export const deleteNote = (id) => API.delete(`/notes/${id}`)

// AI
export const getPlanner = () => API.post('/ai/planner')
export const summarizeNote = (noteId) => API.post('/ai/summarize', { noteId })
export const chatWithAI = (message) => API.post('/ai/chat', { message })
export const getTimePlan = (startTime, endTime) => API.post('/ai/timeplan', { startTime, endTime })