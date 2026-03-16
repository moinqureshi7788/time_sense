import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getNotes, createNote, deleteNote } from '../services/api'

function Notes() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await getNotes()
        setNotes(res.data)
        setActiveNote(res.data[0] || null)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }
    fetchNotes()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const handleCreate = async () => {
    if (newTitle.trim() === '') return
    setSaving(true)
    try {
      const res = await createNote({ title: newTitle, body: newBody })
      setNotes([res.data, ...notes])
      setActiveNote(res.data)
      setIsCreating(false)
      setNewTitle('')
      setNewBody('')
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteNote(id)
      const remaining = notes.filter(n => n.id !== id)
      setNotes(remaining)
      setActiveNote(remaining[0] || null)
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
          <Link to="/tasks" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors">
            ✅ Tasks
          </Link>
          <Link to="/notes" className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium text-sm">
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

      {/* Notes panel */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">My Notes</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold flex items-center justify-center transition-colors"
          >
            +
          </button>
        </div>

        <div className="flex flex-col gap-1 p-3 overflow-y-auto flex-1">
          {notes.length === 0 && (
            <p className="text-gray-500 text-xs text-center mt-6">No notes yet!</p>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => { setActiveNote(note); setIsCreating(false) }}
              className={`p-3 rounded-xl cursor-pointer group flex justify-between items-start transition-colors ${
                activeNote?.id === note.id ? 'bg-blue-600' : 'hover:bg-gray-800'
              }`}
            >
              <div>
                <p className={`text-sm font-medium ${activeNote?.id === note.id ? 'text-white' : 'text-gray-300'}`}>
                  {note.title}
                </p>
                <p className={`text-xs mt-0.5 truncate w-36 ${activeNote?.id === note.id ? 'text-blue-200' : 'text-gray-500'}`}>
                  {note.body}
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                className={`opacity-0 group-hover:opacity-100 text-xs mt-1 transition-all ${
                  activeNote?.id === note.id ? 'text-blue-200 hover:text-white' : 'text-gray-500 hover:text-red-400'
                }`}
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Note content */}
      <main className="flex-1 p-8">
        {isCreating ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="font-semibold text-white mb-5">New Note</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Note title..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all mb-3"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Write your note here..."
              rows={8}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={handleCreate}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                {saving ? 'Saving...' : 'Save Note'}
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-400 hover:text-white px-5 py-2.5 rounded-xl text-sm hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : activeNote ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">{activeNote.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{activeNote.body}</p>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-sm">No notes yet — click + to create one!</p>
          </div>
        )}
      </main>

    </div>
  )
}

export default Notes