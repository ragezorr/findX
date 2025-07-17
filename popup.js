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

    // Обработчик для иконки настроек (если вы захотите добавить функционал)
    const settingsIcon = document.querySelector('.icon');
    if (settingsIcon) {
        settingsIcon.addEventListener('click', () => {
            // Здесь можно добавить логику для открытия страницы настроек или чего-то еще
            console.log("Настройки clicked!");
            // Пример: открыть страницу опций расширения
            // if (chrome.runtime.openOptionsPage) {
            //     chrome.runtime.openOptionsPage();
            // } else {
            //     window.open(chrome.runtime.getURL('options.html')); // Если у вас есть options.html
            // }
        });
    }
});