import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { chatWithAI } from '../services/api'

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard',    short: 'Home'    },
  { to: '/tasks',     icon: '✅', label: 'Tasks',        short: 'Tasks'   },
  { to: '/notes',     icon: '📝', label: 'Notes',        short: 'Notes'   },
  { to: '/ai',        icon: '🤖', label: 'AI Assistant', short: 'AI'      },
  { to: '/insights',  icon: '📊', label: 'Insights',     short: 'Insights'},
  { to: '/pomodoro',  icon: '🍅', label: 'Pomodoro',     short: 'Timer'   },
]

function AIAssistant() {
  const navigate = useNavigate()
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
  localStorage.removeItem('insights')
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
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I ran into an issue. Please try again in a moment."
      }])
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">

      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-64 bg-gray-900 border-r border-gray-800 flex-col p-6 shrink-0">
        <h1 className="text-2xl font-bold text-white mb-10">TimeSense</h1>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors ${
                to === '/ai'
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {icon} {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-gray-800 text-sm transition-colors"
        >
          🚪 Logout
        </button>
      </aside>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center px-2 py-3 z-50">
        {navItems.map(({ to, icon, short }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center gap-1 text-xs ${
              to === '/ai' ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{icon}</span>
            {short}
          </Link>
        ))}
      </nav>

      {/* Chat — full height flex column */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16 md:pb-0">

        <div className="px-4 md:px-8 py-6 border-b border-gray-800 shrink-0">
          <h2 className="text-2xl font-bold text-white">🤖 AI Assistant</h2>
          <p className="text-gray-400 text-sm mt-1">Powered by LLaMA 3.3 70B via Groq</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm shrink-0 mt-0.5">🤖</div>
              )}
              <div className={`max-w-xs md:max-w-2xl px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-800 text-gray-200 rounded-tl-sm'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-sm shrink-0 mt-0.5">👤</div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3 justify-start">
              <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-sm shrink-0">🤖</div>
              <div className="bg-gray-800 px-4 py-3 rounded-2xl rounded-tl-sm flex gap-1 items-center">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="px-4 md:px-8 py-4 border-t border-gray-800 shrink-0">
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

      </div>
    </div>
  )
}

export default AIAssistant