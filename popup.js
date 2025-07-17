//popup.js


// Эта функция будет внедрена и выполнена в контексте content.js
function highlightText(searchText) {
    // Эта функция будет определена в content.js
    // Но для executeScript мы должны передать ее как аргумент или определить здесь
    // Лучше передать только данные, а логику поиска оставить в content.js
    // или определить вспомогательную функцию, которая будет вызвана в content.js
    chrome.tabs.sendMessage(chrome.runtime.id, { action: "searchAndHighlight", query: searchText });
}

// Альтернативный и, возможно, более чистый способ:
document.addEventListener('DOMContentLoaded', () => {
    const searchText = document.getElementById('searchText');
    searchText.focus(); // Устанавливаем фокус на поле ввода сразу при загрузке попапа

    searchText.addEventListener('input', (event) => {
        const query = event.target.value;
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.sendMessage(tabs[0].id, { action: "searchAndHighlight", query: query });
            }
        });
    });

    searchText.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs.length > 0) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: "nextHighlight" });
                }
            });
            event.preventDefault();
        }
    });
});
