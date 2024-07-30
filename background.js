chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({
        extensionEnabled: true,
        currentTranslationService: "google",
    });
});

import { API_KEYS } from "./config.js";
const OCR_API_KEY = API_KEYS.OCR_SPACE;
const deepL_API_KEY = API_KEYS.DEEPL;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureVisibleTab") {
        chrome.tabs.captureVisibleTab(
            null,
            { format: "png" },
            function (dataUrl) {
                cropImage(
                    dataUrl,
                    request.area,
                    request.language,
                    sendResponse
                );
            }
        );
    } else if (request.action === "translate") {
        translateText(
            request.text,
            request.service,
            request.language,
            sendResponse
        );
    } else if (request.action === "fetchKanjiInfo") {
        fetchKanjiInfo(request.kanji, sendResponse);
    } else if (request.action === "fetchMultiKanjiInfo") {
        fetchMultiKanjiInfo(request.kanji, sendResponse);
    } else {
        console.error("Background: Unknown action:", request.action);
        sendResponse({ action: "error", error: "Unknown action" });
    }

    return true;
});

function cropImage(dataUrl, area, language, sendResponse) {
    fetch(dataUrl)
        .then((res) => res.blob())
        .then((blob) => createImageBitmap(blob))
        .then((imageBitmap) => {
            const canvas = new OffscreenCanvas(area.width, area.height);
            const ctx = canvas.getContext("2d");
            ctx.drawImage(
                imageBitmap,
                area.x,
                area.y,
                area.width,
                area.height,
                0,
                0,
                area.width,
                area.height
            );
            return canvas.convertToBlob({ type: "image/png" });
        })
        .then((blob) => {
            const reader = new FileReader();
            reader.onloadend = function () {
                const base64data = reader.result;
                const formattedBase64 = base64data.includes(
                    "data:image/png;base64,"
                )
                    ? base64data
                    : `data:image/png;base64,${base64data.split(",")[1]}`;
                performOCR(formattedBase64, language, sendResponse);
            };
            reader.readAsDataURL(blob);
        })
        .catch((error) => {
            //console.error("Background: Error cropping image:", error);
            sendResponse({
                action: "ocrError",
                error: error.toString(),
                details: "Error occurred while processing the image",
            });
        });
}

function performOCR(image, language, sendResponse) {
    const apiKey = OCR_API_KEY;
    const languageCode =
        language === "CHN" ? "cht" : language === "KOR" ? "kor" : "jpn"; // 'chs' - Simplified Chinese, 'cht' - Traditional Chinese, 'jpn' for Japanese, 'kor' for Korean

    fetch("https://api.ocr.space/parse/image", {
        method: "POST",
        headers: {
            apikey: apiKey,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `base64Image=${encodeURIComponent(
            image
        )}&language=${languageCode}&isOverlayRequired=false&detectOrientation=true`,
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(
                "Background: OCR API response data:",
                JSON.stringify(data, null, 2)
            );
            if (data.ParsedResults && data.ParsedResults.length > 0) {
                let text = data.ParsedResults[0].ParsedText;
                text = cleanOCRText(text, language);
                if (text.trim() === "") {
                    throw new Error("OCR result is empty");
                }
                sendResponse({
                    action: "ocrResult",
                    text: text,
                });
            } else {
                console.error("Background: OCR parsing failed:", data);
                throw new Error(
                    `OCR parsing failed: ${
                        data.ErrorMessage || "Unknown error"
                    }`
                );
            }
        })
        .catch((error) => {
            //console.error('Background: OCR Error:', error);
            sendResponse({
                action: "ocrError",
                error: error.toString(),
                details: error.message,
            });
        });
}

function cleanOCRText(text, language) {
    if (language === "JAP") {
        text = text.replace(/:{2,}D/g, "");
        text = text.replace(/·/g, "");
        text = text.replace(
            /[^\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf\s]/g,
            ""
        );
        text = text.replace(/\s+/g, " ").trim();
        text = text.replace(
            /([あ-ん])つ([かきくけこさしすせそたちつてとはひふへほぱぴぷぺぽばびぶべぼ])/g,
            "$1っ$2"
        );
        text = text.replace(/ロ/g, "口");
    } else if (language === "CHN") {
        text = text.replace(/[^\u4e00-\u9fff\u3400-\u4dbf\s]/g, "");
        text = text.replace(/\s+/g, " ").trim();
    }
    return text;
}

function translateText(text, service, sourceLanguage, sendResponse) {
    if (service === "google") {
        translateWithGoogle(text, sourceLanguage, sendResponse);
    } else if (service === "deepl") {
        translateWithDeepL(text, sourceLanguage, sendResponse);
    } else {
        console.error("Background: Unknown translation service:", service);
        sendResponse({
            action: "translationError",
            error: `Unknown translation service: ${service}`,
        });
    }
}

function translateWithGoogle(text, sourceLanguage, sendResponse) {
    const sourceLang =
        sourceLanguage === "CHN"
            ? "zh-CN"
            : sourceLanguage === "KOR"
            ? "ko"
            : "ja";
    const googleTranslateUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=en&dt=t&q=${encodeURIComponent(
        text
    )}`;

    fetch(googleTranslateUrl)
        .then((response) => response.json())
        .then((result) => {
            if (result && Array.isArray(result[0])) {
                let translatedText = result[0]
                    .map((segment) => segment[0])
                    .filter(Boolean)
                    .join(" ");

                sendResponse({
                    action: "translationResult",
                    originalText: text,
                    translatedText: translatedText,
                });
            } else {
                throw new Error(
                    "Google Translate response format is incorrect"
                );
            }
        })
        .catch((error) => {
            console.error("Background: Google Translate Error:", error);
            sendResponse({
                action: "translationError",
                error: error.toString(),
            });
        });
}

function translateWithDeepL(text, sourceLanguage, sendResponse) {
    const DEEPL_API_KEY = deepL_API_KEY;
    const deeplUrl = "https://api-free.deepl.com/v2/translate";
    const sourceLang =
        sourceLanguage === "CHN"
            ? "ZH"
            : sourceLanguage === "KOR"
            ? "KO"
            : "JA";
    const data = `auth_key=${DEEPL_API_KEY}&text=${encodeURIComponent(
        text
    )}&source_lang=${sourceLang}&target_lang=EN`;

    fetch(deeplUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: data,
    })
        .then((response) => response.json())
        .then((result) => {
            if (result.translations && result.translations.length > 0) {
                sendResponse({
                    action: "translationResult",
                    originalText: text,
                    translatedText: result.translations[0].text,
                });
            } else {
                throw new Error("DeepL response format is incorrect");
            }
        })
        .catch((error) => {
            console.error("Background: DeepL Translate Error:", error);
            sendResponse({
                action: "translationError",
                error: error.toString(),
            });
        });
}

function fetchKanjiInfo(kanji, sendResponse) {
    const url = `https://jisho.org/search/${encodeURIComponent(kanji)}`;

    fetch(url)
        .then((response) => response.text())
        .then((html) => {
            const readingMatch = html.match(
                /class="furigana">\s*<span class="kanji-\d-up kanji">([^<]+)/
            );
            const reading = readingMatch ? readingMatch[1].trim() : "Not found";

            const meaningsMatch = html.match(
                /<div class="meanings english sense">([\s\S]*?)<\/div>/
            );
            const meanings = meaningsMatch
                ? meaningsMatch[1].trim()
                : "Not found";

            const kunMatch = html.match(
                /<div class="kun readings">([\s\S]*?)<\/div>/
            );
            const kunReadings = kunMatch
                ? kunMatch[1]
                      .replace(/<[^>]+>/g, "")
                      .replace(/Kun:/i, "")
                      .trim()
                : "Not found";

            const onMatch = html.match(
                /<div class="on readings">([\s\S]*?)<\/div>/
            );
            const onReadings = onMatch
                ? onMatch[1]
                      .replace(/<[^>]+>/g, "")
                      .replace(/On:/i, "")
                      .trim()
                : "Not found";

            sendResponse({
                action: "kanjiInfo",
                kanji: kanji,
                reading: reading,
                meanings: meanings,
                kunReadings: kunReadings,
                onReadings: onReadings,
                url: url,
            });
        })
        .catch((error) => {
            console.error("Background: Error fetching kanji info:", error);
            sendResponse({
                action: "error",
                error: error.toString(),
            });
        });
}

function extractKanjiReadings(html) {
    const furiganaPattern = /<span class="furigana"[^>]*>([\s\S]*?)<\/div>/i;
    const furiganaMatch = html.match(furiganaPattern);

    if (!furiganaMatch) {
        return "Not found";
    }

    const hiraganaPattern = /[\u3040-\u309F]/g;
    const hiraganaMatches = furiganaMatch[1].match(hiraganaPattern);

    if (!hiraganaMatches) {
        return "Not found";
    }

    const reading = hiraganaMatches.join("");

    return reading;
}

function fetchMultiKanjiInfo(kanji, sendResponse) {
    const url = `https://jisho.org/search/${encodeURIComponent(kanji)}`;

    fetch(url)
        .then((response) => response.text())
        .then((html) => {
            const reading = extractKanjiReadings(html);

            const meaningsRegex =
                /<div class="meaning-wrapper">[\s\S]*?<span class="meaning-meaning">([\s\S]*?)<\/span>/g;
            let match;
            let meanings = [];
            while ((match = meaningsRegex.exec(html)) !== null) {
                meanings.push(match[1].trim());
            }
            const formattedMeanings =
                meanings.length > 0 ? meanings.join("; ") : "Not found";

            sendResponse({
                action: "multiKanjiInfo",
                kanji: kanji,
                reading: reading,
                meanings: formattedMeanings,
                url: url,
            });
        })
        .catch((error) => {
            console.error(
                "Background: Error fetching multi-kanji info:",
                error
            );
            sendResponse({
                action: "error",
                error: error.toString(),
            });
        });
}
