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
let isVertical = false;
let isFirstProcessing = true;

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
        white-space: normal; /* Changed from nowrap to allow wrapping */
        max-height: 80vh; /* Limit height to 80% of viewport height */
        overflow-y: auto; /* Add vertical scrollbar when needed */
    }

    #kanji-info h4 {
        margin-top: 0;
        margin-bottom: 10px;
        font-size: 20px;
    }

    #kanji-info p {
        margin: 5px 0;
    }

    #kanji-info .meanings-list {
        list-style-type: none;
        padding-left: 0;
        margin-top: 5px;
    }

    #kanji-info .meanings-list li {
        margin-bottom: 5px;
        display: flex;
        align-items: flex-start;
    }

    #kanji-info .number {
        min-width: 30px;
        margin-right: 5px;
        flex-shrink: 0;
    }

    #kanji-info .korean {
        min-width: 70px;
        margin-right: 10px;
        font-weight: bold;
        flex-shrink: 0;
    }

    #kanji-info .meaning {
        flex: 1;
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

    .toggle-button {
        padding: 5px 10px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.3s ease;
        margin-left: 10px;
        height: 30px;
        min-width: 80px;
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
    isFirstProcessing = true;
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
            console.log('Error sending message:', chrome.runtime.lastError.message);
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
    } else if (response.action === "translationError") {
        console.error('Content script: Translation Error:', response.error);
        hideLoadingIndicator();
        displayErrorMessage(`An error occurred during translation: ${response.error}. Please try again.`);
    } else if (response.action === "cjkInfo") {
        console.log('Content script: CJK info received:', response);
        hideLoadingIndicator();
        showCJKInfo(response);
    } else if (response.action === "multiKanjiInfo") {
        console.log('Content script: Multi-kanji info received:', response);
        hideLoadingIndicator();
        showMultiKanjiInfo(response);
    } else if (response.action === "error") {
        console.error('Content script: Error:', response.error);
        hideLoadingIndicator();
        displayErrorMessage(`An error occurred: ${response.error}. Please try again.`);
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
        //showLoadingIndicator('Capturing selection...');
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
        <h3>Original Text: 
            <button id="language-toggle">${currentLanguage}</button>
            <button id="vertical-toggle">${isVertical ? 'Vertical' : 'Horizontal'}</button>
        </h3>
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
    setupVerticalToggle();
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
        updateLanguageSettings();
    }

    languageToggle.addEventListener('click', changeLanguage);
    updateLanguageDisplay();  // Initial display update
}

function setupVerticalToggle() {
    const verticalToggle = document.getElementById('vertical-toggle');

    function toggleVertical() {
        isVertical = !isVertical;
        updateVerticalToggle();
        updateLanguageSettings();
    }

    verticalToggle.addEventListener('click', toggleVertical);
    updateVerticalToggle();  // Initial display update
}

function updateVerticalToggle() {
    const verticalToggle = document.getElementById('vertical-toggle');
    if (verticalToggle) {
        verticalToggle.textContent = isVertical ? 'Vertical' : 'Horizontal';
        verticalToggle.className = 'toggle-button';
        if (isVertical) {
            verticalToggle.style.backgroundColor = '#9C27B0';
            verticalToggle.style.color = 'white';
        } else {
            verticalToggle.style.backgroundColor = 'white';
            verticalToggle.style.color = 'black';
            verticalToggle.style.border = '1px solid #2196F3';
        }
    }
}

function updateLanguageSettings() {
    console.log('Updating language settings:', currentLanguage, isVertical);
    
    // Save the language and vertical preferences
    chrome.storage.sync.set({ 
        currentLanguage: currentLanguage,
        isVertical: isVertical
    }, async () => {
        console.log('Language settings saved');
        
        // Update UI elements
        updateVerticalToggle();
        
        // Always reinitialize Tesseract worker
        await initializeTesseract();
        
        // Retranslate the text if available
        if (lastOCRText) {
            showLoadingIndicator(`Processing with ${currentLanguage}${isVertical ? ' (Vertical)' : ''}...`);
            await processImageWithTesseract(lastOverlayData);
        } else {
            console.log('No OCR text available for reprocessing');
        }
        
        // Update the character wrapping
        setupCharacterHover();
    });
}

function setupCharacterHover() {
    const originalText = document.getElementById('original-text');
    wrapCJKCharacters(originalText);
}

function wrapCJKCharacters(element) {
    element.innerHTML = element.textContent.replace(
        /([\u4e00-\u9fff\u3400-\u4dbf\u3131-\u3163\uac00-\ud7a3])/g,
        '<span class="cjk-char">$1</span>'
    );
    
    const cjkChars = element.querySelectorAll('.cjk-char');
    cjkChars.forEach(char => {
        char.addEventListener('mouseenter', handleCJKHover);
        char.addEventListener('mouseleave', handleCJKHoverOut);
        char.addEventListener('click', handleCJKClick);
    });
}

function handleCJKHover(event) {
    if (currentHoveredElement !== event.target) {
        if (currentHoveredElement) {
            currentHoveredElement.classList.remove('hovered');
        }
        currentHoveredElement = event.target;
        currentHoveredElement.classList.add('hovered');
        
        const character = event.target.textContent;
        isHovering = true;
        showLoadingIndicator(`Fetching info for ${character}...`);
        sendMessage({ 
            action: "fetchCJKInfo", 
            character: character,
            language: currentLanguage
        });
    }
    
    const charRect = event.target.getBoundingClientRect();
    kanjiInfoBox.style.top = `${charRect.bottom + 5}px`;
    kanjiInfoBox.style.left = `${charRect.left}px`;
    kanjiInfoBox.style.transform = 'none';
}

function handleCJKHoverOut(event) {
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

function handleCJKClick(event) {
    const character = event.target.textContent;
    const url = getCJKDictionaryUrl(character);
    window.open(url, '_blank');
}

function getCJKDictionaryUrl(character) {
    if (currentLanguage === 'chn') {
        return `https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encodeURIComponent(character)}`;
    } else if (currentLanguage === 'kor') {
        return `https://en.dict.naver.com/#/search?query=${encodeURIComponent(character)}`;
    } else {
        return `https://jisho.org/search/${encodeURIComponent(character)}`;
    }
}

function showCJKInfo(info) {
    if (!isHovering) {
        return;
    }
    
    let contentHtml = '';

    if (currentLanguage === 'jap') {
        contentHtml = `
            <h4>${info.character}</h4>
            <p><strong>Reading:</strong> ${info.reading}</p>
            <p><strong>Meanings:</strong> ${info.meanings}</p>
            <p><strong>Kun readings:</strong> ${info.kunReadings}</p>
            <p><strong>On readings:</strong> ${info.onReadings}</p>
        `;
    } else {
        const meaningsWithKorean = info.meaning.split('\n');
        const meaningsList = meaningsWithKorean.map(item => {
            const [numberPart, ...contentParts] = item.split('. ');
            const content = contentParts.join('. ');
            const [korean, ...meaningParts] = content.split(' - ');
            const meaning = meaningParts.join(' - ');
            return `
                <li>
                    <span class="number">${numberPart}.</span>
                    <span class="korean">${korean}</span>
                    <span class="meaning">${meaning}</span>
                </li>`;
        }).join('');
        
        contentHtml = `
            <h4>${info.character}</h4>
            <p><strong>Meanings:</strong></p>
            <ul class="meanings-list">${meaningsList}</ul>
            <p><strong>Pronunciation:</strong> ${info.pronunciation}</p>
        `;
    }

    kanjiInfoBox.innerHTML = contentHtml;
    kanjiInfoBox.style.display = 'block';
}

// Setup character hover functionality
function setupCharacterHover() {
    const originalText = document.getElementById('original-text');
    wrapCJKCharacters(originalText);
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

async function initializeTesseract() {
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
    }

    const langCode = getLanguageCode();
    console.log('Initializing Tesseract worker for language:', langCode);
    tesseractWorker = await createWorker();
}
  
async function createWorker() {
    const langCode = getLanguageCode();
    console.log('Creating Tesseract worker for language:', langCode);
    const worker = await Tesseract.createWorker([langCode], 1, {
        workerPath: chrome.runtime.getURL('lib/worker.min.js'),
        corePath: chrome.runtime.getURL('lib/tesseract-core-simd-lstm.wasm.js'),
        langPath: chrome.runtime.getURL('languages/'),
        logger: (m) => {
            //console.log(m);
        },
        errorHandler: (e) => {
            console.warn(e);
        }
    });

    const params = {
        chop_enable: '1'
    };
    if (langCode.endsWith('_vert')) {
        params['tessedit_pageseg_mode'] = Tesseract.PSM.SINGLE_BLOCK_VERT_TEXT;
        
    }
    if (['chi_tra', 'chi_tra_vert', 'jpn', 'jpn_vert', 'kor', 'kor_vert'].includes(langCode)) {
        params['preserve_interword_spaces'] = '1';
    }

    await worker.setParameters(params);
    return worker;
}
  
function getLanguageCode() {
    const languageCodes = {
        'jap': isVertical ? 'jpn_vert' : 'jpn',
        'chn': isVertical ? 'chi_tra_vert' : 'chi_tra',
        'kor': isVertical ? 'kor_vert' : 'kor'
    };
    return languageCodes[currentLanguage];
}
  
function createLogContainer() {
    let container = document.getElementById('image-log-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'image-log-container';
        container.style.position = 'fixed';
        container.style.left = '10px';
        container.style.top = '5px';
        container.style.bottom = '5px';
        container.style.width = '250px';
        container.style.overflowY = 'auto';
        container.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        container.style.padding = '10px';
        container.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
        container.style.zIndex = '1000';
        container.style.fontFamily = 'Arial, sans-serif';
        document.body.appendChild(container);
    }
    return container;
}

function logImage(imageData, label) {
    console.log(`${label}:`, imageData);
    
    const container = createLogContainer();
    
    // Create a unique ID for this log entry
    const id = 'image-log-' + Date.now();
    
    // Create a container for the log entry
    const logEntry = document.createElement('div');
    logEntry.id = id;
    logEntry.style.marginBottom = '10px';
    logEntry.style.borderBottom = '1px solid #ddd';
    logEntry.style.paddingBottom = '5px';
    
    // Create a link element
    const link = document.createElement('a');
    link.href = imageData;
    link.target = '_blank';
    link.textContent = `View ${label}`;
    link.style.color = '#0066cc';
    link.style.textDecoration = 'none';
    link.style.display = 'block';
    link.style.marginBottom = '5px';
    
    // Create a thumbnail
    const thumbnail = document.createElement('img');
    thumbnail.src = imageData;
    thumbnail.alt = label;
    thumbnail.style.width = '100%';
    thumbnail.style.height = 'auto';
    thumbnail.style.maxHeight = '300px';
    thumbnail.style.objectFit = 'contain';
    thumbnail.style.border = '1px solid #ddd';
    thumbnail.style.borderRadius = '4px';
    
    // Add elements to the log entry
    logEntry.appendChild(link);
    logEntry.appendChild(thumbnail);
    
    // Add the log entry to the container
    container.insertBefore(logEntry, container.firstChild);
    
}

function invertImageColors(imageData) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                data[i] = 255 - data[i];         // red
                data[i + 1] = 255 - data[i + 1]; // green
                data[i + 2] = 255 - data[i + 2]; // blue
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.src = imageData;
    });
}

function rescaleImage(imageData, scaleFactor =2, targetDPI) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.onload = () => {
            // Calculate new dimensions
            const newWidth = img.width * scaleFactor;
            const newHeight = img.height * scaleFactor;

            // Set canvas size to new dimensions
            canvas.width = newWidth;
            canvas.height = newHeight;

            // Use better quality scaling algorithm
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            // Draw the image at the new size
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            // Set DPI metadata
            const dpi = targetDPI;
            const dpiString = `${dpi} ${dpi}`;
            canvas.setAttribute('data-dpi', dpiString);

            // Get the rescaled image data
            const rescaledImageData = canvas.toDataURL('image/png');

            resolve(rescaledImageData);
        };
        img.src = imageData;
    });
}

  function sharpenImage(imageData, amount = 50) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
  
        // Draw the original image onto the canvas
        ctx.drawImage(img, 0, 0);
  
        // Get the image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
  
        // Create a copy of the original image data
        const original = new Uint8ClampedArray(data);
  
        // Apply sharpening
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
              const i = (y * width + x) * 4 + c;
              
              // Apply convolution
              const sum = 
                5 * original[i] -
                original[i - 4] -
                original[i + 4] -
                original[i - width * 4] -
                original[i + width * 4];
  
              // Normalize and apply sharpening
              data[i] = Math.min(255, Math.max(0, original[i] + (amount / 100) * (sum - original[i])));
            }
          }
        }
  
        // Put the modified image data back on the canvas
        ctx.putImageData(imageData, 0, 0);
  
        // Convert the canvas to a data URL
        const sharpenedImageData = canvas.toDataURL('image/png');
  
        resolve(sharpenedImageData);
      };
      img.src = imageData;
    });
  }

  function enhanceBrightness(imageData, brightnessLevel = 50) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
  
        // Draw the original image onto the canvas
        ctx.drawImage(img, 0, 0);
  
        // Get the image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
  
        // Convert brightnessLevel to a multiplier
        const brightnessFactor = 1 + (brightnessLevel / 100);
  
        // Enhance brightness
        for (let i = 0; i < data.length; i += 4) {
          data[i] = Math.min(255, data[i] * brightnessFactor);     // Red
          data[i + 1] = Math.min(255, data[i + 1] * brightnessFactor); // Green
          data[i + 2] = Math.min(255, data[i + 2] * brightnessFactor); // Blue
          // data[i + 3] is the alpha channel, we don't modify it
        }
  
        // Put the modified image data back on the canvas
        ctx.putImageData(imageData, 0, 0);
  
        // Convert the canvas to a data URL
        const enhancedImageData = canvas.toDataURL('image/png');
  
        resolve(enhancedImageData);
      };
      img.src = imageData;
    });
  }

  function applyMeanFilter(imageData, kernelSize = 3) {
    return new Promise((resolve, reject) => {
      // Create an image object to load the base64 image
      const img = new Image();
      img.onload = () => {
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the image on the canvas
        ctx.drawImage(img, 0, 0);
        
        // Get the image data
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        // Apply mean filter
        const result = new Uint8ClampedArray(data.length);
        const halfKernel = Math.floor(kernelSize / 2);
        
        for (let y = 0; y < canvas.height; y++) {
          for (let x = 0; x < canvas.width; x++) {
            let r = 0, g = 0, b = 0, a = 0, count = 0;
            
            // Gather surrounding pixels
            for (let ky = -halfKernel; ky <= halfKernel; ky++) {
              for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                const px = x + kx;
                const py = y + ky;
                
                if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
                  const i = (py * canvas.width + px) * 4;
                  r += data[i];
                  g += data[i + 1];
                  b += data[i + 2];
                  a += data[i + 3];
                  count++;
                }
              }
            }
            
            // Calculate average
            const i = (y * canvas.width + x) * 4;
            result[i] = r / count;
            result[i + 1] = g / count;
            result[i + 2] = b / count;
            result[i + 3] = a / count;
          }
        }
        
        // Create new ImageData with the result
        const resultImgData = new ImageData(result, canvas.width, canvas.height);
        ctx.putImageData(resultImgData, 0, 0);
        
        // Convert the result back to base64
        const resultBase64 = canvas.toDataURL();
        resolve(resultBase64);
      };
      
      img.onerror = (error) => {
        reject(error);
      };
      
      // Load the base64 image
      img.src = imageData;
    });
  }

  function adaptiveGaussianThreshold(imageData, blockSize = 11, C = 2) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            const width = imageData.width;
            const height = imageData.height;

            // Create grayscale version
            const grayscale = new Uint8ClampedArray(width * height);
            for (let i = 0; i < data.length; i += 4) {
                grayscale[i / 4] = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
            }

            // Compute integral image
            const integral = new Float64Array(width * height);
            for (let i = 0; i < width; i++) {
                let sum = 0;
                for (let j = 0; j < height; j++) {
                    sum += grayscale[j * width + i];
                    if (i === 0) {
                        integral[j * width + i] = sum;
                    } else {
                        integral[j * width + i] = integral[j * width + i - 1] + sum;
                    }
                }
            }

            // Perform adaptive thresholding
            const halfBlockSize = Math.floor(blockSize / 2);
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    let x1 = Math.max(0, x - halfBlockSize);
                    let y1 = Math.max(0, y - halfBlockSize);
                    let x2 = Math.min(width - 1, x + halfBlockSize);
                    let y2 = Math.min(height - 1, y + halfBlockSize);

                    let count = (x2 - x1 + 1) * (y2 - y1 + 1);
                    let sum = integral[y2 * width + x2] -
                              (x1 > 0 ? integral[y2 * width + (x1 - 1)] : 0) -
                              (y1 > 0 ? integral[(y1 - 1) * width + x2] : 0) +
                              (x1 > 0 && y1 > 0 ? integral[(y1 - 1) * width + (x1 - 1)] : 0);

                    let idx = y * width + x;
                    if (grayscale[idx] * count <= sum * (100 - C) / 100) {
                        data[idx * 4] = data[idx * 4 + 1] = data[idx * 4 + 2] = 0;
                    } else {
                        data[idx * 4] = data[idx * 4 + 1] = data[idx * 4 + 2] = 255;
                    }
                }
            }

            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL());
        };
        img.src = imageData;
    });
}

  function whitenImage(base64Image, whitenFactor = 0.5) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // Increase each color channel
          data[i] = Math.min(255, data[i] + (255 - data[i]) * whitenFactor);     // Red
          data[i+1] = Math.min(255, data[i+1] + (255 - data[i+1]) * whitenFactor); // Green
          data[i+2] = Math.min(255, data[i+2] + (255 - data[i+2]) * whitenFactor); // Blue
          // Alpha channel (data[i+3]) remains unchanged
        }
        
        ctx.putImageData(imageData, 0, 0);
        const whitenedBase64 = canvas.toDataURL('image/png');
        resolve(whitenedBase64);
      };
      img.onerror = reject;
      img.src = base64Image;
    });
  }

  function binarizeImage(base64Image, threshold = 128, reverse = false) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale first
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          
          // Binarize
          let val = avg > threshold ? 255 : 0;
          
          // Reverse if needed
          if (reverse) {
            val = 255 - val;
          }
          
          data[i] = val;     // Red
          data[i + 1] = val; // Green
          data[i + 2] = val; // Blue
          // Alpha channel (data[i+3]) remains unchanged
        }
        
        ctx.putImageData(imageData, 0, 0);
        const binarizedBase64 = canvas.toDataURL('image/png');
        resolve(binarizedBase64);
      };
      img.onerror = reject;
      img.src = base64Image;
    });
  }

  function drawBoundingBoxes(imageData, words) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            // Draw the original image
            ctx.drawImage(img, 0, 0);

            // Draw bounding boxes
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            words.forEach(word => {
                const { bbox } = word;
                ctx.strokeRect(bbox.x0, bbox.y0, bbox.x1 - bbox.x0, bbox.y1 - bbox.y0);
            });

            // Convert canvas to image data
            const boundingBoxImageData = canvas.toDataURL('image/png');
            resolve(boundingBoxImageData);
        };
        img.src = imageData;
    });
}

async function processImageWithTesseract(imageData) {
    const langCode = getLanguageCode();
    console.log(langCode);
    showLoadingIndicator(`Processing image with Tesseract (${langCode})...`);
    
    try {
        logImage(imageData, "Original Image");
        if(isFirstProcessing){
            // Apply image processing steps
            
            // imageData = await invertImageColors(imageData);
            // logImage(imageData, "After Color Inversion")

            // imageData = await enhanceBrightness(imageData, 50);
            // logImage(imageData, "After Brightness")

            // imageData = await adaptiveGaussianThreshold(imageData, 51, 31);
            // logImage(imageData, "After adaptiveGaussian");

            // imageData = await binarizeImage(imageData, 108, true);
            // logImage(imageData, "After Binarization");

            // imageData = await applyMeanFilter(imageData, 3);
            // logImage(imageData, "After MeanFilter");

            // imageData = await rescaleImage(imageData, 4);
            // logImage(imageData, "After Rescaling");

            isFirstProcessing = false;
        }

        await initializeTesseract();
        console.log(imageData);
        const result = await tesseractWorker.recognize(imageData);
        
        // Generate bounding box image
        const boundingBoxImage = await drawBoundingBoxes(imageData, result.data.words);
        //logImage(boundingBoxImage, "Bounding Boxes");

        let text = result.data.text;
        
        // Post-processing for CJK languages
        if (['chi_tra', 'chi_tra_vert', 'jpn', 'jpn_vert', 'kor', 'kor_vert'].includes(langCode)){
            if (text) {
                text = text.replace(/[^\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}.,!?…]/gu, '');
            }
        }
        
        console.log('Tesseract OCR Result:', text);
        lastOCRText = text;
        lastOverlayData = imageData;

        // Proceed with translation
        sendMessage({ 
            action: "translate", 
            text: text, 
            service: currentTranslationService,
            language: currentLanguage
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

function adjustFontSize(textElement, container) {
    let fontSize = 14;
    textElement.style.fontSize = `${fontSize}px`;

    while (textElement.scrollHeight > container.clientHeight || textElement.scrollWidth > container.clientWidth) {
        fontSize--;
        if (fontSize < 8) break; // Minimum font size
        textElement.style.fontSize = `${fontSize}px`;
    }
}

chrome.storage.sync.get(['extensionEnabled', 'currentTranslationService', 'currentLanguage', 'overlayEnabled', 'isVertical'], (data) => {
    isExtensionEnabled = data.extensionEnabled !== false;
    currentTranslationService = data.currentTranslationService || 'google';
    currentLanguage = data.currentLanguage || 'jap';
    isOverlayEnabled = data.overlayEnabled === true;
    isVertical = data.isVertical || false;
    console.log('Extension initialized with language:', currentLanguage, 'isVertical:', isVertical);
});
