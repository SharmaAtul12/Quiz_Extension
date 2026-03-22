# ✨ AI Form Helper Chrome Extension

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-blue?logo=googlechrome&logoColor=white)
![AI Powered](https://img.shields.io/badge/AI-Gemini-purple?logo=googlegemini&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)

> An assistive Chrome Extension that provides seamless, AI-generated answer suggestions for Google Forms quizzes using the power of the Gemini API.

---

## 🤔 Why This Project?

**Motivation & Problem Solved**  
Navigating educational or repetitive assessment forms can be tedious. This project was built to explore how Large Language Models (LLMs) can be contextually integrated directly into standard web environments to act as a localized, on-the-fly "smart assistant." Instead of constantly switching tabs to ask questions, this extension reads the environment natively and bridges the gap.

**Skills Demonstrated:**
- **DOM Parsing & Traversal:** Structurally parsing deeply nested, class-obfuscated Google Forms DOM without hardcoded selectors.
- **Chrome Extension Architecture:** Mastering Manifest V3 permissions, content injections, styling contexts, and background service workers.
- **AI Integration:** Securely proxying Google's Gemini 1.5 Flash API endpoints within the strictly isolated extension environment.
- **Batch API Processing:** Intelligently aggregating multiple DOM inputs into a single batched array payload to optimize network calls and creatively bypass strict free-tier rate limits.

---

## 🎥 Demo

**[📺 Watch the full video demonstration of AI Form Helper on LinkedIn!](🔗_PASTE_YOUR_LINKEDIN_POST_LINK_HERE)**

---

## ✨ Features

- **Dynamic Parsing:** Automatically detects and extracts questions directly from the Google Form's structural DOM.
- **Multi-Format Support:** Accurately processes Multiple Choice, Checkbox (multi-select), Short Answer, and Paragraph question types.
- **Granular & Smart Batch Solving:** Retrieve suggestions for individual questions, or utilize a powerful "Solve All" macro button that intelligently batches all visible questions into a single structured API request.
- **Visual Highlighting:** Injects clean, native-feeling UI answer boxes directly underneath each question and automatically highlights/outlines the correct option.
- **100% Secure Storage:** The required Gemini API key is stored safely directly on your device.

---

## 🛠️ How It Works

1. **Open Form:** Navigate to any standard Google Forms quiz.
2. **Extract:** The extension's content module structurally parses the DOM, identifying all active questions, input types, and any available choices.
3. **Send to AI:** When you trigger the extension, questions are batched and securely sent from the background service worker to Google's highly efficient Gemini API model.
4. **Display Answers:** The modeled response is parsed and seamlessly injected into the form UI below each respective question.
5. **Highlight:** Correct radio buttons or checkboxes are elegantly outlined for your convenience without forcefully auto-submitting the form.

---

## 🧪 Live Demo / Try It

You can test this extension directly in your own browser using Developer Mode!

1. **Download & Extract:** Download the ZIP file of this repository and extract it.
2. **Open Extensions Page:** Open Google Chrome and navigate to `chrome://extensions/`.
3. **Enable Developer Mode:** Toggle **Developer mode** ON in the top right corner.
4. **Load Extension:** Click the **Load unpacked** button in the top left.
5. **Select Folder:** Select the extracted extension folder. The extension is now loaded!

---

## 💡 Usage Guide

1. **Get an API Key:** Ensure you have a free Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. **Configure Extension:** Click the AI Form Helper extension icon in your Chrome toolbar, paste in your API key, and click **Save Securely**.
3. **Open a Quiz:** Navigate to an active Google Form.
4. **Solve:** Click the floating **"✨ Solve All Questions"** button at the bottom right of the screen (or individual buttons if utilizing the granular layout) to instantly retrieve AI suggestions!

---

## 📂 Project Structure

```text
AI-Form-Helper/
├── icons/                  # 16x16, 48x48, 128x128 extension icons
├── utils/
│   └── parser.js           # Structural DOM parsing logic
├── background.js           # Service worker & Gemini API proxy
├── content.js              # UI injection and event listeners
├── styles.css              # Custom styling, glassmorphism, and animations
├── manifest.json           # Chrome Extension Manifest V3 configuration
├── popup.html              # Extension settings UI
├── popup.js                # API Key storage logic
├── LICENSE                 # MIT License file
└── README.md               # Project documentation
```

---

## 🔒 Permissions Explanation

This extension strictly requests the bare minimum permissions necessary:

- `activeTab`: Required to interact with the currently active Google Form tab when the extension is triggered.
- `scripting`: Used to inject our custom CSS (`styles.css`) and DOM scripts (`content.js`, `utils/parser.js`) safely into the Google Form page.
- `storage`: Required to securely save and load your personal Gemini API key locally on your device.
- `host_permissions` (`https://docs.google.com/forms/*`): Restricts the extension's background execution privileges strictly to Google Forms URLs.

---

## 🛡️ Privacy Note

Your privacy and security are paramount.
- **Zero Data Collection:** This extension collects absolutely **no** telemetric or personal data. 
- **100% Local Requesting:** All API calls happen directly from your local browser to Google's servers. 
- **Accurate Secure Key Storage:** The API key is stored locally in the browser using `chrome.storage` and is not transmitted to any external servers except Google’s API.

---

## 🧭 Future Improvements

- [ ] Provide customizable UI color themes within the extension popup.
- [ ] Add specific support for reading complex mathematical equations, charts, or image-based questions.
- [ ] Extend compatibility to other web environments (Microsoft Forms, Typeform).

---

## 💻 Tech Stack

- **Core:** JavaScript (Vanilla ES6+), HTML5, CSS3
- **Framework:** Chrome Extensions API (Manifest V3)
- **AI Integration:** Google Gemini API (`gemini-1.5-flash`)

---

## 🤝 Contribution

Feedback, bug reports, and pull requests are highly welcome! Feel free to open an issue or submit a PR if you have an idea to make this AI assistant even more robust.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - feel free to use it, modify it, and share it.
