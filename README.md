# SparkConnect

A secure SSH host manager with authentication, host management, and multi-session support.

---

## Tech Stack

* Frontend: React
* Backend: Node.js + Express
* Database: MySQL
* Optional Desktop: Tauri

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/arabhossain/spark-connect.git
cd sparkconnect
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Start server:

```bash
node server.js
```

Backend runs on:

```
http://localhost:4000
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run tauri:dev
```

Frontend runs on:

```
http://localhost:5173
```

---

### ️ 4. Environment Variables

Copy the example file and configure your environment:

```bash
cp .env.example .env
```

Then update the values inside `.env` with your own database credentials and secrets:

* DB connection details
* JWT secret
* Encryption secret

## 🦀 Installing Rust (Mac & Ubuntu)

You need Rust for the Tauri backend.

---

# 🍎 macOS

### 1. Install via official installer

```bash id="mac_rust_install"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 2. Follow prompts

* Choose default installation (press `1`)

### 3. Load Rust into current shell

```bash id="mac_rust_env"
source $HOME/.cargo/env
```

### 4. Verify installation

```bash id="mac_rust_verify"
rustc --version
cargo --version
```

---

# 🐧 Ubuntu / Linux

### 1. Install required dependencies

```bash id="ubuntu_deps"
sudo apt update
sudo apt install -y curl build-essential
```

### 2. Install Rust

```bash id="ubuntu_rust_install"
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Load Rust environment

```bash id="ubuntu_env"
source $HOME/.cargo/env
```

### 4. Verify installation

```bash id="ubuntu_verify"
rustc --version
cargo --version
```

---

## After Installation (Both)

Restart your terminal or run:

```bash id="reload_shell"
source ~/.cargo/env
```

---
