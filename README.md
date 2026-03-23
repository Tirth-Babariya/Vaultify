# 🔐 Vaultify

**Vaultify** is a premium, local-first password manager designed for simplicity, security, and a superior user experience. Built with modern web technologies, it ensures your sensitive data never leaves your device while providing the luxurious feel of high-end mechanical security.

![Vaultify Hero](https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=1200&h=600)

## ✨ Features

- **🛡️ Military-Grade Security**: Uses AES-GCM encryption for vault data and PBKDF2 for key derivation. Your Master Password isnever stored in plain text.
- **💻 Local-First Architecture**: All data is stored in your browser's local storage. No servers, no trackers, no compromises.
- **🎨 Deep Customization**: 
  - **Theme Engine**: Choose from high-end accent color profiles (Emerald, Cyber Blue, Ruby).
  - **Mechanical Experience**: Satisfying synthesized clicking sounds and mechanical "spring" animations for every lock/unlock action.
- **📊 Security Audit**: A built-in health dashboard that flags weak, reused, or old passwords in real-time.
- **⚡ Productivity First**:
  - **Global Shortcuts**: Press `/` to search or `N` to add a new entry instantly.
  - **Instant Search**: Find any credential in milliseconds.
  - **Smart Generator**: Create high-entropy passwords with customizable length.
- **⏲️ Smart Auto-Lock**: Configurable inactivity timer (1-60m) to keep your vault secure even if you walk away.
- **📤 Data Portability**: Seamlessly import from Chrome/Bitwarden (JSON/CSV) and export for backups.

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
    Navigate to [http://localhost:3000](http://localhost:3000) your browser.

## 🔒 Security Model

Vaultify implements a rigorous security architecture:

1.  **Key Derivation**: Your Master Password is used to derive a 256-bit encryption key using PBKDF2 with a high iteration count.
2.  **Encryption**: Vault data is encrypted using AES-GCM (Authenticated Encryption), ensuring both confidentiality and integrity.
3.  **Memory Safety**: The encryption key is kept in `sessionStorage` and cleared immediately upon logout or auto-lock, ensuring it's never persisted to disk.
4.  **Zero-Knowledge**: As a client-side only application, only YOU hold the keys to your data.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `/` | Focus search bar |
| `N` | Focus 'Add Entry' form |
| `Esc` | Clear focus / Close Settings |

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS & Custom CSS Variables
- **Cryptography**: Web Crypto API (SubtleCrypto)
- **Audio**: Web Audio API (Live Synthesis)
- **Icons**: Lucide React & Custom SVG

---

Developed with ❤️ for security and design excellence by [Tirth-Babariya](https://github.com/Tirth-Babariya).
