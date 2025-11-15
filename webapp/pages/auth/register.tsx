import { useState, FormEvent } from 'react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import Link from 'next/link'
import axios from 'axios'

export default function Register() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const response = await axios.post('/api/auth/register', {
        email: formData.email,
        username: formData.username,
        password: formData.password,
        name: formData.name || formData.username
      })

      if (response.data.message) {
        router.push('/auth/signin?registered=true')
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto px-4 py-16">
        <div className="card">
          <h1 className="text-3xl font-bold text-center mb-6">Register</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-4 text-sm">
            <strong>Note:</strong> Your account will require admin approval before you can use the transcription service.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="label">Email *</label>
              <input
                type="email"
                name="email"
                className="input"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-4">
              <label className="label">Username *</label>
              <input
                type="text"
                name="username"
                className="input"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-4">
              <label className="label">Full Name (optional)</label>
              <input
                type="text"
                name="name"
                className="input"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="mb-4">
              <label className="label">Password *</label>
              <input
                type="password"
                name="password"
                className="input"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            <div className="mb-6">
              <label className="label">Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                className="input"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  )
}
