document.addEventListener('DOMContentLoaded', function() {
    const extensionToggle = document.getElementById('extensionToggle');
    const overlayToggle = document.getElementById('overlayToggle');
    const tesseractToggle = document.getElementById('tesseractToggle');
    const japaneseBtn = document.getElementById('japaneseBtn');
    const chineseBtn = document.getElementById('chineseBtn');
    const koreanBtn = document.getElementById('koreanBtn');

    // Load saved settings
    chrome.storage.sync.get(['extensionEnabled', 'overlayEnabled', 'tesseractEnabled', 'currentLanguage'], function(result) {
        extensionToggle.checked = result.extensionEnabled !== false;
        overlayToggle.checked = result.overlayEnabled === true;
        tesseractToggle.checked = result.tesseractEnabled === true;
        
        updateToggleLabel(extensionToggle, 'extensionStatus');
        updateToggleLabel(overlayToggle, 'overlayStatus');
        updateToggleLabel(tesseractToggle, 'tesseractStatus');
        
        setActiveLanguageButton(result.currentLanguage || 'JAP');
    });

    // Extension toggle
    extensionToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.sync.set({extensionEnabled: isEnabled}, function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleExtension", isEnabled: isEnabled});
            });
        });
        updateToggleLabel(this, 'extensionStatus');
    });

    // Overlay toggle
    overlayToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.sync.set({overlayEnabled: isEnabled}, function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleOverlay", isEnabled: isEnabled});
            });
        });
        updateToggleLabel(this, 'overlayStatus');
    });

    // Tesseract toggle
    tesseractToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.sync.set({tesseractEnabled: isEnabled}, function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleTesseract", isEnabled: isEnabled});
            });
        });
        updateToggleLabel(this, 'tesseractStatus');
    });

    // Language selection
    japaneseBtn.addEventListener('click', () => setLanguage('JAP'));
    chineseBtn.addEventListener('click', () => setLanguage('CHN'));
    koreanBtn.addEventListener('click', () => setLanguage('KOR'));

    function setLanguage(lang) {
        chrome.storage.sync.set({currentLanguage: lang}, function() {
            setActiveLanguageButton(lang);
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "changeLanguage", language: lang});
            });
        });
    }

    function setActiveLanguageButton(lang) {
        japaneseBtn.classList.toggle('active', lang === 'JAP');
        chineseBtn.classList.toggle('active', lang === 'CHN');
        koreanBtn.classList.toggle('active', lang === 'KOR');
    }

    function updateToggleLabel(toggle, labelId) {
        const label = document.getElementById(labelId);
        if (label) {
            label.textContent = toggle.checked ? 'ON' : 'OFF';
        }
    }
});