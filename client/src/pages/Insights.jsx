import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

function Insights() {
  const navigate = useNavigate()
  const savedInsights = localStorage.getItem('insights')
const [step, setStep] = useState(savedInsights ? 3 : 1)
const [screenshot, setScreenshot] = useState(null)
const [screenshotPreview, setScreenshotPreview] = useState(null)
const [screenTimeData, setScreenTimeData] = useState(null)
const [csvFile, setCsvFile] = useState(null)
const [insights, setInsights] = useState(savedInsights ? JSON.parse(savedInsights) : null)
const [loading, setLoading] = useState(false)
const [readingScreenshot, setReadingScreenshot] = useState(false)
const [error, setError] = useState('')

  const token = localStorage.getItem('token')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleScreenshotUpload = (e) => {
  const files = Array.from(e.target.files)
  if (!files.length) return
  setScreenshot(files)
  setScreenshotPreview(files.map(f => URL.createObjectURL(f)))
  setScreenTimeData(null)
}

  const handleReadScreenshot = async () => {
  if (!screenshot || !screenshot.length) return
  setReadingScreenshot(true)
  setError('')
  try {
    const formData = new FormData()
    screenshot.forEach(file => formData.append('screenshots', file))
    const res = await axios.post('http://localhost:8000/api/insights/read-screenshot', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
    setScreenTimeData(res.data.screenTimeData)
  } catch (err) {
    setError('Failed to read screenshots. Please try again.')
    console.error(err)
  } finally {
    setReadingScreenshot(false)
  }
}

  const handleAnalyze = async () => {
    if (!screenTimeData) {
      setError('Please upload and read your screenshot first')
      return
    }
    setError('')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('screenTimeData', JSON.stringify(screenTimeData))
     if (csvFile) formData.append('healthZip', csvFile)

      const res = await axios.post('http://localhost:8000/api/insights/analyze', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      setInsights(res.data)
      localStorage.setItem('insights', JSON.stringify(res.data))
      setStep(3)
    } catch (err) {
      setError('Analysis failed. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const energyColor = (value) => {
    if (value >= 80) return 'bg-green-500'
    if (value >= 60) return 'bg-blue-500'
    if (value >= 40) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const impactColor = (impact) => {
    if (impact === 'negative') return 'text-red-400'
    if (impact === 'positive') return 'text-green-400'
    return 'text-yellow-400'
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
          <Link to="/tasks" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            ✅ Tasks
          </Link>
          <Link to="/notes" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            📝 Notes
          </Link>
          <Link to="/ai" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            🤖 AI Assistant
          </Link>
          <Link to="/insights" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm">
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
      <main className="flex-1 p-8 overflow-y-auto">

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white">📊 Personal Insights</h2>
          <p className="text-gray-400 text-sm mt-1">AI analyzes your behavior to optimize your productivity</p>
        </div>

        {/* Step indicator */}
        {step < 3 && (
          <div className="flex items-center gap-2 mb-8">
            {['Screen Time', 'Health Data', 'Analysis'].map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === i + 1 ? 'bg-blue-600 text-white' :
                  step > i + 1 ? 'bg-green-600 text-white' :
                  'bg-gray-800 text-gray-400'
                }`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-sm ${step === i + 1 ? 'text-white' : 'text-gray-500'}`}>{label}</span>
                {i < 2 && <div className="w-8 h-0.5 bg-gray-700 ml-2"></div>}
              </div>
            ))}
          </div>
        )}

        {/* Step 1 — Screenshot Upload */}
        {step === 1 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-2xl">
            <h3 className="text-white font-semibold mb-2">Step 1 — Upload Screen Time Screenshot</h3>
            <p className="text-gray-400 text-sm mb-6">
              On your iPhone go to <span className="text-white">Settings → Screen Time → See All Activity</span>. Take a screenshot and upload it here.
            </p>

            {/* Upload area */}
            <div className="border-2 border-dashed border-gray-700 rounded-xl p-6 text-center mb-4">
              {screenshotPreview ? (
  <div>
    <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
      {screenshotPreview.map((src, i) => (
        <img
          key={i}
          src={src}
          alt={`Screenshot ${i + 1}`}
          className="h-48 rounded-xl object-contain shrink-0"
        />
      ))}
    </div>
    <p className="text-gray-400 text-xs mb-2">{screenshot.length} screenshot{screenshot.length > 1 ? 's' : ''} selected</p>
    <button
      onClick={() => { setScreenshot(null); setScreenshotPreview(null); setScreenTimeData(null) }}
      className="text-gray-500 text-xs hover:text-red-400"
    >
      Remove all
    </button>
  </div>
              ) : (
                <div>
                  <p className="text-4xl mb-3">📱</p>
                  <p className="text-gray-400 text-sm mb-3">Upload your Screen Time screenshot</p>
                  <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm cursor-pointer transition-colors">
                    Browse File
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleScreenshotUpload}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Read screenshot button */}
            {screenshot && !screenTimeData && (
              <button
                onClick={handleReadScreenshot}
                disabled={readingScreenshot}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors mb-4"
              >
                {readingScreenshot ? '🤖 Reading screenshot...' : '🔍 Read Screen Time Data'}
              </button>
            )}

            {/* Extracted data preview */}
            {screenTimeData && (
              <div className="bg-gray-800 rounded-xl p-4 mb-4">
                <p className="text-green-400 text-sm font-medium mb-3">✅ Screen Time data extracted!</p>
                <p className="text-gray-400 text-xs mb-2">Daily Average: <span className="text-white">{screenTimeData.totalDailyAverage}</span></p>
                <div className="flex flex-col gap-1">
                  {screenTimeData.apps?.slice(0, 5).map((app, i) => (
                    <div className="flex justify-between">
  <span className="text-gray-300 text-xs">{app.name}</span>
  <span className="text-gray-400 text-xs">{app.weeklyTotal}/week</span>
</div>
                  ))}
                </div>
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {screenTimeData && (
              <button
                onClick={() => setStep(2)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                Next →
              </button>
            )}
          </div>
        )}

        {/* Step 2 — Health CSV */}
        {step === 2 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-2xl">
            <h3 className="text-white font-semibold mb-2">Step 2 — Upload Health Data</h3>
            <p className="text-gray-400 text-sm mb-2">Export your iPhone Health data:</p>
<div className="bg-gray-800 rounded-xl p-3 mb-6 text-xs text-gray-400 leading-6">
  Health App → Tap your profile photo → Export All Health Data → Share the export.zip file
</div>

            <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center mb-6">
              {csvFile ? (
                <div>
                  <p className="text-green-400 text-sm font-medium">✅ {csvFile.name}</p>
                  <button onClick={() => setCsvFile(null)} className="text-gray-500 text-xs mt-2 hover:text-red-400">Remove</button>
                </div>
              ) : (
                <div>
                  <p className="text-4xl mb-3">📁</p>
                  <p className="text-gray-400 text-sm mb-3">Drop your export.zip here or click to browse</p>
                  <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm cursor-pointer transition-colors">
                    Browse File
                    <input
  type="file"
  accept=".zip"
  className="hidden"
  onChange={(e) => setCsvFile(e.target.files[0])}
/>
                  </label>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="text-gray-400 hover:text-white px-6 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {loading ? '🤖 Analyzing your behavior...' : '✨ Generate Insights'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Results */}
        {step === 3 && insights && (
          <div className="space-y-6 max-w-4xl">

            {/* Personality insight */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-3">🧠 Your Productivity Profile</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{insights.personalityInsight}</p>
              <div className="flex gap-4 mt-4">
                <div className="bg-gray-800 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-blue-400">{insights.sleepScore}</p>
                  <p className="text-gray-400 text-xs mt-1">Sleep Score</p>
                </div>
                <div className="bg-gray-800 rounded-xl px-4 py-3 text-center">
                  <p className="text-2xl font-bold text-red-400">{insights.weeklyScreenTime}h</p>
                  <p className="text-gray-400 text-xs mt-1">Weekly Screen Time</p>
                </div>
                <div className="bg-gray-800 rounded-xl px-4 py-3 flex-1">
                  <p className="text-gray-400 text-xs mb-1">Sleep Insight</p>
                  <p className="text-gray-300 text-xs leading-relaxed">{insights.sleepInsight}</p>
                </div>
              </div>
            </div>

            {/* Energy curve */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-6">⚡ Energy Level Throughout the Day</h3>
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
              <div className="flex gap-4 mt-4">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500"></div><span className="text-xs text-gray-400">High (80+)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div><span className="text-xs text-gray-400">Good (60-79)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-yellow-500"></div><span className="text-xs text-gray-400">Medium (40-59)</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div><span className="text-xs text-gray-400">Low (0-39)</span></div>
              </div>
            </div>

            {/* Focus and procrastination windows */}
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">🎯 Focus Windows</h3>
                <div className="flex flex-col gap-3">
                  {insights.focusWindows.map((w, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white text-sm font-medium">{w.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${w.type === 'peak' ? 'bg-green-900 text-green-400' : 'bg-blue-900 text-blue-400'}`}>
                          {w.type}
                        </span>
                      </div>
                      <p className="text-blue-400 text-xs">{w.time}</p>
                      <p className="text-gray-400 text-xs mt-1">{w.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <h3 className="text-white font-semibold mb-4">⚠️ Procrastination Windows</h3>
                <div className="flex flex-col gap-3">
                  {insights.procrastinationWindows.map((w, i) => (
                    <div key={i} className="bg-gray-800 rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-white text-sm font-medium">{w.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${w.type === 'high' ? 'bg-red-900 text-red-400' : 'bg-yellow-900 text-yellow-400'}`}>
                          {w.type}
                        </span>
                      </div>
                      <p className="text-red-400 text-xs">{w.time}</p>
                      <p className="text-gray-400 text-xs mt-1">{w.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* App insights */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">📱 App Usage Analysis</h3>
              <div className="flex flex-col gap-3">
                {insights.appInsights.map((app, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white text-sm font-medium">{app.app}</span>
                        <span className={`text-xs font-medium ${impactColor(app.impact)}`}>
                          {app.impact === 'negative' ? '⚠️ Procrastination risk' : app.impact === 'positive' ? '✅ Productive' : '⚪ Neutral'}
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs">{app.pattern}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-white text-lg font-bold">{app.weeklyHours}h</p>
                      <p className="text-gray-500 text-xs">per week</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Task recommendations */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-white font-semibold mb-4">📋 Smart Task Schedule</h3>
              <div className="flex flex-col gap-3">
                {insights.taskRecommendations.map((rec, i) => (
                  <div key={i} className="bg-gray-800 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{rec.taskType}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{rec.reason}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 text-sm font-medium">{rec.bestTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Redo button */}
            <button
              onClick={() => { 
  setStep(1)
  setInsights(null)
  setScreenshot(null)
  setScreenshotPreview(null)
  setScreenTimeData(null)
  localStorage.removeItem('insights')
}}
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              🔄 Run New Analysis
            </button>

          </div>
        )}

      </main>
    </div>
  )
}

export default Insights