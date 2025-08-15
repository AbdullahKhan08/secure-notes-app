// components/PasswordModal.tsx
import React, { useEffect, useRef, useId, useCallback, useState } from 'react'
import '../styles.css'

interface PasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (password: string) => void
  action: 'lock' | 'unlock'
  title?: string
}

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
          />
          <div
            // style={{
            //   display: 'flex',
            //   alignItems: 'center',
            //   gap: 8,
            //   marginTop: 8,
            // }}
            className="pw-visibility"
          >
            <label
              // style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              className="pw-toggle"
            >
              <input
                type="checkbox"
                checked={showPw}
                onChange={(e) => setShowPw(e.target.checked)}
              />
              Show password
            </label>
          </div>
          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn primary"
              disabled={!password.trim()}
              aria-disabled={!password.trim()}
              // onClick={handleSubmit}
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
