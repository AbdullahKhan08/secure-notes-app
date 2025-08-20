// src/softUpdater.ts
type GHRelease = {
  tag_name?: string
  name?: string
  html_url?: string
}

function semverCompare(a: string, b: string): number {
  const ap = a.split('.').map((n) => parseInt(n, 10) || 0)
  const bp = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < 3; i++) {
    if ((ap[i] || 0) > (bp[i] || 0)) return 1
    if ((ap[i] || 0) < (bp[i] || 0)) return -1
  }
  return 0
}

export async function checkForUpdateAndPrompt(options?: {
  owner?: string
  repo?: string
  onFound?: (latestVer: string, currentVer: string, url: string) => void
}) {
  const owner = options?.owner ?? 'AbdullahKhan08'
  const repo = options?.repo ?? 'secure-notes-app'

  try {
    const r = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-cache',
      }
    )
    if (!r.ok) return
    const latest: GHRelease = await r.json()
    const latestVer = (latest.tag_name || latest.name || '').replace(/^v/, '')
    if (!latestVer) return
    const currentVer = await window.appAPI.getVersion()
    const relUrl =
      latest.html_url || `https://github.com/${owner}/${repo}/releases/latest`

    if (semverCompare(latestVer, currentVer) > 0) {
      if (options?.onFound) {
        options.onFound(latestVer, currentVer, relUrl)
        return
      }
      // fallback UI
      const go = window.confirm(
        `A new version ${latestVer} is available (you have ${currentVer}).\n\nOpen the download page?`
      )
      if (go) window.appAPI.openExternal(relUrl)
    }
  } catch {
    // ignore network errors
  }
}
