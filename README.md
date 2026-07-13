# AutoForm AI

AutoForm AI is a desktop application that helps users fill online forms quickly using a smart profile form and browser automation. It combines React, Electron, Vite, and Playwright to capture user details, organize them into a reusable profile, and automate form completion on supported websites.

## Screenshots

![Login screen]("./sceenshot/Data.png")

![Main application view]("./sceenshot\Main.png")
![Save Data Of Profile]("./sceenshot\Data.png")

## Features

- Smart profile form for personal and professional details
- Built-in field mapping for common resume and application information
- Desktop experience powered by Electron
- Browser automation using Playwright
- Local storage for saved profile data
- Demo-ready flow for quick testing and exploration

## Tech Stack

- React + TypeScript
- Vite
- Electron
- Playwright
- Node.js

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the app in development mode:
   ```bash
   npm run dev
   ```
3. The app will launch the Electron desktop interface with the Vite development server.

### Optional setup for Playwright

If browser binaries are not installed yet, run:

```bash
npx playwright install
```

## Available Scripts

- `npm run dev` - start the app in development mode
- `npm run build` - build the web app
- `npm run build:electron` - build the Electron app assets
- `npm run lint` - run ESLint checks
- `npm run preview` - preview the built app

## Project Structure

- `src/main` - Electron main process and IPC handlers
- `src/renderer` - React-based UI
- `src/shared` - shared app logic and assets
- `scripts` - build helpers
- `dist-electron` - generated Electron build output

## How It Works

1. Enter your profile details in the app.
2. The app maps your information to common form fields.
3. Playwright opens the target page and fills the form automatically.
4. Your data stays stored locally for future use.

## Notes

- This project is designed for local automation and demo use.
- Automation behavior may vary depending on the target website and its form structure.

