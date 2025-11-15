import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '@/components/Layout'
import axios from 'axios'

interface User {
  id: string
  email: string
  username: string
  name: string | null
  role: 'USER' | 'ADMIN'
  approved: boolean
  createdAt: string
  _count: {
    transcriptions: number
  }
}

export default function Admin() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    } else if (session && (session.user as any).role !== 'ADMIN') {
      router.push('/')
    } else if (session) {
      fetchUsers()
    }
  }, [status, session, router])

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/api/admin/users')
      setUsers(response.data)
      setLoading(false)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users')
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      await axios.patch('/api/admin/users', {
        userId,
        action: 'approve'
      })
      setSuccess('User approved successfully')
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve user')
    }
  }

  const handleUnapprove = async (userId: string) => {
    try {
      await axios.patch('/api/admin/users', {
        userId,
        action: 'unapprove'
      })
      setSuccess('User approval revoked')
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke approval')
    }
  }

  const handleDelete = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      return
    }

    try {
      await axios.patch('/api/admin/users', {
        userId,
        action: 'delete'
      })
      setSuccess('User deleted successfully')
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user')
    }
  }

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN'

    if (newRole === 'ADMIN' && !confirm(`Are you sure you want to make this user an ADMIN?`)) {
      return
    }

    try {
      await axios.patch('/api/admin/users', {
        userId,
        action: 'update',
        role: newRole
      })
      setSuccess(`User role updated to ${newRole}`)
      fetchUsers()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update role')
    }
  }

  if (status === 'loading' || loading) {
    return <Layout><div className="text-center py-12">Loading...</div></Layout>
  }

  if (!session || (session.user as any).role !== 'ADMIN') {
    return null
  }

  const pendingUsers = users.filter(u => !u.approved)
  const approvedUsers = users.filter(u => u.approved)

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

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

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="card bg-blue-50">
            <div className="text-3xl font-bold text-blue-600">{users.length}</div>
            <div className="text-gray-600">Total Users</div>
          </div>
          <div className="card bg-green-50">
            <div className="text-3xl font-bold text-green-600">{approvedUsers.length}</div>
            <div className="text-gray-600">Approved Users</div>
          </div>
          <div className="card bg-yellow-50">
            <div className="text-3xl font-bold text-yellow-600">{pendingUsers.length}</div>
            <div className="text-gray-600">Pending Approval</div>
          </div>
          <div className="card bg-purple-50">
            <div className="text-3xl font-bold text-purple-600">
              {users.filter(u => u.role === 'ADMIN').length}
            </div>
            <div className="text-gray-600">Admins</div>
          </div>
        </div>

        {/* Pending Users */}
        {pendingUsers.length > 0 && (
          <div className="card mb-8">
            <h2 className="text-2xl font-bold mb-4 text-yellow-700">
              Pending Approval ({pendingUsers.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left">Username</th>
                    <th className="px-4 py-2 text-left">Email</th>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Registered</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">{user.username}</td>
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">{user.name || '-'}</td>
                      <td className="px-4 py-3">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="btn btn-success text-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="btn btn-danger text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Approved Users */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-4">
            Approved Users ({approvedUsers.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Username</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Transcriptions</th>
                  <th className="px-4 py-2 text-left">Registered</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {user.username}
                      {user.id === (session.user as any).id && (
                        <span className="ml-2 text-xs text-blue-600">(You)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">{user.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        user.role === 'ADMIN' ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">{user._count.transcriptions}</td>
                    <td className="px-4 py-3">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {user.id !== (session.user as any).id && (
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleToggleRole(user.id, user.role)}
                            className="btn btn-secondary text-xs"
                          >
                            {user.role === 'ADMIN' ? 'Make User' : 'Make Admin'}
                          </button>
                          <button
                            onClick={() => handleUnapprove(user.id)}
                            className="btn btn-secondary text-xs"
                          >
                            Unapprove
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.username)}
                            className="btn btn-danger text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  )
}
