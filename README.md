# Sparks Connect ⚡

Sparks Connect is a high-performance, multi-tenant SSH Client platform built to manage distributed server infrastructures cleanly and securely. Built atop Tauri's native Rust execution stack with an integrated scalable NodeJS distribution dashboard. 

## Features

- **Blazing Fast SSH Emulation:** Built over `xterm.js` and securely piped natively into Rust standard processes mimicking real POSIX terminal emulation. 
- **Active Telemetry & Session Monitoring:** Constant background auditing isolates exact session IDs tracking live commands dynamically through optimized MySQL filtering via `JSON_EXTRACT`.
- **Multi-Tenant Orgs:** Granular roles mapping `owners`, `organization_user`, and standard free tier users to exact connection assets.
- **Auto-Distribution Center:** Seamlessly designed central `Download` server routing distribution assets intuitively using standard web `href` components directly linking your active compiled versions securely.

## 🛠 Project Structure

- `/app`: The Native Desktop application powered by **Tauri**, providing access to native raw SSH bridges and system tracking. 
- `/web`: The User Dashboard, providing telemetry views, historical log playbacks, access sharing boundaries, and the download distribution layer. Built with React and Vite.
- `/backend`: The Express/MySQL Server hosting telemetry logs, dynamic user access tokens, and organizational mappings securely via strict JWT extraction algorithms. 

## 🔌 Running Locally

### Backend 
Requires standard MySQL bindings mapped to `.env`:
```env
DB_HOST=127.0.0.1
DB_PORT=3306
...
```
```bash
cd backend
node server.js
```

### Web Dashboard
```bash
cd web
npm run dev
```

### App (Native Tauri Core)
```bash
cd app
npm run tauri dev
```

## 🚀 Building & Exporting Binaries

To automatically build the Tauri application and elegantly transfer those binary distribution packages straight to the Web Directory distribution core, we have specifically built an automation proxy script routing `cargo tauri build`.

Navigate into the `/app` folder and run:
```bash
npm run build:release
```

Once parsing and native cargo compilation completes, you will see output proving the binaries successfully linked seamlessly to `/web/public/client` sorted meticulously by OS type without any manual effort necessary!

## ☁️ Cross OS GitHub Automation
In `.github/workflows/release.yml` you will find standard instructions capable of instantly translating GitHub events into massive cross-native pipelines capable of spinning up AWS/cloud Mac, Linux, and Windows containers generating binary distribution payloads automatically. All tags `v*.*` auto-generate Draft Releases!
