# 🔐 Vaultify

**Vaultify** is a premium, local-first password manager designed for simplicity, security, and a superior user experience. Experience a modern webapp-like interface with glassmorphism, smooth animations, and a focus on both desktop and mobile accessibility.

![Vaultify Hero](https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200&h=600)

## ✨ Features

- **🛡️ Military-Grade Security**: Uses AES-GCM encryption for vault data and PBKDF2 for key derivation. Your Master Password is never stored.
- **📱 Mobile-First Design**: Optimized for touch with a responsive bottom navigation bar on mobile and a side rail on desktop.
- **🧪 Modern Webapp Architecture**: Modular views for your Vault, Password Generator, Security Audit, and Settings.
- **🎨 Premium Aesthetics**: 
  - **Glassmorphism**: A sleek, translucent UI that feels lightweight and modern.
  - **Theme Engine**: Choose from high-end accent color profiles (Emerald, Cyber Blue, Ruby).
  - **Mechanical Experience**: Satisfying synthesized sounds and mechanical "spring" animations.
- **📊 Security Audit**: A built-in health dashboard that flags weak, reused, or old passwords in real-time.
- **⚡ Productivity First**:
  - **Global Shortcuts**: Press `/` to search or `N` to add a new entry from anywhere.
  - **Smart Generator**: Create high-entropy passwords with a cryptographically secure RNG.
- **⏲️ Smart Auto-Lock**: Configurable inactivity timer to keep your vault secure automatically.
- **📤 Data Portability**: Import from JSON/CSV and export secure backups locally.

## 🚀 Getting Started

Vaultify is built with **Next.js 14**, **Tailwind CSS**, and **Web Audio API**.

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/Tirth-Babariya/Vaultify.git
    cd Vaultify
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the app**:
    Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 🔒 Security Model

Vaultify implements a zero-knowledge security architecture:

1.  **Key Derivation**: PBKDF2 with 100,000+ iterations to derive a 256-bit key from your master password.
2.  **Encryption**: AES-GCM (Authenticated Encryption with Associated Data) for all stored credentials.
3.  **Memory Protection**: Your encryption key is stored only in `sessionStorage` and destroyed on lock, logout, or tab close.
4.  **Local-Only**: Your data never touches a server. Encryption and decryption happen entirely on your machine.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `/` | Focus Search Bar |
| `N` | New Password Entry |
| `L` | Lock Vault |
| `G` | Switch to Generator |
| `S` | Switch to Security Audit |
| `Esc` | Clear Focus / Cancel |

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Vanilla CSS & Tailwind (Custom Glassmorphism Utilities)
- **Cryptography**: Web Crypto API (SubtleCrypto)
- **Audio**: Web Audio API
- **Icons**: Lucide & Custom SVGs

---

Developed with ❤️ for security and design excellence by [Tirth-Babariya](https://github.com/Tirth-Babariya).
