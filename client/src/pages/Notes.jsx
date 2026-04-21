import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getNotes, createNote, updateNote, deleteNote } from '../services/api'

// ─── Skeleton ────────────────────────────────────────────────────────────────
function NotesSkeleton() {
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

      {/* Main skeleton — two panel layout */}
      <main className="flex-1 flex">

        {/* Notes list panel */}
        <div className="w-72 bg-gray-900 border-r border-gray-800 p-5 flex flex-col">
          <div className="h-7 w-24 bg-gray-800 rounded-lg animate-pulse mb-4" />
          <div className="h-10 bg-gray-800 rounded-xl animate-pulse mb-4" />
          <div className="flex flex-col gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-gray-800 rounded-xl p-3 animate-pulse">
                <div className="h-4 bg-gray-700 rounded mb-2" style={{ width: `${50 + i * 10}%` }} />
                <div className="h-3 bg-gray-700 rounded" style={{ width: `${70 + i * 5}%` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 p-8">
          <div className="h-8 w-48 bg-gray-800 rounded-lg animate-pulse mb-6" />
          <div className="h-full bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" style={{ minHeight: '400px' }} />
        </div>

      </main>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
function Notes() {
  const navigate = useNavigate()
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedNote, setSelectedNote] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const saveTimeout = useRef(null)

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await getNotes()
        setNotes(res.data)
        if (res.data.length > 0) {
          selectNote(res.data[0])
        }
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

  const selectNote = (note) => {
    setSelectedNote(note)
    setTitle(note.title)
    setContent(note.content)
  }

  const handleNew = async () => {
    try {
      const res = await createNote({ title: 'Untitled', content: '' })
      const newNote = res.data
      setNotes([newNote, ...notes])
      selectNote(newNote)
    } catch (error) {
      console.error(error)
    }
  }

  // Auto-save with debounce
  const handleTitleChange = (val) => {
    setTitle(val)
    scheduleSave(val, content)
  }

  const handleContentChange = (val) => {
    setContent(val)
    scheduleSave(title, val)
  }

  const scheduleSave = (t, c) => {
    if (!selectedNote) return
    clearTimeout(saveTimeout.current)
    setSaving(true)
    saveTimeout.current = setTimeout(async () => {
      try {
        const res = await updateNote(selectedNote.id, { title: t, content: c })
        setNotes(prev => prev.map(n => n.id === selectedNote.id ? res.data : n))
        setSelectedNote(res.data)
      } catch (error) {
        console.error(error)
      } finally {
        setSaving(false)
      }
    }, 800)
  }

  const handleDelete = async (id) => {
    try {
      await deleteNote(id)
      const remaining = notes.filter(n => n.id !== id)
      setNotes(remaining)
      if (selectedNote?.id === id) {
        if (remaining.length > 0) {
          selectNote(remaining[0])
        } else {
          setSelectedNote(null)
          setTitle('')
          setContent('')
        }
      }
    } catch (error) {
      console.error(error)
    }
  }

  const filteredNotes = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <NotesSkeleton />

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

      {/* Two-panel layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Notes list panel */}
        <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">

          {/* Panel header */}
          <div className="p-5 border-b border-gray-800">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-white">📝 Notes</h2>
              <button
                onClick={handleNew}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              >
                + New
              </button>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Note list */}
          <div className="flex-1 overflow-y-auto p-3">
            {filteredNotes.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-gray-500 text-xs">No notes yet</p>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => selectNote(note)}
                  className={`p-3 rounded-xl mb-2 cursor-pointer group transition-colors ${
                    selectedNote?.id === note.id
                      ? 'bg-blue-600 bg-opacity-20 border border-blue-500 border-opacity-40'
                      : 'hover:bg-gray-800'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <p className={`text-sm font-medium truncate flex-1 ${selectedNote?.id === note.id ? 'text-blue-300' : 'text-gray-200'}`}>
                      {note.title || 'Untitled'}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(note.id) }}
                      className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs ml-2 shrink-0"
                    >
                      🗑️
                    </button>
                  </div>
                  <p className="text-gray-500 text-xs mt-1 truncate">
                    {note.content || 'No content'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Editor panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedNote ? (
            <>
              {/* Editor header */}
              <div className="px-8 pt-8 pb-4 border-b border-gray-800 flex justify-between items-center">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Note title..."
                  className="text-2xl font-bold text-white bg-transparent focus:outline-none flex-1 placeholder-gray-600"
                />
                <span className="text-xs text-gray-600 ml-4 shrink-0">
                  {saving ? '💾 Saving...' : '✓ Saved'}
                </span>
              </div>

              {/* Editor body */}
              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Start writing..."
                className="flex-1 bg-transparent text-gray-300 text-sm leading-relaxed px-8 py-6 resize-none focus:outline-none placeholder-gray-600"
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-5xl mb-4">📝</p>
                <p className="text-gray-400 text-sm">Select a note or create a new one</p>
                <button
                  onClick={handleNew}
                  className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  + Create your first note
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default Notes
