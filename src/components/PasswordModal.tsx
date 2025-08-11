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
  const inputRef = useRef<HTMLInputElement>(null)
  const headingId = useId()

  useEffect(() => {
    if (!isOpen) return
    setPassword('')
    requestAnimationFrame(() => inputRef.current?.focus())
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
        <input
          ref={inputRef}
          type="password"
          autoFocus
          autoComplete={action === 'lock' ? 'new-password' : 'current-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          onKeyDown={handleKeyDown}
        />
        <div className="actions">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn primary"
            disabled={!password.trim()}
            aria-disabled={!password.trim()}
            onClick={handleSubmit}
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}

export default PasswordModal
