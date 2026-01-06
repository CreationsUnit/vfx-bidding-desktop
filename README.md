# VFX Bidding AI - Desktop Application

A Tauri-based desktop application for automated VFX bidding and budgeting using local LLMs.

## Project Structure

```
vfx-bidding-desktop/
├── src/                          # React frontend
│   ├── components/              # UI components
│   │   ├── Chat/               # Chat interface
│   │   ├── QuickGenerate/      # Quick bid generation
│   │   ├── LiveSync/           # Live bid editor
│   │   └── Settings/           # Settings panel
│   ├── stores/                 # Zustand state management
│   ├── hooks/                  # Custom React hooks
│   ├── services/               # Tauri API wrappers
│   ├── App.tsx                 # Main app component
│   └── main.tsx                # React entry point
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── commands/           # Tauri command handlers
│   │   ├── sidecar/            # Python process management
│   │   ├── state/              # Global state
│   │   └── main.rs             # Entry point
│   ├── Cargo.toml              # Rust dependencies
│   ├── tauri.conf.json         # Tauri configuration
│   └── icons/                  # App icons
├── package.json                # Node dependencies
└── tsconfig.json               # TypeScript config
```

## Prerequisites

- Node.js 18+
- Rust 1.70+
- Python 3.10+
- Tauri CLI

## Installation

```bash
cd vfx-bidding-desktop

# Install Node dependencies
npm install

# Install Rust dependencies (via Cargo, automatic)
# Build Tauri app
npm run tauri:build
```

## Development

```bash
# Start development server (Vite + Tauri)
npm run tauri:dev

# Build for production
npm run tauri:build

# Just frontend (without Tauri)
npm run dev
```

## Features

- **Chat Interface**: Interact with the VFX bidding AI assistant
- **Quick Generate**: Upload scripts and generate bids automatically
- **Live Sync**: Real-time bid editor with Excel synchronization
- **Settings**: Configure LLM server, paths, and UI preferences

## Architecture

### Frontend (React + TypeScript)
- **State Management**: Zustand stores for bid, chat, and settings
- **UI Framework**: React with Tailwind CSS
- **Build Tool**: Vite

### Backend (Rust + Tauri 2.x)
- **Commands**: Tauri commands for script processing, chat, and bid management
- **Sidecar**: Python process manager for existing pipeline
- **State**: In-memory bid storage and session management

### Communication
- **Tauri IPC**: Commands between Rust and JavaScript
- **JSON-RPC**: Communication with Python sidecar (TODO)
- **Events**: Real-time updates via Tauri events

## TODO

- [ ] Implement Python sidecar RPC integration
- [ ] Add file drop handlers for script files
- [ ] Connect to existing VFX bidding pipeline
- [ ] Implement Excel import/export
- [ ] Add proper error handling and notifications
- [ ] Create app icons for all platforms
- [ ] Add automated tests

## License

MIT
