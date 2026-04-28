import { Link, useNavigate } from 'react-router-dom'

const navItems = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard',    short: 'Home'    },
  { to: '/tasks',     icon: '✅', label: 'Tasks',        short: 'Tasks'   },
  { to: '/notes',     icon: '📝', label: 'Notes',        short: 'Notes'   },
  { to: '/ai',        icon: '🤖', label: 'AI Assistant', short: 'AI'      },
  { to: '/insights',  icon: '📊', label: 'Insights',     short: 'Insights'},
  { to: '/pomodoro',  icon: '🍅', label: 'Pomodoro',     short: 'Timer'   },
]

function Layout({ children, current }) {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
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
                current === to
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
              current === to ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            <span className="text-lg">{icon}</span>
            {short}
          </Link>
        ))}
      </nav>

      {/* Page content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8" style={{ paddingTop: 'max(3.5rem, env(safe-area-inset-top))' }}>
        {children}
      </main>

    </div>
  )
}

export default Layout