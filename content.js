let currentMatches = []; // Хранит ГРУППЫ найденных элементов, а не отдельные span
let currentIndex = -1;   // Текущий индекс в currentMatches (индекс ГРУППЫ)

// Функция для очистки предыдущих выделений
function clearHighlights() {
    // Удаляем обычные span-выделения
    const highlights = document.querySelectorAll('.chrome-extension-highlight');
    highlights.forEach(span => {
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
    });

    document.body.normalize(); // Объединяем соседние текстовые узлы
    currentMatches = [];
    currentIndex = -1;
}

// Вспомогательная функция для сбора всего поискового контента (текстовых узлов и атрибутов)
function collectSearchableContent(node) {
    const contentData = [];
    const walker = document.createTreeWalker(
        node,
        NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        { acceptNode: function(node) {
            // Игнорируем скрипты, стили и наши собственные выделения
            if (node.nodeType === Node.ELEMENT_NODE) {
                const tagName = node.tagName.toLowerCase();
                if (tagName === 'script' || tagName === 'style' ||
                    (node.classList && (node.classList.contains('chrome-extension-highlight') || node.classList.contains('chrome-extension-attribute-highlight') || node.classList.contains('chrome-extension-active-highlight')))) {
                    return NodeFilter.FILTER_REJECT;
                    }
            }

            // Проверяем видимость родительского элемента для текстовых узлов и элементов
            const parent = node.parentNode;
            if (parent && parent.nodeType === Node.ELEMENT_NODE) {
                const style = window.getComputedStyle(parent);
                if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                }
            }
            return NodeFilter.FILTER_ACCEPT;
        }},
        false
    );

    let currentNode;
    while ((currentNode = walker.nextNode())) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            if (currentNode.nodeValue.trim().length > 0) {
                contentData.push({ type: 'text', node: currentNode, value: currentNode.nodeValue });
            }
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            const attrsToScan = ['onclick', 'href', 'title', 'alt', 'data-phone', 'data-number', 'data-value'];
            attrsToScan.forEach(attrName => {
                const attrValue = currentNode.getAttribute(attrName);
                if (attrValue && attrValue.trim().length > 0) {
                    contentData.push({ type: 'attribute', node: currentNode, attrName: attrName, value: attrValue });
                }
            });

            if ((currentNode.tagName.toLowerCase() === 'input' || currentNode.tagName.toLowerCase() === 'textarea') && currentNode.value && currentNode.value.trim().length > 0) {
                contentData.push({ type: 'input_value', node: currentNode, value: currentNode.value });
            }
        }
    }
    return contentData;
}


// Функция для поиска и выделения текста
function searchAndHighlight(query) {
    clearHighlights(); // Очищаем предыдущие выделения

    if (!query) {
        return;
    }

    const queries = query.split('|').map(q => q.trim()).filter(q => q.length > 0);

    // Шаг 1: Сбор всего поискового контента со страницы
    const searchableContent = collectSearchableContent(document.body);

    // Шаг 2: Создаем "виртуальную" строку для поиска и карту для обратного сопоставления
    let virtualText = '';
    const virtualTextMap = [];

    searchableContent.forEach((item, index) => {
        const itemStart = virtualText.length;
        virtualText += item.value;
        const itemEnd = virtualText.length;
        virtualTextMap.push({ contentItemIndex: index, start: itemStart, end: itemEnd });
    });

    // Этот массив будет хранить группы элементов для каждого НАЙДЕННОГО СОВПАДЕНИЯ
    let allFoundMatches = [];

    // Шаг 3: Выполняем поиск в виртуальной строке
    queries.forEach(singleQuery => {
        const escapedQuery = singleQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        let regexPattern = '';
        for (let i = 0; i < escapedQuery.length; i++) {
            regexPattern += escapedQuery[i];
            if (/\d/.test(escapedQuery[i]) && i < escapedQuery.length - 1 && /\d/.test(escapedQuery[i+1])) {
                regexPattern += '\\s*';
            }
        }
        const regex = new RegExp(regexPattern, 'g');

        let match;
        while ((match = regex.exec(virtualText)) !== null) {
            const matchStart = match.index;
            const matchEnd = match.index + match[0].length;

            const relevantMapItems = virtualTextMap.filter(mapItem =>
            (mapItem.start < matchEnd && mapItem.end > matchStart)
            );

            let currentMatchGroup = []; // Группа элементов для текущего полного совпадения

            relevantMapItems.forEach(mapItem => {
                const item = searchableContent[mapItem.contentItemIndex];

                if (item.type === 'text') {
                    const node = item.node;
                    const nodeText = node.nodeValue;

                    const localMatchStart = Math.max(0, matchStart - mapItem.start);
                    const localMatchEnd = Math.min(nodeText.length, matchEnd - mapItem.start);

                    if (localMatchEnd > localMatchStart) {
                        const originalParent = node.parentNode;
                        const beforeText = nodeText.substring(0, localMatchStart);
                        const matchedText = nodeText.substring(localMatchStart, localMatchEnd);
                        const afterText = nodeText.substring(localMatchEnd);

                        const fragment = document.createDocumentFragment();
                        if (beforeText.length > 0) {
                            fragment.appendChild(document.createTextNode(beforeText));
                        }
                        const highlightSpan = document.createElement('span');
                        highlightSpan.className = 'chrome-extension-highlight';
                        highlightSpan.style.backgroundColor = 'yellow';
                        highlightSpan.style.color = 'black';
                        highlightSpan.textContent = matchedText;
                        fragment.appendChild(highlightSpan);
                        currentMatchGroup.push(highlightSpan); // Добавляем в группу

                        if (afterText.length > 0) {
                            fragment.appendChild(document.createTextNode(afterText));
                        }
                        try {
                            originalParent.replaceChild(fragment, node);
                        } catch (e) {
                            console.warn("Could not replace text node, it might have been modified:", node, e);
                        }
                    }
                } else if (item.type === 'attribute' || item.type === 'input_value') {
                    const element = item.node;
                    if (!element.classList.contains('chrome-extension-attribute-highlight')) {
                        element.classList.add('chrome-extension-attribute-highlight'); // Класс можно оставить для идентификации, но он не будет стилизовать рамку
                        currentMatchGroup.push(element); // Добавляем в группу
                    }
                }
            });

            if (currentMatchGroup.length > 0) {
                allFoundMatches.push(currentMatchGroup); // Добавляем полную группу совпадений
            }
        }
    });

    currentMatches = allFoundMatches; // Обновляем currentMatches полными группами
    if (currentMatches.length > 0) {
        currentIndex = 0;
        scrollToCurrentMatch();
    }
}

// Функция для прокрутки к текущему выделенному элементу
function scrollToCurrentMatch() {
    if (currentMatches.length === 0) return;

    // Сначала сбрасываем стили со ВСЕХ предыдущих выделений
    document.querySelectorAll('.chrome-extension-highlight').forEach(el => {
        el.style.backgroundColor = 'yellow';
        el.classList.remove('chrome-extension-active-highlight');
    });
    // Удаляем логику сброса рамки для неактивных элементов
    document.querySelectorAll('.chrome-extension-attribute-highlight').forEach(el => {
        el.style.outline = 'none'; // УДАЛЕНО, если хотим полностью избавиться от рамки, но если хотим рамку только для АКТИВНОГО элемента - оставляем
        el.classList.remove('chrome-extension-active-highlight');
    });


    // Выделяем текущую активную ГРУППУ
    const activeGroup = currentMatches[currentIndex];
    activeGroup.forEach(el => {
        if (el.classList.contains('chrome-extension-highlight')) {
            el.style.backgroundColor = 'orange'; // Для текстовых span
        } else if (el.classList.contains('chrome-extension-attribute-highlight')) {
            // **ДОБАВЛЯЕМ РАМКУ ТОЛЬКО ДЛЯ АКТИВНОГО ЭЛЕМЕНТА, ЕСЛИ ХОТИМ**
            //el.style.outline = '2px solid orange'; // Рамка только для активного
            //el.style.outlineOffset = '2px';
        }
        el.classList.add('chrome-extension-active-highlight');
    });

    // Прокручиваем к первому элементу в активной группе
    if (activeGroup.length > 0) {
        activeGroup[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Слушатель сообщений от popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "searchAndHighlight") {
        searchAndHighlight(request.query);
    } else if (request.action === "nextHighlight") {
        if (currentMatches.length > 0) {
            // Переход к следующей группе
            currentIndex = (currentIndex + 1) % currentMatches.length;
            scrollToCurrentMatch();
        }
    }
});