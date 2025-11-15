import Layout from '@/components/Layout'
import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function Home() {
  const { data: session } = useSession()

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Audio Transcription with Speaker Identification
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Advanced AI-powered transcription service with automatic speaker diarization
          </p>
          {!session && (
            <div className="space-x-4">
              <Link href="/auth/register" className="btn btn-primary text-lg">
                Get Started
              </Link>
              <Link href="/auth/signin" className="btn btn-secondary text-lg">
                Sign In
              </Link>
            </div>
          )}
          {session && (
            <Link href="/transcribe" className="btn btn-primary text-lg">
              Start Transcribing
            </Link>
          )}
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="card text-center">
            <div className="text-4xl mb-4">🎤</div>
            <h3 className="text-xl font-bold mb-2">Speaker Diarization</h3>
            <p className="text-gray-600">
              Automatically identifies and labels different speakers in your audio recordings
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🌍</div>
            <h3 className="text-xl font-bold mb-2">Multi-Language Support</h3>
            <p className="text-gray-600">
              Supports multiple languages including English and Spanish with automatic detection
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-2">High Accuracy</h3>
            <p className="text-gray-600">
              Powered by WhisperX and PyAnnote AI models for industry-leading accuracy
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="card mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h4 className="font-semibold mb-2">Upload Audio</h4>
              <p className="text-sm text-gray-600">Upload your audio file (WAV, MP3, or MP4)</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">2</span>
              </div>
              <h4 className="font-semibold mb-2">AI Processing</h4>
              <p className="text-sm text-gray-600">Our AI analyzes and transcribes the audio</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">3</span>
              </div>
              <h4 className="font-semibold mb-2">Speaker ID</h4>
              <p className="text-sm text-gray-600">Different speakers are automatically identified</p>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 font-bold">4</span>
              </div>
              <h4 className="font-semibold mb-2">Download Transcript</h4>
              <p className="text-sm text-gray-600">Get your formatted transcript with timestamps</p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="card bg-gray-50">
          <h2 className="text-3xl font-bold mb-6">Technical Details</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h3 className="font-semibold text-lg mb-2">🤖 AI Models</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>WhisperX (large-v2)</strong>: State-of-the-art speech recognition</li>
                <li><strong>PyAnnote Audio 3.0</strong>: Advanced speaker diarization</li>
                <li><strong>Language Detection</strong>: Automatic language identification per segment</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">📝 Output Formats</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li><strong>Raw Transcript</strong>: Complete transcript with original speaker IDs and timestamps</li>
                <li><strong>Conversation Format</strong>: Formatted dialogue with numbered speakers and language tags</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">⚙️ Processing Pipeline</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Audio chunking for efficient processing</li>
                <li>Automatic language detection</li>
                <li>Word-level timestamp alignment</li>
                <li>Speaker overlap detection and resolution</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">💡 Use Cases</h3>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Meeting transcription and minutes generation</li>
                <li>Interview documentation</li>
                <li>Podcast and video content transcription</li>
                <li>Multi-speaker conference recordings</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ChatGPT Integration Tip */}
        <div className="card bg-blue-50 border-2 border-blue-200 mt-8">
          <h3 className="text-xl font-bold mb-3 text-blue-900">💡 Pro Tip: Generate Meeting Minutes</h3>
          <p className="text-gray-700">
            After downloading your transcript, you can upload it to ChatGPT with a prompt like:
            <span className="block mt-2 p-3 bg-white rounded border border-blue-200 font-mono text-sm">
              "Please create professional meeting minutes from this transcript, including key discussion points, decisions made, and action items."
            </span>
          </p>
        </div>
      </div>
    </Layout>
  )
}
