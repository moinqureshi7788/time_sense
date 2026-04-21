import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getTasks, getNotes, getTimePlan, toggleTask } from '../services/api'

function Dashboard() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [schedule, setSchedule] = useState([])
  const [plannerLoading, setPlannerLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('21:00')

  const user = JSON.parse(localStorage.getItem('user'))
  const savedInsights = localStorage.getItem('insights')
  const insights = savedInsights ? JSON.parse(savedInsights) : null

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tasksRes, notesRes] = await Promise.all([
          getTasks(),
          getNotes()
        ])
        setTasks(tasksRes.data)
        setNotes(notesRes.data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }
  
  const handleToggle = async (id) => {
  try {
    const res = await toggleTask(id)
    setTasks(tasks.map(t => t.id === id ? res.data : t))
  } catch (error) {
    console.error(error)
  }
}

  const handleTimePlan = async () => {
    setPlannerLoading(true)
    setSchedule([])
    try {
      const format = (t) => {
        const [h, m] = t.split(':')
        const hour = parseInt(h)
        const ampm = hour >= 12 ? 'PM' : 'AM'
        const hour12 = hour % 12 || 12
        return `${hour12}:${m} ${ampm}`
      }
      const res = await getTimePlan(format(startTime), format(endTime))
      setSchedule(res.data.schedule)
    } catch (error) {
      console.error(error)
    } finally {
      setPlannerLoading(false)
    }
  }

  const completedTasks = tasks.filter(t => t.done).length
  const recentTasks = tasks.slice(0, 3)

  const calculateStreak = () => {
  if (tasks.length === 0) return 0
  const completedDates = tasks
    .filter(t => t.done)
    .map(t => new Date(t.createdAt).toDateString())
  const uniqueDates = [...new Set(completedDates)]
  if (uniqueDates.length === 0) return 0

  let streak = 0
  const today = new Date()
  for (let i = 0; i < 30; i++) {
    const day = new Date(today)
    day.setDate(today.getDate() - i)
    if (uniqueDates.includes(day.toDateString())) {
      streak++
    } else if (i > 0) {
      break
    }
  }
  return streak
}

const streak = calculateStreak()

// Sort tasks by AI schedule if available
const getSortedTasks = () => {
  if (!insights?.taskRecommendations) return tasks

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Parse time string like "9:00 AM" into 24h number
  const parseTime = (timeStr) => {
    if (!timeStr) return 999
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
    if (!match) return 999
    let hour = parseInt(match[1])
    const min = parseInt(match[2])
    const ampm = match[3].toUpperCase()
    if (ampm === 'PM' && hour !== 12) hour += 12
    if (ampm === 'AM' && hour === 12) hour = 0
    return hour * 60 + min
  }

  const currentMinutes = currentHour * 60 + currentMinute

  // Score each task based on how close its recommended time is to now
  const scoredTasks = tasks.map(task => {
    const rec = insights.taskRecommendations.find(r =>
      r.taskType.toLowerCase().includes(task.title.toLowerCase().split(' ')[0]) ||
      task.title.toLowerCase().includes(r.taskType.toLowerCase().split(' ')[0])
    )

    const recTime = rec ? parseTime(rec.bestTime.split(' - ')[0]) : 999
    const timeDiff = Math.abs(recTime - currentMinutes)

    return { ...task, timeDiff, recTime }
  })

  // Sort: undone tasks first by closest to current time, done tasks at bottom
  return scoredTasks.sort((a, b) => {
    if (a.done && !b.done) return 1
    if (!a.done && b.done) return -1
    return a.timeDiff - b.timeDiff
  })
}

const sortedTasks = getSortedTasks()
const pendingTasks = sortedTasks.filter(t => !t.done)

const stats = [
  { label: 'Tasks Today', value: tasks.length, icon: '📋', color: 'text-blue-400' },
  { label: 'Completed', value: completedTasks, icon: '✅', color: 'text-green-400' },
  { label: 'Notes', value: notes.length, icon: '📝', color: 'text-purple-400' },
  { label: 'Streak', value: `${streak} days`, icon: '🔥', color: 'text-orange-400' },
]

  const typeStyles = {
    work: 'bg-blue-600 border-blue-500',
    break: 'bg-green-700 border-green-600',
    personal: 'bg-purple-700 border-purple-600',
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex">

        {/* Sidebar skeleton */}
        <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col p-6">
          <div className="h-7 w-32 bg-gray-800 rounded-lg animate-pulse mb-10" />
          <div className="flex flex-col gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        </aside>

        {/* Main skeleton */}
        <main className="flex-1 p-8">

          {/* Header */}
          <div className="mb-8">
            <div className="h-8 w-64 bg-gray-800 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-800 rounded-lg animate-pulse" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                <div className="h-8 w-8 bg-gray-800 rounded-lg animate-pulse mb-2" />
                <div className="h-7 w-16 bg-gray-800 rounded-lg animate-pulse mb-2" />
                <div className="h-4 w-24 bg-gray-800 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>

          {/* Energy chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="h-5 w-48 bg-gray-800 rounded-lg animate-pulse mb-4" />
            <div className="h-40 bg-gray-800 rounded-xl animate-pulse" />
          </div>

          {/* Planner */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <div className="h-5 w-40 bg-gray-800 rounded-lg animate-pulse mb-4" />
            <div className="h-32 bg-gray-800 rounded-xl animate-pulse" />
          </div>

          {/* Tasks */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="h-5 w-32 bg-gray-800 rounded-lg animate-pulse mb-4" />
            <div className="flex flex-col gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>

        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* Sidebar */}
      <aside className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col p-6 shrink-0">
        <h1 className="text-2xl font-bold text-white mb-10">TimeSense</h1>
        <nav className="flex flex-col gap-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm">
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

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center px-2 py-3 z-50">
        <Link to="/dashboard" className="flex flex-col items-center gap-1 text-blue-400 text-xs">
          <span className="text-lg">🏠</span> Home
        </Link>
        <Link to="/tasks" className="flex flex-col items-center gap-1 text-gray-400 text-xs">
          <span className="text-lg">✅</span> Tasks
        </Link>
        <Link to="/notes" className="flex flex-col items-center gap-1 text-gray-400 text-xs">
          <span className="text-lg">📝</span> Notes
        </Link>
        <Link to="/ai" className="flex flex-col items-center gap-1 text-gray-400 text-xs">
          <span className="text-lg">🤖</span> AI
        </Link>
        <Link to="/insights" className="flex flex-col items-center gap-1 text-gray-400 text-xs">
          <span className="text-lg">📊</span> Insights
        </Link>
        <Link to="/pomodoro" className="flex flex-col items-center gap-1 text-gray-400 text-xs">
          <span className="text-lg">🍅</span> Timer
        </Link>
      </nav>

      {/* Main content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">
            Good morning, {user?.name} 👋
          </h2>
          <p className="text-gray-400 text-sm mt-1">Here's what's on your plate today</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <span className="text-2xl">{stat.icon}</span>
              <p className={`text-2xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-400 text-sm mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
          {/* Energy Chart */}
<div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
  <div className="flex justify-between items-center mb-6">
    <div>
      <h3 className="font-semibold text-white">⚡ Your Energy Level Today</h3>
      <p className="text-gray-400 text-xs mt-1">Based on your personal behavioral analysis</p>
    </div>
    <Link to="/insights" className="text-blue-400 text-xs hover:text-blue-300 transition-colors">
      Update analysis →
    </Link>
  </div>

  {insights ? (
    <div>
      <div className="relative w-full" style={{ height: '160px' }}>
        <svg
          viewBox={`0 0 ${insights.energyCurve.length * 50} 100`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: '130px' }}
        >
          {/* Grid lines */}
          {[25, 50, 75].map(y => (
            <line
              key={y}
              x1="0" y1={100 - y}
              x2={insights.energyCurve.length * 50} y2={100 - y}
              stroke="#374151" strokeWidth="0.5" strokeDasharray="4"
            />
          ))}

          {/* Line */}
          <polyline
            points={insights.energyCurve.map((point, i) => `${i * 50 + 25},${100 - point.energy}`).join(' ')}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Dots */}
          {insights.energyCurve.map((point, i) => (
            <circle
              key={i}
              cx={i * 50 + 25}
              cy={100 - point.energy}
              r="3"
              fill={point.energy >= 80 ? '#22C55E' : point.energy >= 60 ? '#3B82F6' : point.energy >= 40 ? '#EAB308' : '#EF4444'}
              stroke="#111827"
              strokeWidth="1.5"
            >
              <title>{point.hour}: {point.label} ({point.energy}%)</title>
            </circle>
          ))}
        </svg>

        {/* X axis labels */}
        <div className="flex justify-between px-1">
          {insights.energyCurve.map((point, i) => (
            <span key={i} className="text-gray-500" style={{ fontSize: '9px' }}>
              {point.hour.replace(' AM', 'a').replace(' PM', 'p')}
            </span>
          ))}
        </div>
      </div>

      {/* Focus and procrastination summary */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-green-400 text-xs font-medium mb-1">🎯 Best Focus Window</p>
          <p className="text-white text-sm">{insights.focusWindows[0]?.time}</p>
          <p className="text-gray-400 text-xs mt-0.5">{insights.focusWindows[0]?.description}</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-3">
          <p className="text-red-400 text-xs font-medium mb-1">⚠️ Procrastination Risk</p>
          <p className="text-white text-sm">{insights.procrastinationWindows[0]?.time}</p>
          <p className="text-gray-400 text-xs mt-0.5">{insights.procrastinationWindows[0]?.description}</p>
        </div>
      </div>
    </div>
  ) : (
    <div className="text-center py-8">
      <p className="text-4xl mb-3">📊</p>
      <p className="text-gray-400 text-sm">No behavioral analysis yet</p>
      <Link
        to="/insights"
        className="inline-block mt-3 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
      >
        Generate my insights
      </Link>
    </div>
  )}
</div>
        {/* AI Time Planner */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">

          {/* Planner header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="font-semibold text-white text-lg">🤖 AI Day Planner</h3>
              <p className="text-gray-400 text-xs mt-1">AI schedules your tasks across the day</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-xl text-sm transition-colors"
              >
                ⚙️ Settings
              </button>
              <button
                onClick={handleTimePlan}
                disabled={plannerLoading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
              >
                {plannerLoading ? '⏳ Planning...' : '✨ Plan my day'}
              </button>
            </div>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div className="bg-gray-800 rounded-xl p-4 mb-6 flex gap-6 items-end">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Work Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Work End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Save
              </button>
            </div>
          )}

          {/* Empty state */}
          {schedule.length === 0 && !plannerLoading && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🗓️</p>
              <p className="text-gray-400 text-sm">Click "Plan my day" to generate your AI schedule</p>
              <p className="text-gray-500 text-xs mt-1">Make sure you have tasks added first</p>
            </div>
          )}

          {/* Loading state */}
          {plannerLoading && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3 animate-pulse">🤖</p>
              <p className="text-gray-400 text-sm">AI is planning your day...</p>
            </div>
          )}

          {/* Timeline calendar */}
          {schedule.length > 0 && (
            <div className="flex flex-col gap-2">

              {/* Legend */}
              <div className="flex gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                  <span className="text-xs text-gray-400">Work</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-700"></div>
                  <span className="text-xs text-gray-400">Break</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-700"></div>
                  <span className="text-xs text-gray-400">Personal</span>
                </div>
              </div>

              {/* Schedule blocks */}
              {schedule.map((item, index) => (
                <div key={index} className="flex gap-4 items-start">

                  {/* Time column */}
                  <div className="w-20 text-right shrink-0">
                    <span className="text-xs text-gray-500 font-medium">{item.time}</span>
                  </div>

                  {/* Line + dot */}
                  <div className="flex flex-col items-center shrink-0">
                    <div className={`w-3 h-3 rounded-full border-2 mt-0.5 ${typeStyles[item.type] || typeStyles.work}`}></div>
                    {index < schedule.length - 1 && (
                      <div className="w-0.5 bg-gray-700 flex-1 mt-1" style={{ minHeight: '24px' }}></div>
                    )}
                  </div>

                  {/* Task block */}
                  <div className={`flex-1 rounded-xl px-4 py-3 mb-2 border-l-4 ${typeStyles[item.type] || typeStyles.work} bg-opacity-20`}>
                    <div className="flex justify-between items-center">
                      <p className="text-white text-sm font-medium">{item.task}</p>
                      <span className="text-xs text-gray-300 bg-gray-800 px-2 py-0.5 rounded-full">
                        {item.duration}
                      </span>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tasks */}
<div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
  <div className="flex justify-between items-center mb-5">
    <div>
      <h3 className="font-semibold text-white">Your Tasks</h3>
      <p className="text-gray-400 text-xs mt-0.5">
        {insights ? 'Sorted by your AI energy schedule' : 'All tasks'}
      </p>
    </div>
    <Link to="/tasks" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
      Manage →
    </Link>
  </div>
  <div className="flex flex-col gap-3">
    {pendingTasks.length === 0 && (
      <p className="text-gray-500 text-sm text-center py-6">
        No tasks yet — add one in the Tasks page!
      </p>
    )}
    {pendingTasks.map((task) => (
      <div
        key={task.id}
        className="flex items-center gap-3 p-3 rounded-xl bg-gray-800"
      >
        <button onClick={() => handleToggle(task.id)} className="text-lg shrink-0">
          {task.done ? '✅' : '⬜'}
        </button>
        <div className="flex-1">
          <span className={`text-sm ${task.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
            {task.title}
          </span>
          {!task.done && insights?.taskRecommendations && (() => {
            const rec = insights.taskRecommendations.find(r =>
              r.taskType.toLowerCase().includes(task.title.toLowerCase().split(' ')[0]) ||
              task.title.toLowerCase().includes(r.taskType.toLowerCase().split(' ')[0])
            )
            return rec ? (
              <p className="text-blue-400 text-xs mt-0.5">⏰ {rec.bestTime}</p>
            ) : null
          })()}
        </div>
      </div>
    ))}
  </div>
</div>

      </main>
    </div>
  )
}

export default Dashboard