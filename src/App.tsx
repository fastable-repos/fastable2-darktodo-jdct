import { useState, useEffect, useCallback } from 'react'

type Theme = 'dark' | 'light'
type Filter = 'all' | 'active' | 'completed'

interface TodoItem {
  id: string
  text: string
  completed: boolean
  createdAt: string
}

const STORAGE_KEY_ITEMS = 'darktodo_items'
const STORAGE_KEY_THEME = 'darktodo_theme'

function loadItems(): TodoItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_ITEMS)
    if (stored) return JSON.parse(stored) as TodoItem[]
  } catch (err) {
    console.error('Failed to load todos from localStorage:', err)
  }
  return []
}

function saveItems(items: TodoItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items))
  } catch (err) {
    console.error('Failed to save todos to localStorage:', err)
  }
}

function loadTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_THEME)
    if (stored === 'dark' || stored === 'light') return stored
  } catch (err) {
    console.error('Failed to load theme from localStorage:', err)
  }
  return 'dark'
}

function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY_THEME, theme)
  } catch (err) {
    console.error('Failed to save theme to localStorage:', err)
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function MoonIcon() {
  return (
    <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      <line x1="12" y1="1" x2="12" y2="3" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// ── Empty State ────────────────────────────────────────────────────────────────

function EmptyState({ filter, isDark }: { filter: Filter; isDark: boolean }) {
  const message =
    filter === 'completed'
      ? 'No completed tasks yet'
      : filter === 'active'
      ? 'All tasks are done! 🎉'
      : 'No tasks yet — add one above!'

  return (
    <div className={`py-16 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`} data-testid="empty-state">
      <div className="text-5xl mb-4 select-none">
        {filter === 'completed' ? '📋' : filter === 'active' ? '🎉' : '✨'}
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [items, setItems] = useState<TodoItem[]>(loadItems)
  const [theme, setTheme] = useState<Theme>(loadTheme)
  const [inputText, setInputText] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const isDark = theme === 'dark'

  useEffect(() => {
    saveItems(items)
  }, [items])

  useEffect(() => {
    saveTheme(theme)
  }, [theme])

  const addTodo = useCallback(() => {
    const text = inputText.trim()
    if (!text) return
    const newItem: TodoItem = {
      id: generateId(),
      text,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    setItems(prev => [...prev, newItem])
    setInputText('')
  }, [inputText])

  const toggleTodo = useCallback((id: string) => {
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, completed: !item.completed } : item))
    )
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setItems(prev => prev.filter(item => !item.completed))
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'))
  }, [])

  const filteredItems = items.filter(item => {
    if (filter === 'active') return !item.completed
    if (filter === 'completed') return item.completed
    return true
  })

  const activeCount = items.filter(item => !item.completed).length
  const completedCount = items.filter(item => item.completed).length

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const appBg = isDark ? 'bg-[#0F172A]' : 'bg-[#FFFFFF]'
  const cardBg = isDark ? 'bg-[#1E293B]' : 'bg-[#F3F4F6]'
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-800'
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-500'
  const dividerColor = isDark ? 'border-slate-700' : 'border-slate-200'
  const hoverRowBg = isDark ? 'hover:bg-slate-700/40' : 'hover:bg-slate-200/60'
  const deleteBtn = isDark
    ? 'text-slate-500 hover:text-red-400 hover:bg-slate-700'
    : 'text-slate-400 hover:text-red-500 hover:bg-slate-200'
  const pillInactive = isDark
    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'

  return (
    <div
      data-testid="app-container"
      className={`min-h-screen ${appBg} transition-colors duration-300 font-sans`}
    >
      <div className="max-w-[600px] mx-auto px-4 py-10">

        {/* ── Header ── */}
        <header className="flex items-center justify-between mb-8">
          <h1 className={`text-3xl font-bold tracking-tight ${textPrimary}`}>DarkTodo</h1>

          {/* Theme toggle */}
          <button
            data-testid="theme-toggle"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center transition-transform duration-300 ${
                isDark ? 'translate-x-7' : 'translate-x-0'
              }`}
            >
              {isDark ? <MoonIcon /> : <SunIcon />}
            </span>
          </button>
        </header>

        {/* ── Input ── */}
        <div className={`${cardBg} rounded-xl px-4 py-3 mb-4 flex gap-3 items-center shadow-sm`}>
          <input
            data-testid="todo-input"
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addTodo() }}
            placeholder="Add a new task..."
            className={`flex-1 bg-transparent outline-none text-sm ${textPrimary} placeholder:text-slate-400`}
            aria-label="New task input"
          />
          <button
            data-testid="add-button"
            onClick={addTodo}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors duration-150 flex-shrink-0"
          >
            Add
          </button>
        </div>

        {/* ── Todo List ── */}
        <div className={`${cardBg} rounded-xl shadow-sm overflow-hidden mb-4`}>
          {filteredItems.length === 0 ? (
            <EmptyState filter={filter} isDark={isDark} />
          ) : (
            <ul data-testid="todo-list">
              {filteredItems.map((item, idx) => (
                <li
                  key={item.id}
                  data-testid="todo-item"
                  className={`group flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 ${hoverRowBg} ${
                    idx < filteredItems.length - 1 ? `border-b ${dividerColor}` : ''
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    data-testid="todo-checkbox"
                    onClick={() => toggleTodo(item.id)}
                    aria-label={item.completed ? 'Mark as active' : 'Mark as complete'}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors duration-150 ${
                      item.completed
                        ? 'bg-indigo-600 border-indigo-600'
                        : isDark
                        ? 'border-slate-600 hover:border-indigo-400'
                        : 'border-slate-300 hover:border-indigo-500'
                    }`}
                  >
                    {item.completed && <CheckIcon />}
                  </button>

                  {/* Task text */}
                  <span
                    data-testid="todo-text"
                    className={`flex-1 text-sm select-text transition-colors duration-150 ${
                      item.completed ? `line-through ${textSecondary}` : textPrimary
                    }`}
                  >
                    {item.text}
                  </span>

                  {/* Delete button */}
                  <button
                    data-testid="delete-button"
                    onClick={() => deleteTodo(item.id)}
                    aria-label="Delete task"
                    className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-md ${deleteBtn}`}
                  >
                    <XIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          {/* Filter pills */}
          <div className="flex gap-1">
            {(['all', 'active', 'completed'] as Filter[]).map(f => (
              <button
                key={f}
                data-testid={`filter-${f}`}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors duration-150 ${
                  filter === f ? 'bg-indigo-600 text-white' : pillInactive
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Active count */}
            <span data-testid="active-count" className={`text-xs ${textSecondary}`}>
              {activeCount} {activeCount === 1 ? 'item' : 'items'} left
            </span>

            {/* Clear completed */}
            {completedCount > 0 && (
              <button
                data-testid="clear-completed"
                onClick={clearCompleted}
                className={`text-xs transition-colors duration-150 underline-offset-2 hover:underline ${
                  isDark ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-500'
                }`}
              >
                Clear Completed
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
