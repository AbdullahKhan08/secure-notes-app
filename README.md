# Secure Notes (Electron + React)

A minimal, local-first notes app for macOS with optional password-locking per note.

## Requirements

- macOS
- Node.js 18+ and npm

## Install

git clone <https://github.com/AbdullahKhan08/secure-notes-app>
cd secure-notes-app
npm install
Environment
Create a .env file in the project root with a 32-byte base64 key:

# .env

SECRET_KEY=<<paste output of: openssl rand -base64 32 >>
A sample is in .env.example. This key encrypts/decrypts locked notes.

Development
bash
Copy
Edit
npm run dev
Starts React dev server and compiles Electron main/preload.

App launches pointing to http://localhost:3000.

Production build (local DMG/ZIP)
bash
Copy
Edit
npm run dist:mac
Artifacts are placed in release/.
If macOS blocks an unsigned build, right-click the app → Open.

Publish (auto-updates)
See PUBLISHING.md for creating GitHub Releases with electron-builder and enabling auto-updates.

Project structure (high-level)
bash
Copy
Edit
/src # React app (renderer)
/public # Static assets (splash.html, icons)
/dist # Compiled Electron main/preload (built)
/renderer # Production React build (generated)
/build # electron-builder resources (icns, entitlements)
/release # DMG/ZIP outputs (generated)
main.ts # Electron main process (TypeScript)
preload.ts # Electron preload (TypeScript)
types.ts # Shared app types
Assets
App icon: build/icons/SecureNotes.icns

Splash screen: public/splash.html (copied during build)

Header/app SVG: public/icons/secure-notes-logo.svg

License
MIT — see LICENSE
