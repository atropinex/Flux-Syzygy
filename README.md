# 🪐 Flux Syzygy

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Flux Syzygy** is a lightweight developer cockpit and workspace launcher. It aggregates scattered projects across local drives—game engines (Unreal, Unity, Cocos, Godot), monorepos, and standalone scripts—into a unified dashboard. Inspect remote upstream connectivity at a glance and fire code directly into its designated IDE with one click.

---

## ✨ Features

- **🗂️ Universal Project Detection:** Add any folder without strict schema requirements. Recognizes project topologies for Unity, Unreal Engine, Cocos Creator, Godot, Node.js, Rust, Python, and more.
- **🛰️ Git Remote Status:** Automatically detects `.git` remotes and displays active connections to GitHub, GitLab, Bitbucket, or self-hosted Git instances.
- **🎯 Per-Project IDE Routing:** Bind specific projects to specific development environments (e.g., Rider for Unity, Visual Studio for Unreal, VS Code for web, Cursor, Zed, CLion).
- **⚡ Native Performance:** Fast startup, zero background telemetry overhead, and minimal system resource consumption.
- **🔌 Configurable & Open:** Add custom detection rules, run flags, and editor execution paths via simple JSON configuration.

---

## 🚀 Tech Stack

- **Desktop Shell:** Electron / Tauri
- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS

---

## 📄 License

This project is licensed under the Apache License, Version 2.0. See the [LICENSE](LICENSE) file for details.
