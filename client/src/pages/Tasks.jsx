import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getTasks, createTask, toggleTask, deleteTask } from '../services/api'
import Layout from '../components/Layout'

function TasksSkeleton() {
  return (
    <Layout current="/tasks">
      <div className="mb-8">
        <div className="h-8 w-40 bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <div className="h-10 bg-gray-800 rounded-xl animate-pulse" />
      </div>
      <div className="flex gap-2 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="flex flex-col gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 animate-pulse">
              <div className="h-6 w-6 bg-gray-700 rounded-md shrink-0" />
              <div className="flex-1 h-4 bg-gray-700 rounded-lg" />
              <div className="h-4 w-4 bg-gray-700 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}

function Tasks() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await getTasks()
        setTasks(res.data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  const handleAdd = async () => {
    if (!newTask.trim()) return
    setAdding(true)
    try {
      const res = await createTask({ title: newTask.trim() })
      setTasks([res.data, ...tasks])
      setNewTask('')
    } catch (error) {
      console.error(error)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id) => {
  setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)) // update instantly
  try {
    const res = await toggleTask(id)
    setTasks(tasks.map(t => t.id === id ? res.data : t)) // sync with server
  } catch (error) {
    setTasks(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t)) // revert on fail
    console.error(error)
  }
}

  const handleDelete = async (id) => {
    try {
      await deleteTask(id)
      setTasks(tasks.filter(t => t.id !== id))
    } catch (error) {
      console.error(error)
    }
  }

  const completedCount = tasks.filter(t => t.done).length
  const filteredTasks = tasks.filter(t => {
    if (filter === 'pending') return !t.done
    if (filter === 'done') return t.done
    return true
  })

  if (loading) return <TasksSkeleton />

  return (
    <Layout current="/tasks">

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">✅ Tasks</h2>
        <p className="text-gray-400 text-sm mt-1">{completedCount} of {tasks.length} completed</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Add a new task..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newTask.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            {adding ? '...' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'all',     label: `All (${tasks.length})` },
          { key: 'pending', label: `Pending (${tasks.length - completedCount})` },
          { key: 'done',    label: `Done (${completedCount})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400 text-sm">
              {filter === 'done' ? 'No completed tasks yet' : 'No tasks here — add one above!'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-800 group">
                <button onClick={() => handleToggle(task.id)} className="text-lg shrink-0">
                  {task.done ? '✅' : '⬜'}
                </button>
                <span className={`flex-1 text-sm ${task.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {task.title}
                </span>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 text-sm"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </Layout>
  )
}

export default Tasks