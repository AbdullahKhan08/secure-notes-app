import { useEffect } from 'react'

type Options = {
  interceptKeys?: boolean
  onIntercept?: () => void
}

export default function useUnsavedChangesGuard(
  enabled: boolean,
  { interceptKeys = false, onIntercept }: Options = {}
) {
  useEffect(() => {
    if (!enabled) return

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return ''
    }

    window.addEventListener('beforeunload', beforeUnload)

    let keydown: ((e: KeyboardEvent) => void) | undefined
    if (interceptKeys) {
      keydown = (e: KeyboardEvent) => {
        const isR = e.key === 'r' || e.key === 'R'
        const isF5 = e.key === 'F5' || e.code === 'F5'
        const isBrowserReload =
          e.key === 'BrowserRefresh' || e.key === 'Refresh'
        const isReload =
          isF5 || isBrowserReload || (isR && (e.metaKey || e.ctrlKey)) // also catches Cmd/Ctrl+Shift+R

        const isCloseWin = e.metaKey && (e.key === 'w' || e.key === 'W')

        if (isReload || isCloseWin) {
          // stop Chromium's default reload
          e.preventDefault()
          e.stopPropagation()
          onIntercept?.()
        }
      }
      // capture=true makes sure we beat other handlers / menu accelerators
      window.addEventListener('keydown', keydown, true)
    }

    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      if (keydown) window.removeEventListener('keydown', keydown, true)
    }
  }, [enabled, interceptKeys, onIntercept])
}
