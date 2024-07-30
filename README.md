# 🔍✨ エクスプロージョン: Instant OCR & Translation

> Capture, Recognize, Translate - All in One Click!

エクスプロージョン is a powerful Chrome extension that combines Optical Character Recognition (OCR) with seamless translation capabilities.

## 🌟 Features

- 📸 Capture any part of your screen with our intuitive selection tool
- 🔤 Advanced OCR powered by OCR.space for accurate text recognition
- 🌐 Instant translation using Google Translate or DeepL
- 🇯🇵🇨🇳 Specialized support for Japanese and Chinese characters
- 🧠 Kanji information lookup for deeper understanding
- 🚀 Lightning-fast performance for a smooth user experience

## 🛠 To-Do List

- [x] Implement screen capture functionality
- [x] Integrate OCR.space API for text recognition
- [x] Add Google Translate support
- [x] Implement DeepL translation option
- [x] Create Kanji information lookup feature
- [x] Add support for more languages (Korean)
- [x] Make translation overlay remain on the selected text
- [x] Better Popup UI
- [ ] Add Tessaract support for when API limits are reached

## 📚 Tutorial: Setting Up API Keys

To use エクスプロージョン, you'll need to set up API keys for OCR.space (mandatory) and DeepL (optional secondary engine for translation):

### 🔑 OCR.space API Key

1. Visit the [OCR.space website](https://ocr.space/ocrapi)
2. Register for a free API key (25k req/month) with a valid email
3. Verify your email
4. Copy your API key from the received email

### 🔑 DeepL API Key

1. Go to the [DeepL page](https://www.deepl.com/)
2. Create an account
3. Sign up for an API key (500k characters for free/month)
4. After verification, you'll receive your API key

### ⚙️ Configuring Your Extension

1. Clone this repository to your local machine
2. In the root directory, create a file named `config.js`
3. Open `config.js` and add the following code:

```javascript
export const API_KEYS = {
  OCR_SPACE: 'your_ocr_space_api_key_here',
  DEEPL: 'your_deepl_api_key_here'
};
```

4. Replace `'your_ocr_space_api_key_here'` and `'your_deepl_api_key_here'` with your actual API keys
5. Save the file

## 🚀 Getting Started

1. Open Google Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the directory containing your extension files
4. エクスプロージョン icon should now appear in your Chrome toolbar!
5. (Optional) Pin it for easier access to the popup!

## 📚 How to Use

1. **Activation**: Press Ctrl+Shift+S or middle-click to activate the selection overlay.
2. **Capture**: Click and drag to select the area you want to capture and translate.
3. **OCR and Translation**: エクスプロージョン will automatically perform OCR and translate the text.
4. **View Results**: The original text and translation will appear in a popup window.
5. **Switch Translation Service**: Toggle between Google Translate and DeepL using the buttons in the result window.
6. **Language Toggle**: Switch between Japanese and Chinese modes using the language toggle button.
7. **Kanji/Hanzi Information**: 
   - Hover over individual kanji/hanzi characters to see detailed information.
   - Select multiple characters to get compound word meanings.
8. **External Dictionary**: Click on a character to open it in Jisho.org (for Japanese) or MDBG (for Chinese).
9. **Overlay Mode**: Enable the overlay mode in the extension popup to see translations directly on the webpage.
10. **Quick Disable**: Use the extension popup to quickly enable/disable エクスプロージョン or toggle the overlay mode.

## 🤝 Contributing

We love contributions! If you have any ideas or improvements, feel free to fork this repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE) file for details.

---

<p align="center">Made with 🖤 by TheRiper</p>
