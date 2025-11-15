import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import axios from 'axios'

interface Transcription {
  id: string
  originalFilename: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  createdAt: string
  updatedAt: string
  errorMessage?: string
}

export default function Transcribe() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session) {
      fetchTranscriptions()
      // Poll for updates every 5 seconds
      const interval = setInterval(fetchTranscriptions, 5000)
      return () => clearInterval(interval)
    }
  }, [session])

  const fetchTranscriptions = async () => {
    try {
      const response = await axios.get('/api/transcribe/list')
      setTranscriptions(response.data)
    } catch (err) {
      console.error('Error fetching transcriptions:', err)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]

      // Validate file type
      const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-wav']
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.match(/\.(wav|mp3|mp4)$/i)) {
        setError('Please upload a valid audio file (WAV, MP3, or MP4)')
        return
      }

      setFile(selectedFile)
      setError('')
    }
  }

  const handleUploadAndProcess = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setUploading(true)
    setError('')
    setSuccess('')

    try {
      // Upload file
      const formData = new FormData()
      formData.append('audio', file)

      const uploadResponse = await axios.post('/api/transcribe/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const transcriptionId = uploadResponse.data.transcriptionId
      setSuccess('File uploaded successfully! Starting transcription...')

      // Start processing
      setUploading(false)
      setProcessing(true)

      await axios.post('/api/transcribe/process', { transcriptionId })

      setSuccess('Transcription started! You can monitor progress below.')
      setFile(null)

      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Fetch updated list
      fetchTranscriptions()

    } catch (err: any) {
      setError(err.response?.data?.message || 'An error occurred')
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  const downloadTranscript = async (transcriptionId: string, type: 'raw' | 'final') => {
    try {
      const response = await axios.get(`/api/transcribe/${transcriptionId}`)
      const transcription = response.data

      const content = type === 'raw' ? transcription.transcriptRaw : transcription.transcriptFinal
      const filename = `${transcription.originalFilename}_${type}_transcript.txt`

      // Create download
      const blob = new Blob([content], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      window.URL.revokeObjectURL(url)

    } catch (err) {
      setError('Failed to download transcript')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      PENDING: 'bg-gray-200 text-gray-700',
      PROCESSING: 'bg-blue-200 text-blue-700 animate-pulse',
      COMPLETED: 'bg-green-200 text-green-700',
      FAILED: 'bg-red-200 text-red-700'
    }
    return badges[status] || 'bg-gray-200'
  }

  if (status === 'loading') {
    return <Layout><div className="text-center py-12">Loading...</div></Layout>
  }

  if (!session) {
    return null
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Audio Transcription</h1>

        {/* Upload Section */}
        <div className="card mb-8">
          <h2 className="text-2xl font-bold mb-4">Upload Audio File</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <div className="mb-4">
            <label className="label">Select Audio File (WAV, MP3, or MP4)</label>
            <input
              id="file-input"
              type="file"
              accept=".wav,.mp3,.mp4,audio/*"
              onChange={handleFileChange}
              className="input"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            onClick={handleUploadAndProcess}
            disabled={!file || uploading || processing}
            className="btn btn-primary"
          >
            {uploading ? 'Uploading...' : processing ? 'Starting Processing...' : 'Upload and Process'}
          </button>

          <div className="mt-4 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">Processing Information</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Large files may take several minutes to process</li>
              <li>• You can leave this page; processing continues in the background</li>
              <li>• Transcripts will appear below when ready</li>
              <li>• Download both raw and formatted versions of your transcript</li>
            </ul>
          </div>
        </div>

        {/* Transcriptions List */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">Your Transcriptions</h2>

          {transcriptions.length === 0 ? (
            <p className="text-gray-600">No transcriptions yet. Upload an audio file to get started!</p>
          ) : (
            <div className="space-y-4">
              {transcriptions.map((t) => (
                <div key={t.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{t.originalFilename}</h3>
                      <p className="text-sm text-gray-600">
                        Uploaded: {new Date(t.createdAt).toLocaleString()}
                      </p>
                      {t.status === 'COMPLETED' && (
                        <p className="text-sm text-gray-600">
                          Completed: {new Date(t.updatedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>

                  {t.status === 'FAILED' && t.errorMessage && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-2">
                      Error: {t.errorMessage}
                    </div>
                  )}

                  {t.status === 'COMPLETED' && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => downloadTranscript(t.id, 'raw')}
                        className="btn btn-primary text-sm"
                      >
                        Download Raw Transcript
                      </button>
                      <button
                        onClick={() => downloadTranscript(t.id, 'final')}
                        className="btn btn-success text-sm"
                      >
                        Download Formatted Transcript
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
