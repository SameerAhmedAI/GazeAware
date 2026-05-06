import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, Loader2 } from 'lucide-react'
import { api } from '../services/api'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const [userFocus, setUserFocus]   = useState(false)
  const [passFocus, setPassFocus]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.login(username, password)
      if (res.token) {
        localStorage.setItem('gazeaware_token', res.token)
        localStorage.setItem('gazeaware_user', JSON.stringify({
          user_id:  res.user_id,
          username: res.username,
        }))
        navigate('/dashboard')
      } else {
        setError(res.detail || 'Login failed. Please try again.')
      }
    } catch {
      setError('Network error. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Card */}
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: 'var(--bg-surface)',
        borderRadius: '20px',
        border: '1px solid var(--border-subtle)',
        padding: '40px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        animation: 'fade-in-up 0.4s ease-out both',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '12px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.06))',
            border: '1px solid rgba(16,185,129,0.3)',
            boxShadow: '0 0 24px rgba(16,185,129,0.12)',
          }}>
            <Eye size={22} style={{ color: 'var(--zone-green)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-syne)',
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: '4px',
            }}>
              Welcome back
            </div>
            <div style={{
              fontFamily: 'var(--font-dm)',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}>
              Sign in to your GazeAware account
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Username */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontFamily: 'var(--font-dm)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}>
              USERNAME
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onFocus={() => setUserFocus(true)}
              onBlur={() => setUserFocus(false)}
              required
              placeholder="Enter your username"
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: `1px solid ${userFocus ? 'var(--border-active)' : 'var(--border-default)'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-dm)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.18s',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontFamily: 'var(--font-dm)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              letterSpacing: '0.04em',
            }}>
              PASSWORD
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onFocus={() => setPassFocus(true)}
              onBlur={() => setPassFocus(false)}
              required
              placeholder="Enter your password"
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: `1px solid ${passFocus ? 'var(--border-active)' : 'var(--border-default)'}`,
                borderRadius: '12px',
                padding: '12px 16px',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-dm)',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.18s',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              fontFamily: 'var(--font-dm)',
              fontSize: '13px',
              color: 'var(--zone-red)',
              background: 'var(--zone-red-bg)',
              border: '1px solid var(--zone-red-border)',
              borderRadius: '10px',
              padding: '10px 14px',
              animation: 'fade-in 0.2s ease-out both',
            }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px 20px',
              background: loading
                ? 'rgba(232,232,248,0.06)'
                : 'var(--accent)',
              color: loading ? 'var(--text-muted)' : '#09090f',
              border: 'none',
              borderRadius: '12px',
              fontFamily: 'var(--font-dm)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.18s, opacity 0.18s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '4px',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin-ring 0.8s linear infinite' }} />
                Signing in…
              </>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Register link */}
        <div style={{
          marginTop: '24px',
          textAlign: 'center',
          fontFamily: 'var(--font-dm)',
          fontSize: '13px',
          color: 'var(--text-muted)',
        }}>
          Don't have an account?{' '}
          <Link
            to="/register"
            style={{
              color: 'var(--zone-green)',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}
