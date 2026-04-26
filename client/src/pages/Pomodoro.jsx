import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { getTasks } from '../services/api'
import Layout from '../components/Layout'

function PomodoroSkeleton() {
  return (
    <Layout current="/pomodoro">
      <div className="mb-8">
        <div className="h-8 w-40 bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-56 bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="flex justify-center mb-8">
        <div className="h-56 w-56 bg-gray-800 rounded-full animate-pulse" />
      </div>
      <div className="flex justify-center gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 w-28 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="flex justify-center gap-3 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-9 w-32 bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md mx-auto">
        <div className="h-4 w-32 bg-gray-800 rounded-lg animate-pulse mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-800 rounded-xl animate-pulse mb-2" />
        ))}
      </div>
    </Layout>
  )
}

const MODES = {
  focus:      { label: 'Focus',       duration: 25 * 60, color: 'text-blue-400',   ring: 'stroke-blue-500'  },
  shortBreak: { label: 'Short Break', duration:  5 * 60, color: 'text-green-400',  ring: 'stroke-green-500' },
  longBreak:  { label: 'Long Break',  duration: 15 * 60, color: 'text-purple-400', ring: 'stroke-purple-500'},
}

function Pomodoro() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('focus')
  const [timeLeft, setTimeLeft] = useState(MODES.focus.duration)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const [selectedTask, setSelectedTask] = useState(null)
  const intervalRef = useRef(null)
  const audioRef = useRef(null)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const res = await getTasks()
        setTasks(res.data.filter(t => !t.done))
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (mode === 'focus') setSessions(s => s + 1)
            try { audioRef.current?.play() } catch {}
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running, mode])

  const switchMode = (newMode) => {
    setRunning(false)
    setMode(newMode)
    setTimeLeft(MODES[newMode].duration)
  }

  const handleReset = () => {
    setRunning(false)
    setTimeLeft(MODES[mode].duration)
  }

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const total = MODES[mode].duration
  const radius = 90
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - timeLeft / total)

  if (loading) return <PomodoroSkeleton />

  return (
    <Layout current="/pomodoro">

      <audio ref={audioRef} src="/chime.mp3" preload="none" />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">🍅 Pomodoro Timer</h2>
        <p className="text-gray-400 text-sm mt-1">
          {sessions} session{sessions !== 1 ? 's' : ''} completed today
        </p>
      </div>

      <div className="flex justify-center gap-2 mb-10 flex-wrap">
        {Object.entries(MODES).map(([key, val]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            className={`px-5 py-2 rounded-xl text-sm font-medium transition-colors ${
              mode === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700'
            }`}
          >
            {val.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center mb-10">
        <div className="relative">
          <svg width="220" height="220" viewBox="0 0 220 220">
            <circle cx="110" cy="110" r={radius} fill="none" stroke="#1F2937" strokeWidth="10" />
            <circle
              cx="110" cy="110" r={radius}
              fill="none"
              className={MODES[mode].ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 110 110)"
              style={{ transition: 'stroke-dashoffset 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className={`text-5xl font-bold tabular-nums ${MODES[mode].color}`}>{formatTime(timeLeft)}</p>
            <p className="text-gray-500 text-xs mt-1">{MODES[mode].label}</p>
          </div>
        </div>

        {selectedTask && (
          <p className="text-gray-400 text-sm mt-3">
            Working on: <span className="text-white font-medium">{selectedTask.title}</span>
          </p>
        )}
      </div>

      <div className="flex justify-center gap-3 mb-10 flex-wrap">
        <button
          onClick={handleReset}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          ↺ Reset
        </button>
        <button
          onClick={() => setRunning(r => !r)}
          className={`px-8 py-3 rounded-xl text-sm font-bold transition-colors ${
            running ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {running ? '⏸ Pause' : timeLeft === MODES[mode].duration ? '▶ Start' : '▶ Resume'}
        </button>
        <button
          onClick={() => switchMode(mode === 'focus' ? 'shortBreak' : 'focus')}
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-3 rounded-xl text-sm font-medium transition-colors"
        >
          ⏭ Skip
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md mx-auto">
        <h3 className="text-sm font-semibold text-white mb-3">🎯 Focus on a task</h3>
        {tasks.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No pending tasks — <Link to="/tasks" className="text-blue-400 hover:text-blue-300">add some</Link>
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map(task => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(selectedTask?.id === task.id ? null : task)}
                className={`text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                  selectedTask?.id === task.id
                    ? 'bg-blue-600 bg-opacity-20 border border-blue-500 border-opacity-40 text-blue-300'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {selectedTask?.id === task.id ? '▶ ' : ''}{task.title}
              </button>
            ))}
          </div>
        )}
      </div>

    </Layout>
  )
}

export default Pomodoro