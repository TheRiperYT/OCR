chrome.runtime.onInstalled.addListener(() => {
  console.log('Background: Extension installed');
  chrome.storage.sync.set({ extensionEnabled: true, currentTranslationService: 'google' });
});

import { API_KEYS } from './config.js';
const OCR_API_KEY = API_KEYS.OCR_SPACE;
const deepL_API_KEY = API_KEYS.DEEPL;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background: Received message:', request);
  
  if (request.action === "captureVisibleTab") {
    console.log('Background: Capturing visible tab');
    chrome.tabs.captureVisibleTab(null, {format: 'png'}, function(dataUrl) {
      console.log('Background: Tab captured, cropping image');
      cropImage(dataUrl, request.area, request.language, sendResponse);
    });
  } else if (request.action === "translate") {
    console.log('Background: Translating text');
    translateText(request.text, request.service, request.language, sendResponse);
  } else if (request.action === "fetchCJKInfo") {
    console.log('Background: Fetching CJK info');
    fetchCJKInfo(request.character, request.language, sendResponse);
  } else if (request.action === "fetchMultiKanjiInfo") {
    console.log('Background: Fetching multi-kanji info');
    fetchMultiKanjiInfo(request.kanji, sendResponse);
  } else {
    console.error('Background: Unknown action:', request.action);
    sendResponse({ action: "error", error: "Unknown action" });
  }
  
  return true;
});

function cropImage(dataUrl, area, language, sendResponse) {
  console.log('Background: Starting image crop');
  fetch(dataUrl)
    .then(res => res.blob())
    .then(blob => createImageBitmap(blob))
    .then(imageBitmap => {
      console.log('Background: Image bitmap created');
      const canvas = new OffscreenCanvas(area.width, area.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imageBitmap, area.x, area.y, area.width, area.height, 0, 0, area.width, area.height);
      return canvas.convertToBlob({type: 'image/png'});
    })
    .then(blob => {
      console.log('Background: Image cropped to blob');
      const reader = new FileReader();
      reader.onloadend = function() {
        console.log('Background: Image converted to base64');
        const base64data = reader.result;
        chrome.storage.sync.get('tesseractEnabled', function(result) {
          if (result.tesseractEnabled) {
            console.log('Background: Tesseract enabled, sending image to content script');
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
              if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {
                  action: "processImageWithTesseract",
                  imageData: base64data,
                  language: language
                }, function(response) {
                  if (chrome.runtime.lastError) {
                    console.log('Error sending message:', chrome.runtime.lastError);
                  } else {
                    console.log('Message sent successfully');
                  }
                });
              } else {
                console.error('No active tab found');
              }
            });
          } else {
            console.log('Background: Tesseract disabled, performing OCR');
            performOCR(base64data, language, sendResponse);
          }
        });
      }
      reader.readAsDataURL(blob);
    })
    .catch(error => {
      console.error('Background: Error cropping image:', error);
      sendResponse({
        action: "ocrError",
        error: error.toString(),
        details: "Error occurred while processing the image"
      });
    });
}

function performOCR(image, language, sendResponse) {
  console.log(`Background: Starting OCR process for ${language}...`);
  const apiKey = OCR_API_KEY;
  const languageCode = language === 'chn' ? 'cht' : (language === 'kor' ? 'kor' : 'jpn');
  
  fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      'apikey': apiKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `base64Image=${encodeURIComponent(image)}&language=${languageCode}&isOverlayRequired=false&detectOrientation=true`
  })
  .then(response => response.json())
  .then(data => {
    console.log('Background: OCR API response data:', JSON.stringify(data, null, 2));
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      let text = data.ParsedResults[0].ParsedText;
      text = cleanOCRText(text, language);
      if (language === 'CHN') text = reorderText(text);
      console.log('Background: OCR Result:', text);
      if (text.trim() === '') {
        throw new Error("OCR result is empty");
      }
      sendResponse({
        action: "ocrResult",
        text: text
      });
    } else {
      console.error('Background: OCR parsing failed:', data);
      throw new Error(`OCR parsing failed: ${data.ErrorMessage || 'Unknown error'}`);
    }
  })
  .catch(error => {
    console.error('Background: OCR Error:', error);
    sendResponse({
      action: "ocrError",
      error: error.toString(),
      details: error.message
    });
  });
}

function reorderText(text) {
  let phrases = text.split(' ');
  phrases.reverse();
  text = phrases.join('');
  return text;
}

function cleanOCRText(text, language) {
  if (language === 'jap') {
    text = text.replace(/:{2,}D/g, '');
    text = text.replace(/·/g, '');
    text = text.replace(/[^\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\s]/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/([あ-ん])つ([かきくけこさしすせそたちつてとはひふへほぱぴぷぺぽばびぶべぼ])/g, '$1っ$2');
    text = text.replace(/ロ/g, '口');
  } else if (language === 'chn') {
    text = text.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\s]/g, '');
    text = text.replace(/\s+/g, ' ').trim();
  } else if (language === 'kor') {
    text = text.replace(/[^\u3131-\u3163\uac00-\ud7a3\s]/g, '');
    text = text.replace(/\s+/g, ' ').trim();
  }
  return text;
}

function translateText(text, service, sourceLanguage, sendResponse) {
  console.log(`Background: Translating ${sourceLanguage} text with ${service}`);
  if (service === 'google') {
    translateWithGoogle(text, sourceLanguage, sendResponse);
  } else if (service === 'deepl') {
    translateWithDeepL(text, sourceLanguage, sendResponse);
  } else {
    console.error('Background: Unknown translation service:', service);
    sendResponse({
      action: "translationError",
      error: `Unknown translation service: ${service}`
    });
  }
}

function translateWithGoogle(text, sourceLanguage, sendResponse) {
  const sourceLang = sourceLanguage === 'chn' ? 'zh-CN' : (sourceLanguage === 'kor' ? 'ko' : 'ja');
  const googleTranslateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=en&dt=t&q=${encodeURIComponent(text)}`;

  fetch(googleTranslateUrl)
    .then(response => response.json())
    .then(result => {
      console.log('Background: Google Translate response:', result);
      if (result && Array.isArray(result[0])) {
        let translatedText = result[0]
          .map(segment => segment[0])
          .filter(Boolean)
          .join(' ');
        
        console.log('Background: Translated Text:', translatedText);
        
        sendResponse({
          action: "translationResult",
          originalText: text,
          translatedText: translatedText
        });
      } else {
        throw new Error("Google Translate response format is incorrect");
      }
    })
    .catch(error => {
      console.error('Background: Google Translate Error:', error);
      sendResponse({
        action: "translationError",
        error: error.toString()
      });
    });
}

function translateWithDeepL(text, sourceLanguage, sendResponse) {
  const DEEPL_API_KEY = deepL_API_KEY;
  const deeplUrl = 'https://api-free.deepl.com/v2/translate';
  const sourceLang = sourceLanguage === 'chn' ? 'ZH' : (sourceLanguage === 'kor' ? 'KO' : 'JA');
  const data = `auth_key=${DEEPL_API_KEY}&text=${encodeURIComponent(text)}&source_lang=${sourceLang}&target_lang=EN`;

  console.log('Background: Sending request to DeepL');
  fetch(deeplUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: data
  })
  .then(response => response.json())
  .then(result => {
    console.log('Background: DeepL response received:', result);
    if (result.translations && result.translations.length > 0) {
      sendResponse({
        action: "translationResult",
        originalText: text,
        translatedText: result.translations[0].text
      });
    } else {
      throw new Error("DeepL response format is incorrect");
    }
  })
  .catch(error => {
    console.error('Background: DeepL Translate Error:', error);
    sendResponse({
      action: "translationError",
      error: error.toString()
    });
  });
}

function fetchCJKInfo(character, language, sendResponse) {
  let url;
  if (language === 'jap') {
    url = `https://jisho.org/search/${encodeURIComponent(character)}`;
  } else if (language === 'chn') {
    url = `https://www.mdbg.net/chinese/dictionary?page=worddict&wdrst=0&wdqb=${encodeURIComponent(character)}`;
  } else if (language === 'kor') {
    url = `https://en.dict.naver.com/#/search?query=${encodeURIComponent(character)}`;
  }

  fetch(url)
    .then(response => response.text())
    .then(html => {
      let info = {};
      if (language === 'jap') {
        info = extractJapaneseInfo(html, character);
      } else if (language === 'chn') {
        info = extractChineseInfo(html, character);
      } else if (language === 'kor') {
        info = extractKoreanInfo(html, character);
      }
      sendResponse({
        action: "cjkInfo",
        ...info
      });
    })
    .catch(error => {
      console.error(`Background: Error fetching ${language} info:`, error);
      sendResponse({
        action: "error",
        error: error.toString()
      });
    });
}

function extractJapaneseInfo(html, character) {
  const readingMatch = html.match(/class="furigana">\s*<span class="kanji-\d-up kanji">([^<]+)/);
  const reading = readingMatch ? readingMatch[1].trim() : 'Not found';

  const meaningsMatch = html.match(/<div class="meanings english sense">([\s\S]*?)<\/div>/);
  const meanings = meaningsMatch ? meaningsMatch[1].trim() : 'Not found';

  const kunMatch = html.match(/<div class="kun readings">([\s\S]*?)<\/div>/);
  const kunReadings = kunMatch 
    ? kunMatch[1].replace(/<[^>]+>/g, '').replace(/Kun:/i, '').trim() 
    : 'Not found';

  const onMatch = html.match(/<div class="on readings">([\s\S]*?)<\/div>/);
  const onReadings = onMatch 
    ? onMatch[1].replace(/<[^>]+>/g, '').replace(/On:/i, '').trim() 
    : 'Not found';

  return { character, reading, meanings, kunReadings, onReadings };
}

function extractChineseInfo(html, character) {
  const resultMatch = html.match(/<tr class="row">[\s\S]*?<\/tr>/);
  if (!resultMatch) {
    return { character, pronunciation: 'Not found', meaning: 'Not found' };
  }

  const rowHtml = resultMatch[0];
  
  const pinyinMatch = rowHtml.match(/<div class="pinyin"[^>]*>[\s\S]*?<span class="mpt\d+">([^<]+)<\/span>/);
  const pinyin = pinyinMatch ? pinyinMatch[1].trim() : 'Not found';
  
  const detailsMatch = rowHtml.match(/<td class="details">([\s\S]*?)<\/td>/);
  let meanings = 'Not found';
  if (detailsMatch) {
    const defsMatch = detailsMatch[1].match(/<div class="defs">([\s\S]*?)<\/div>/);
    if (defsMatch) {
      meanings = defsMatch[1].split(';')
        .map(meaning => meaning.trim())
        .filter(meaning => meaning.length > 0)
        .map((meaning, index) => `${index + 1}. ${character} - ${meaning}`)
        .join('\n');
    }
  }
  
  return { character, pronunciation: pinyin, meaning: meanings };
}

function extractKoreanInfo(html, character) {
  const similarWordsTableMatch = html.match(/<table class="similar-words">([\s\S]*?)<\/table>/);
  
  if (!similarWordsTableMatch) {
    return { character, pronunciation: 'Not found', meaning: 'Not found' };
  }

  const tableHtml = similarWordsTableMatch[1];
  const rows = tableHtml.match(/<tr>([\s\S]*?)<\/tr>/g);
  
  let meaningsWithKorean = [];
  
  if (rows) {
    rows.forEach(row => {
      const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/g);
      if (cells && cells.length >= 3) {
        let koreanSymbol = cells[1].replace(/<[^>]+>/g, '').trim();
        let meaning = cells[2].replace(/<[^>]+>/g, '').trim();
        if (meaning && !meaningsWithKorean.some(item => item.meaning === meaning)) {
          meaningsWithKorean.push({ korean: koreanSymbol, meaning: meaning });
        }
      }
    });
  }

  let formattedMeanings = meaningsWithKorean.map((item, index) => 
    `${index + 1}. ${item.korean} - ${item.meaning}`
  ).join('\n');

  return { character, pronunciation: 'N/A', meaning: formattedMeanings || 'Not found' };
}

function fetchMultiKanjiInfo(kanji, sendResponse) {
  const url = `https://jisho.org/search/${encodeURIComponent(kanji)}`;
  console.log('Fetching URL:', url);
  
  fetch(url)
    .then(response => response.text())
    .then(html => {
      console.log('Received HTML response');
      
      const reading = extractKanjiReadings(html);
      
      const meaningsRegex = /<div class="meaning-wrapper">[\s\S]*?<span class="meaning-meaning">([\s\S]*?)<\/span>/g;
      let match;
      let meanings = [];
      while ((match = meaningsRegex.exec(html)) !== null) {
        meanings.push(match[1].trim());
      }
      const formattedMeanings = meanings.length > 0 ? meanings.join('; ') : 'Not found';

      console.log('Extracted multi-kanji info:', { reading, formattedMeanings });

      sendResponse({
        action: "multiKanjiInfo",
        kanji: kanji,
        reading: reading,
        meanings: formattedMeanings,
        url: url
      });
    })
    .catch(error => {
      console.error('Background: Error fetching multi-kanji info:', error);
      sendResponse({
        action: "error",
        error: error.toString()
      });
    });
}

function extractKanjiReadings(html) {
  console.log('Extracting kanji readings from HTML...');
  
  const furiganaPattern = /<span class="furigana"[^>]*>([\s\S]*?)<\/div>/i;
  const furiganaMatch = html.match(furiganaPattern);
  
  if (!furiganaMatch) {
    console.log('No furigana span found in the HTML');
    return 'Not found';
  }
  
  console.log('Found furigana content. Full content:');
  console.log(furiganaMatch[1]);
  
  const hiraganaPattern = /[\u3040-\u309F]/g;
  const hiraganaMatches = furiganaMatch[1].match(hiraganaPattern);
  
  if (!hiraganaMatches) {
    console.log('No hiragana characters found within furigana content');
    return 'Not found';
  }
  
  const reading = hiraganaMatches.join('');
  console.log('Extracted reading:', reading);
  
  return reading;
}