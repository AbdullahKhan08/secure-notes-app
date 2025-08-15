import React, { useEffect, useRef, useId, useCallback } from 'react'
import '../styles.css'

interface ConfirmModalProps {
  isOpen: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onClose: () => void
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onClose,
}) => {
  const headingId = useId()
  const descId = useId()
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen) requestAnimationFrame(() => confirmRef.current?.focus())
  }, [isOpen])

  const handleSubmit = useCallback(
    (e?: React.FormEvent) => {
      e?.preventDefault()
      onConfirm()
    },
    [onConfirm]
  )

  if (!isOpen) return null

  return (
    <div
      className="modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      aria-describedby={descId}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 id={headingId}>{title}</h3>
        <p id={descId} className="modal-message">
          {message}
        </p>
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="actions">
            <button type="button" className="btn" onClick={onClose}>
              {cancelText}
            </button>
            <button
              ref={confirmRef}
              type="submit"
              title={confirmText}
              className="btn danger"
            >
              {confirmText}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ConfirmModal
