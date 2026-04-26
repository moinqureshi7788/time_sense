import { useState } from 'react'
import { uploadScreenTime, uploadHealth } from '../services/api'
import { Link } from 'react-router-dom'
import Layout from '../components/Layout'

function InsightsSkeleton() {
  return (
    <Layout current="/insights">
      <div className="mb-8">
        <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-72 bg-gray-800 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <div className="h-5 w-40 bg-gray-800 rounded-lg animate-pulse mb-3" />
            <div className="h-28 bg-gray-800 rounded-xl animate-pulse mb-3" />
            <div className="h-10 bg-gray-800 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <div className="h-5 w-48 bg-gray-800 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-40 bg-gray-800 rounded-xl animate-pulse" />
      </div>
    </Layout>
  )
}

function Insights() {
  const [loading] = useState(false)
  const [screenTimeFile, setScreenTimeFile] = useState(null)
  const [healthFile, setHealthFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState('')
  const [insights, setInsights] = useState(() => {
    const saved = localStorage.getItem('insights')
    return saved ? JSON.parse(saved) : null
  })

  const handleAnalyze = async () => {
    if (!screenTimeFile && !healthFile) return
    setAnalyzing(true)
    setProgress('Uploading files...')
    try {
      let result = null
      if (screenTimeFile) {
        setProgress('Reading Screen Time screenshot...')
        const formData = new FormData()
        screenTimeFile.forEach(file => {
  formData.append('screenshots', file)
})
        const res = await uploadScreenTime(formData)
        result = res.data
      }
      if (healthFile) {
        setProgress('Parsing Health export...')
        const formData = new FormData()
        formData.append('healthExport', healthFile)
        const res = await uploadHealth(formData)
        result = { ...result, ...res.data }
      }
      setProgress('AI is generating your behavioral profile...')
      await new Promise(r => setTimeout(r, 800))
      if (result) {
        setInsights(result)
        localStorage.setItem('insights', JSON.stringify(result))
      }
    } catch (error) {
      console.error(error)
      setProgress('Something went wrong. Please try again.')
    } finally {
      setAnalyzing(false)
      setProgress('')
    }
  }

  const handleClear = () => {
    setInsights(null)
    localStorage.removeItem('insights')
  }

  if (loading) return <InsightsSkeleton />

  return (
    <Layout current="/insights">

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white">📊 Behavioral Insights</h2>
        <p className="text-gray-400 text-sm mt-1">Upload your iPhone data to generate your personal energy profile</p>
      </div>

      {!insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-1">📱 Screen Time Screenshot</h3>
            <p className="text-gray-400 text-xs mb-4">Take a screenshot of your Screen Time summary page in iPhone Settings</p>
            <label className="block">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                screenTimeFile ? 'border-blue-500 bg-blue-500 bg-opacity-10' : 'border-gray-700 hover:border-gray-600'
              }`}>
                {screenTimeFile ? (
                  <>
                    <p className="text-2xl mb-1">✅</p>
                    <p className="text-blue-400 text-sm font-medium">{screenTimeFile.name}</p>
                    <p className="text-gray-500 text-xs mt-1">Click to replace</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl mb-2">📸</p>
                    <p className="text-gray-400 text-sm">Click to upload screenshot</p>
                    <p className="text-gray-600 text-xs mt-1">PNG, JPG supported</p>
                  </>
                )}
              </div>
              <input
  type="file"
  accept="image/*"
  multiple
  className="hidden"
  onChange={(e) => setScreenTimeFile(Array.from(e.target.files))}
/>
            </label>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-1">❤️ Health Export (Optional)</h3>
            <p className="text-gray-400 text-xs mb-4">Export from Apple Health app → Profile → Export All Health Data</p>
            <label className="block">
              <div className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                healthFile ? 'border-green-500 bg-green-500 bg-opacity-10' : 'border-gray-700 hover:border-gray-600'
              }`}>
                {healthFile ? (
                  <>
                    <p className="text-2xl mb-1">✅</p>
                    <p className="text-green-400 text-sm font-medium">{healthFile.name}</p>
                    <p className="text-gray-500 text-xs mt-1">Click to replace</p>
                  </>
                ) : (
                  <>
                    <p className="text-3xl mb-2">🗂️</p>
                    <p className="text-gray-400 text-sm">Click to upload ZIP export</p>
                    <p className="text-gray-600 text-xs mt-1">.zip file from Apple Health</p>
                  </>
                )}
              </div>
              <input type="file" accept=".zip" className="hidden" onChange={(e) => setHealthFile(e.target.files[0])} />
            </label>
          </div>

        </div>
      )}

      {!insights && (
        <div className="flex justify-center mb-8">
          {analyzing ? (
            <div className="text-center">
              <p className="text-3xl animate-pulse mb-2">🤖</p>
              <p className="text-gray-300 text-sm font-medium">{progress}</p>
            </div>
          ) : (
            <button
              onClick={handleAnalyze}
              disabled={!screenTimeFile && !healthFile}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-8 py-3 rounded-xl font-semibold transition-colors"
            >
              ✨ Generate My Insights
            </button>
          )}
        </div>
      )}

      {insights && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={handleClear} className="text-gray-500 hover:text-red-400 text-sm transition-colors">
              🔄 Re-analyze
            </button>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h3 className="font-semibold text-white mb-1">⚡ Your Energy Curve</h3>
            <p className="text-gray-400 text-xs mb-4">How your focus and energy level changes throughout the day</p>
            <div className="relative w-full" style={{ height: '180px' }}>
              <svg viewBox={`0 0 ${insights.energyCurve.length * 50} 100`} preserveAspectRatio="none" className="w-full" style={{ height: '150px' }}>
                {[25, 50, 75].map(y => (
                  <line key={y} x1="0" y1={100 - y} x2={insights.energyCurve.length * 50} y2={100 - y} stroke="#374151" strokeWidth="0.5" strokeDasharray="4" />
                ))}
                <polyline
                  points={insights.energyCurve.map((p, i) => `${i * 50 + 25},${100 - p.energy}`).join(' ')}
                  fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                />
                {insights.energyCurve.map((p, i) => (
                  <circle key={i} cx={i * 50 + 25} cy={100 - p.energy} r="3"
                    fill={p.energy >= 80 ? '#22C55E' : p.energy >= 60 ? '#3B82F6' : p.energy >= 40 ? '#EAB308' : '#EF4444'}
                    stroke="#111827" strokeWidth="1.5">
                    <title>{p.hour}: {p.label} ({p.energy}%)</title>
                  </circle>
                ))}
              </svg>
              <div className="flex justify-between px-1">
                {insights.energyCurve.map((p, i) => (
                  <span key={i} className="text-gray-500" style={{ fontSize: '9px' }}>
                    {p.hour.replace(' AM', 'a').replace(' PM', 'p')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">🎯 Focus Windows</h3>
              <div className="flex flex-col gap-3">
                {insights.focusWindows?.map((w, i) => (
                  <div key={i} className="bg-green-900 bg-opacity-30 border border-green-800 border-opacity-40 rounded-xl p-3">
                    <p className="text-green-400 text-sm font-medium">{w.time}</p>
                    <p className="text-gray-300 text-xs mt-0.5">{w.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">⚠️ Procrastination Risk</h3>
              <div className="flex flex-col gap-3">
                {insights.procrastinationWindows?.map((w, i) => (
                  <div key={i} className="bg-red-900 bg-opacity-30 border border-red-800 border-opacity-40 rounded-xl p-3">
                    <p className="text-red-400 text-sm font-medium">{w.time}</p>
                    <p className="text-gray-300 text-xs mt-0.5">{w.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {insights.taskRecommendations && (
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="font-semibold text-white mb-4">📋 Task Timing Recommendations</h3>
              <div className="flex flex-col gap-3">
                {insights.taskRecommendations.map((rec, i) => (
                  <div key={i} className="flex items-center gap-4 bg-gray-800 rounded-xl p-3">
                    <span className="text-2xl">{rec.icon || '⏰'}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{rec.taskType}</p>
                      <p className="text-blue-400 text-xs">Best time: {rec.bestTime}</p>
                      <p className="text-gray-400 text-xs mt-0.5">{rec.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </Layout>
  )
}

export default Insights