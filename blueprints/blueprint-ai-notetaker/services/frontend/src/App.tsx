import { useState, useEffect } from 'react'
import { FileText, CheckCircle2, Users, Sparkles, Clock, Trash2, Calendar, AlertCircle } from 'lucide-react'

// =============================================================================
// TYPES
// =============================================================================
interface ProcessedMeeting {
  meeting_id: string
  title: string
  summary: string
  key_points: string[]
  action_items: string[]
  participants: string[]
  decisions: string[]
}

interface ActionItem {
  id: string
  description: string
  status: string
  priority: string
  due_date: string | null
  assigned_to: string | null
}

interface Participant {
  id: string
  name: string
}

interface Meeting {
  id: string
  title: string
  summary: string
  key_points: string[]
  action_items: ActionItem[]
  participants: Participant[]
  created_at: string
}

// Priority configuration
const PRIORITIES = {
  high: { label: 'High', color: 'bg-red-500', textColor: 'text-red-400', icon: '🔴' },
  medium: { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400', icon: '🟡' },
  low: { label: 'Low', color: 'bg-green-500', textColor: 'text-green-400', icon: '🟢' },
}

function App() {
  // =============================================================================
  // STATE
  // =============================================================================
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<ProcessedMeeting | null>(null)
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'input' | 'history'>('input')
  const [editingItem, setEditingItem] = useState<string | null>(null)

  // =============================================================================
  // HELPER FUNCTIONS
  // =============================================================================
  const formatDueDate = (dueDate: string | null): string => {
    if (!dueDate) return ''
    
    const date = new Date(dueDate)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays <= 7) return `Due in ${diffDays} days`
    
    return `Due ${date.toLocaleDateString()}`
  }

  const isOverdue = (dueDate: string | null): boolean => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  // =============================================================================
  // API CALLS
  // =============================================================================
  const processMeeting = async () => {
    if (!transcript.trim()) {
      setError('Please enter a meeting transcript')
      return
    }

    setProcessing(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/meetings/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to process meeting')
      }

      const data: ProcessedMeeting = await response.json()
      setResult(data)
      setTranscript('') // Clear input
      
      // Refresh meeting history
      fetchMeetings()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setProcessing(false)
    }
  }

  const fetchMeetings = async () => {
    try {
      const response = await fetch('/api/meetings')
      if (!response.ok) throw new Error('Failed to fetch meetings')
      
      const data: Meeting[] = await response.json()
      setMeetings(data)
    } catch (err) {
      console.error('Error fetching meetings:', err)
    }
  }

  const deleteMeeting = async (id: string) => {
    if (!confirm('Delete this meeting?')) return

    try {
      const response = await fetch(`/api/meetings/${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete meeting')
      
      setMeetings(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const updateActionItem = async (
    itemId: string,
    updates: { status?: string; priority?: string; due_date?: string | null; assigned_to?: string | null }
  ) => {
    try {
      const response = await fetch(`/api/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      
      if (!response.ok) throw new Error('Failed to update action item')
      
      // Refresh meetings to show updated data
      fetchMeetings()
    } catch (err) {
      console.error('Error updating action item:', err)
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const toggleActionItem = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending'
    await updateActionItem(itemId, { status: newStatus })
  }

  // Load meetings on component mount
  useEffect(() => {
    fetchMeetings()
  }, [])

  // =============================================================================
  // ACTION ITEM COMPONENT
  // =============================================================================
  const ActionItemCard = ({ item, participants }: { item: ActionItem; participants: Participant[] }) => {
    const isEditing = editingItem === item.id
    const priorityConfig = PRIORITIES[item.priority as keyof typeof PRIORITIES] || PRIORITIES.medium
    const overdue = isOverdue(item.due_date)

    return (
      <li className={`bg-slate-900 rounded-lg p-4 space-y-3 border ${
        overdue && item.status !== 'completed' ? 'border-red-500' : 'border-slate-700'
      }`}>
        {/* Top Row: Checkbox and Description */}
        <div className="flex items-start gap-3">
          <button
            onClick={() => toggleActionItem(item.id, item.status)}
            className="mt-0.5 flex-shrink-0"
          >
            {item.status === 'completed' ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-slate-400 transition" />
            )}
          </button>
          <span className={`flex-1 ${item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
            {item.description}
          </span>
          <button
            onClick={() => setEditingItem(isEditing ? null : item.id)}
            className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 hover:bg-slate-800 rounded"
          >
            {isEditing ? 'Done' : 'Edit'}
          </button>
        </div>

        {/* Second Row: Priority, Due Date, Assignee */}
        {isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pl-8">
            {/* Priority Selector */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Priority</label>
              <select
                value={item.priority}
                onChange={(e) => updateActionItem(item.id, { priority: e.target.value })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
            </div>

            {/* Due Date Picker */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Due Date</label>
              <input
                type="date"
                value={item.due_date ? new Date(item.due_date).toISOString().split('T')[0] : ''}
                onChange={(e) => updateActionItem(item.id, { 
                  due_date: e.target.value ? new Date(e.target.value).toISOString() : null 
                })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Assignee Selector */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Assigned To</label>
              <select
                value={item.assigned_to || ''}
                onChange={(e) => updateActionItem(item.id, { assigned_to: e.target.value || null })}
                className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Unassigned</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3 pl-8 text-sm">
            {/* Priority Badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color} bg-opacity-20 ${priorityConfig.textColor}`}>
              {priorityConfig.icon} {priorityConfig.label}
            </span>

            {/* Due Date */}
            {item.due_date && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                overdue ? 'bg-red-500 bg-opacity-20 text-red-400' : 'bg-blue-500 bg-opacity-20 text-blue-400'
              }`}>
                <Calendar className="w-3 h-3" />
                {formatDueDate(item.due_date)}
                {overdue && <AlertCircle className="w-3 h-3" />}
              </span>
            )}

            {/* Assignee */}
            {item.assigned_to && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-500 bg-opacity-20 text-purple-400">
                <Users className="w-3 h-3" />
                {item.assigned_to}
              </span>
            )}
          </div>
        )}
      </li>
    )
  }

  // =============================================================================
  // RENDER
  // =============================================================================
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-blue-400" />
              <div>
                <h1 className="text-2xl font-bold">AI Meeting Notes</h1>
                <p className="text-sm text-slate-400">Extract action items from transcripts</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setView('input')}
                className={`px-4 py-2 rounded-lg transition ${
                  view === 'input'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                New Meeting
              </button>
              <button
                onClick={() => setView('history')}
                className={`px-4 py-2 rounded-lg transition ${
                  view === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                History ({meetings.length})
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input View */}
        {view === 'input' && (
          <div className="space-y-6">
            {/* Input Section */}
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <label className="block text-lg font-medium mb-3">
                <FileText className="inline w-5 h-5 mr-2" />
                Meeting Transcript
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your meeting transcript here...&#10;&#10;Example:&#10;Sarah: I think we should prioritize the mobile app redesign.&#10;John: Agreed. Let's allocate two engineers to this project.&#10;Maria: What about the timeline? Can we get this done by Q2?"
                className="w-full h-64 bg-slate-900 border border-slate-600 rounded-lg p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-slate-400">
                  {transcript.length} characters
                </span>
                <button
                  onClick={processMeeting}
                  disabled={processing || !transcript.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium transition flex items-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Extract Notes
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 text-red-300">
                {error}
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-6">
                <h2 className="text-2xl font-bold text-blue-400">{result.title}</h2>
                
                {/* Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-green-400" />
                    Summary
                  </h3>
                  <p className="text-slate-300">{result.summary}</p>
                </div>

                {/* Key Points */}
                <div>
                  <h3 className="text-lg font-semibold mb-2">Key Discussion Points</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-300">
                    {result.key_points.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>

                {/* Action Items */}
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-yellow-400" />
                    Action Items
                  </h3>
                  <ul className="space-y-2">
                    {result.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-slate-300">
                        <span className="text-yellow-400 mt-1">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Participants */}
                {result.participants.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      Participants
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {result.participants.map((name, i) => (
                        <span key={i} className="bg-slate-700 px-3 py-1 rounded-full text-sm">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Decisions */}
                {result.decisions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Decisions Made</h3>
                    <ul className="list-disc list-inside space-y-1 text-slate-300">
                      {result.decisions.map((decision, i) => (
                        <li key={i}>{decision}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-700 text-sm text-slate-400">
                  ✓ Meeting saved to history
                </div>
              </div>
            )}
          </div>
        )}

        {/* History View */}
        {view === 'history' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Meeting History</h2>
            
            {meetings.length === 0 ? (
              <div className="bg-slate-800 rounded-lg p-12 text-center border border-slate-700">
                <Clock className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                <p className="text-slate-400">No meetings yet. Process your first transcript!</p>
              </div>
            ) : (
              meetings.map((meeting) => (
                <div key={meeting.id} className="bg-slate-800 rounded-lg p-6 border border-slate-700 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-blue-400">{meeting.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">
                        {new Date(meeting.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteMeeting(meeting.id)}
                      className="text-red-400 hover:text-red-300 p-2 hover:bg-slate-700 rounded transition"
                      title="Delete meeting"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {meeting.summary && (
                    <p className="text-slate-300">{meeting.summary}</p>
                  )}

                  {meeting.action_items.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3 text-sm text-slate-400">Action Items:</h4>
                      <ul className="space-y-3">
                        {meeting.action_items.map((item) => (
                          <ActionItemCard 
                            key={item.id} 
                            item={item} 
                            participants={meeting.participants}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {meeting.participants.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {meeting.participants.map((p) => (
                        <span key={p.id} className="text-xs bg-slate-700 px-2 py-1 rounded-full text-slate-300">
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-slate-500 text-sm border-t border-slate-800">
        Built with Genesis System SDK • Powered by AI
      </footer>
    </div>
  )
}

export default App
