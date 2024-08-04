let isSelecting = false;
let startX, startY;
let currentTranslationService = 'google';
let lastOCRText = '';
let isHovering = false;
let currentHoveredElement = null;
let currentSelection = null;
let currentLanguage = 'jap';
let isExtensionEnabled = true;
let lastOverlayData = null;
let tesseractWorker = null;

const styles = `
    #ocr-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
    }
    #ocr-selection {
        position: absolute;
        pointer-events: none;
        box-sizing: border-box;
        box-shadow: 0 0 0 2px #fff;
    }
    #esc-message {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        font-size: 18px;
        z-index: 10002;
        display: none;
    }
    #result-box {
        position: fixed;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 80%;
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        border: 1px solid white;
        z-index: 10001;

        font-family: Arial, sans-serif;
        font-size: 16px;
        display: none;
    }
    #close-button {
        position: relative;
        bottom: 5px;
        right: 5px;
        color: red;
        cursor: pointer;
        font-size: 20px;
    }
    #loading-indicator {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10004;
        display: none;
    }
    .translation-button {
        margin-right: 10px;
        cursor: pointer;
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        transition: background-color 0.3s;
    }
    .translation-button.active {
        background-color: #4CAF50;
        color: white;
    }
    .translation-button:not(.active) {
        background-color: #808080;
        color: #D3D3D3;
    }
     #kanji-info {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 10px;
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        border: 1px solid white;
        z-index: 10005;
        font-family: Arial, sans-serif;
        font-size: 16px;
        display: none;
        max-width: 80%;
        min-width: 200px;
        white-space: nowrap;
    }

    #kanji-info h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 20px;
    }

    #kanji-info p {
        margin: 5px 0;
    }

    #original-text {
    cursor: default;
    line-height: 1.5;
    margin-bottom: 15px;
    }

    #original-text .kanji-char {
        position: relative;
        display: inline-block;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    #original-text .kanji-char:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }

    #original-text .kanji-char::after {
        content: '';
        position: absolute;
        left: 0;
        bottom: -2px;
        width: 100%;
        height: 2px;
        background-color: rgba(255, 255, 255, 0.5);
        transform: scaleX(0);
        transition: transform 0.3s;
    }

    #original-text .kanji-char:hover::after {
        transform: scaleX(1);
    }

    #multi-kanji-info {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        z-index: 10005;
        max-width: 400px;
        width: auto;
        overflow-y: auto;
        max-height: 50vh;
        font-size: 16px;
        line-height: 1.4;
    }

    #multi-kanji-info h4 {
        margin-top: 0;
        font-size: 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 10px;
        margin-bottom: 15px;
    }

    #multi-kanji-info .meanings {
        max-height: calc(50vh - 80px);
        overflow-y: auto;
        padding-right: 10px;
    }

    #multi-kanji-info .meanings p {
        margin: 0 0 8px 0;
    }

    #multi-kanji-info .meanings::-webkit-scrollbar {
        width: 6px;
    }

    #multi-kanji-info .meanings::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
    }

    #multi-kanji-info .meanings::-webkit-scrollbar-thumb {
        background-color: rgba(255, 255, 255, 0.3);
        border-radius: 3px;
    }

    #language-toggle {
        margin-left: 10px;
        padding: 5px 10px;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
    }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const overlay = document.createElement('div');
overlay.id = 'ocr-overlay';
document.body.appendChild(overlay);

const selection = document.createElement('div');
selection.id = 'ocr-selection';
overlay.appendChild(selection);

const resultBox = document.createElement('div');
resultBox.id = 'result-box';
document.body.appendChild(resultBox);

const loadingIndicator = document.createElement('div');
loadingIndicator.id = 'loading-indicator';
loadingIndicator.textContent = 'Loading...';
document.body.appendChild(loadingIndicator);

const kanjiInfoBox = document.createElement('div');
kanjiInfoBox.id = 'kanji-info';
document.body.appendChild(kanjiInfoBox);

const escMessage = document.createElement('div');
escMessage.id = 'esc-message';
escMessage.textContent = 'Press ESC to cancel selection';
document.body.appendChild(escMessage);

function handleKeyDown(e) {
    if (!isExtensionEnabled) return;
    if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        showOverlay();
    }
}

function handleMouseDown(e) {
    if (!isExtensionEnabled) return;
    if (e.button === 1) { // Middle mouse button
        e.preventDefault(); // Prevent default middle-click behavior
        resultBox.style.display = 'none';
        removeOverlay();
        showOverlay();
    } else if (e.button === 0 && overlay.style.display === 'block') { // Left mouse button when overlay is visible
        startSelection(e);
    }
}

function showOverlay() {
    overlay.style.display = 'block';
    overlay.style.clipPath = 'none';
    clearSelection();
    escMessage.style.display = 'block';
    document.body.style.userSelect = 'none'; // Prevent text selection
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', updateSelection);
document.addEventListener('mouseup', endSelection);

function startSelection(e) {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    clearSelection();
    escMessage.style.display = 'none';
    updateSelectionBox(e);
}

function clearSelection() {
    selection.style.width = '0';
    selection.style.height = '0';
    selection.style.left = '0';
    selection.style.top = '0';
    overlay.style.clipPath = 'none';
}

function updateSelection(e) {
    if (!isSelecting) return;
    updateSelectionBox(e);
}

function updateSelectionBox(e) {
    const left = Math.min(startX, e.clientX);
    const top = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);

    selection.style.left = `${left}px`;
    selection.style.top = `${top}px`;
    selection.style.width = `${width}px`;
    selection.style.height = `${height}px`;

    // Get the overlay's bounding rectangle
    const overlayRect = overlay.getBoundingClientRect();

    // Calculate percentages for clip-path, adjusting for the overlay's position
    const leftPercentage = (left - overlayRect.left) / overlayRect.width * 100;
    const topPercentage = (top - overlayRect.top) / overlayRect.height * 100;
    const rightPercentage = (left + width - overlayRect.left) / overlayRect.width * 100;
    const bottomPercentage = (top + height - overlayRect.top) / overlayRect.height * 100;

    // Update the clip-path of the overlay
    overlay.style.clipPath = `
        polygon(
            0% 0%,
            100% 0%,
            100% 100%,
            0% 100%,
            0% ${topPercentage}%,
            ${leftPercentage}% ${topPercentage}%,
            ${leftPercentage}% ${bottomPercentage}%,
            ${rightPercentage}% ${bottomPercentage}%,
            ${rightPercentage}% ${topPercentage}%,
            0% ${topPercentage}%
        )
    `;
}

let finalSelectionCoords = { left: 0, top: 0, width: 0, height: 0 };

function endSelection(e) {
    if (!isSelecting) return;
    isSelecting = false;
    escMessage.style.display = 'none';
    
    finalSelectionCoords = {
        left: parseInt(selection.style.left),
        top: parseInt(selection.style.top),
        width: parseInt(selection.style.width),
        height: parseInt(selection.style.height)
    };
    
    captureSelection();
    overlay.style.display = 'none';
    clearSelection();
    document.body.style.userSelect = ''; // Re-enable text selection
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && overlay.style.display === 'block') {
        isSelecting = false;
        clearSelection();
        escMessage.style.display = 'none';
        overlay.style.display = 'none';
    }
});

function sendMessage(message) {
    chrome.runtime.sendMessage(message, function(response) {
        if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
            return;
        }
        handleResponse(response);
    });
}

function handleResponse(response) {
    console.log('Content script: Received response:', response);
    if (response.action === "ocrResult") {
        console.log('Content script: OCR result received:', response.text);
        hideLoadingIndicator();
        lastOCRText = response.text;
        lastOverlayData = response.overlay;
        chrome.storage.sync.get('currentTranslationService', (data) => {
            currentTranslationService = data.currentTranslationService || 'google';
            console.log('Content script: Using translation service:', currentTranslationService);
            showLoadingIndicator(`Translating with ${currentTranslationService}...`);
            sendMessage({ 
                action: "translate", 
                text: response.text, 
                service: currentTranslationService,
                language: currentLanguage
            });
        });
    } else if (response.action === "ocrError") {
        console.log('Content script: OCR Error:', response.error, 'Details:', response.details);
        hideLoadingIndicator();
        displayErrorMessage("Couldn't find text in the selection. Try again");
    } else if (response.action === "translationResult") {
        console.log('Content script: Translation result received:', response.translatedText);
        hideLoadingIndicator();
        displayResults(response.originalText, response.translatedText);
        const languageToggle = document.getElementById('language-toggle');
        //languageToggle.classList.toggle('active', currentLanguage === 'chn');
    } else if (response.action === "translationError") {
        console.error('Content script: Translation Error:', response.error);
        hideLoadingIndicator();
        displayErrorMessage(`An error occurred during translation: ${response.error}. Please try again.`);
    } else if (response.action === "kanjiInfo") {
        console.log('Content script: Kanji info received:', response);
        hideLoadingIndicator();
        showKanjiInfo(response);
    } else if (response.action === "multiKanjiInfo") {
        console.log('Content script: Multi-kanji info received:', response);
        hideLoadingIndicator();
        showMultiKanjiInfo(response);
    }
}

// Updated function to display error messages
function displayErrorMessage(message) {
    let errorDisplay = document.getElementById('error-display');
    if (!errorDisplay) {
        errorDisplay = document.createElement('div');
        errorDisplay.id = 'error-display';
        errorDisplay.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ffcccc;
            color: #990000;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            display: none;
        `;
        document.body.appendChild(errorDisplay);
    }
    errorDisplay.textContent = message;
    errorDisplay.style.display = 'block';
    
    // Clear any existing timeout
    if (errorDisplay.timeoutId) {
        clearTimeout(errorDisplay.timeoutId);
    }
    
    // Set new timeout
    errorDisplay.timeoutId = setTimeout(() => {
        errorDisplay.style.display = 'none';
    }, 3000); // Hide the message after 3 seconds
}

function captureSelection() {
    console.log('Content script: Capturing selection...');
    const rect = selection.getBoundingClientRect();
    try {
        sendMessage({
            action: "captureVisibleTab",
            area: {
                x: rect.left,
                y: rect.top,
                width: rect.width,
                height: rect.height
            },
            language: currentLanguage
        });
        overlay.style.display = 'none';
        showLoadingIndicator('Capturing selection...');
    } catch (error) {
        console.error('Content script: Error sending message:', error);
        alert('An error occurred. Please refresh the page and try again.');
        hideLoadingIndicator();
    }
}

function showLoadingIndicator(message) {
    loadingIndicator.textContent = message;
    loadingIndicator.style.display = 'block';
}

function hideLoadingIndicator() {
    loadingIndicator.style.display = 'none';
}

function displayResults(original, translated) {
    resultBox.innerHTML = `
        <h3>Original Text: <button id="language-toggle">${currentLanguage}</button></h3>
        <p id="original-text">${original}</p>
        <h3>Translated Text:</h3>
        <div>
            <button id="google-translate" class="translation-button ${currentTranslationService === 'google' ? 'active' : ''}">Google Translate</button>
            <button id="deepl-translate" class="translation-button ${currentTranslationService === 'deepl' ? 'active' : ''}">DeepL</button>
        </div>
        <p id="translated-text">${translated}</p>
        <span id="close-button">❌</span>
    `;
    resultBox.style.display = 'block';

    setupCloseButton();
    setupTranslationButtons();
    setupLanguageToggle();
    setupCharacterHover();
    setupMultiKanjiSelection();

    if (isOverlayEnabled) {
        displayOverlay(translated);
    } else {
        removeOverlay();
    }
}

function setupLanguageToggle() {
    const languageToggle = document.getElementById('language-toggle');
    const languages = ['jap', 'chn', 'kor'];
    const colors = {
        'jap': '#4CAF50',  // Green
        'chn': '#F44336',  // Red
        'kor': '#3498db'   // Blue
    };
    let currentIndex = languages.indexOf(currentLanguage);

    function updateLanguageDisplay() {
        languageToggle.textContent = currentLanguage;
        languageToggle.style.backgroundColor = colors[currentLanguage];
        languageToggle.style.color = 'white';
        languageToggle.style.transition = 'background-color 0.3s ease';
    }

    function changeLanguage() {
        currentIndex = (currentIndex + 1) % languages.length;
        currentLanguage = languages[currentIndex];
        
        updateLanguageDisplay();
        
        // Save the language preference
        chrome.storage.sync.set({ currentLanguage: currentLanguage });
        
        // Retranslate the text
        if (lastOCRText) {
            showLoadingIndicator(`Translating with ${currentTranslationService}...`);
            sendMessage({ 
                action: "translate", 
                text: lastOCRText, 
                service: currentTranslationService,
                language: currentLanguage
            });
        }
        
        // Update the character wrapping
        setupCharacterHover();
    }

    updateLanguageDisplay();  // Initial display update

    languageToggle.addEventListener('click', changeLanguage);
}

function setupCharacterHover() {
    const originalText = document.getElementById('original-text');
    switch(currentLanguage) {
        case 'jap':
            wrapKanjiCharacters(originalText);
            break;
        case 'chn':
            wrapChineseCharacters(originalText);
            break;
        case 'kor':
            wrapKoreanCharacters(originalText);
            break;
    }
}

function wrapKoreanCharacters(element) {
    element.innerHTML = element.textContent.replace(/([가-힣])/g, '<span class="korean-char">$1</span>');
    
    const koreanChars = element.querySelectorAll('.korean-char');
    koreanChars.forEach(char => {
      char.addEventListener('mouseenter', handleKoreanHover);
      char.addEventListener('mouseleave', handleKoreanHoverOut);
      char.addEventListener('click', handleKoreanClick);
    });
  }
  
  // Add handler functions for Korean characters
  function handleKoreanHover(event) {
    if (currentHoveredElement !== event.target) {
      if (currentHoveredElement) {
        currentHoveredElement.classList.remove('hovered');
      }
      currentHoveredElement = event.target;
      currentHoveredElement.classList.add('hovered');
      
      const character = event.target.textContent;
      isHovering = true;
      showLoadingIndicator(`Fetching info for ${character}...`);
      sendMessage({ action: "fetchKoreanInfo", character: character });
    }
    
    const charRect = event.target.getBoundingClientRect();
    kanjiInfoBox.style.top = `${charRect.bottom + 5}px`;
    kanjiInfoBox.style.left = `${charRect.left}px`;
    kanjiInfoBox.style.transform = 'none';
  }
  
  function handleKoreanHoverOut(event) {
    isHovering = false;
    if (currentHoveredElement) {
      currentHoveredElement.classList.remove('hovered');
    }
    currentHoveredElement = null;
    setTimeout(() => {
      if (!isHovering) {
        kanjiInfoBox.style.display = 'none';
      }
    }, 100);
  }
  
  function handleKoreanClick(event) {
    const character = event.target.textContent;
    window.open(`https://krdict.korean.go.kr/eng/dicSearch/search?nation=eng&nationCode=6&ParaWordNo=&mainSearchWord=${encodeURIComponent(character)}`, '_blank');
  }
  
  // Add a function to show Korean character info
  function showKoreanInfo(info) {
    if (!isHovering) {
      return;
    }
    kanjiInfoBox.innerHTML = `
      <h4>${info.character}</h4>
      <p><strong>Meaning:</strong> ${info.meaning}</p>
      <p><strong>Pronunciation:</strong> ${info.pronunciation}</p>
    `;
    kanjiInfoBox.style.display = 'block';
  }

function wrapKanjiCharacters(element) {
    element.innerHTML = element.textContent.replace(/([\u4e00-\u9faf])/g, '<span class="kanji-char">$1</span>');
    
    const kanjiChars = element.querySelectorAll('.kanji-char');
    kanjiChars.forEach(char => {
        char.addEventListener('mouseenter', handleKanjiHover);
        char.addEventListener('mouseleave', handleKanjiHoverOut);
        char.addEventListener('click', handleKanjiClick);
    });
}

function wrapChineseCharacters(element) {
    element.innerHTML = element.textContent.replace(/([\u4e00-\u9fff\u3400-\u4dbf])/g, '<span class="chinese-char">$1</span>');
    
    const chineseChars = element.querySelectorAll('.chinese-char');
    chineseChars.forEach(char => {
        char.addEventListener('mouseenter', handleChineseHover);
        char.addEventListener('mouseleave', handleChineseHoverOut);
        char.addEventListener('click', handleChineseClick);
    });
}

function handleKanjiHover(event) {
    if (currentHoveredElement !== event.target) {
        if (currentHoveredElement) {
            currentHoveredElement.classList.remove('hovered');
        }
        currentHoveredElement = event.target;
        currentHoveredElement.classList.add('hovered');
        
        const kanji = event.target.textContent;
        isHovering = true;
        showLoadingIndicator(`Fetching info for ${kanji}...`);
        sendMessage({ action: "fetchKanjiInfo", kanji: kanji });
    }
    
    const charRect = event.target.getBoundingClientRect();
    kanjiInfoBox.style.top = `${charRect.bottom + 5}px`;
    kanjiInfoBox.style.left = `${charRect.left}px`;
    kanjiInfoBox.style.transform = 'none';
}

function handleKanjiHoverOut(event) {
    isHovering = false;
    if (currentHoveredElement) {
        currentHoveredElement.classList.remove('hovered');
    }
    currentHoveredElement = null;
    setTimeout(() => {
        if (!isHovering) {
            kanjiInfoBox.style.display = 'none';
        }
    }, 100);
}

function handleKanjiClick(event) {
    const kanji = event.target.textContent;
    window.open(`https://jisho.org/search/${encodeURIComponent(kanji)}`, '_blank');
}

function handleChineseHover(event) {
    if (currentHoveredElement !== event.target) {
        if (currentHoveredElement) {
            currentHoveredElement.classList.remove('hovered');
        }
        currentHoveredElement = event.target;
        currentHoveredElement.classList.add('hovered');
        
        const character = event.target.textContent;
        isHovering = true;
        showLoadingIndicator(`Fetching info for ${character}...`);
        sendMessage({ action: "fetchMultiKanjiInfo", kanji: character });
    }
    
    const charRect = event.target.getBoundingClientRect();
    kanjiInfoBox.style.top = `${charRect.bottom + 5}px`;
    kanjiInfoBox.style.left = `${charRect.left}px`;
    kanjiInfoBox.style.transform = 'none';
}

function handleChineseHoverOut(event) {
    isHovering = false;
    if (currentHoveredElement) {
        currentHoveredElement.classList.remove('hovered');
    }
    currentHoveredElement = null;
    setTimeout(() => {
        if (!isHovering) {
            kanjiInfoBox.style.display = 'none';
        }
    }, 100);
}

function handleChineseClick(event) {
    const character = event.target.textContent;
    window.open(`https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encodeURIComponent(character)}`, '_blank');
}

function showKanjiInfo(info) {
    if (!isHovering) {
        return;
    }
    kanjiInfoBox.innerHTML = `
        <h4>${info.kanji} (${info.reading})</h4>
        <p><strong>Meaning:</strong> ${info.meanings}</p>
        <p><strong>Kun'yomi:</strong> ${info.kunReadings}</p>
        <p><strong>On'yomi:</strong> ${info.onReadings}</p>
    `;
    kanjiInfoBox.style.display = 'block';
}

let debounceTimer = null;

function debounce(func, delay) {
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    };
}

const handleSelectionDebounced = debounce(() => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();

    if (selectedText) {
        const originalText = document.getElementById('original-text');
        if (originalText.contains(selection.anchorNode) && originalText.contains(selection.focusNode)) {
            if (selectedText !== currentSelection) {
                currentSelection = selectedText;
                showLoadingIndicator(`Fetching info for ${selectedText}...`);
                sendMessage({ action: "fetchMultiKanjiInfo", kanji: selectedText });
            }
        }
    } else {
        hideMultiKanjiInfo();
    }
}, 150);

function setupMultiKanjiSelection() {
    const originalText = document.getElementById('original-text');
    document.addEventListener('selectionchange', handleSelectionDebounced);
    document.addEventListener('mousedown', handleDocumentClick);
}

function handleDocumentClick(event) {
    const resultBox = document.getElementById('result-box');
    const multiKanjiInfoBox = document.getElementById('multi-kanji-info');
    if (!resultBox.contains(event.target) && (!multiKanjiInfoBox || !multiKanjiInfoBox.contains(event.target))) {
        hideMultiKanjiInfo();
    }
}

function showMultiKanjiInfo(info) {
    const multiKanjiInfoBox = document.getElementById('multi-kanji-info') || document.createElement('div');
    multiKanjiInfoBox.id = 'multi-kanji-info';

    const title = `${info.kanji}  (Reading: ${info.reading})`;

    const meaningsHtml = info.meanings.split('; ')
        .map((meaning, index) => `<p>${index + 1}. ${meaning}</p>`)
        .join('');

    multiKanjiInfoBox.innerHTML = `
        <h4>${title}</h4>
        <div class="meanings">
            ${meaningsHtml}
        </div>
    `;

    document.body.appendChild(multiKanjiInfoBox);
    multiKanjiInfoBox.style.display = 'block';

    const resultBox = document.getElementById('result-box');
    const resultBoxRect = resultBox.getBoundingClientRect();
    
    multiKanjiInfoBox.style.top = `${resultBoxRect.bottom + 10}px`;
    multiKanjiInfoBox.style.left = '50%';
    multiKanjiInfoBox.style.transform = 'translateX(-50%)';

    multiKanjiInfoBox.style.width = 'auto';
    multiKanjiInfoBox.style.minWidth = '200px';
    multiKanjiInfoBox.style.maxWidth = '400px';
}

function hideMultiKanjiInfo() {
    const multiKanjiInfoBox = document.getElementById('multi-kanji-info');
    if (multiKanjiInfoBox) {
        multiKanjiInfoBox.style.display = 'none';
    }
    currentSelection = null;
}

function setupCloseButton() {
    const closeButton = document.getElementById('close-button');
    closeButton.addEventListener('click', function() {
        resultBox.style.display = 'none';
        removeOverlay();
    });
}

function setupTranslationButtons() {
    const googleButton = document.getElementById('google-translate');
    const deeplButton = document.getElementById('deepl-translate');

    googleButton.addEventListener('click', function() {
        if (currentTranslationService !== 'google') {
            currentTranslationService = 'google';
            chrome.storage.sync.set({ currentTranslationService: 'google' });
            updateTranslationButtons();
            retranslate();
        }
    });

    deeplButton.addEventListener('click', function() {
        if (currentTranslationService !== 'deepl') {
            currentTranslationService = 'deepl';
            chrome.storage.sync.set({ currentTranslationService: 'deepl' });
            updateTranslationButtons();
            retranslate();
        }
    });
}

function updateTranslationButtons() {
    const googleButton = document.getElementById('google-translate');
    const deeplButton = document.getElementById('deepl-translate');
    
    googleButton.classList.toggle('active', currentTranslationService === 'google');
    deeplButton.classList.toggle('active', currentTranslationService === 'deepl');
}

function retranslate() {
    if (lastOCRText) {
        showLoadingIndicator(`Translating with ${currentTranslationService}...`);
        sendMessage({ 
            action: "translate", 
            text: lastOCRText, 
            service: currentTranslationService,
            language: currentLanguage
        });
    }
}

let lastUrl = location.href; 
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        hideAllInfoDisplays();
        removeOverlay();
    }
}).observe(document, {subtree: true, childList: true});

function hideAllInfoDisplays() {
    resultBox.style.display = 'none';
    hideLoadingIndicator();
    hideMultiKanjiInfo();
    removeOverlay();
}

document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        hideAllInfoDisplays();
        removeOverlay();
    }
});

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "toggleExtension") {
        isExtensionEnabled = request.isEnabled;
        if (!isExtensionEnabled) {
            hideAllInfoDisplays(); // Hide everything when extension is disabled
        }
    } else if (request.action === "changeLanguage") {
        currentLanguage = request.language;
    } else if (request.action === "toggleOverlay") {
        isOverlayEnabled = request.isEnabled;
        if (!isOverlayEnabled) {
            removeOverlay(); // Hide overlay when it's disabled
        } else if (lastOCRText) {
            displayResults(lastOCRText, document.getElementById('translated-text').textContent);
        }
    } else if (request.action === "processImageWithTesseract") {
        processImageWithTesseract(request.imageData, request.language);
    }
});

const CONSTANTS = {
    workerLanguage: ['chi_tra_vert'],
    progressBarId: "image-to-text-progress-bar",
    loadingMessageId: "loadingMessage",
    workerPath: "lib/worker.min.js",
    corePath: "lib/tesseract-core-simd-lstm.wasm.js",
    langPath: "languages/"
  };

async function initializeTesseract() {
    if (tesseractWorker) return;
  
    // Inject Tesseract script
    await injectScript(chrome.runtime.getURL('lib/tesseract.min.js'));
  
    console.log('Tesseract script injected');
  
    tesseractWorker = await createWorker();
  
    console.log('Tesseract worker initialized');
  }
  
  function injectScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  async function createWorker() {
    const selectedLangs = getSelectedLanguageCodes();
    const langCodes = Array.isArray(selectedLangs) ? selectedLangs : [selectedLangs];
    const worker = await Tesseract.createWorker(selectedLangs, 1, {
        workerPath: chrome.runtime.getURL(CONSTANTS.workerPath),
        corePath: chrome.runtime.getURL(CONSTANTS.corePath),
        langPath: chrome.runtime.getURL(CONSTANTS.langPath),
        logger: (m) => {
            console.log(m);
        },
        errorHandler: (e) => {
            console.warn(e);
            // You might want to add error handling here
        }
    });

    await worker.loadLanguage(langCodes);
    await worker.initialize(langCodes);

    const params = {};
    if (langCodes.some(lang => lang.endsWith('_vert'))) {
        params['tessedit_pageseg_mode'] = Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT;
    }
    if (langCodes.some(lang => ['chi_tra', 'chi_tra_vert', 'jpn', 'jpn_vert', 'kor', 'kor_vert'].includes(lang))) {
        params['preserve_interword_spaces'] = '1';
    }

    await worker.setParameters(params);
    return worker;
}
  
  function getSelectedLanguageCodes() {
    console.log(CONSTANTS.workerLanguage.join('+'));
    return CONSTANTS.workerLanguage.join('+');
  }
  
  async function processImageWithTesseract(imageData, language) {
    showLoadingIndicator('Processing image with Tesseract...');
    try {
      await initializeTesseract();
  
      const { data } = await tesseractWorker.recognize(imageData);
      
      let text = data.text;
      
      // Post-processing for CJK and Thai languages
      if (['chi_tra', 'chi_tra_vert', 'jpn', 'jpn_vert', 'kor', 'kor_vert'].includes(language.toLowerCase())){
        if (text) {
            console.log(2);
            text = text.replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}0-9.,!?…]/gu, '');
        }
    }
    
      console.log('Tesseract OCR Result:', text);
      
      // Proceed with translation
      sendMessage({ 
        action: "translate", 
        text: text, 
        service: currentTranslationService,
        language: language
      });
    } catch (error) {
      console.error('Error processing image with Tesseract:', error);
      displayErrorMessage("Error occurred while processing the image with Tesseract.");
    } finally {
      hideLoadingIndicator();
    }
  }
  

let scrollOffset = 0;
let currentOverlay = null;
let initialScrollY = 0;

function displayOverlay(translatedText) {
    const existingOverlay = document.getElementById('translation-overlay');

    if (existingOverlay) {
        // Update the text content if overlay already exists
        existingOverlay.querySelector('div').textContent = translatedText;
    } else {
        // Create a new overlay if it doesn't exist
        const overlay = document.createElement('div');
        overlay.id = 'translation-overlay';
        overlay.style.position = 'absolute';
        overlay.style.zIndex = '1000';
        overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        overlay.style.color = 'black';
        overlay.style.padding = '5px';
        overlay.style.boxShadow = '0 0 5px rgba(0,0,0,0.3)';
        overlay.style.fontSize = '14px';
        overlay.style.wordBreak = 'break-word';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.textAlign = 'center';
        document.body.appendChild(overlay);

        // Use the stored selection coordinates
        overlay.style.left = `${finalSelectionCoords.left}px`;
        overlay.style.top = `${finalSelectionCoords.top + window.scrollY}px`;
        overlay.style.width = `${finalSelectionCoords.width}px`;
        overlay.style.height = `${finalSelectionCoords.height}px`;

        const textElement = document.createElement('div');
        textElement.textContent = translatedText;
        overlay.appendChild(textElement);

        // Adjust font size if text is too large for the overlay
        adjustFontSize(textElement, overlay);

        currentOverlay = overlay;
        initialScrollY = window.scrollY;
    }
}


function removeOverlay() {
    if (currentOverlay) {
        currentOverlay.remove();
        currentOverlay = null;
    }
    scrollOffset = 0;
    initialScrollY = 0;
}

function updateOverlayPosition() {
    if (currentOverlay) {
        const scrollDifference = window.scrollY - initialScrollY;
        const newTop = initialOverlayTop - scrollDifference;
        
        // Constrain the overlay to stay within the viewport
        const minTop = 0;
        const maxTop = window.innerHeight - currentOverlay.offsetHeight;
        
        currentOverlay.style.top = `${Math.max(minTop, Math.min(newTop, maxTop))}px`;
    }
}

function adjustFontSize(textElement, container) {
    let fontSize = 14;
    textElement.style.fontSize = `${fontSize}px`;

    while (textElement.scrollHeight > container.clientHeight || textElement.scrollWidth > container.clientWidth) {
        fontSize--;
        if (fontSize < 8) break; // Minimum font size
        textElement.style.fontSize = `${fontSize}px`;
    }
}

chrome.storage.sync.get(['extensionEnabled', 'currentTranslationService', 'currentLanguage', 'overlayEnabled'], (data) => {
    isExtensionEnabled = data.extensionEnabled !== false;
    currentTranslationService = data.currentTranslationService || 'google';
    currentLanguage = data.currentLanguage || 'jap';
    isOverlayEnabled = data.overlayEnabled === true;
    console.log('Overlay enabled:', isOverlayEnabled);
});