import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'
const THEME_KEY = 'theme'

const readStoredMode = (): ThemeMode => {
  const raw = localStorage.getItem(THEME_KEY)
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

const systemPrefers = (): 'light' | 'dark' =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

/**
 * Manages app theme:
 * - data-theme="light|dark" when forced
 * - no data-theme attr in "system" mode
 * - also sets color-scheme to keep native controls consistent
 */
export default function useTheme() {
  const [mode, setMode] = useState<ThemeMode>(readStoredMode)

  const apply = useCallback((m: ThemeMode) => {
    const root = document.documentElement
    if (m === 'system') {
      root.removeAttribute('data-theme')
      // keep UA controls in sync with the OS
      root.style.colorScheme = systemPrefers()
    } else {
      root.setAttribute('data-theme', m)
      // lock UA controls to the forced theme
      root.style.colorScheme = m
    }
  }, [])

  useEffect(() => {
    apply(mode)
    localStorage.setItem(THEME_KEY, mode)
  }, [mode, apply])

  // Re-apply when OS theme changes *only* in system mode
  useEffect(() => {
    if (mode !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => apply('system')
    // cross-browser
    mql.addEventListener?.('change', onChange)

    mql.addListener?.(onChange)
    return () => {
      mql.removeEventListener?.('change', onChange)
      mql.removeListener?.(onChange)
    }
  }, [mode, apply])

  return { mode, setMode }
}
