import { useEffect, useRef } from 'react'

/**
 * Sets up idle auto-lock. Resets on activity, fires on:
 * - blur
 * - visibility hidden
 * - idle timeout
 */
export default function useIdleLock(timeoutMs: number, onIdle: () => void) {
  const cbRef = useRef(onIdle)
  useEffect(() => {
    cbRef.current = onIdle
  }, [onIdle])

  useEffect(() => {
    let t: number | null = null
    const reset = () => {
      if (t) window.clearTimeout(t)
      t = window.setTimeout(() => cbRef.current(), timeoutMs)
    }
    const onActivity = () => reset()
    const onVisibility = () => (document.hidden ? cbRef.current() : reset())
    const onBlur = () => cbRef.current()

    reset()
    const passiveOpts: AddEventListenerOptions = { passive: true }
    window.addEventListener('mousemove', onActivity, passiveOpts)
    window.addEventListener('pointerdown', onActivity, passiveOpts)
    window.addEventListener('keydown', onActivity)
    window.addEventListener('mousedown', onActivity)
    window.addEventListener('scroll', onActivity, passiveOpts)
    window.addEventListener('focus', onActivity)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (t) window.clearTimeout(t)
      window.removeEventListener('mousemove', onActivity, passiveOpts)
      window.removeEventListener('pointerdown', onActivity, passiveOpts)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('mousedown', onActivity)
      window.removeEventListener('scroll', onActivity, passiveOpts)
      window.removeEventListener('focus', onActivity)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [timeoutMs])
}
