// ==UserScript==
// @name         MangaPlus Downloader
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Downloader for MangaPlus
// @author       Baconana-chan
// @match        https://mangaplus.shueisha.co.jp/viewer/*
// @grant        GM_download
// ==/UserScript==

(function() {
    'use strict';

    let blobs = [];
    let imageHashes = new Set();  // Для отслеживания уникальных хэшей изображений
    let downloadedCount = 0;

    // Функция для вычисления хэша из blob-объекта
    async function hashBlob(blob) {
        const arrayBuffer = await blob.arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Функция для сохранения blob объектов как файлов PNG
    function saveBlob(blob, filename) {
        const blobUrl = URL.createObjectURL(blob);
        GM_download({
            url: blobUrl,
            name: filename,
            saveAs: false
        });
    }

    // Функция для поочередной загрузки всех изображений
    function downloadSequentially(index) {
        if (index >= blobs.length) {
            alert(`Downloaded all ${blobs.length} images.`);
            return;
        }

        const filename = `page-${index + 1}.png`;
        const blob = blobs[index];
        saveBlob(blob, filename);
        downloadedCount++;

        console.log(`Downloaded ${filename}`);

        setTimeout(() => {
            downloadSequentially(index + 1);
        }, 1000);  // Задержка в 1 секунду между загрузками
    }

    // Функция для загрузки всех blob-изображений
    function downloadImages() {
        if (blobs.length === 0) {
            alert("No images found. Try scrolling manually and reloading.");
            return;
        }

        downloadedCount = 0;
        downloadSequentially(0);
    }

    // Перехватываем создание blob URL и сохраняем уникальные blob объекты
    const originalCreateObjectURL = URL.createObjectURL;
    URL.createObjectURL = function(blob) {
        const url = originalCreateObjectURL(blob);
        if (blob.type.startsWith('image/')) {
            hashBlob(blob).then(hash => {
                if (!imageHashes.has(hash)) {  // Проверка уникальности по хэшу
                    blobs.push(blob);  // Сохраняем уникальный blob
                    imageHashes.add(hash);  // Добавляем хэш в set
                    console.log(`Captured unique image blob: ${url} (hash: ${hash})`);
                } else {
                    console.log(`Duplicate image blob skipped: ${url} (hash: ${hash})`);
                }
            });
        }
        return url;
    };

    // Создание кнопки для загрузки
    function createDownloadButton() {
        const button = document.createElement('button');
        button.innerText = "Download All Images";
        button.style.position = 'fixed';
        button.style.top = '10px';
        button.style.right = '10px';
        button.style.zIndex = '9999';
        button.style.padding = '10px 20px';
        button.style.backgroundColor = '#28a745';
        button.style.color = 'white';
        button.style.border = 'none';
        button.style.borderRadius = '5px';
        button.style.fontSize = '16px';
        button.style.fontWeight = 'bold';
        button.style.cursor = 'pointer';
        button.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
        document.body.appendChild(button);

        button.addEventListener('click', () => {
            console.log("Download button clicked");
            downloadImages();
        });
    }

    // Проверяем готовность страницы и создаем кнопку
    const interval = setInterval(() => {
        if (document.readyState === "complete") {
            clearInterval(interval);
            console.log("Page fully loaded, initializing script.");
            createDownloadButton();
        }
    }, 1000);
})();
