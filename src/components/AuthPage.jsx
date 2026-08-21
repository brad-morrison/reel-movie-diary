import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { IconChart, IconCheck, IconCloud, IconCrown, IconFilm, IconGoogle, IconSparkle, IconStar } from '../lib/icons.jsx'

function authMessage(error) {
  const code = error?.code || ''
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'That email and password combination isn’t right.'
  if (code.includes('email-already-in-use')) return 'An account already exists for that email. Try signing in instead.'
  if (code.includes('weak-password')) return 'Choose a stronger password with at least 6 characters.'
  if (code.includes('invalid-email')) return 'Enter a valid email address.'
  if (code.includes('popup-closed')) return 'The Google sign-in window was closed before finishing.'
  if (code.includes('operation-not-allowed')) return 'This sign-in method needs to be enabled in Firebase Authentication.'
  if (code.includes('too-many-requests')) return 'Too many attempts. Take a short break and try again.'
  return error?.message || 'Something went wrong. Please try again.'
}

export default function AuthPage({ onGoogle, onSignIn, onCreateAccount, onResetPassword, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resetSent, setResetSent] = useState(false)

  function changeMode(next) {
    setMode(next)
    setError('')
    setResetSent(false)
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (mode === 'create' && password !== confirmPassword) { setError('Those passwords don’t match.'); return }
    setBusy(true)
    try {
      if (mode === 'create') await onCreateAccount(name, email.trim(), password)
      else if (mode === 'reset') { await onResetPassword(email.trim()); setResetSent(true) }
      else await onSignIn(email.trim(), password)
    } catch (err) {
      setError(authMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function googleSignIn() {
    setError('')
    setBusy(true)
    try { await onGoogle() }
    catch (err) { setError(authMessage(err)) }
    finally { setBusy(false) }
  }

  return (
    <main className="auth-page">
      <section className="auth-story">
        <div className="auth-story-glow" />
        <motion.div className="auth-brand" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <span className="brand-mark"><IconFilm size={22} color="#14110a" /></span>
          <span className="brand-name">Reel<span className="dot">.</span></span>
        </motion.div>
        <motion.div className="auth-story-copy" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>
          <span className="auth-eyebrow"><IconSparkle size={14} /> Your life in film</span>
          <h1>Every story you watch,<br /><em>beautifully remembered.</em></h1>
          <p>Build your personal movie diary, keep watch lists for every occasion, and discover what to watch next.</p>
          <div className="auth-feature-grid">
            <div><IconFilm size={18} /><span><strong>Keep your diary</strong><small>Log every film and rewatch</small></span></div>
            <div><IconCrown size={18} /><span><strong>Curate your Top 20</strong><small>Your favourites, ranked</small></span></div>
            <div><IconChart size={18} /><span><strong>See your story</strong><small>Personal viewing statistics</small></span></div>
            <div><IconCloud size={18} /><span><strong>Always with you</strong><small>Private cloud sync</small></span></div>
          </div>
        </motion.div>
        <div className="auth-poster-stack" aria-hidden>
          <motion.div animate={{ y: [0, -10, 0], rotate: [-7, -5, -7] }} transition={{ duration: 7, repeat: Infinity }}><IconStar size={30} /></motion.div>
          <motion.div animate={{ y: [0, 9, 0], rotate: [6, 4, 6] }} transition={{ duration: 8, repeat: Infinity }}><IconFilm size={34} /></motion.div>
          <motion.div animate={{ y: [0, -7, 0], rotate: [-1, 1, -1] }} transition={{ duration: 6.5, repeat: Infinity }}><IconCrown size={32} /></motion.div>
        </div>
        <p className="auth-story-foot">Private by design · Synced across your devices</p>
      </section>

      <section className="auth-entry">
        <motion.div className="auth-card" initial={{ opacity: 0, x: 25 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .5, ease: [0.22, 1, 0.36, 1] }}>
          <div className="auth-mobile-brand"><span className="brand-mark"><IconFilm size={20} color="#14110a" /></span><span className="brand-name">Reel<span className="dot">.</span></span></div>
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0, x: mode === 'create' ? 12 : -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: .22 }}>
              <span className="auth-form-kicker">{mode === 'create' ? 'Start your diary' : mode === 'reset' ? 'Account recovery' : 'Welcome back'}</span>
              <h2>{mode === 'create' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to Reel'}</h2>
              <p className="auth-form-intro">{mode === 'create' ? 'Your next great watch deserves a place to live.' : mode === 'reset' ? 'We’ll send a reset link to your inbox.' : 'Your diary and watch lists are waiting.'}</p>

              {mode !== 'reset' && <button className="auth-google" type="button" onClick={googleSignIn} disabled={busy}><IconGoogle size={19} /> Continue with Google</button>}
              {mode !== 'reset' && <div className="auth-divider"><span>or continue with email</span></div>}

              <form className="auth-form" onSubmit={submit}>
                {mode === 'create' && <div className="field"><label>Your name</label><input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="How should we call you?" required /></div>}
                <div className="field"><label>Email address</label><input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></div>
                {mode !== 'reset' && <div className="field"><div className="auth-label-row"><label>Password</label>{mode === 'signin' && <button type="button" onClick={() => changeMode('reset')}>Forgot password?</button>}</div><input type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'create' ? 'At least 6 characters' : 'Your password'} minLength={6} required /></div>}
                {mode === 'create' && <div className="field"><label>Confirm password</label><input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Type it once more" minLength={6} required /></div>}

                {error && <motion.div className="auth-message error" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>{error}</motion.div>}
                {resetSent && <motion.div className="auth-message success" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}><IconCheck size={16} /> Reset link sent. Check your inbox.</motion.div>}
                {!resetSent && <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Just a moment…' : mode === 'create' ? 'Create my account' : mode === 'reset' ? 'Send reset link' : 'Sign in'}</button>}
              </form>

              <p className="auth-switch">
                {mode === 'signin' && <>New to Reel? <button onClick={() => changeMode('create')}>Create an account</button></>}
                {mode === 'create' && <>Already have an account? <button onClick={() => changeMode('signin')}>Sign in</button></>}
                {mode === 'reset' && <button onClick={() => changeMode('signin')}>← Back to sign in</button>}
              </p>
              {mode === 'create' && <p className="auth-terms">By creating an account, you agree to keep excellent taste entirely optional.</p>}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </section>
    </main>
  )
}

export function AuthLoading() {
  return <div className="auth-loading"><span className="brand-mark"><IconFilm size={22} color="#14110a" /></span><span className="brand-name">Reel<span className="dot">.</span></span><i /></div>
}
