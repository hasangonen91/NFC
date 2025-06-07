# React Native NFC Reader Example

This project is a robust **React Native** template demonstrating modern, user-friendly **NFC tag and EMV (credit card) reading**.  
It uses a custom React hook for NFC operations and an animated modal for rich user experience.

---

## 📸 Demo & Screenshots

Below you can see a step-by-step NFC reading flow.  
The screenshots are shown side by side and resized for a compact overview:

<p align="center">
  <img src="https://github.com/user-attachments/assets/b76761d1-f93f-416e-9704-02e98fedb969" alt="NFC Start" width="180" style="display:inline-block; margin-right:8px;" />
  <img src="https://github.com/user-attachments/assets/c2fe56e6-6406-4c39-9eba-0ec4dbad268c" alt="Scanning Progress" width="180" style="display:inline-block; margin-right:8px;" />
  <img src="https://github.com/user-attachments/assets/0157adbb-f029-444b-898f-08ece72a2dd7" alt="NFC Result" width="180" style="display:inline-block;" />
</p>

<p align="center">
  <b>1.</b> Start NFC  &nbsp;&nbsp;&nbsp;
  <b>2.</b> Scanning  &nbsp;&nbsp;&nbsp;
  <b>3.</b> Result
</p>


## 🎬 Demo Video

You can watch a full demo of the NFC reader in action below:

<p align="center">
  <video src="https://github.com/user-attachments/assets/761924eb-e72f-400a-88c3-ec74d9a02877" controls width="360"></video>
</p>

---

---

## 🚀 Getting Started

> **Note:** Make sure you have completed the [Set Up Your Environment](https://reactnative.dev/docs/set-up-your-environment) guide before proceeding.

### 1. Start Metro

Start the Metro JavaScript build tool:

```sh
# Using npm
npm start

# OR using Yarn
yarn start
```

### 2. Build and run your app

Open a new terminal and run:

#### Android

```sh
npm run android
# OR
yarn android
```

#### iOS

First install CocoaPods dependencies if not already:

```sh
bundle install
bundle exec pod install
```

Then:

```sh
npm run ios
# OR
yarn ios
```

If everything is set up correctly, your app will run in the Android Emulator, iOS Simulator, or a connected device.

---

## 📖 NFC Reading System & Code Overview

### The `useNfc` Hook

All NFC logic is handled in a custom hook (`useNfc`).  
This hook:
- Checks if NFC is enabled and reacts to changes
- Guides the user to device settings if NFC is off
- Reads both classic NFC tags and credit cards (EMV protocol)
- Parses and structures all read data for easy display
- Manages progress animation and step text during scanning
- Handles errors and success states robustly
- Offers utility functions for copying and modal control

**Typical flow:**
- When scanning starts, the hook checks if NFC is enabled.
- If not, the user is prompted to enable it.
- The hook auto-detects if the card is EMV or a standard tag.
- Progress bar and step messages inform the user during the process.
- On completion, success or error feedback is shown.
- All data (card number, tag ID, etc.) can be copied to clipboard.

### The `NfcModal` Component

A custom modal provides a rich UI for NFC scanning:
- **While scanning:** Animated NFC icon, progress bar, step message, and cancel button
- **On completion:** Success/failure animation and detailed data card
- **Data rows:** Each row is easily copyable and styled for clarity
- Modal smoothly animates in/out, acting like a bottom sheet
- Data display adapts to both credit cards and NFC tags

**UX features:**
- Progress and step feedback during scanning
- Clear animations for error or success
- Data display is modern, readable, and copy-enabled

---

## 📦 Project Structure

```
.
├── hooks/
│   └── useNfc.ts
├── components/
│   └── NfcModal.tsx
├── assets/
│   ├── nfc-scan.json
│   ├── success.json
│   └── failure.json
├── screenshots/
│   ├── scan.gif
│   ├── success.png
│   └── taginfo.png
├── App.tsx
└── README.md
```

---

## 🛠 Features

- **Credit Card (EMV) Reading**
- **Classic NFC Tag Reading (NDEF, Mifare, Ultralight, etc.)**
- **Animated progress bar & step messaging**
- **Lottie animations for error/success**
- **Easy copy to clipboard**
- **Modern, user-friendly modal**
- **Clean, customizable, and easily extendable codebase**

---

## 🔗 Resources

- [React Native Website](https://reactnative.dev)
- [react-native-nfc-manager](https://github.com/revtel/react-native-nfc-manager)
- [Lottie for React Native](https://github.com/lottie-react-native/lottie-react-native)
- [Clipboard API](https://github.com/react-native-clipboard/clipboard)

---
