# Publishing (macOS) & Auto-Updates

This project uses `electron-builder` + GitHub Releases. Users who install a build from a Release will receive auto-updates.

## One-time setup

1. Create a **Personal Access Token** (classic) with **repo** scope:

   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → New token
   - (Optional) Set an expiration and rotate periodically.

2. In the terminal **where you run the publish**, export it:
   ```bash
   export GH_TOKEN=YOUR_TOKEN
   ```
