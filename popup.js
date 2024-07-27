document.addEventListener('DOMContentLoaded', function() {
    const extensionToggle = document.getElementById('extensionToggle');
    const overlayToggle = document.getElementById('overlayToggle');
    const toggleStatus = document.getElementById('toggleStatus');
    const overlayStatus = document.getElementById('overlayStatus');
    const japaneseBtn = document.getElementById('japaneseBtn');
    const chineseBtn = document.getElementById('chineseBtn');

    // Load saved settings
    chrome.storage.sync.get(['extensionEnabled', 'overlayEnabled', 'currentLanguage'], function(result) {
        extensionToggle.checked = result.extensionEnabled !== false;
        overlayToggle.checked = result.overlayEnabled === true;
        toggleStatus.textContent = extensionToggle.checked ? 'ON' : 'OFF';
        overlayStatus.textContent = overlayToggle.checked ? 'ON' : 'OFF';
        
        if (result.currentLanguage === 'CHN') {
            japaneseBtn.classList.remove('active');
            chineseBtn.classList.add('active');
        } else {
            japaneseBtn.classList.add('active');
            chineseBtn.classList.remove('active');
        }
    });

    // Extension toggle
    extensionToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.sync.set({extensionEnabled: isEnabled}, function() {
            toggleStatus.textContent = isEnabled ? 'ON' : 'OFF';
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleExtension", isEnabled: isEnabled});
            });
        });
    });

    // Overlay toggle
    overlayToggle.addEventListener('change', function() {
        const isEnabled = this.checked;
        chrome.storage.sync.set({overlayEnabled: isEnabled}, function() {
            overlayStatus.textContent = isEnabled ? 'ON' : 'OFF';
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "toggleOverlay", isEnabled: isEnabled});
            });
        });
    });

    // Language selection
    japaneseBtn.addEventListener('click', function() {
        setLanguage('JAP');
    });

    chineseBtn.addEventListener('click', function() {
        setLanguage('CHN');
    });

    function setLanguage(lang) {
        chrome.storage.sync.set({currentLanguage: lang}, function() {
            if (lang === 'JAP') {
                japaneseBtn.classList.add('active');
                chineseBtn.classList.remove('active');
            } else {
                japaneseBtn.classList.remove('active');
                chineseBtn.classList.add('active');
            }
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action: "changeLanguage", language: lang});
            });
        });
    }
});