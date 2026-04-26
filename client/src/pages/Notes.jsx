import { useState, useEffect } from 'react'
import { getNotes, createNote, updateNote, deleteNote } from '../services/api'
import Layout from '../components/Layout'

function NotesSkeleton() {
  return (
    <Layout current="/notes">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="h-7 w-24 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-9 w-20 bg-gray-800 rounded-xl animate-pulse" />
        </div>
        <div className="flex flex-col gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-900 border border-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </Layout>
  )
}

function NoteModal({ note, mode: initialMode, onClose, onSave, onDelete }) {
  const [mode, setMode] = useState(initialMode) // 'view' | 'edit'
  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) { onClose(); return }
    setSaving(true)
    try {
      await onSave({ title: title.trim() || 'Untitled', content })
      onClose()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const isNew = !note?.id

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            {!isNew && mode === 'view' && (
              <>
                <button
                  onClick={() => setMode('edit')}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={onDelete}
                  className="bg-red-600 hover:bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  🗑️ Delete
                </button>
              </>
            )}
            {(isNew || mode === 'edit') && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {saving ? 'Saving...' : '💾 Save'}
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-xl leading-none transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div className="px-6 pt-5 pb-3 shrink-0">
          {mode === 'edit' || isNew ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title..."
              autoFocus
              className="w-full text-2xl font-bold text-white bg-transparent focus:outline-none placeholder-gray-600"
            />
          ) : (
            <h2 className="text-2xl font-bold text-white">{title || 'Untitled'}</h2>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {mode === 'edit' || isNew ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note here..."
              className="w-full h-full min-h-[200px] bg-transparent text-gray-300 text-sm leading-relaxed resize-none focus:outline-none placeholder-gray-600"
            />
          ) : (
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
              {content || <span className="text-gray-600">No content</span>}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}

function Notes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | { note, mode }

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await getNotes()
        setNotes(res.data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchNotes()
  }, [])

  const openNote = (note) => setModal({ note, mode: 'view' })
  const openNew = () => setModal({ note: null, mode: 'edit' })
  const closeModal = () => setModal(null)

  const handleSave = async ({ title, content }) => {
    if (modal.note?.id) {
      // Updating existing
      const res = await updateNote(modal.note.id, { title, content })
      setNotes(prev => prev.map(n => n.id === modal.note.id ? res.data : n))
    } else {
      // Creating new
      const res = await createNote({ title, content })
      setNotes(prev => [res.data, ...prev])
    }
  }

  const handleDelete = async () => {
    if (!modal.note?.id) return
    try {
      await deleteNote(modal.note.id)
      setNotes(prev => prev.filter(n => n.id !== modal.note.id))
      closeModal()
    } catch (e) {
      console.error(e)
    }
  }

  if (loading) return <NotesSkeleton />

  return (
    <Layout current="/notes">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold text-white">📝 Notes</h1>
          <button
            onClick={openNew}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            + New
          </button>
        </div>

        {/* Notes list */}
        {notes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 text-sm mb-4">No notes yet</p>
            <button
              onClick={openNew}
              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Create your first note
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notes.map((note) => (
              <div
                key={note.id}
                onClick={() => openNote(note)}
                className="bg-gray-900 border border-gray-800 hover:border-blue-500 hover:border-opacity-50 rounded-xl px-5 py-3.5 cursor-pointer transition-all group flex items-center justify-between"
              >
                <span className="text-gray-200 text-sm font-medium group-hover:text-white transition-colors">
                  {note.title || 'Untitled'}
                </span>
                <span className="text-gray-600 text-xs">→</span>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Modal */}
      {modal && (
        <NoteModal
          note={modal.note}
          mode={modal.mode}
          onClose={closeModal}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </Layout>
  )
}

export default Notes