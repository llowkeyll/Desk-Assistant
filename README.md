# Desk Assistant

Desk Assistant is a desktop helper application built with Tauri, Vite, and TypeScript. It provides a small, cross-platform UI for desktop productivity features.

**Product Name:** Desk Assistant
**Version:** 0.1.0

---

## Quick links

- Built Windows executable: `src-tauri/target/release/desk-assistant.exe`
- Project root: this repository

---

## Prerequisites

- Node.js (LTS recommended) — for example, Node 18+.
- Rust toolchain (stable) and `cargo`.
- Tauri CLI (installed via `cargo` or `npm` — instructions below).

On Windows, you can install prerequisites with:

```powershell
# Install Node (if you use nvm-windows, prefer that)
# choco install nodejs-lts

# Install Rust (official installer)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Tauri CLI (optional; you can also run via npm scripts)
cargo install tauri-cli --locked
```

---

## Install dependencies

Run the following in the project root:

```bash
# install npm dependencies
npm install
```

---

## Development

Start frontend dev server (Vite):

```bash
npm run dev
```

Start Tauri in dev mode (launches the desktop app with the dev frontend):

```bash
# either
npm run tauri dev
# or (if you have tauri CLI globally)
# tauri dev
```

---

## Build (produce release binary)

1. Build the frontend:

```bash
npm run build
```

2. Build the Tauri app / create a release:

```bash
# from project root
npm run tauri build
# or if calling tauri directly:
# tauri build
```

After a successful build, the Windows executable can be found at:

```
src-tauri/target/release/desk-assistant.exe
```

Depending on Tauri bundle configuration you may also find additional installers/bundles under `src-tauri/target/release/bundle/`.

---

## Running the bundled executable (Windows)

Locate `src-tauri/target/release/desk-assistant.exe` and double-click it, or run from PowerShell:

```powershell
Start-Process .\src-tauri\target\release\desk-assistant.exe
```

---

## Dependencies

Front-end / runtime dependencies (from `package.json`):

- `@tauri-apps/api` ^2.10.1
- `@tauri-apps/plugin-dialog` ^2.6.0
- `@tauri-apps/plugin-fs` ^2.4.5
- `@tauri-apps/plugin-opener` ^2
- `@tauri-apps/plugin-os` ^2.3.2
- `@tauri-apps/plugin-shell` ^2.3.5
- `@tauri-apps/plugin-window-state` ^2.4.1
- `lucide` ^1.7.0

Dev dependencies:

- `@tauri-apps/cli` ^2
- `typescript` ~5.6.2
- `vite` ^6.0.3

System-level dependencies:

- Rust toolchain (for building native Tauri binaries)
- Windows build toolchain (on Windows, Visual Studio Build Tools may be needed)

---

## Contributing

Contributions are welcome. Please open issues or pull requests on the GitHub repository.

When contributing, keep the original attribution section intact (see License / Attribution below).

---

## Attribution & Redistribution

You requested that your name be prominently displayed when others use, distribute, or modify this project. The repository includes an MIT License file with a placeholder for the original author name. By default, the code is licensed under the MIT License below — which requires preservation of the copyright notice.

Please replace the placeholder in `LICENSE` with your preferred author name (or let me know the exact name and I will update it for you).

If you prefer a different license or a stronger "attribution required" clause, tell me which one and I will update the files.

---

## Where to find the executable in this workspace

If someone clones this repo, they will not initially have a built `.exe`. The currently-built binary (from local builds) lives at:

```
src-tauri/target/release/desk-assistant.exe
```

I cannot attach binary files directly in the repository via this README. To publish a downloadable `.exe` for the public, create a GitHub Release and upload the `desk-assistant.exe` there, or add a `releases/` folder with the binary (note: adding binaries to repo history increases repo size).

---

## Troubleshooting

- If `tauri build` fails, ensure your Rust toolchain is up-to-date: `rustup update`.
- On Windows, ensure you have the Visual Studio Build Tools (`cl.exe`) or the required MSVC toolchain installed for building native components.
- If frontend build errors appear, run `npm run build` and inspect Vite output for errors.

---

## Contact / Author

Original Author: [YOUR NAME HERE]

Replace the placeholder above with your name to satisfy the attribution requirement.

---

If you'd like, I can:

- Insert your real name into `README.md` and `LICENSE` now.
- Create a repository Release draft with the `.exe` (I can guide you how to upload it).

Happy to do the next step — tell me which option you prefer.# Tauri + Vanilla TS

This template should help get you started developing with Tauri in vanilla HTML, CSS and Typescript.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
