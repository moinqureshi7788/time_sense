import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTasks } from '../services/api'

function Pomodoro() {
  const navigate = useNavigate()

  // Timer settings
  const [workDuration, setWorkDuration] = useState(25)
  const [breakDuration, setBreakDuration] = useState(5)
  const [showSettings, setShowSettings] = useState(false)

  // Timer state
  const [mode, setMode] = useState('work') // 'work' or 'break'
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionsToday, setSessionsToday] = useState(() => {
  const saved = localStorage.getItem('pomodoroHistory')
  if (!saved) return 0
  const parsed = JSON.parse(saved)
  const today = new Date().toDateString()
  return parsed.filter(s => new Date(s.date).toDateString() === today && s.type === 'work').length
})
  const intervalRef = useRef(null)

  // Tasks
  const [tasks, setTasks] = useState([])
  const [selectedTask, setSelectedTask] = useState(null)

  // Session history
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('pomodoroHistory')
    if (!saved) return []
    const parsed = JSON.parse(saved)
    // Only keep today's sessions
    const today = new Date().toDateString()
    return parsed.filter(s => new Date(s.date).toDateString() === today)
  })

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await getTasks()
        setTasks(res.data.filter(t => !t.done))
      } catch (error) {
        console.error(error)
      }
    }
    fetchTasks()
  }, [])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            handleSessionComplete()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [isRunning, mode])

  const handleSessionComplete = () => {
  setIsRunning(false)

  setHistory(prevHistory => {
    if (mode === 'work') {
      const session = {
        id: Date.now(),
        task: selectedTask ? selectedTask.title : 'No task selected',
        duration: workDuration,
        date: new Date().toISOString(),
        type: 'work'
      }
      const newHistory = [session, ...prevHistory]
      localStorage.setItem('pomodoroHistory', JSON.stringify(newHistory))
      setSessionsToday(prev => prev + 1)
      return newHistory
    }
    return prevHistory
  })

  if (mode === 'work') {
    setMode('break')
    setTimeLeft(breakDuration * 60)
  } else {
    setMode('work')
    setTimeLeft(workDuration * 60)
  }

  if (Notification.permission === 'granted') {
    new Notification(mode === 'work' ? '🍅 Pomodoro complete! Take a break.' : '💪 Break over! Back to work.')
  }
}

  const handleStartPause = () => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setMode('work')
    setTimeLeft(workDuration * 60)
  }

  const handleSkip = () => {
    setIsRunning(false)
    if (mode === 'work') {
      setMode('break')
      setTimeLeft(breakDuration * 60)
    } else {
      setMode('work')
      setTimeLeft(workDuration * 60)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const totalSeconds = mode === 'work' ? workDuration * 60 : breakDuration * 60
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 90

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-6">
        <h1 className="text-2xl font-bold text-white mb-10">TimeSense</h1>
        <nav className="flex flex-col gap-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            🏠 Dashboard
          </Link>
          <Link to="/tasks" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
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
          <Link to="/pomodoro" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm">
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
      <main className="flex-1 p-8 overflow-y-auto">

        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">🍅 Pomodoro Timer</h2>
            <p className="text-gray-400 text-sm mt-1">Stay focused with timed work sessions</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm transition-colors"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6 max-w-md">
            <h3 className="text-white font-semibold mb-4">Timer Settings</h3>
            <div className="flex gap-6">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Work (minutes)</label>
                <input
                  type="number"
                  value={workDuration}
                  onChange={(e) => {
                    setWorkDuration(Number(e.target.value))
                    if (!isRunning) setTimeLeft(Number(e.target.value) * 60)
                  }}
                  min="1" max="90"
                  className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Break (minutes)</label>
                <input
                  type="number"
                  value={breakDuration}
                  onChange={(e) => setBreakDuration(Number(e.target.value))}
                  min="1" max="30"
                  className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6 max-w-4xl">

          {/* Timer */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center">

            {/* Mode tabs */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => { setMode('work'); setTimeLeft(workDuration * 60); setIsRunning(false) }}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${mode === 'work' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                Work
              </button>
              <button
                onClick={() => { setMode('break'); setTimeLeft(breakDuration * 60); setIsRunning(false) }}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${mode === 'break' ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
              >
                Break
              </button>
            </div>

            {/* Circular timer */}
            <div className="relative mb-8">
              <svg width="220" height="220" className="-rotate-90">
                <circle
                  cx="110" cy="110" r="90"
                  fill="none"
                  stroke="#1F2937"
                  strokeWidth="8"
                />
                <circle
                  cx="110" cy="110" r="90"
                  fill="none"
                  stroke={mode === 'work' ? '#3B82F6' : '#22C55E'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (progress / 100) * circumference}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-white font-mono">
                  {formatTime(timeLeft)}
                </span>
                <span className={`text-sm mt-1 font-medium ${mode === 'work' ? 'text-blue-400' : 'text-green-400'}`}>
                  {mode === 'work' ? 'Focus' : 'Break'}
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleReset}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 w-10 h-10 rounded-xl text-lg transition-colors"
              >
                ↺
              </button>
              <button
                onClick={handleStartPause}
                className={`${mode === 'work' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'} text-white px-8 h-10 rounded-xl font-semibold text-sm transition-colors`}
              >
                {isRunning ? 'Pause' : 'Start'}
              </button>
              <button
                onClick={handleSkip}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 w-10 h-10 rounded-xl text-lg transition-colors"
              >
                ⏭
              </button>
            </div>

            {/* Sessions today */}
            <div className="flex items-center gap-2">
              {Array.from({ length: Math.max(sessionsToday, 4) }).map((_, i) => (
                <span key={i} className={`text-xl ${i < sessionsToday ? 'opacity-100' : 'opacity-20'}`}>🍅</span>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-2">{sessionsToday} session{sessionsToday !== 1 ? 's' : ''} today</p>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">

            {/* Task picker */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">🎯 What are you working on?</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setSelectedTask(null)}
                  className={`p-3 rounded-xl text-sm text-left transition-colors ${!selectedTask ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  No specific task
                </button>
                {tasks.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-2">No pending tasks — add some in Tasks page</p>
                )}
                {tasks.map(task => (
                  <button
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className={`p-3 rounded-xl text-sm text-left transition-colors ${selectedTask?.id === task.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Session history */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex-1">
              <h3 className="text-white font-semibold mb-4">📋 Today's Sessions</h3>
              {history.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No sessions yet — start your first pomodoro!</p>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-48">
                  {history.map((session, i) => (
                    <div key={session.id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🍅</span>
                        <div>
                          <p className="text-white text-sm font-medium">{session.task}</p>
                          <p className="text-gray-500 text-xs">
                            {new Date(session.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <span className="text-gray-400 text-xs">{session.duration} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </main>
    </div>
  )
}

export default Pomodoro