import { ReactNode } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold">
                Audio Transcription
              </Link>
              {session && (
                <>
                  <Link href="/transcribe" className="hover:text-blue-200">
                    Transcribe
                  </Link>
                  {(session.user as any).role === 'ADMIN' && (
                    <Link href="/admin" className="hover:text-blue-200">
                      Admin
                    </Link>
                  )}
                </>
              )}
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <>
                  <span className="text-sm">
                    {session.user?.name || session.user?.email}
                    {(session.user as any).role === 'ADMIN' && (
                      <span className="ml-2 px-2 py-1 bg-yellow-500 text-xs rounded">
                        ADMIN
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => signOut({ callbackUrl: '/' })}
                    className="btn btn-secondary text-sm"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="hover:text-blue-200">
                    Sign In
                  </Link>
                  <Link href="/auth/register" className="btn btn-secondary text-sm">
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        {children}
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2025 Audio Transcription System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
