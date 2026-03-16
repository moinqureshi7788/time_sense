import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTasks, createTask, toggleTask, deleteTask } from '../services/api'

function Tasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [newTask, setNewTask] = useState('')
  const [loading, setLoading] = useState(true)
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

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const addTask = async () => {
    if (newTask.trim() === '') return
    setAdding(true)
    try {
      const res = await createTask({ title: newTask })
      setTasks([res.data, ...tasks])
      setNewTask('')
    } catch (error) {
      console.error(error)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      const res = await toggleTask(id)
      setTasks(tasks.map(t => t.id === id ? res.data : t))
    } catch (error) {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-6">
        <h1 className="text-2xl font-bold text-white mb-10">TimeSense</h1>
        <nav className="flex flex-col gap-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            🏠 Dashboard
          </Link>
          <Link to="/tasks" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm">
            ✅ Tasks
          </Link>
          <Link to="/notes" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            📝 Notes
          </Link>
          <Link to="/ai" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            🤖 AI Assistant
        </Link>
        <Link to="/insights" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
  📊 Insights
</Link>
        <Link to="/pomodoro" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
  🍅 Pomodoro
</Link>
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-gray-800 text-sm transition-colors"
        >
          🚪 Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">Tasks</h2>
          <p className="text-gray-400 text-sm mt-1">Manage and track your tasks</p>
        </div>

        {/* Add task */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Add a new task..."
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          <button
            onClick={addTask}
            disabled={adding}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-colors"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>

        {/* Tasks list */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
  <div className="flex flex-col gap-3">
    {tasks.length === 0 && (
      <p className="text-gray-500 text-sm text-center py-8">
        No tasks yet — add one above! 🎉
      </p>
    )}
    {[...tasks.filter(t => !t.done), ...tasks.filter(t => t.done)].map((task) => (
      <div
        key={task.id}
        className="flex items-center justify-between p-3 rounded-xl bg-gray-800 group"
      >
        <div className="flex items-center gap-3">
          <button onClick={() => handleToggle(task.id)} className="text-lg">
            {task.done ? '✅' : '⬜'}
          </button>
          <span className={`text-sm ${task.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
            {task.title}
          </span>
        </div>
        <button
          onClick={() => handleDelete(task.id)}
          className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-sm"
        >
          🗑️
        </button>
      </div>
    ))}
  </div>
</div>

      </main>
    </div>
  )
}

export default Tasks