import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { chatWithAI } from "../services/api";

// ─── Skeleton ────────────────────────────────────────────────────────────────
function AISkeleton() {
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
      <main className="flex-1 flex flex-col p-8">

        {/* Header */}
        <div className="mb-6">
          <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse mb-2" />
          <div className="h-4 w-64 bg-gray-800 rounded-lg animate-pulse" />
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-4">
          <div className="flex flex-col gap-4">
            {/* AI message bubble */}
            <div className="flex gap-3">
              <div className="h-8 w-8 bg-gray-800 rounded-full animate-pulse shrink-0" />
              <div className="h-16 bg-gray-800 rounded-2xl animate-pulse flex-1 max-w-sm" />
            </div>
            {/* User message bubble */}
            <div className="flex gap-3 justify-end">
              <div className="h-10 bg-gray-800 rounded-2xl animate-pulse w-48" />
              <div className="h-8 w-8 bg-gray-800 rounded-full animate-pulse shrink-0" />
            </div>
            {/* Another AI bubble */}
            <div className="flex gap-3">
              <div className="h-8 w-8 bg-gray-800 rounded-full animate-pulse shrink-0" />
              <div className="h-24 bg-gray-800 rounded-2xl animate-pulse flex-1 max-w-md" />
            </div>
          </div>
        </div>

        {/* Input skeleton */}
        <div className="h-14 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />

      </main>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
function AIAssistant() {
  const navigate = useNavigate()
  const [loading] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm your TimeSense AI assistant. I can help you with productivity tips, analyzing your schedule, task prioritization, and anything related to your workday. What's on your mind?"
    }
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleSend = async () => {
    if (!input.trim() || thinking) return
    const userMsg = { role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setThinking(true)

    try {
      const res = await chatWithAI([...messages, userMsg])
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch (error) {
      console.error(error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I ran into an issue. Please try again in a moment."
      }])
    } finally {
      setThinking(false)
    }
  }

  if (loading) return <AISkeleton />

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
          <Link to="/ai" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm">
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

      {/* Main chat area */}
      <main className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-800">
          <h2 className="text-2xl font-bold text-white">🤖 AI Assistant</h2>
          <p className="text-gray-400 text-sm mt-1">Powered by LLaMA 3.3 70B via Groq</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm shrink-0 mt-0.5">
                  🤖
                </div>
              )}
              <div
                className={`max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-gray-800 text-gray-200 rounded-tl-sm'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-sm shrink-0 mt-0.5">
                  👤
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {thinking && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm shrink-0">
                🤖
              </div>
              <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="px-8 py-4 border-t border-gray-800">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Ask me anything about your productivity..."
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || thinking}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
            >
              Send →
            </button>
          </div>
        </div>

      </main>
    </div>
  )
}

export default AIAssistant
