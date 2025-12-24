import { useState, useEffect } from 'react'
import { FileText, CheckCircle2, Users, Sparkles, Clock, Trash2 } from 'lucide-react'

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

interface Meeting {
  id: string
  title: string
  summary: string
  key_points: string[]
  action_items: { id: string; description: string; status: string }[]
  participants: { id: string; name: string }[]
  created_at: string
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

  const toggleActionItem = async (itemId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending'
    
    try {
      const response = await fetch(`/api/action-items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      
      if (!response.ok) throw new Error('Failed to update action item')
      
      // Refresh meetings to show updated status
      fetchMeetings()
    } catch (err) {
      console.error('Error updating action item:', err)
    }
  }

  // Load meetings on component mount
  useEffect(() => {
    fetchMeetings()
  }, [])

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
                      <h4 className="font-semibold mb-2 text-sm text-slate-400">Action Items:</h4>
                      <ul className="space-y-2">
                        {meeting.action_items.map((item) => (
                          <li key={item.id} className="flex items-start gap-2">
                            <button
                              onClick={() => toggleActionItem(item.id, item.status)}
                              className="mt-0.5"
                            >
                              {item.status === 'completed' ? (
                                <CheckCircle2 className="w-5 h-5 text-green-400" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-600" />
                              )}
                            </button>
                            <span className={item.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-300'}>
                              {item.description}
                            </span>
                          </li>
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
