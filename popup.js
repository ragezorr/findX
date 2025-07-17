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
document.getElementById('searchText').addEventListener('input', (event) => {
    const searchText = event.target.value;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        // Отправляем сообщение в content.js
        chrome.tabs.sendMessage(tabs[0].id, { action: "searchAndHighlight", query: searchText });
    });
});

document.getElementById('searchText').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: "nextHighlight" });
        });
        event.preventDefault(); // Предотвращаем стандартное действие Enter (например, отправку формы)
    }
});
