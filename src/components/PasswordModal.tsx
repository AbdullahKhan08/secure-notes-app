import React, { useEffect, useRef, useId, useCallback, useState } from 'react'
import '../styles.css'

interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (password: string) => void
  action: 'lock' | 'unlock'
  title?: string
}

const scorePassword = (pwd: string) => {
  if (!pwd) return 0
  let score = 0
  const len = pwd.length
  const classes =
    (/[a-z]/.test(pwd) ? 1 : 0) +
    (/[A-Z]/.test(pwd) ? 1 : 0) +
    (/[0-9]/.test(pwd) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(pwd) ? 1 : 0)

  if (len >= 8) score++
  if (len >= 12) score++
  if (classes >= 3) score++
  if (classes === 4) score++
  return Math.min(4, score)
}

const labelForScore = (s: number) =>
  ['Too short', 'Weak', 'Okay', 'Strong', 'Very strong'][s]

const PasswordModal: React.FC<PasswordModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  action,
  title,
}) => {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const headingId = useId()

  useEffect(() => {
    if (!isOpen) return
    setPassword('')
    setShowPw(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [isOpen])

  // Prevent background scroll while open
  useEffect(() => {
    if (!isOpen) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleSubmit = useCallback(() => {
    const pwd = password.trim()
    if (!pwd) return
    onSubmit(pwd)
    setPassword('')
  }, [password, onSubmit])

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') onClose()
  }

  if (!isOpen) return null

  const defaultHeading =
    action === 'lock' ? 'Set Lock Password' : 'Enter Unlock Password'

  const submitLabel = action === 'unlock' ? 'Unlock' : 'Set password'

  const score = action === 'lock' ? scorePassword(password) : 0

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 id={headingId}>{title ?? defaultHeading}</h3>
        <form
          className="modal-form"
          onSubmit={(e) => {
            e.preventDefault()
            handleSubmit()
          }}
        >
          <input
            ref={inputRef}
            type={showPw ? 'text' : 'password'}
            autoFocus
            className="password-input"
            name={action === 'lock' ? 'new-password' : 'current-password'}
            autoComplete={
              action === 'lock' ? 'new-password' : 'current-password'
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            onKeyDown={handleKeyDown}
            aria-label="Password"
            aria-describedby={
              action === 'lock' ? 'pw-strength-label' : undefined
            }
          />
          <div className="pw-visibility">
            <label className="pw-toggle">
              <input
                type="checkbox"
                checked={showPw}
                onChange={(e) => setShowPw(e.target.checked)}
              />
              Show password
            </label>
          </div>

          {action === 'lock' && (
            <div className="pw-strength" aria-live="polite">
              <div className={`pw-bar s${score}`} aria-hidden="true" />
              <div id="pw-strength-label" className="pw-strength-label">
                {labelForScore(score)}
              </div>
            </div>
          )}

          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={!password.trim()}
              aria-disabled={!password.trim()}
              title={submitLabel}
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PasswordModal
