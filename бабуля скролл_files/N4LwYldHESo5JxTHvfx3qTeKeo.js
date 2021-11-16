/* begin: ../../blocks-common/i-counters/__error/i-counters__error.js */
/**
 * @file
 * Скрипт сбора ошибок
 *
 * Логгирует непойманные ошибки и предоставляет метод `window.logSerpJsError`
 * для пользовательских логов
 *
 * Пишет счётчик с параметрами pid=1, cid=73018: https://stat.yandex-team.ru/Counters/Yandex/73018
 *
 * В случае обработки непойманной ошибки логгирует её как `path=tech.uncaught_error`,
 * в случае логгирования через метод `window.logSerpJsError` –
 * как `path=tech.client_error`
 */
/*eslint max-params: ["error", 6]*/
/* globals w */
(function(window) {
    var Ya = window.Ya || {},
        // минимальный обработчик ошибок из i-counters__error-minimal.js
        // просто сохраняет ошибки в window.jserrors
        prevErrors = window.jserrors,
        // Создаем заново глобальный список ошибок для тестирования, SERP-20981
        jsErrors = window.jserrors = [],
        jsErrorsByTypeCount = window.jsErrorsByTypeCount = {
            '690.2354': 0, // tech.client_error
            '690.2361': 0, // tech.uncaught_error
            '690.2854': 0 // tech.external_error
        };

    /**
     * Проверяет, что ошибка из внешнего источника
     *
     * @param {String} url
     * @param {String} message
     * @param {?String} stack
     *
     * @returns {Boolean}
     */
    function isExternalError(url, message, stack) {
        url = String(url || '');
        message = String(message || '');
        stack = String(stack || '');

        return Boolean(url && (
            // расширение Kaspersky Protection
            url.indexOf('kaspersky-labs.com/') !== -1 ||
            // апи расширений браузера, загружается фоновыми страницами расширений
            /(?:miscellaneous|extension)_bindings/.test(url) ||
            // видимые элементы браузера, не относящиеся к веб-страницам (панели инструментов, панель меню, вкладки)
            // пользовательские файлы
            /^(?:chrome|file):/.test(url) ||
            // ошибки в расширениях Firefox/Chrome
            /^(?:moz|chrome)-extension:\/\//.test(url) ||
            // ошибка в подгружаемых ресурсах (типа дополнительных скриптов расширений или Java-апплетов в Firefox)
            url.indexOf('resource://') === 0 ||
            // популярное сеошное расширение: https://nda.ya.ru/3UVNQe
            url.indexOf('webnetc.top') !== -1 ||
            // ошибка AdGuard
            url.indexOf('local.adguard.com') !== -1 ||
            // ошибка Google Chrome: https://bugs.chromium.org/p/chromium/issues/detail?id=97172
            url.indexOf('ntp is not defined') !== -1
        ) || message && (
            // ошибки AdGuard и UC Browser
            /(?:__adgRemoveDirect|ucapi|gj\.track\.uc\.cn|__show__deepen)/.test(message) ||
            // ошибка Firefox/iOS 8,9,10 https://bugzilla.mozilla.org/show_bug.cgi?id=1394296
            /__firefox__\.(?:favicons|metadata|reader)\./.test(message)
        ) || stack && (
            // ошибки в расширениях Firefox/Chrome
            /(?:moz|chrome)-extension:\/\//.test(stack)
        ));
    }

    function sendCounter(message, errorUrl, line, col, err, label) {
        var path = '690.2354', // tech.client_error
            stackTrace = err && err.stack,
            vars,
            varsArr = [];

        if (isExternalError(errorUrl, message, stackTrace)) {
            path = '690.2854'; // tech.external_error
        } else if (label == null) {
            path = '690.2361'; // tech.uncaught_error
        }

        vars = {
            '143': Ya.loadPageId || '2543.1030', // granny.error
            '-label': label,
            '-msg': message,
            '-url': errorUrl,
            '-line': line,
            '-col': col,
            '-stack': stackTrace,
            '-static-host': Ya.staticHost,
            '-project': 'granny',
            '-ua': navigator.userAgent,
            // если кол-во ошибок от 1 пользователя слишком большое, тогда отсылаем признак,
            // чтобы отфильтровывать эти ошибки в Головане
            '-silent': jsErrorsByTypeCount[path] > 10 ? 'yes' : 'no'
        };

        for (var key in vars) {
            if (vars.hasOwnProperty(key) && vars[key] != null) {
                varsArr.push(key + '=' + encodeURIComponent(vars[key]));
            }
        }

        w(
            null,
            path,
            varsArr.join(','),
            {
                clck: Ya.clck || '//yandex.ru/clck/click',
                sts: ['dtype=stred', 'pid=1', 'cid=73018']
            }
        );

        jsErrorsByTypeCount[path]++;
    }

    function handleError(message, url, line, col, err, label) {
        sendCounter(message, url, line, col, err, label);

        jsErrors.push({ message: message, url: url, line: line, col: col, error: err });
    }

    // отправляем накопленные ошибки на сервер
    // и сохраняем их в jsErrors/window.jserrors
    if (prevErrors) {
        for (var i = 0, l = prevErrors.length; i < l; i++) {
            handleError.apply(null, prevErrors[i]);
        }
    }

    // Устанавливаем заново обработчик всех пропущенных ошибок
    window.onerror = function() {
        handleError.apply(null, arguments);
    };

    /**
     * Залоггировать ошибку
     *
     * Добавляет к сообщению ошибки лейбл `err.catchType` или `unknown`
     * для облегчения поиска в логах
     *
     * @param {Error} err
     * @param {String} [err.catchType]
     */
    window.logSerpJsError = function(err) {
        var label = err.catchType || 'unknown';

        handleError(err.message, err.fileName, err.lineNumber, err.columnNumber, err, label);
    };
})(window);

/* end: ../../blocks-common/i-counters/__error/i-counters__error.js */
/* begin: ../../blocks-common/i-global/__ready/i-global__ready.js */
Ya.ready = function(callback) {
    // @see https://clck.ru/AK63K
    if (document.readyState === 'complete' ||
        (document.readyState !== 'loading' && !document.documentElement.doScroll)) {
        callback();
    } else if (window.addEventListener) {
        window.addEventListener('DOMContentLoaded', onReady, false);
        window.addEventListener('load', onReady, false);
    } else {
        // IE8 и ниже: нет addEventListener, нет DOMContentLoaded
        window.attachEvent('onload', onReady);
    }

    function onReady() {
        if (window.removeEventListener) {
            window.removeEventListener('DOMContentLoaded', onReady, false);
            window.removeEventListener('load', onReady, false);
        } else {
            window.detachEvent('onload', onReady);
        }
        callback();
    }
};

/* end: ../../blocks-common/i-global/__ready/i-global__ready.js */
/* begin: ../../blocks-common/i-global/__load-counter/i-global__load-counter.js */
/* global w:false */
Ya.ready(function() {
    var helpers = {
        offset: function(elem) {
            var offsetParent = elem.offsetParent,
                offsetTop = elem.offsetTop,
                offsetLeft = elem.offsetLeft;

            while (offsetParent !== document.body) {
                offsetLeft += offsetParent.offsetLeft;
                offsetTop += offsetParent.offsetTop;
                offsetParent = offsetParent.offsetParent;
            }

            return { top: offsetTop, left: offsetLeft };
        },

        isInArea: function(area, item, useHeight) {
            if (!item || !(item instanceof Element)) return false;

            var itemOffset = this.offset(item),
                itemOffsetTop = itemOffset.top;

            useHeight && (itemOffsetTop += item.offsetHeight);

            return itemOffset.left < area.right &&
                itemOffsetTop < area.bottom &&
                itemOffsetTop > area.top;
        },

        titleCount: function(area, items) {
            if (!items || !items.length) return {};

            var visibilityFlag = false,
                serpAdvTitlesCount = 0,
                serpTitlesCount = 0;

            for (var i = 0; i < items.length; i++) {
                var item = items[i],
                    title = item.querySelector('.organic__title') || item.querySelector('.serp-item__title'),
                    inArea = this.isInArea(area, title, true);

                if (!inArea) {
                    // считаем все organic__title-wrapper и serp-title, которые попадают в видимую область,
                    // если перестают попадать, значит мы дошли до границы области и цикл можно остановить
                    if (visibilityFlag) break;

                    // если не попадает title в область видимости,
                    // то значит ещё не дошли до области видимости и пропускаем след действия
                    continue;
                }

                // дошли до title, попадающего в область видимости
                visibilityFlag = true;

                if (item.querySelector('.organic_adv')) {
                    serpAdvTitlesCount++;
                } else {
                    serpTitlesCount++;
                }
            }

            return {
                organic: serpTitlesCount,
                adv: serpAdvTitlesCount
            };
        },

        getViewportParams: function() {
            var winWidth = window.innerWidth || document.documentElement.clientWidth,
                winScrollTop = window.scrollY || window.pageYOffset,
                winHeight = window.innerHeight || document.documentElement.clientHeight,
                area = {
                    top: winScrollTop,
                    right: winWidth,
                    bottom: winScrollTop + winHeight,
                    left: 0
                },
                titles = this.titleCount(area, document.querySelectorAll('.serp-item'));

            return {
                serpTitlesCount: titles.organic,
                serpAdvTitlesCount: titles.adv,
                bannerInArea: this.isInArea(area, document.querySelectorAll('.serp-adv__banner')),
                winWidth: winWidth,
                winHeight: winHeight
            };
        },

        getBaobabData: function() {
            var viewportParams = this.getViewportParams();

            return {
                event: 'tech',
                type: 'serp-page-loaded',
                nodeId: Ya.clckId,
                data: {
                    vis: document.visibilityState || 'unknown',
                    visible: {
                        webCount: viewportParams.serpTitlesCount,
                        directCount: viewportParams.serpAdvTitlesCount,
                        banner: viewportParams.bannerInArea
                    },
                    viewportSize: {
                        width: viewportParams.winWidth,
                        height: viewportParams.winHeight
                    }
                }
            };
        }
    };

    function getStyles(element) {
        return window.getComputedStyle ?
            window.getComputedStyle(element) :
            element.currentStyle;
    }

    function _makeSend() {
        var container = document.querySelector('[data-log-node="' + Ya.clckId + '"]') || document.body;

        w(
            null,
            // на серверной стороне вызов все равно нужен
            // вызывается в i-global__load-counter.priv.js
            '471.143.1007', // /serp/page/loaded
            null,
            helpers.getBaobabData()
        );

        w(null, null, null, {
            event: 'tech',
            type: 'coords',
            nodeId: Ya.clckId,
            data: {
                nodes: getBlocksLayout(container),
                pageNodes: getPageLayout(document)
            }
        });
    }

    function _shownAlready() {
        if (window.requestAnimationFrame) {
            requestAnimationFrame(_makeSend);
        } else {
            // http://caniuse.com/#feat=requestanimationframe
            // IE 9- FF 22- Chrome 23- Safari 6- iOS Safari 6.1- Opera 12-
            // Opera Mobile 12- Opera Mini Android Browser 4.3-
            setTimeout(_makeSend, 0);
        }
    }

    if ('onvisibilitychange' in document && document.visibilityState !== 'visible') {
        document.addEventListener('visibilitychange', function onVisChange() {
            if (document.visibilityState !== 'visible') return;

            document.removeEventListener('visibilitychange', onVisChange);
            _shownAlready();
        });
    } else {
        _shownAlready();
    }

    function getPageLayout(container) {
        var selectors = [
            '.b-page[data-log-node]',
            '.main .content__left[data-log-node], .main[data-log-node]',
            '.main__top[data-log-node]',
            '.serp-header[data-log-node], .header3[data-log-node]',
            '.navigation[data-log-node]',
            '.serp-footer[data-log-node]',
            '.related[data-log-node]',
            '.pager[data-log-node]',
            '.more[data-log-node]',
            '.region-change[data-log-node]',
            '.competitors[data-log-node]'
        ];
        var result = {};

        for (var i = 0; i < selectors.length; i++) {
            var selector = selectors[i];
            var elementData = _getElementData(container.querySelector(selector));

            if (!elementData || !elementData.id) continue;

            var calcHeight = elementData.offsetHeight + elementData.marginTop + elementData.marginBottom;

            result[elementData.id] = [
                elementData.left,
                elementData.top,
                elementData.offsetWidth,
                elementData.offsetHeight,
                calcHeight
            ];
        }

        return result;
    }

    /**
     * Возвращает расположение баобаб-блоков на странице.
     *
     * @param {Element} container - элемент, в котором располагаются актуальные элементы поисковой выдачи
     * @returns {[String, Number, Number, Number, Number, Number][]}
     * по порядку: logNodeId, left, top, width, height, calcHeight
     */
    function getBlocksLayout(container) {
        var serpItems = getElementsLayout(container.querySelectorAll('.serp-list .distr-default-search, .serp-item')),
            // В одном блоке .mispell может быть несколько "колдунщиков". Правильный селектор - misspell__level
            misspell = getElementsLayout(container.querySelectorAll('.misspell__level'));

        for (var key in misspell) {
            if (misspell.hasOwnProperty(key)) {
                serpItems[key] = misspell[key];
            }
        }

        return serpItems;
    }

    function getElementsLayout(elements) {
        var layout = {};

        if (elements.length === 0) return layout;

        var elementsData = [],
            i = 0;

        for (; i < elements.length; i++) {
            var elem = elements[i],
                data = _getElementData(elem);

            if (data) {
                elementsData.push(data);
            }
        }

        for (i = 0; i < elementsData.length; i++) {
            var prev = elementsData[i - 1],
                curr = elementsData[i],
                next = elementsData[i + 1],
                calcHeight = curr.offsetHeight +
                    ((prev ? Math.max(curr.marginTop - prev.marginBottom, 0) : curr.marginTop) || 0) +
                    ((next ? Math.max(curr.marginBottom - next.marginTop, 0) : curr.marginBottom) || 0) +
                    ((prev && next ? Math.min(prev.marginBottom, next.marginTop) : 0) || 0);

            layout[curr.id] = [
                curr.left,
                curr.top,
                curr.offsetWidth,
                curr.offsetHeight,
                calcHeight
            ];
        }

        return layout;
    }

    /**
     * Получить данные по HTML-элементу.
     *
     * @param {HTMLElement} element
     * @returns {Object}
     * @private
     */
    function _getElementData(element) {
        if (!element) return null;

        var compStyle = getStyles(element) || {},
            position = helpers.offset(element);

        if (compStyle && compStyle.display === 'none') {
            return {
                element: element,
                id: element.getAttribute('data-log-node'),
                left: position.left,
                top: position.top,
                offsetWidth: 0,
                offsetHeight: 0,
                marginTop: 0,
                marginBottom: 0
            };
        }

        function getComputedStyleFallback() {
            if (window.getComputedStyle) {
                return window.getComputedStyle.apply(window, arguments);
            }

            return 0;
        }

        // margin может быть в :before и/или :after. Он не учитывается в getComputedStyle основного элемента.
        var marginTopBefore = getComputedStyleFallback(element, ':before').marginTop,
            marginBottomAfter = getComputedStyleFallback(element, ':after').marginBottom;

        return {
            element: element,
            id: element.getAttribute('data-log-node'),
            left: position.left,
            top: position.top,
            offsetWidth: element.offsetWidth,
            offsetHeight: element.offsetHeight,
            // берём максимум, так как их margin схлопываются
            marginTop: Math.max(parseInt(compStyle.marginTop, 10) || 0, parseInt(marginTopBefore, 10) || 0),
            marginBottom: Math.max(parseInt(compStyle.marginBottom, 10) || 0, parseInt(marginBottomAfter, 10) || 0)
        };
    }
});

/* end: ../../blocks-common/i-global/__load-counter/i-global__load-counter.js */
/* begin: ../../blocks-common/rum/rum.js */
/* eslint-disable no-use-before-define */ // TODO: удалить после починки линтера
/* global Ya */
/**
 * @file
 * Скрипт для логов RUM (Real User Measurement)
 * @see https://wiki.yandex-team.ru/search-interfaces/velocity/rum/
 *
 * PERF: Файл оптимизирован для минификации
 */
(function(window, document, navigator, PerformanceObserver, undefined) {
    /* eslint-disable-next-line */ // TODO: удалить после починки линтера
    'use strict';
    // @see https://developer.mozilla.org/ru/docs/Web/API/Navigation_timing_API
    var perf = window.performance,
        tm = perf && perf.timing,
        navStart = tm && tm.navigationStart;

    // timing, а так же свойство navigationStart должны быть определены
    if (navStart === undefined) return;

    // Общие переменные
    var Rum = Ya.Rum,
        firstByteFromNavStart = tm.responseStart - navStart,
        dnsTimeFromNavStart = tm.domainLookupStart - navStart,
        docRespEnd = tm.responseEnd,

        navData = perf.navigation || {},

        visState = document.visibilityState,
        visStateCode = {
            visible: 1,
            hidden: 2,
            prerender: 3
        }[visState],

        connection = navigator.connection || {},
        conType = {
            bluetooth: 2064,
            cellular: 2065,
            ethernet: 2066,
            none: 1229,
            wifi: 2067,
            wimax: 2068,
            other: 861,
            unknown: 836
        }[connection.type] || 2771,

        commonVars = [
            // [page] ID страницы
            '143=' + Ya.loadPageId,

            // [region] ID региона
            '287=' + Ya.regionId,

            // [nav-type] См. MDN: https://clck.ru/9edos
            navData.type && ('770.76=' + navData.type),

            // [redirect-count] Количество редиректов
            navData.redirectCount && ('1384.1385=' + navData.redirectCount),

            // [visibility] См. MDN: https://clck.ru/9edpN
            // 2771 – invalid
            '1484=' + (visStateCode ? visStateCode : 1),

            // [connection_type] Тип соединения. MDN: https://clck.ru/AASTf
            conType && ('2437=' + conType),

            // [downlink_max] Максимальная скорость соединения. MDN: https://clck.ru/AASYS
            connection.downlinkMax !== undefined && ('2439=' + connection.downlinkMax),

            // [effective_type] Оценка реального качества соединения. MDN: https://clck.ru/C5hCb
            connection.effectiveType && ('2870=' + connection.effectiveType),

            // Характеристики сети
            connection.rtt !== undefined && ('rtt=' + connection.rtt),
            connection.downlink !== undefined && ('dwl=' + connection.downlink)
        ],

        isResTimingSupported = typeof perf.getEntriesByType === 'function',

        timeMarks = {};

    // Данные счётчика хорошести картинок
    var IMAGE_SIZE_THRESHOLD = 10;
    var SEARCH_IMAGE_LAST_TIMEOUT = 15000;
    var DATA_URI_IMAGE_ID = 'data-uri';

    var imageResourcesExpected = 0;
    var imageResourcesFound = 0;
    var hasDataUriImages = false;
    var hasUnknownImages = false;

    var firstImageTime;
    var lastImageTime;

    if (Ya.isPrerender) {
        commonVars.push('3105=1');
    }

    if (Ya.prerenderStatus) {
        commonVars.push('prerender.status=' + Ya.prerenderStatus);
    }

    // Выполняем расчёты и отправку только когда документ готов
    Ya.ready(function() {
        setTimeout(function() {
            sendPageLoadingTiming();
            sendPaintTiming();

            sendLcp();
            sendFid();
            sendCls();
            sendImageGoodness();

            sendAllResourceTimings();
            triggerRumInit();
        }, 0);
    });

    /**
     * Отправить счётчик /tech/timing
     * Отчёт: https://stat.yandex-team.ru/Yandex/Velocity/PageLoading
     */
    function sendPageLoadingTiming() {
        var counterParams = commonVars.concat([
            // [navigation_start] Время старта запроса
            '2129=' + navStart,

            // [wait] Время ожидания перед запросом
            '1036=' + (tm.domainLookupStart - navStart),

            // [dns] Время DNS Lookup
            '1037=' + (tm.domainLookupEnd - tm.domainLookupStart),

            // [tcp] Время TCP Handshake
            '1038=' + (tm.connectEnd - tm.connectStart),

            // [ssl] Время установки безопасного соединения
            tm.secureConnectionStart ? ('1383=' + (tm.connectEnd - tm.secureConnectionStart)) : null,

            // [ttfb] Время до первого байта
            '1039=' + (tm.responseStart - tm.connectEnd),

            // [html] Время получения HTML от первого байта
            '1040=' + (tm.responseEnd - tm.responseStart),

            // [html-total] Время получения HTML от DNS Lookup
            '1040.906=' + (tm.responseEnd - tm.domainLookupStart),

            // [dom-loading] Время начала парсинга HTML от первого байта
            '1310.2084=' + (tm.domLoading - tm.responseStart),

            // [dom-interactive] Время окончания парсинга HTML от первого байта
            '1310.2085=' + (tm.domInteractive - tm.responseStart),

            // [dom-init] Время выполнения DOMContentLoaded
            '1310.1309=' + (tm.domContentLoadedEventEnd - tm.domContentLoadedEventStart),

            // [dom-loaded] Время начала DOMContentLoaded от первого байта
            '1310.1007=' + (tm.domContentLoadedEventStart - tm.responseStart)
        ]);

        var rawData = {
            '2127': tm.unloadEventStart,
            '2128': tm.unloadEventEnd,
            '2109': tm.redirectStart,
            '2110': tm.redirectEnd,
            '2111': tm.fetchStart,
            '2112': tm.domainLookupStart,
            '2113': tm.domainLookupEnd,
            '2114': tm.connectStart,
            '2115': tm.secureConnectionStart,
            '2116': tm.connectEnd,
            '2117': tm.requestStart,
            '2119': tm.responseStart,
            '2120': tm.responseEnd,
            '2769': tm.domLoading,
            '2770': tm.domInteractive,
            '2123': tm.domContentLoadedEventStart,
            '2131': tm.domContentLoadedEventEnd
        };

        Object.keys(rawData).forEach(function(bsCode) {
            var val = rawData[bsCode];

            if (val) {
                counterParams.push(bsCode + '=' + (val - navStart));
            }
        });

        // 690.1033 – /tech/timing
        sendCounter('690.1033', counterParams);
    }

    function sendPaintTiming() {
        if (!isResTimingSupported || !Ya.isPrerender && Rum.isVisibilityChanged()) {
            return;
        }

        var paintEvents = perf.getEntriesByType('paint');

        for (var i = 0; i < paintEvents.length; i++) {
            var event = paintEvents[i];

            if (event.name === 'first-contentful-paint') {
                // 1926.2794 – paint.first-contentful-paint
                sendTimeMark('1926.2794', event.startTime);
                return;
            }
        }

        // На DomContentLoaded отрисовка может не произойти (например в случае полностью клиентского рендеринга)
        // В этом случае нужно дождаться события отрисовки и попробовать отправить метрики ещё раз
        if (PerformanceObserver) {
            try {
                (new PerformanceObserver(function(list, observer) {
                    sendPaintTiming();
                    observer.disconnect();
                })).observe({ entryTypes: ['paint'] });
            } catch (e) {
            }
        }
    }

    /**
     * Отправить счётчики /tech/perf/resource_timing
     * Отчёт: https://stat.yandex-team.ru/Yandex/Velocity/ResourceLoading
     */
    function sendAllResourceTimings() {
        Rum.sendTimeMark = sendTimeMark;
        Rum.sendResTiming = sendResTiming;
        Rum.getTimeMarks = getTimeMarks;

        var defRes = Rum.__defRes;

        while (defRes.length) {
            var resData = defRes.shift();

            sendResTiming(resData[0], resData[1]);
        }

        var defTimes = Rum.__defTimes;

        while (defTimes.length) {
            var timeData = defTimes.shift();

            sendTimeMark(timeData[0], timeData[1]);
        }

        // Атрибут data-rCid – resource counter ID
        var nodes = document.querySelectorAll('[data-rCid]');

        for (var i = 0, length = nodes.length; i < length; i++) {
            var node = nodes[i],
                url = node.tagName === 'LINK' ? node.href : node.src;

            sendResTiming(node.getAttribute('data-rCid'), url);
        }
    }

    var largestContentfulPaint;

    /**
     * Отправить метрику Largest Contentful Paint
     * @see https://web.dev/lcp/
     */
    function sendLcp() {
        if (!PerformanceObserver || !Ya.isPrerender && Rum.isVisibilityChanged()) {
            return;
        }

        var po = new PerformanceObserver(function(entryList) {
            var entries = entryList.getEntries();

            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                largestContentfulPaint = entry.renderTime || entry.loadTime;
            }
        });

        try {
            po.observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {}

        addEventListener('visibilitychange', function onVisChange() {
            if (document.visibilityState !== 'hidden') {
                return;
            }
            removeEventListener('visibilitychange', onVisChange);

            try {
                if (typeof po.takeRecords === 'function') {
                    po.takeRecords(); // очистить буфер
                }
                po.disconnect();
            } catch (e) {}

            finalizeLcp();
        });

        addEventListener('beforeunload', finalizeLcp);
    }

    function finalizeLcp() {
        if (largestContentfulPaint == null) {
            return;
        }

        sendTimeMark('largest-contentful-paint', largestContentfulPaint);

        largestContentfulPaint = null;
    }

    /**
     * Отправить метрику First Input Delay
     * See: https://web.dev/fid/
     */
    function sendFid() {
        try {
            (new PerformanceObserver(function(entryList, observer) {
                var entry = entryList.getEntries()[0];
                if (!entry) {
                    return;
                }

                var fid = entry.processingStart - entry.startTime;
                sendDelta('first-input', fid);

                observer.disconnect();
            })).observe({ type: 'first-input', buffered: true });
        } catch (e) {}
    }

    var clsScore;

    /**
     * Посчитать Cumulative Layout Shift (CLS)
     * See: https://web.dev/cls/
     */
    function sendCls() {
        if (!PerformanceObserver) {
            return;
        }

        var po = new PerformanceObserver(function(entryList) {
            var entries = entryList.getEntries();

            if (clsScore == null) {
                clsScore = 0;
            }

            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (!entry.hadRecentInput) {
                    clsScore += entry.value;
                }
            }
        });

        try {
            po.observe({ type: 'layout-shift', buffered: true });
        } catch (e) {}

        addEventListener('visibilitychange', function onVisChange() {
            if (document.visibilityState !== 'hidden') {
                return;
            }

            removeEventListener('visibilitychange', onVisChange);

            try {
                if (typeof po.takeRecords === 'function') {
                    po.takeRecords(); // очистить буфер
                }
                po.disconnect();
            } catch (e) {}

            finalizeCls();
        });

        addEventListener('beforeunload', finalizeCls);
    }

    function finalizeCls() {
        if (clsScore == null) {
            return;
        }

        var score = Math.round(clsScore * 1e6) / 1e6;

        // 690.2096.4004 – tech.perf.cls
        sendCounter('690.2096.4004', commonVars.concat('s=' + score));

        clsScore = null;
    }

    /**
     * Отправить данные о хорошести картинок
     */
    function sendImageGoodness() {
        if (!PerformanceObserver || !Ya.isPrerender && Rum.isVisibilityChanged()) {
            return;
        }

        var candidateElements = document.querySelectorAll('img,[data-rcid],[style*="background"]');

        var targetElements = [];
        for (var i = 0; i < candidateElements.length; i++) {
            var elem = candidateElements[i];
            if (elem.loading === 'lazy' || Ya.lazyImage === 1 && elem.getAttribute('data-image-url')) {
                continue;
            }

            var url;
            if (elem.src) {
                url = elem.src;
            } else {
                url = getComputedStyle(elem).backgroundImage;
                if (url.indexOf('url(') === 0) {
                    url = url.slice(4, -1);
                    if (url[0] === '"' || url[0] === "'") {
                        url = url.slice(1, -1);
                    }
                }
            }

            if (url) {
                if (url.indexOf('data:') === 0) {
                    url = DATA_URI_IMAGE_ID;
                }
                targetElements.push({ elem: elem, url: url });
            }
        }

        requestAnimationFrame(function() {
            var visibleElements = filterVisibleElements(targetElements);
            try {
                handleVisibleElements(visibleElements);
            } catch (e) {}
        });
    }

    function filterVisibleElements(elements) {
        var docElem = document.documentElement;

        var vWidth = docElem.clientWidth;
        var vHeight = docElem.clientHeight;

        var visibleElements = [];

        for (var i = 0; i < elements.length; i++) {
            var elemData = elements[i];
            var rect = elemData.elem.getBoundingClientRect();
            if (rect.width < IMAGE_SIZE_THRESHOLD || rect.height < IMAGE_SIZE_THRESHOLD) {
                continue;
            }

            if (rect.bottom <= 0 || rect.top >= vHeight || rect.right <= 0 || rect.left >= vWidth) {
                continue;
            }

            visibleElements.push(elemData);
        }

        return visibleElements;
    }

    function handleVisibleElements(elements) {
        if (!elements.length) {
            return;
        }

        var normalizeLink = document.createElement('link');

        var urlSet = {};

        for (var i = 0; i < elements.length; i++) {
            var elemData = elements[i];

            if (elemData.url === DATA_URI_IMAGE_ID) {
                hasDataUriImages = true;
                continue;
            }

            normalizeLink.href = elemData.url;
            urlSet[normalizeLink.href] = true;
        }

        if (hasDataUriImages) {
            // Условность – считаем, что data URI загружаются тогда же, когда документ
            firstImageTime = docRespEnd;
            lastImageTime = docRespEnd;
        }

        imageResourcesExpected = Object.keys(urlSet).length;

        if (imageResourcesExpected === 0) {
            return finalizeImageGoodness('e0');
        }

        var finalizeTimeout;

        var po = new PerformanceObserver(function(perfEntryList) {
            var entries = perfEntryList.getEntries();

            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (!urlSet[entry.name]) {
                    continue;
                }

                var time = entry.responseEnd;
                if (!time) {
                    // Случай, когда данные недоступны
                    // Условно считаем, что загрузилось через duration после загрузки документа
                    hasUnknownImages = true;
                    time = docRespEnd + entry.duration;
                }

                if (firstImageTime === undefined || time < firstImageTime) {
                    firstImageTime = time;
                }

                if (lastImageTime === undefined || time > lastImageTime) {
                    lastImageTime = time;
                }

                if (++imageResourcesFound === imageResourcesExpected) {
                    po.disconnect();
                    finalizeImageGoodness('ok');
                    clearTimeout(finalizeTimeout);
                }
            }
        });

        po.observe({
            type: 'resource',
            buffered: true
        });

        finalizeTimeout = setTimeout(function() {
            try {
                po.disconnect();
                finalizeImageGoodness('tm');
            } catch (e) {}
        }, SEARCH_IMAGE_LAST_TIMEOUT);
    }

    function finalizeImageGoodness(finalizeType) {
        // 690.2096.277 – /tech/perf/images
        sendCounter('690.2096.277', [
            'ft=' + firstImageTime,
            'lt=' + lastImageTime,
            'er=' + imageResourcesExpected,
            'fr=' + imageResourcesFound,
            't=' + (finalizeType || 'unk'),
            hasDataUriImages && 'd=1',
            hasUnknownImages && 'u=1'
        ]);
    }

    function triggerRumInit() {
        while (Rum.__rumListeners.length) {
            Rum.__rumListeners.shift()();
        }

        Rum.onRumInited = function(cb) {
            cb();
        };
    }

    /**
     * Отправить счётчик с временной меткой /tech/perf/time. Время считается от начала парсинга документа
     *
     * @param {String} counterId ID метки времени
     * @param {Number} [time] Время. Если не передано, используется время вызова функции
     *
     * @returns {Number} Итоговое время
     */
    function sendTimeMark(counterId, time) {
        time = Math.round((time || Rum.getTime()) * 1000) / 1000;

        // 690.2096.207 - /tech/perf/time
        sendCounter('690.2096.207', commonVars.concat([
            '1701=' + counterId, // id – идентификатор счётчика
            '143.2129=' + navStart, // page.navigation_start
            '207=' + time // time
        ]));

        timeMarks[counterId] = timeMarks[counterId] || [];
        timeMarks[counterId].push(time);

        return time;
    }

    /**
     * Отправить счетчик с дельтой времени /tech/perf/delta
     *
     * @param {String} counterId - ID метки времени
     * @param {Number} delta - Точное значение дельты
     */
    function sendDelta(counterId, delta) {
        var deltaEnd = Rum.getTime();
        var deltaStart = deltaEnd - delta;

        // 690.2096.2877 – /tech/perf/delta
        sendCounter('690.2096.2877', commonVars.concat([
            '1701=' + counterId, // id – идентификатор счётчика
            '207.2154=' + deltaStart, // time.start
            '207.1428=' + deltaEnd, // time.end
            '2877=' + delta // delta
        ]));
    }

    function getTimeMarks() {
        return timeMarks;
    }

    /**
     * Отправить счётчик /tech/perf/resource_timing
     *
     * @param {String|Number} counterId
     * @param {String} url
     */
    function sendResTiming(counterId, url) {
        if (!isResTimingSupported) return;

        var pollingIteration = 0;

        function tryToSendResTiming() {
            var resTimings = perf.getEntriesByName(url);

            if (!resTimings.length) {
                if (pollingIteration++ < 10) {
                    setTimeout(tryToSendResTiming, 300);
                }
                return;
            }

            var resTiming = resTimings[0],

                data = {
                    '1701': counterId,

                    '143': Ya.loadPageId,
                    '287': Ya.regionId,

                    '2323': resTiming.transferSize,
                    '2136': resTiming.duration,
                    '2322': resTiming.startTime,
                    '2137': resTiming.workerStart,
                    '2111': resTiming.fetchStart,
                    '2112': resTiming.domainLookupStart,
                    '2113': resTiming.domainLookupEnd,
                    '2114': resTiming.connectStart,
                    '2115': resTiming.secureConnectionStart,
                    '2116': resTiming.connectEnd,
                    '2117': resTiming.requestStart,
                    '2119': resTiming.responseStart,
                    '2120': resTiming.responseEnd,

                    '2428': pollingIteration,

                    '143.2129': navStart,
                    '143.2112': dnsTimeFromNavStart,
                    '143.2119': firstByteFromNavStart
                },

                vars = Object.keys(data).map(function(bsCode) {
                    var val = data[bsCode];

                    if (val !== undefined) {
                        if (typeof val === 'number') {
                            val = Math.round(val * 1000) / 1000;
                        }
                        return bsCode + '=' + val;
                    }
                });

            // 690.2096.2044 – /tech/perf/resource_timing
            sendCounter('690.2096.2044', vars);
        }

        setTimeout(tryToSendResTiming, 0);
    }

    /**
     * Отправить счётчик
     *
     * @param {String} path – уникальный path счётчика для аналитики
     * @param {String[]} counterParams – данные счётчика
     */
    function sendCounter(path, counterParams) {
        Rum.send(Ya.clck, '/' + [
            'path=' + path,
            'vars=' + counterParams.filter(Boolean).join(','),
            '*'
        ].join('/'));
    }
})(window, document, navigator, window.PerformanceObserver);

/* end: ../../blocks-common/rum/rum.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-namespace/i-mini-namespace.js */
window.MBEM = window.MBEM || {};

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-namespace/i-mini-namespace.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-observable/i-mini-observable.js */
(function () {
    /**
     * @class MBEM.Event
     * @desc События, которые генерятся при использовании .trigger
     * @param {String} type Тип посбытия
     * @constructor
     */
    var Evt = function (type) {
        this.type = type;
        this.propagationStopped = false;
    };

    /**
     * Отменяет вызовы следующих обработчиков
     */
    Evt.prototype.stopPropagation = function () {
        this.propagationStopped = true;
    };

    /**
     * @class MBEM.Observable
     * @desc Базовый класс, содержит методы для рассылки событий
     * @constructor
     */
    var Observable = function () {};

    /**
     * Подписывается на события
     * @param {String|Object} event Название события или объект вида {eventName: handler}
     * @param {Function|Object} fn Обработчик события или контекст вызова обработчика (если первый аргумент - объект)
     * @param {Object} [ctx] Контекст вызова обработчика, если первый аргумент - строка. Если не задано, будет считаться равным this (на момент вызова .trigger)
     * @returns {MBEM.Observable}
     */
    Observable.prototype.on = function (event, fn, ctx) {
        if (typeof event === 'object') {
            for (var i in event) {
                if (event.hasOwnProperty(i)) {
                    this.on(i, event[i], fn);
                }
            }
            return this;
        }

        var storage = this._handlerStorage || (this._handlerStorage = {}),
            list = storage[event] || (storage[event] = []);

        list.push({
            fn: fn,
            ctx: ctx
        });

        return this;
    };

    /**
     * Отписывается от события
     * @param {String} eventName Название события
     * @param {Function} fn Обработчик
     * @returns {MBEM.Observable}
     */
    Observable.prototype.un = function (eventName, fn) {
        var storage = this._handlerStorage || (this._handlerStorage = {}),
            list = storage[eventName] || (storage[eventName] = []);

        for (var i = 0; i < list.length; ++i) {
            if (list[i].fn === fn) {
                list.splice(i, 1);
                return this;
            }
        }

        return this;
    };

    /**
     * Извещает о событии. Возвращает значение из последнего обработчика
     * @param {String} eventName Название события
     * @param {Object} [data] Данные, которые будут доступны внутри обработчика
     * @returns {*}
     */
    Observable.prototype.trigger = function (eventName, data) {
        var evt = new Evt(eventName),
            self = this;

        var storage = this._handlerStorage || (this._handlerStorage = {}),
            list = storage[eventName] || (storage[eventName] = []),
            ret;

        for (var i = 0; i < list.length; ++i) {
            var props = list[i];

            ret = props.fn.call(props.ctx || self, evt, data);

            if (ret === false) {
                evt.stopPropagation();
            }

            if (evt.propagationStopped) {
                break;
            }
        }

        return ret;
    };

    MBEM.Observable = Observable;
})();

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-observable/i-mini-observable.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-util/array-from/i-mini-util__array-from.js */
/**
 * Возвращает массив из всяких штук вроде arguments
 * @param {*} arrayLike
 * @returns {Array}
 */
MBEM.arrayFrom = function (arrayLike) {
    return Array.prototype.slice.call(arrayLike);
};

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-util/array-from/i-mini-util__array-from.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-util/closest/i-mini-util__closest.js */
/**
 * Возвращает ближайший родительский элемент с указанным классом
 * @param {HTMLElement} elem
 * @param {String} className Единственный класс. Без точки!
 * @returns {HTMLElement|undefined}
 */
MBEM.closest = function (elem, className) {
    var regexp = new RegExp('\\b' + className + '\\b');

    while (elem) {
        if (regexp.test(elem.className)) {
            return elem;
        }
        elem = elem.parentNode;
    }
};

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-util/closest/i-mini-util__closest.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-util/cls/i-mini-util__cls.js */
/**
 * Утилиты по работе с классами (classList не поддерживается в старых браузерах, например, в IE 9)
 */

(function () {
    var spaceRegExp = /\s+/;

    MBEM.cls = {
        /**
         * Возвращает список классов из цельного className
         * @param {String} className
         * @returns {Array}
         */
        list: function (className) {
            return className.split(spaceRegExp).filter(Boolean);
        },
        /**
         * Имеет ли указанная DOM-нода указанный класс
         * @param {HTMLElement} node
         * @param {String} className
         * @returns {Boolean}
         */
        contains: function (node, className) {
            return MBEM.cls.list(node.className).indexOf(className) > -1;
        },
        /**
         * Добавляет класс к DOM-ноде
         * @param {HTMLElement} node
         * @param {String} className
         * @returns {MBEM.cls}
         */
        add: function (node, className) {
            var arr = MBEM.cls.list(node.className);
            if (arr.indexOf(className) === -1) {
                arr.push(className);
            }
            node.className = arr.join(' ');
            return this;
        },
        /**
         * Удаляет класс с DOM-ноды
         * @param {HTMLElement} node
         * @param {String} className
         * @returns {MBEM.cls}
         */
        remove: function (node, className) {
            var arr = MBEM.cls.list(node.className),
                index = arr.indexOf(className);
            if (index > -1) {
                arr.splice(index, 1);
            }
            node.className = arr.join(' ');
            return this;
        },
        /**
         * Переключает класс DOM-ноды
         * @param {HTMLElement} node
         * @param {String} className
         * @param {Boolean} [force] Если true, то добавляет, false - удаляет, не передать - переключает класс
         * @returns {MBEM.cls}
         */
        toggle: function (node, className, force) {
            if (force === undefined) {
                force = !MBEM.cls.contains(node, className);
            }
            return MBEM.cls[force ? 'add' : 'remove'](node, className);
        }
    };
})();

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-util/cls/i-mini-util__cls.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-util/extend/i-mini-util__extend.js */
/**
 * Мёржит два объекта. Выполняет вложенный мёрж (deepExtend)
 * @param {Object} base
 * @param {Object} extender
 * @returns {Object}
 */
MBEM.extend = function (base, extender) {
    for (var i in extender) {
        if (extender.hasOwnProperty(i)) {
            var item = extender[i];

            if (item instanceof Array || item instanceof Date || typeof item !== 'object' || item === null) {
                base[i] = item;
            } else {
                base[i] = base[i] || {};
                MBEM.extend(base[i], item);
            }
        }
    }

    return base;
};

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-util/extend/i-mini-util__extend.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-bem/i-mini-bem.js */
(function () {
    var propName = '__uniqMBEM' + Math.random().toString().substr(2, 5);
    var blocks = MBEM.blocks = {};

    /**
     * Прототип для экземпляров класса MBEM
     *
     * @class MBEM
     * @extends MBEM.Observable
     */
    MBEM.prototype = Object.create(MBEM.Observable.prototype);

    /**
     * Возвращает дефолтные параметры блока (this.params)
     * @returns {Object}
     */
    MBEM.prototype.getDefaultParams = function () {
        return {};
    };

    var propListeners = MBEM._propListeners = '__uniqMBEMListeners' + Math.random().toString().substr(2, 5);
    /**
     * Подписывается на события
     * @param {Array|HTMLElement|String} elem Элемент или список событий
     * @param {String|Function} eventNames Список событий или обработчик
     * @param {Function} [handler] Обработчик, если не был передан ранее
     * @returns {MBEM}
     */
    MBEM.prototype.bindTo = function (elem, eventNames, handler) {
        if (typeof eventNames === 'function') {
            handler = eventNames;
            eventNames = elem;
            elem = this.domElem;
        }

        if (typeof elem === 'string') {
            elem = this.elem(elem);
        } else if (!Array.isArray(elem)) {
            elem = [elem];
        }

        eventNames.split(' ').forEach(function (eventName) {
            elem.forEach(function (el) {
                var func = handler.bind(this);
                func.origHandler = handler;

                if (!el[propListeners]) {
                    el[propListeners] = {};
                }
                if (!el[propListeners][eventName]) {
                    el[propListeners][eventName] = [];
                }
                el[propListeners][eventName].push(func);
                el.addEventListener(eventName, func, false);
            }, this);
        }, this);

        return this;
    };

    /**
     * Ищет список дочерних элементов
     * Не использует кеширование
     * @param {String} elem Список название элементов через пробел
     * @param {String} [modName] Название модификатора
     * @param {String} [modVal] Значение модификатора
     * @returns {Array.<HTMLElement>}
     */
    MBEM.prototype.elem = function (elem, modName, modVal) {
        var selfElem = [];

        var str = elem.split(' ').map(function (e) {
            var className = this.__self.className(e, modName, modVal);

            if (MBEM.cls.contains(this.domElem, className)) {
                selfElem.push(this.domElem);
            }

            return '.' + className;
        }, this).join(',');

        return selfElem.concat(MBEM.arrayFrom(this.domElem.querySelectorAll(str)));
    };

    var noop = function () {
    };

    /**
     * Переопределяет одну функцию другой. base можно вызвать из extender через this.__base().
     * Если extender - не функция (например, какое-то свойство), то просто вернёт его
     *
     * @param {Function} [base]
     * @param {Function|*} extender
     * @returns {Function}
     */
    MBEM.override = function (base, extender) {
        if (typeof extender === 'function' && extender.toString().indexOf('__base') > -1) {
            base = base || noop;

            return function () {
                var prevBase = this.__base;

                //noinspection JSPotentiallyInvalidUsageOfThis
                this.__base = base;
                var ret = extender.apply(this, arguments);
                //noinspection JSPotentiallyInvalidUsageOfThis
                this.__base = prevBase;

                return ret;
            };
        }

        return extender;
    };

    /**
     * Объект-хранилище статичных свойств и методов
     * @type {Object}
     */
    MBEM.staticProto = {};

    /**
     * Генерирует имя класса
     * @param {String} [elem] Элемент
     * @param {String} [modName] Название модификатора
     * @param {String|Boolean} [modVal] Значение модификатора
     * @returns {String}
     */
    MBEM.staticProto.className = function (elem, modName, modVal) {
        var res = this._name;

        if (elem) {
            res += '__' + elem;
        }

        if (modName !== undefined && modVal !== false) {
            res += '_' + modName + (modVal !== true && modVal !== undefined ? '_' + modVal : '');
        }

        return res;
    };

    /**
     * Объявляет блок
     * @param {String|Object} blockName Название блока или его описание
     * @param {String} blockName.block Название блока
     * @param {String} blockName.baseBlock Блок, от которого происходит наследование
     * @param {Object} [protoProps] Свойства экземпляра
     * @param {Object} [staticProps] Статичные свойства
     * @returns {Function} Функция-конструктор
     *
     * @example
     * <code>
     *     MBEM.decl('block');
     *
     *     // Доопределение
     *     MBEM.decl('block', {
     *         method: function () {}
     *     });
     *
     *     // Конструктор и статичные свойства
     *     var Block = MBEM.decl('block', {
     *         __constructor: function (opts) {
     *            this.__base.apply(this, arguments);
     *            this._prop = opts.prop;
     *         }
     *     }, {
     *         build: function (opts) {
     *            return new Block(opts);
     *         }
     *     });
     *     var block = Block.build({prop: true});
     *
     *     // Переопределение базового блока
     *     MBEM.decl({block: 'block2', baseBlock: 'block'});
     * </code>
     */
    MBEM.decl = function (blockName, protoProps, staticProps) {
        protoProps = protoProps || {};

        var isNewBlock = false,
            constructor,
            proto,
            staticProto,
            staticProp,
            baseBlockName;

        if (typeof blockName === 'object' && blockName.baseBlock) {
            isNewBlock = true;
            baseBlockName = blockName.baseBlock;
            blockName = blockName.block;
        } else {
            baseBlockName = blockName;
        }

        if (baseBlockName in blocks) {
            proto = blocks[baseBlockName].prototype;
            constructor = staticProto = blocks[baseBlockName];
        } else {
            isNewBlock = true;
            proto = MBEM.prototype;
            staticProto = MBEM.staticProto;
        }

        if (isNewBlock) {
            proto = Object.create(proto);
            constructor = function (opts) {
                this.__internalConstructor(opts);
                this.__constructor(opts);
                this.__afterConstructor(opts);
            };

            constructor.prototype = proto;
            constructor.prototype.constructor = constructor;
            constructor.prototype.__self = constructor;
            constructor._name = blockName;

            blocks[blockName] = constructor;
        }

        for (var protoProp in protoProps) {
            if (protoProps.hasOwnProperty(protoProp)) {
                proto[protoProp] = MBEM.override(proto[protoProp], protoProps[protoProp]);
            }
        }

        for (staticProp in staticProto) {
            if ((!staticProps || !staticProps.hasOwnProperty(staticProp)) && !constructor[staticProp]) {
                constructor[staticProp] = staticProto[staticProp];
            }
        }

        if (staticProps) {
            for (staticProp in staticProps) {
                if (staticProps.hasOwnProperty(staticProp)) {
                    constructor[staticProp] = MBEM.override(staticProto[staticProp], staticProps[staticProp]);
                }
            }
        }

        return constructor;
    };

    /**
     * Возвращает блок, привязанный к DOM-ноде, если он есть
     * @param {HTMLElement} node
     * @param {String} blockName Название блока
     * @returns {MBEM|undefined}
     */
    MBEM.getBlock = function (node, blockName) {
        return node[propName] && node[propName][blockName];
    };

    /**
     * Пишет ошибку в консоль
     */
    MBEM.consoleError = function () {
        if (window.console && window.console.error) {
            try {
                window.console.error.apply(window.console, arguments);
            } catch (err) {
                // ie9 apply :(
            }
        }
    };

    /**
     * Конструктор MBEM-блока
     * @param {Object} opts Опции создания блока: имя, DOM-нода, параметры, модификаторы (при наличии mods)
     * @constructor
     */
    MBEM.prototype.__internalConstructor = function (opts) {
        opts = opts || {};

        this.domElem = opts.node;
        this.params = MBEM.extend(this.getDefaultParams(), opts.params || {});

        if (opts.node) {
            (opts.node[propName] || (opts.node[propName] = {}))[this.__self._name] = this;
        }
    };

    /**
     * Конструктор MBEM-блока, который доступен для переопределения. В этот момент уже определены params/domElem
     * @param {Object} opts Опции создания блока: имя, DOM-нода, параметры, модификаторы (при наличии mods)
     * @constructor
     */
    MBEM.prototype.__constructor = function (/* opts */) {
    };

    /**
     * Конструктор бем-блока, который зовётся после всех пользовательских конструкторов
     * @param {Object} opts Опции создания блока: имя, DOM-нода, параметры, модификаторы (при наличии mods)
     * @constructor
     */
    MBEM.prototype.__afterConstructor = function (/* opts */) {
    };

    /**
     * Возвращает блок с указанной DOM-ноды или создаёт его
     * @param {HTMLElement} node
     * @param {String} blockName
     * @param {Object} [params]
     * @returns {MBEM}
     */
    MBEM.initBlockFromNode = function (node, blockName, params) {
        var block;

        if ((block = MBEM.getBlock(node, blockName))) {
            return block;
        }

        if (!params) {
            params = MBEM.getNodeParams(node)[blockName];
        }

        return MBEM._createBlockFromNode({node: node, block: blockName, params: params});
    };

    /**
     * Создаёт MBEM-блок
     * @param {Object} opts Опции
     * @param {String} opts.block Название блока
     * @param {Object} [opts.params] Параметры блока
     * @param {HTMLElement} [opts.node] DOM-нода
     * @returns {MBEM|undefined} undefined, если блок не объявлен
     */
    MBEM.createBlock = function (opts) {
        if (!blocks[opts.block]) {
            MBEM.consoleError('Block is not declared', opts.block);
            return;
        }

        return new blocks[opts.block](opts);
    };

    /**
     * Создаёт MBEM-блок с DOM-ноды, если нужно (live инициализация
     * @type {Function}
     * @param {Object} opts Опции
     * @protected
     */
    MBEM._createBlockFromNode = MBEM.createBlock;

    /**
     * Возвращает все параметры блоков с указанной DOM-ноды
     * @param {HTMLElement} node
     * @returns {Object|undefined}
     */
    MBEM.getNodeParams = function (node) {
        var params;

        try {
            params = JSON.parse(node.getAttribute('data-bem')) || {};
        } catch (err) {
            MBEM.consoleError('Incorrect params', node);
            return;
        }

        return params;
    };
})();

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-bem/i-mini-bem.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-polyfill/bind/i-polyfill__bind.js */
/**
 * Укороченная версия полифила bind, поддерживает только контекст
 */
if (!Function.prototype.bind) {
    Function.prototype.bind = function (arg) {
        var self = this;

        return function () {
            return self.apply(arg, arguments);
        };
    };
}

/* end: ../../node_modules/mini-suggest/common.blocks/i-polyfill/bind/i-polyfill__bind.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-channel/i-mini-channel.js */
(function () {
    var channels = {};

    /**
     * Возвращает канал событий
     * @param {String} [name] Имя. Если уже был создан, то возвращает его, иначе создаёт новый. Если не передать ничего, создаёт анонимный канал
     * @returns {MBEM.Observable}
     */
    MBEM.channel = function (name) {
        if (name !== undefined && channels[name]) {
            return channels[name];
        }

        var channel = new MBEM.Observable();

        if (name !== undefined) {
            channels[name] = channel;
        }

        return channel;
    };
})();

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-channel/i-mini-channel.js */
/* begin: ../../node_modules/mini-suggest/touch.blocks/mini-suggest/mini-suggest.js */
/* eslint no-bitwise: 1 */

(function () {
    /**
     * Энкодит строку, чтобы её можно было вставить в html
     * @param {String} str
     * @returns {String}
     */
    var encode = function (str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    };

    /**
     * Дополняет урл протоколом
     * @param {String} url
     * @returns {String}
     */
    var resolveUrl = function (url) {
        return (/[/]{2}/.test(url) ? '' : 'http://') + url;
    };

    /**
     * @class miniSuggest
     * @extends MBEM
     * @desc Строка поиска. Управляет работой кнопки, инпута, крестика в инпуте, попапом с саджестом
     *
     * @property {String} url Урл до ручки саджеста, например,
     * //yandex.ru/suggest/suggest-endings?srv=morda_ru_touch&wiz=TrWth&uil=ru&fact=1&v=4&icon=1&mob=1&tpah=1&sn=7&full_text_count=5&bemjson=0
     * @property {Number} [popupOffset=3] Вертикальный отступ попапа от инпута
     * @property {String} [clickHost] Путь до хоста, куда нужно логировать safeclick-счётчики (если используется, параметр safeclick=1 в url)
     */
    MBEM.decl('mini-suggest', {
        /**
         * События клика по кнопке
         * @event miniSuggest#button-click
         */
        /**
         * События изменения значения инпута
         * @event miniSuggest#input-change
         * @param {String} type Тип изменения: 'tpah', 'suggest-item', 'user', 'clear'
         */
        /**
         * События клика по тап-ахеду
         * @event miniSuggest#item-tpah
         * @param {Number} itemIndex Индекс подсказки
         * @param {String} val Текстовое значение тап-ахеда (полное)
         */
        /**
         * События клика по произвольной подсказке (помимо тап-ахеда, но включая навигационные)
         * Если отменить событие, то сабмит формы и подстановка текста будут отменены (но не подстановка текста)
         * @event miniSuggest#item-select
         *
         * @param {HTMLElement} node DOM-нода с элементом
         * @param {String} type Тип подсказки
         * @param {Number} itemIndex Индекс подсказки
         * @param {String} val Текстовое значение подсказки
         * @param {Boolean} byKeyboard Была ли использована клавиатура
         */
        /**
         * Обновление содержимого попапа
         * @event miniSuggest#popup-update
         * @param {Array} items Отрисованные подсказки
         */
        /**
         * Показ попапа
         * @event miniSuggest#popup-show
         */
        /**
         * Скрытие попапа
         * @event miniSuggest#popup-hide
         */
        /**
         * Начало запроса за данными
         * @event miniSuggest#request
         */
        /**
         * Обработчик получения данных от сервера
         * @event miniSuggest#response
         * @param {Array} data Исходные данные от сервера
         * @param {String} url Строка запроса (для использования, например, в Resource Timing API)
         * @param {Number} duration Время ответа
         */
        /**
         * Сабмит формы
         * @event miniSuggest#submit
         */

        /**
         * @constructor
         */
        __constructor: function () {
            this.__base.apply(this, arguments);

            var input;

            this._input = input = this.elem('input')[0];
            this._val = input.value;
            this._popup = undefined;
            // Есть ли какой-то контент в попапе
            this._popupHasContent = false;
            // Отключение событий внутри попапа до указанного времени
            this._popupDelayTime = 0;
            // Стартовый скролл страницы при нажатии в попапе, чтобы можно было всё скроллить
            this._popupTouchStartScroll = 0;
            this._focused = false;
            this._freezeFocusDelayTime = 0;

            this._prevRequestText = null;

            this.bindTo('click', function (event) {
                if (!MBEM.cls.contains(event.target, 'mini-suggest__button')) {
                    this._input.focus();
                }
            });

            this.bindTo('submit', function (event) {
                if (this._onSubmit() === false) {
                    event.preventDefault();
                }
            });

            this.bindTo(input, 'focus', this._onFocus);
            this.bindTo(input, 'blur deactivate', this._onBlur);
            this.bindTo(input, 'input', this._onValueChange);
            if (document.documentMode === 9) {
                this.bindTo(document, 'selectionchange', function () {
                    if (document.activeElement === this._input) {
                        this._onValueChange();
                    }
                });
            }

            this.bindTo('button', 'click', function () {
                this.trigger('button-click');
            });

            // Фризим фокус при нажатии на всё внутри стрелки (инпут, крестик, кнопка)
            // Инпут нужен, чтобы во втором андроиде фокус не слетал от переключения body_search_yes
            // Крестик и кнопка нужны, чтобы не слетал body_search_yes при использовании фичей поиска
            this.bindTo('touchstart mousedown', this._freezeFocus);

            this.bindTo('input-clear', 'click MSPointerUp', this._onClearClick);

            this._updateInputVal();

            this.bindTo(window, 'orientationchange resize', function () {
                if (this._popupShown) {
                    this.repositionPopup();
                }
            });

            if (document.activeElement === this._input) {
                this._onFocus();
            }
        },
        /**
         * Возвращает дефолтные параметры блока
         * @returns {Object}
         */
        getDefaultParams: function () {
            return {
                popupOffset: 3
            };
        },
        /**
         * Переносит курсор (каретку) из инпута в фокусе в конец значения
         * @protected
         */
        _moveCaretToEnd: function () {
            var len = this._val.length;

            try {
                if (typeof this._input.createTextRange !== 'undefined') { // IE
                    var range = this._input.createTextRange();
                    range.collapse(false);
                    range.select();
                } else if (typeof this._input.selectionStart === 'number') {
                    this._input.scrollLeft = 999999;
                    this._input.setSelectionRange(len, len);
                }
            } catch (err) {
                //
            }
        },
        /**
         * Возвращает позицию курсора (каретки) в инпуте
         * @returns {Number}
         * @protected
         */
        _getCaretPosition: function() {
            var len = this._val.length,
                sel;

            if (document.selection) {
                sel = document.selection.createRange();
                sel.moveStart('character', -len);
                return sel.text.length;
            } else if (typeof this._input.selectionStart === 'number') {
                return this._input.selectionStart;
            }

            return len;
        },
        /**
         * Выключает логику потери фокуса на 1000 мс
         * @protected
         */
        _freezeFocus: function () {
            this._freezeFocusDelayTime = Date.now() + 1000;
        },
        /**
         * Добавляет значение тап-ахеда из подсказки в инпут
         * @param {HTMLElement} node
         * @protected
         */
        _appendTpah: function (node) {
            this._input.value = node.getAttribute('data-tpah') + ' ';
            this._updateInputVal();

            this._moveCaretToEnd();
            this._input.focus();
            this._update();

            this.trigger('input-change', {type: 'tpah'});
        },
        /**
         * Обрабатывает клик по подсказке
         * @param {HTMLElement} node DOM-нода с подсказкой (должна иметь класс "mini-suggest__item")
         * @param {String|null} type Тип подсказки (data-type)
         * @param {String|null} text Текст, который будет подставлен в инпут (data-text)
         * @returns {Boolean} Обработан ли клик
         * @protected
         */
        _processItemClick: function (node, type, text) {
            var res,
                safeclick;

            if (type === 'tpah') {
                this._appendTpah(node);
                this.trigger('item-tpah', {
                    itemIndex: node.getAttribute('data-index') | 0,
                    val: node.getAttribute('data-tpah')
                });
            } else if (type === 'fact' || type === 'fulltext') {
                // Отменяем ближайшие обновления саджеста
                this._submitTime = Date.now();
                this._input.value = this._val = text;
                this._updateInputVal();
                this._moveCaretToEnd();
                this.trigger('input-change', {type: 'suggest-item'});

                // Отменяем сабмит формы
                if (this.trigger('item-select', this._getItemEventProps(node, type, text)) !== false) {
                    if (this._onSubmit() !== false) {
                        this.domElem.submit();
                    }
                }
            } else if (type === 'nav') {
                // Отменяем переход по ссылке
                res = this.trigger('item-select', this._getItemEventProps(node, type, text));

                if (res !== false) {
                    safeclick = node.getAttribute('data-safeclick');
                    if (safeclick) {
                        new Image().src = this.params.clickHost + safeclick;
                        this._addMetrikaCookie(node);
                    }
                }

                return res === false;
            }

            return true;
        },
        /**
         * Параметры для события `item-select`
         * @param {HTMLElement} node DOM-нода с подсказкой (должна иметь класс "mini-suggest__item")
         * @param {String|null} type Тип подсказки (data-type)
         * @param {String|null} text Текст, который будет подставлен в инпут (data-text)
         * @returns {Object}
         * @protected
         */
        _getItemEventProps: function (node, type, text) {
            return {
                node: node,
                type: type,
                byKeyboard: false,
                itemIndex: node.getAttribute('data-index') | 0,
                val: type === 'nav' ? this._val : text
            };
        },
        /**
         * Логика обработки клика по элементу попапа
         * @param {HTMLElement} target
         * @param {String} eventType Тип произошедшего события
         * @returns {Boolean} Обработан ли клик
         * @protected
         */
        _processPopupClick: function (target, eventType) {
            var node = MBEM.closest(target, 'mini-suggest__item'),
                type = node && node.getAttribute('data-type'),
                text = node && node.getAttribute('data-text');

            if (!node) {
                return true;
            }

            // nav-ссылки не обрабатываются, и данная проверка нужна, чтобы не было двух событий item-select
            if (eventType !== 'click' && type === 'nav') {
                return false;
            }

            return this._processItemClick(node, type, text);
        },
        /**
         * Обработчика клика по попапу (включая клики по дочерним элементам)
         * @param {Event} event
         * @protected
         */
        _onPopupClick: function (event) {
            if (MBEM.cls.contains(event.target, 'mini-suggest__popup-spacer')) {
                this._popupDelayTime = 0;
                this._freezeFocusDelayTime = 0;
                this._outClick();
                return;
            }

            if (this._popupDelayTime > Date.now() || this._popupDisableClicks) {
                this._input.focus();
                this._freezeFocus();
                event.preventDefault();
                return;
            }

            if (this._processPopupClick(event.target, 'click')) {
                event.preventDefault();
            } else {
                this._hidePopup();
            }
        },
        /**
         * Возвращает координаты события
         * @param {Event} event
         * @returns {{x: (Number), y: (Number)}}
         * @protected
         */
        _getTouchCoords: function (event) {
            var touches = (event.touches && event.touches.length) ? event.touches : event.changedTouches,
                touch = touches && touches[0] || event;

            return {
                x: touch.pageX || touch.clientX || 0,
                y: touch.pageY || touch.clientY || 0
            };
        },
        /**
         * Отдельный обработчик на touchstart, чтобы не терять фокус и не скрывать попап
         * @param {Event} event
         * @protected
         */
        _onPopupTouchStart: function (event) {
            if (MBEM.cls.contains(event.target, 'mini-suggest__popup-spacer')) {
                return;
            }

            this._popupTouchStartCoords = this._getTouchCoords(event);
            if (event.type === 'touchstart') {
                this._popupTouchStarted = true;
                this._popupDisableClicks = false;
            }
            this._freezeFocus();
        },
        /**
         * Обработчик touchend в попапе и вложенных элементаъ
         * @param {Event} event
         * @protected
         */
        _onPopupTouchEnd: function (event) {
            if (MBEM.cls.contains(event.target, 'mini-suggest__popup-spacer')) {
                return;
            }

            // Если страницу скроллили, то клавиатура не должна скрываться, отменяем фриз фокуса
            var coords = this._getTouchCoords(event),
                x = (coords.x - this._popupTouchStartCoords.x),
                y = (coords.y - this._popupTouchStartCoords.y),
                dist = x * x + y * y;
            if (dist > 64) {
                this._freezeFocusDelayTime = 0;
                return;
            }
            // Если только что открыли попап, то ничего не делаем
            if (this._popupDelayTime > Date.now()) {
                this._freezeFocus();
                return;
            }

            this._freezeFocus();

            if (this._processPopupClick(event.target, 'touchend')) {
                event.preventDefault();
                if (this._popupTouchStarted) {
                    this._popupDisableClicks = true;
                }
            }
        },
        /**
         * Создаёт попап, если он ещё не был создан
         * @protected
         */
        _createPopup: function () {
            if (this._popup) {
                return;
            }

            var popup = this._popup = document.createElement('div');
            popup.className = 'mini-suggest__popup mini-suggest__popup_hidden_yes mini-suggest__popup_svg_' + (this.__self._hasSvg() ? 'yes' : 'no');
            this.bindTo(popup, 'click', this._onPopupClick);
            this.bindTo(popup, 'mousedown touchstart', this._onPopupTouchStart);
            this.bindTo(popup, 'touchend', this._onPopupTouchEnd);

            var content = this._popupContent = document.createElement('div');
            content.className = 'mini-suggest__popup-content';
            popup.appendChild(content);

            var spacer = document.createElement('div');
            spacer.className = 'mini-suggest__popup-spacer';
            popup.appendChild(spacer);

            document.body.appendChild(popup);
        },
        /**
         * Обработчик "клика мимо" (клик по пустому месту ниже попапа/оверлею)
         * @protected
         */
        _outClick: function () {
            if (this._popupDelayTime > Date.now() || this._freezeFocusDelayTime > Date.now()) {
                // this._freezeFocus();
                this._input.focus();
                return;
            }
            this._onBlur();
        },
        /**
         * Генерирует вёрстку одной подсказки
         * @param {Array} item Данные подсказки
         * @param {Number} index Номер подсказки
         * @returns {String} html-вёрстка подсказки
         * @protected
         */
        _drawItem: function (item, index) {
            var type = item[0];

            var obj = {
                tag: 'div',
                className: 'mini-suggest__item mini-suggest__item_type_' + type,
                attrs: 'data-index="' + index + '" data-type="' + type + '"',
                content: ''
            };

            obj = this._buildItem(item, obj);

            if (!obj.content) {
                return '';
            }

            return '<' + obj.tag + ' class="' + obj.className + '" ' + obj.attrs + '>' + obj.content + '</' + obj.tag + '>';
        },
        /**
         * Генерит содержимое подсказки по-отдельности: атрибуты, контент, класс
         * @param {Array} item Данные подсказки
         * @param {MiniSuggestItemProps} obj
         * @returns {MiniSuggestItemProps}
         * @protected
         */
        _buildItem: function (item, obj) {
            var type = item[0],
                isNav = type === 'nav',
                title,
                info,
                text,
                safeclickUrl;

            if (isNav || type === 'fact') {
                title = isNav ? item[1] : item[2];
                info = item[3] || item[1];

                obj.content = '<span class="mini-suggest__item-title">' + encode(title) + '</span>' +
                    '<span class="mini-suggest__item-info">' + encode(info) + '</span>';

                if (isNav) {
                    obj.tag = 'a';
                    obj.attrs += ' href="' + resolveUrl(item[4]) + '" target="_blank" rel="noopener"';

                    safeclickUrl = typeof item[5] === 'object' && item[5] !== null ? item[5].counter : item[5];
                    if (safeclickUrl && this.params.clickHost) {
                        obj.attrs += ' data-safeclick="' + encode(safeclickUrl) + '"';
                    }
                } else {
                    obj.attrs += ' data-text="' + encode(info) + '"';
                }
            } else if (type === 'tpah') {
                obj.attrs += '  data-tpah="' + encode(item[1]) + '"';
                text = item[1];
                if (item[3] && item[3].tpah) {
                    text = text.substr(item[3].tpah[0]);
                }
                obj.content = encode(text);
            } else if (type === 'fulltext') {
                obj.attrs += ' data-text="' + encode(item[1]) + '"';
                obj.content = encode(item[1]);
            }

            return obj;
        },
        /**
         * Преобразует ответ от сервера в список подсказок
         * @param {Array} data
         * @returns {Array} Список подсказок
         * @protected
         */
        _processResponse: function (data) {
            var items = [],
                last;

            this._createPopup();

            if (data[2]) {
                items.push.apply(items, data[2].map(function (item) {
                    return ['tpah'].concat(item);
                }));
            }

            if (data[3] && (data[3][0] === 'nav' || data[3][0] === 'fact')) {
                items.push(data[3]);
            }

            last = data[data.length - 1];
            if (last && last.suggestions) {
                items.push.apply(items, last.suggestions.map(function (item) {
                    return ['fulltext'].concat(item);
                }));
            }

            return items;
        },
        /**
         * "Рисует" указанные подсказки в попапе и показывает его, либо скрывает, если подсказок нет
         * @param {Array} items
         * @protected
         */
        _drawPopup: function (items) {
            if (items.length) {
                this._popupContent.innerHTML = this._getItemsHTML(items);
                this._popupHasContent = true;

                this.trigger('popup-update', {items: items});
                this._showPopup();
            } else {
                this._popupHasContent = false;
                this._hidePopup();
            }
        },
        /**
         * Генерирует html для списка подсказок
         * @param {Array} items
         * @returns {String}
         * @protected
         */
        _getItemsHTML: function (items) {
            return items.map(this._drawItem, this).join('');
        },
        /**
         * Обработчик получения данных от сервера
         * @param {Array} items
         * @protected
         */
        _onSuggestData: function (items) {
            this._drawPopup(items);
        },
        /**
         * Делает запрос за обновлёнными данными (если значение действительно поменялось)
         * @param {Boolean} [force] Принудительно обновить содержимое
         * @protected
         */
        _update: function (force) {
            if (!force && (this._prevRequestText === this._val || (this._submitTime && (Date.now() - this._submitTime) < 500))) {
                return;
            }
            this._prevRequestText = this._val;

            this._request(this._val);
            this.trigger('request', {text: this._val});
        },
        /**
         * Обработчик сабмита формы
         * @returns {Boolean|undefined} Если вернёт false, то форма не будет отправлена
         * @protected
         */
        _onSubmit: function () {
            // Фикс баги WP 8.1: при сабмите формы не закрывается клавиатура

            this._freezeFocus();
            try {
                if (document.activeElement) {
                    document.activeElement.blur();
                }
            } catch (e) {
                // no active element?
            }

            return this.trigger('submit');
        },
        /**
         * Показывает попап, обновляет его позицию
         * @protected
         */
        _showPopup: function () {
            if (!this._popupShown && this._focused) {
                this._popupShown = true;
                this.repositionPopup();
                MBEM.cls.remove(this._popup, 'mini-suggest__popup_hidden_yes');
                this._popupDelayTime = Date.now() + 500;
                this.trigger('popup-show');
            }
        },
        /**
         * Скрывает попап
         * @protected
         */
        _hidePopup: function () {
            if (this._popupShown) {
                MBEM.cls.add(this._popup, 'mini-suggest__popup_hidden_yes');
                this._popupShown = false;
                this.trigger('popup-hide');
            }
        },
        /**
         * Перепозиционирует попап
         */
        repositionPopup: function () {
            if (!this._popupShown) {
                return;
            }

            this._popup.style.top = (
                MBEM.offset(this._input).top +
                this._input.offsetHeight +
                this.params.popupOffset
            ) + 'px';
        },
        /**
         * Обработчки получения фокуса - показываем попап, делаем запрос за новыми данными
         * @protected
         */
        _onFocus: function () {
            if (/*parseInt(MBEM.blocks['i-mini-ua'].ios, 10) >= 8 && */!this._focused) {
                if (this._input.selectionStart === this._input.value.length) {
                    this._input.scrollLeft = this._input.scrollWidth;
                }
            }

            MBEM.cls.add(document.body, 'body_search_yes');
            this._focused = true;
            if (this._popupHasContent) {
                this._showPopup();
            }
            this._fixScrollTop();
            clearTimeout(this._blurTimeout);
            this._update();
        },
        /**
         * Мелкий подскролл, чтобы окно было примерно в одной и той же позиции
         * @protected
         */
        _fixScrollTop: function () {
            // scrollTo(0, 0) плохо работает в iOS
            if (window.pageYOffset < 1) {
                document.body.scrollTop = 0;
            }
        },
        /**
         * Обработчик потери фокуса - скрываем попап, выключаем "режим поиска"
         * @protected
         */
        _onBlur: function () {
            if (this._freezeFocusDelayTime > Date.now()) {
                return;
            }

            this._focused = false;
            this._hidePopup();

            // Двух зайцев одним таймаутом:
            // - уменьшаем дёрганье страницы от одновременного скрытия клавиатуры и переезжания всего
            // - фиксим прокликивание в страницу во втором андроиде
            // В нормальных браузерах разница не особо заметна
            clearTimeout(this._blurTimeout);
            this._blurTimeout = setTimeout(this._afterBlur.bind(this), 300);
        },
        /**
         * Фактическое убирание класса, означающего, что "фокус есть"
         * @private
         */
        _afterBlur: function () {
            MBEM.cls.remove(document.body, 'body_search_yes');
        },
        /**
         * Обработчик смены значения инпута
         * @protected
         */
        _onValueChange: function () {
            if (this._input.value === this._val) {
                return;
            }

            this._updateInputVal();
            this._update();

            this.trigger('input-change', {type: 'user'});
        },
        /**
         * Обновляет внутреннее значение инпута и связанные с ним флаги
         * @protected
         */
        _updateInputVal: function () {
            this._val = this._input.value;
            if (!this._val) {
                this._popupHasContent = false;
            }
            MBEM.cls.toggle(this.domElem, this.__self.className('', 'has-value', 'yes'), !!this._val);
        },
        /**
         * Обработчика клика по крестику
         * @protected
         */
        _onClearClick: function () {
            // Нужно сначала зафокусить _input, и только потом менять value.
            // Иначе textarea во втором андроиде может не перерисоваться.
            this._freezeFocus();
            this._input.focus();
            this._input.value = '';
            this._updateInputVal();
            this._update();

            this.trigger('input-change', {type: 'clear'});
        },
        /**
         * Добавляет скрытый инпут в форму
         * @param {String} name
         * @param {String} value
         * @protected
         */
        _appendHiddenInput: function (name, value) {
            var hidden = this.domElem.querySelector('input[name=' + name + ']');

            if (!hidden) {
                hidden = document.createElement('input');
                hidden.type = 'hidden';
                hidden.name = name;
                this.domElem.appendChild(hidden);
            }

            hidden.value = value;
        },
        /**
         * Записываем в куку метрики информацию о переходе
         * @param {HTMLElement} node
         * @private
         */
        _addMetrikaCookie: function (node) {
            var text = this._val,
                reqid = this._reqID,
                link = node.href,
                source = [text, link, this._getNavSource(), reqid].map(encodeURIComponent).join(':'),
                now = Date.now(),
                expirationTime = 10 * 60 * 1000;

            document.cookie = 'sc_' + now + '=' + source +
                ';path=/watch;domain=.' + (location.hostname.match(/yandex\..+$/) || [])[0] +
                ';expires=' + (new Date(now + expirationTime)).toUTCString() +
                ';secure';
        },
        /**
         * Возвращает префикс счетчика, например '/search/suggest'
         * Необходимо переопределить на сервисе
         * @returns {String|null}
         * @protected
         */
        _getNavSource: function () {
            return null;
        },
        /**
         * Динамические параметры запроса саджеста (остальные должны быть описаны в params.url)
         * @param {String} text
         * @returns {Object}
         * @protected
         */
        _getMainUrlParams: function (text) {
            return {
                svg: (this.__self._hasSvg() ? 1 : 0),
                part: text,
                pos: this._getCaretPosition()
            };
        }
    }, {
        /**
         * Есть ли поддержка svg в браузере
         * @returns {Boolean}
         * @protected
         */
        _hasSvg: function () {
            // На морде/web4 используется i-ua_[inline]svg_yes
            // В бабуле используется ua_svg_yes
            // Проверяем наличие класса с svg_yes у <html>
            return document.documentElement.className.indexOf('svg_yes') !== -1;
        },
        _encode: encode
    });
})();

/**
 * @typedef {Object} MiniSuggestItemProps
 * @property {String} tag
 * @property {String} className
 * @property {String} attrs
 * @property {String} content
 */

 MBEM.decl('mini-suggest', {
    _fixScrollTopFixed: function () {
        // scrollTo(0, 0) плохо работает в iOS
        if (window.pageYOffset > 1) {
            document.documentElement.scrollTop = 0;
        }
    },
    _onFocus: function () {
        this._fixScrollTopFixed();
        _this = this;
        _base = this.__base;
        _args = arguments;

        setTimeout(function(){
            _base.apply(_this, _args);
            console.log('Я починен');
        }, 100);
    },
 });

/* end: ../../node_modules/mini-suggest/touch.blocks/mini-suggest/mini-suggest.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-polyfill/now/i-polyfill__now.js */
/**
 * Полифил для Date.now()
 */
if (!Date.now) {
    Date.now = function () {
        return (new Date()).getTime();
    };
}

/* end: ../../node_modules/mini-suggest/common.blocks/i-polyfill/now/i-polyfill__now.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-util/offset/i-mini-util__offset.js */
/**
 * Считает отступ элемента от верхнего левого угла документа
 * Не используем offsetTop/offsetLeft, так как они возвращают целочисленные значения, а нам нужны дробные
 * Не используем одиночный getBoundingClientRect, так как он в разных браузерах зависит от скролла
 *
 * @param {HTMLElement} node
 * @returns {{top: number, left: number}}
 */
MBEM.offset = function (node) {
    if (!node) {
        return {
            top: 0,
            left: 0
        };
    }

    var nodeBBox = node.getBoundingClientRect();
    var rootBBox = document.documentElement.getBoundingClientRect();

    return {
        top: nodeBBox.top - rootBBox.top,
        left: nodeBBox.left - rootBBox.left
    };
};

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-util/offset/i-mini-util__offset.js */
/* begin: ../../node_modules/mini-suggest/touch.blocks/mini-suggest/counter/mini-suggest__counter.js */
// todo prev_query
/**
 * @mixin miniSuggestCounter
 * @lends miniSuggestCounter.prototype
 * @extends miniSuggest
 * @desc Отправляет статистику при отправке формы
 *
 * ## Параметры блока
 *
 * @property {Object} counter
 * @property {String} counter.service Сервис, с которого уходит запрос в саджест
 * @property {String} counter.url Урл, по которому будет отправлена статистика. Например, '//yandex.ru/clck/jclck'
 * @property {String} counter.yandexuid Yandex UID пользователя
 * @property {*} counter.params Дополнительные параметры
 * @property {Number} counter.timeout Таймаут на отправку статистики
 */
MBEM.decl('mini-suggest', {
    /**
     * @constructor
     */
    __constructor: function () {
        // Инитим все свойства до вызова __base,
        // так как в конструкторе может происходить запрос саджеста

        if (this.params.counter) {
            this._renderTime = 0;

            this._isSendBeaconAvailable = 'sendBeacon' in navigator &&
                // В UC браузере плохо работает sendBeacon
                navigator.userAgent.indexOf('UCBrowser') === -1;

            this._clearCounters();

            this
                .on('submit', this._handleSubmit, this)
                .on('request', this._handleRequest, this)
                .on('response', this._handleResponse, this)
                .on('input-change', this._handleInputChange, this)
                .on('popup-update', this._handlePopupUpdate, this)
                .on('item-select', this._handleItemSelect, this)
                .on('item-tpah', this._handleItemTpah, this)
                .on('popup-show', this._handlePopupShow, this)
                .on('button-click', this._handleButtonClick, this);
        }

        this.__base.apply(this, arguments);
    },
    /**
     * Обработчик события submit
     * @protected
     */
    _handleSubmit: function() {
        if (
            // Если запрос был отправлен кликом мышкой по кнопке «Найти»,
            this._path.submit === 'button_by_mouse' ||
            // или запрос был отправлен с клавиатуры
            // и при этом подсказка не была выбрана с клавиатуры
            // (на touch-устройствах нельзя выбрать подсказку с клавиатуры, но это для надёжности).
            this._path.submit === 'keyboard' && this._path.state !== 'keyboard'
        ) {
            this._addAction('submit');
        }

        this._sendCounters();
    },
    /**
     * Обработчик события request
     * @protected
     */
    _handleRequest: function() {
        ++this._responses.rqs;
    },
    /**
     * Обработчик события response
     * @param {Event} event
     * @param {Object} data
     * @protected
     */
    _handleResponse: function(event, data) {
        if (data.duration !== undefined) {
            this._params.times += (this._params.times ? '.' : '') + data.duration;
        }
        this._renderTime = Date.now();

        ++this._responses.rsp;
        if (!data.items.length) {
            ++this._responses.ersp;
        }
        if (data.fromCache) {
            ++this._responses.cchd;
        }
    },
    /**
     * Обработчик события popup-update
     * @param {Event} event
     * @param {Object} data
     * @protected
     */
    _handlePopupUpdate: function (event, data) {
        this._params.render_times += (this._params.render_times ? '.' : '') + (Date.now() - this._renderTime);
        ++this._responses.rndr;

        var hasPersonal = data.items.some(function (item) {
            return item[3] && item[3].src === 'Pers';
        });

        this._path.personal = hasPersonal ? 'nah_not_used' : 'nah_not_shown';
    },
    /**
     * Обработчик события item-select
     * @param {Event} event
     * @param {Object} data
     * @protected
     */
    _handleItemSelect: function(event, data) {
        var type = data.node.getAttribute('data-log-type') || (data.type === 'nav' ? 'nav' : 'phrase');

        if (data.personal) {
            this._path.personal = 'nah_used';
        }

        this._addAction(type, data.itemIndex + 1);

        this._path.state = data.byKeyboard ? 'keyboard' : 'mouse';
        this._path.index = data.itemIndex + 1;
        this._selectedText = data.val;

        this._path.submit = data.byKeyboard ? 'keyboard' : 'click_by_mouse';

        if (data.type === 'nav') {
            this._sendCounters();
        }
    },
    /**
     * Обработчик события item-tpah
     * @param {Event} event
     * @param {Object} data
     * @protected
     */
    _handleItemTpah: function(event, data) {
        this._selectedText = data.val;
        this._path.state = 'tpah';
        this._addAction('word', data.itemIndex + 1);
        ++this._responses.clks;
    },
    /**
     * Обработчик события popup-show
     * @protected
     */
    _handlePopupShow: function() {
        if (this._path.state === 'not_shown') {
            this._path.state = 'not_used';
        }
    },
    /**
     * Обработчик события button-click
     * @protected
     */
    _handleButtonClick: function() {
        if (this._path.submit !== 'keyboard') {
            this._path.submit = 'button_by_mouse';
        }
    },
    /**
     * Обработчик события input-change
     * @param {Event} event
     * @param {Object} data
     * @protected
     */
    _handleInputChange: function(event, data) {
        var change;

        if (data.type === 'user') {
            if (this._params.user_input.length < this._input.value.length) {
                this._addAction('add');
            } else {
                this._addAction('del');
            }
        } else if (data.type === 'clear' && this._params.user_input.length) {
            this._addAction('clear');
        }

        if (data.type === 'user' || data.type === 'clear') {
            change = this._calcInputChange(this._prevVal, this._input.value);
            if (change.type === 'add') {
                this._params.user_input += (this._params.user_input && !this._changedByUser ? '!' : '') + change.text;
                this._userInputVal += change.text;
            } else if (change.type === 'del') {
                if (this._userInputVal.substr(this._userInputVal.length - change.text.length) === change.text) {
                    this._params.user_input = this._params.user_input.slice(0, this._params.user_input.length - change.text.length);
                    this._userInputVal = this._userInputVal.slice(0, this._userInputVal.length - change.text.length);
                }
            } else {
                this._params.user_input = change.text;
                this._userInputVal = change.text;
            }
            this._changedByUser = true;
        } else {
            this._changedByUser = false;
        }

        if (data.type === 'user' || data.type === 'clear' || data.type === 'tpah') {
            this._firstChange = this._firstChange || Date.now();
            this._lastChange = Date.now();

            if (!this._startInputTime) {
                this._startInputTime = this._firstChange;
            }
        }

        // На случай, если запрос был отредактирован после выбора подсказки @see st/SERP-35273
        if (this._selectedText) {
            this._path.state = 'edit';
        }

        this._ratio.actionsCount++;
        this._prevVal = this._input.value;
    },
    /**
     * По фокусу запоминаем время: если время не было записано ранее,
     * или если было и мы после этого потеряли фокус на достаточное время
     * @protected
     */
    _onFocus: function () {
        this.__base.apply(this, arguments);

        this._startInputTime = this._startInputTime || Date.now();
        var sinceBlur = this._blurTime && Date.now() - this._blurTime;
        if (sinceBlur && sinceBlur > 300) {
            this._blurDuration += sinceBlur;
            this._blurTime = null;
            if (this._lastChange) {
                this._blurDurationLastChange += sinceBlur;
            }
            if (this._firstChange) {
                this._blurDurationFirstChange += sinceBlur;
            }
        }
    },
    /**
     * По потере фокуса запоминаем время: маленькие потери фокуса характерны для крестика и тап-ахеда
     * @protected
     */
    _onBlur: function () {
        this.__base.apply(this, arguments);

        this._blurTime = Date.now();
    },
    /**
     * Дописывает необходимые параметры, отправляет статистику и очищает её
     * @private
     */
    _sendCounters: function () {
        this._params.text = this._input.value;
        this._params.pos = this._getCaretPosition();
        this._attachReqID();

        var url = this._getUrl();
        this._clearCounters();

        this._sendStatUrl(url);
    },
    /**
     * Отправляет статистику по указанному url'у, сабмитит форму при необходимости
     * @param {String} url
     * @protected
     */
    _sendStatUrl: function (url) {
        url += (url.indexOf('?') > -1 ? '&' : '?') + '_=' + Date.now();

        if (this._isSendBeaconAvailable) {
            // Строка из пробела, чтобы кликдемон что-либо распарсил (нужен ненулевой Content-Length)
            var sendResult = navigator.sendBeacon(url, ' ');
            if (sendResult) {
                return;
            }
        }

        // hello ie9
        var xhr = 'XDomainRequest' in window ? new XDomainRequest() : new XMLHttpRequest();

        xhr.open('get', url, true);
        xhr.withCredentials = true;

        xhr.send();
    },
    /**
     * Очистить счётчики
     * @private
     */
    _clearCounters: function () {
        /**
         * GET-параметры для отправки счётчиков.
         * Умолчания заданы не для всех параметров.
         *
         * @private
         * @type {Object}
         */
        this._params = {
            'user_input': '',
            'text': '',
            'exprt': '',
            'log': '',
            'region': '',
            'times': '',
            'render_times': ''
        };

        /**
         * Данные для формирования параметра.
         *
         * @private
         * @type {Object}
         * @property {String} service Идентификатор сервиса
         * @property {String} state Взаимодействие с саджестом: edit|keyboard|suggest|mouse|not_used|not_shown
         * @property {Number} index Порядковый номер выбранной подсказки или ноль, если подсказка не была выбрана
         * @property {String} personal Взаимодействие с персональной подсказкой: nah_not_used|nah_used|nah_not_shown
         * @property {String} submit Способ отправки запроса: click_by_mouse|button_by_mouse|keyboard
         */
        this._path = {
            service: this.params.counter.service,
            state: 'not_shown',
            index: 0,
            personal: 'nah_not_shown',
            submit: 'button_by_mouse'
        };

        /**
         * Данные для формирования параметра ratio.
         *
         * @private
         * @type {Object}
         * @property {Number} len Количество символов, введённых пользователем
         * @property {Number} queryLen Количество символов в запросе, который был отправлен
         * @property {Number} actionsCount Количество действий пользователя (ввод/удаление символов, клик мышкой)
         */
        this._ratio = {
            len: 0,
            queryLen: 0,
            actionsCount: 0
        };

        /**
         * Время ввода первой буквы в миллисекундах.
         *
         * @private
         * @type {Number}
         */
        this._firstChange = 0;

        /**
         * Время ввода последней буквы в миллисекундах.
         *
         * @private
         * @type {Number}
         */
        this._lastChange = 0;

        /**
         * Время прошедшее от ввода первой и последней буквы
         * до отправки запроса пользователем в миллисекундах.
         *
         * @private
         * @type {Object}
         * @property {Number} first Промежуток времени от ввода первой буквы до отправки запроса
         * @property {Number} last Промежуток времени от ввода последней буквы до отправки запроса
         */
        this._sinceChange = {
            first: 0,
            last: 0
        };

        /**
         * Время первого клика на инпут, которое присваивается после фокуса инпута
         *
         * @private
         * @type {Number}
         */
        this._startInputTime = null;

        /**
         * Выбранный из саджеста текст подсказки.
         *
         * @private
         * @type {String}
         */
        this._selectedText = '';

        /**
         * Уникальный номер для подклейки логов саджеста к сессии пользователя.
         *
         * @private
         * @type {Number}
         */
        this._reqID = this.__self._generateReqID(this.params.counter.yandexuid);

        /**
         * Последовательность действий при использовании автокомплита.
         *
         * @private
         * @type {Object[]}
         * @property {String} action Название действия: add|del|clear|submit|word|phrase
         * @property {Number} time Время действия в миллисекундах
         * @property {Number} [index] Порядковый номер указывается для действия, связанного с подсказкой
         */
        this._tpah = [];

        /**
         * Время возникновения первого действия при
         * использовании touch автокомплита.
         *
         * @private
         * @type {Number}
         */
        this._firstActionTime = 0;

        /**
         * Переменная для расчёта user_input, хранит прошлое значение инпута
         * @type {String}
         * @private
         */
        this._prevVal = '';
        /**
         * Специальное значение user_input для расчёта ratio
         * @type {String}
         * @private
         */
        this._userInputVal = '';
        /**
         * Флаг того, что последнее изменение записано в _userInputVal
         * @type {Boolean}
         * @private
         */
        this._changedByUser = true;
        /**
         * Дополнительная информация о кликах и запросах
         * @private
         * @type {Object}
         */
        this._responses = {
            //  количество запросов
            rqs: 0,
            // количество ответов
            rsp: 0,
            // количество отрисовок
            rndr: 0,
            // количество ответов с пустым список подсказок
            ersp: 0,
            // количество кликов по подсказкам (которые не привели к переходу)
            clks: 0,
            // количество ответов из кеша
            cchd: 0
        };
        /**
         * Время, которое инпут был не в фокусе
         * Считаем от первого blur
         *
         * @private
         * @type {Number}
         */
        this._blurDuration = 0;
        /**
         * Длительность последнего blur в инпуте
         *
         * @private
         * @type {Number}
         */
        this._blurTime = null;
        /**
         * Отдельный рассчет blur для _firstChange
         * Считается от blur если _firstChange не равен 0
         *
         * @private
         * @type {Number}
         */
        this._blurDurationFirstChange = 0;
        /**
         * Отдельный рассчет blur для _lastChange
         *
         * @private
         * @type {Number}
         */
        this._blurDurationLastChange = 0;
    },
    /**
     * Добавить действие для лога тап-ахеда
     * @param {String} name Название действия
     * @param {Number} [index] Порядковый номер подсказки
     * @private
     */
    _addAction: function (name, index) {
        var time;

        if (this._firstActionTime) {
            time = Date.now() - this._firstActionTime;
        } else {
            this._firstActionTime = Date.now();
            time = 0;
        }

        var action = {
            action: name,
            time: time
        };

        if (index !== undefined) {
            action.index = index;
        }

        this._tpah.push(action);
    },
    /**
     * Добавляет параметр suggest_reqid в форму, если это не было сделано ранее
     * @private
     */
    _attachReqID: function () {
        this._appendHiddenInput('suggest_reqid', this._reqID);
    },
    /**
     * Получить адрес для отправки статистики
     * @returns {String}
     * @private
     */
    _getUrl: function() {
        return this.params.counter.url + '/' +
            this._getUrlParams()
                .join('/')
                .replace(/(\/+)/g, '/');
    },
    /**
     * Получить список параметров для формирования строки параметров запроса
     * @returns {Object[]}
     * @private
     */
    _getParamsList: function() {
        return [
            this.params.counter.params,
            this._getPath(),
            this._params,
            this._getRatio(),
            this._getSinceChange(),
            this._getSession(),
            this._getResponsesShows(),
            {'suggest_reqid': this._reqID},
            this._getTpah()
        ];
    },
    /**
     * Получить параметр path
     * @returns {Object}
     * @private
     */
    _getPath: function() {
        return {path: [
            this._path.service,
            this._path.state,
            'p' + this._path.index,
            this._path.personal,
            this._path.submit
        ].join('.')};
    },
    /**
     * Получить параметр ratio
     * @returns {Object}
     * @private
     */
    _getRatio: function() {
        return {ratio: [
            this._userInputVal.length,
            this._params.text.length,
            this._ratio.actionsCount
        ].join('.')};
    },
    /**
     * Получить параметры since_first_change, since_last_change и total_input_time
     * @returns {Object}
     * @protected
     */
    _getSinceChange: function() {
        return {
            'since_first_change': this._getSinceTime('first'),
            'since_last_change': this._getSinceTime('last'),
            'total_input_time': this._getTotalInputTime()
        };
    },
    /**
     * Метод подсчета since_first_change и since_last_change
     * @param {String} name
     * @returns {Number}
     * @protected
     */
    _getSinceTime: function(name) {
        var time = '_' + name + 'Change';

        if (!this[time]) {
            return 0;
        }

        var blurDuration = name === 'first' ?
            this._blurDurationFirstChange :
            this._blurDurationLastChange;

        return Date.now() - this[time] - blurDuration;
    },
    /**
     * Метод подсчета total_input_time
     * @protected
     * @returns {Number} общее время инпута минус время, проведенное в блюре
     */
    _getTotalInputTime: function() {
        return this._startInputTime && Date.now() - this._startInputTime - this._blurDuration || 0;
    },
    /**
     * Получить параметр session
     * @returns {Object}
     * @private
     */
    _getSession: function() {
        return {session: Date.now() + Math.round(Math.random() * 10000)};
    },
    /**
     * Получить события показа/ответов саджеста
     * @private
     * @returns {Object}
     */
    _getResponsesShows: function () {
        return this._responses;
    },
    /**
     * Получить параметр tpah_log
     * @returns {Object}
     * @private
     */
    _getTpah: function() {
        return {
            'tpah_log': '[' + this._tpah.map(function (action) {
                return '[' + [
                    action.action,
                    'p' + (action.index || 0),
                    action.time
                ].join(',') + ']';
            }).join(',') + ']'
        };
    },
    /**
     * Получить параметры запроса
     * @returns {String[]}
     * @private
     */
    _getUrlParams: function() {
        return this._getParamsList()
            .concat({'*data': 'url=http://ya.ru'})
            .reduce(function(params, p) {
                return params.concat(this._getParams(p));
            }.bind(this), []).concat(['/']);
    },
    /**
     * Получить массив строк закодированных параметров.
     * @param {Object} params Параметры
     * @returns {String[]}
     * @private
     */
    _getParams: function(params) {
        return Object.keys(params).reduce(function(encodedGetParams, param) {
            if (params[param] === '') {
                return encodedGetParams;
            }

            encodedGetParams.push(param + '=' + encodeURIComponent(params[param])
                .replace(/%5B/g, '[')
                .replace(/%5D/g, ']')
                .replace(/%2C/g, ',')
            );

            return encodedGetParams;
        }, []);
    },
    /**
     * Расчитывает примерный тип изменений в инпуте.
     * @param {String} prevVal Старое значние
     * @param {String} newVal Новое значение
     * @returns {{type: ('add' | 'del' | 'other'), text: string}}
     * @private
     */
    _calcInputChange: function (prevVal, newVal) {
        if (newVal.length > prevVal.length && newVal.indexOf(prevVal) === 0) {
            return {
                type: 'add',
                text: newVal.substr(prevVal.length)
            };
        } else if (newVal.length < prevVal.length && prevVal.indexOf(newVal) === 0) {
            return {
                type: 'del',
                text: prevVal.substr(newVal.length)
            };
        } else {
            return {
                type: 'other',
                text: newVal
            };
        }
    },
    /**
     * Дополнительные динамические параметры запроса
     * Добавляем suggest_reqid
     * @param {String} text
     * @returns {Object}
     * @protected
     */
    _getMainUrlParams: function (/*text*/) {
        var res = this.__base.apply(this, arguments);

        if (this._reqID) {
            res.suggest_reqid = this._reqID;
        }

        return res;
    }
}, {
    /**
     * Сгенерировать уникальный параметр
     * для отправки в счётчик саджеста
     * и подклейки к поисковому запросу.
     *
     * Параметр представляет из себя строку
     * длиной в 32 случайных числовых символа.
     *
     * @see {@link http://st.yandex-team.ru/ISLSUGGEST-95}
     * @param {String} yandexuid
     * @returns {String} Например: `23449683141245425514182109295931`
     * @private
     */
    _generateReqID: function(yandexuid) {
        yandexuid = yandexuid ||
            this._random(9) + this._random(9); // Длина `yandexuid` всегда равна 18.

        return yandexuid +
            Date.now().toString().slice(-7) +
            this._random(7);
    },

    /**
     * Сгенерировать строку заданной длины из случайных чисел.
     * Длина строки не может быть более десяти символов.
     *
     * @param {Number} length Длина строки (0 < length ≤ 10)
     * @returns {String}
     * @private
     */
    _random: function(length) {
        return Math.random().toString().slice(2, Math.min(length, 10) + 2);
    }
});

/* end: ../../node_modules/mini-suggest/touch.blocks/mini-suggest/counter/mini-suggest__counter.js */
/* begin: ../../blocks-touch-phone/mini-suggest/__init-counter/mini-suggest__init-counter.js */
/* global MBEM, Ya */
MBEM.channel('suggest').on('init', function() {
    // 2295 – bem-inited. Время инициализации блоков
    Ya.Rum.sendTimeMark('2295');
    Ya.isBemInited = 1;
});

/* end: ../../blocks-touch-phone/mini-suggest/__init-counter/mini-suggest__init-counter.js */
/* begin: ../../node_modules/mini-suggest/touch.blocks/mini-suggest/_request/mini-suggest_request_jsonp.js */
/**
 * @class miniSuggestRequestJsonp
 * @lends miniSuggestRequestJsonp.prototype
 * @extends miniSuggest
 * @desc Делает запрос к бекенду в виде jsonp
 */
MBEM.decl('mini-suggest', {
    __constructor: function () {
        this.__base.apply(this, arguments);

        // Мап с урлами, которые могут быть закешированы браузером
        // Содержит таймстемпы ответов
        this._cachedUrls = {};
    },
    /**
     * Устанавливает обработчик на получение данных в window, так как jsonp
     * @returns {String} Название функции
     * @protected
     */
    _initDataCallback: function () {
        if (this._callbackName) {
            return this._callbackName;
        }

        this._callbackName = 'onSuggestResponse' + Math.random().toString().substr(2, 5);
        this._callbackStorage = {};
        window[this._callbackName] = function (data) {
            // items по сути не нужны, если значение в инпуте уже поменялось, но всё ещё нужны, чтобы залогировать количество пустых ответов
            var items = this._processResponse(data),
                requestInfo = typeof data[0] === 'string' && this._callbackStorage[data[0]],
                url = requestInfo && requestInfo.url,
                now = Date.now();

            this.trigger('response', {
                data: data,
                items: items,
                url: url,
                duration: requestInfo && (now - requestInfo.start),
                fromCache: this._cachedUrls[url] && (now - this._cachedUrls[url] < 60 * 1000)
            });
            if (url) {
                this._cachedUrls[url] = now;
            }

            if (typeof data[0] === 'string' && data[0].toLowerCase() === this._prevRequestText.toLowerCase()) {
                this._onSuggestData(items);
            }
        }.bind(this);

        return this._callbackName;
    },
    /**
     * Делает jsonp-запрос с нужным текстом
     * @param {String} text
     * @protected
     */
    _request: function (text) {
        var script = document.createElement('script'),
            callbackName = this._initDataCallback(),
            url,
            params;

        params = this._getMainUrlParams(text);
        params.callback = callbackName;

        url = MBEM.appendUrlParams(this.params.url, params);

        this._callbackStorage[text.toLowerCase()] = {
            start: Date.now(),
            url: url
        };

        script.src = url;
        script.onload = script.onerror = function () {
            script.parentNode.removeChild(script);
        };
        document.head.appendChild(script);
    }
});

/* end: ../../node_modules/mini-suggest/touch.blocks/mini-suggest/_request/mini-suggest_request_jsonp.js */
/* begin: ../../node_modules/mini-suggest/common.blocks/i-mini-util/url-params/i-mini-util__url-params.js */
/**
 * Добавляет параметры к урлу
 *
 * @param {String} url
 * @param {Object} params
 * @returns {String}
 */
MBEM.appendUrlParams = function (url, params) {
    return url +
        (url.indexOf('?') > -1 ? '&' : '?') +
        Object.keys(params).map(function (key) {
            return key + '=' + encodeURIComponent(params[key]);
        }).join('&');
};

/* end: ../../node_modules/mini-suggest/common.blocks/i-mini-util/url-params/i-mini-util__url-params.js */
/* begin: ../../blocks-touch-phone/mini-suggest/_init/mini-suggest_init_auto.js */
/*global MBEM*/
Ya.ready(function() {
    var searchForm = document.forms[0],
        input = searchForm.text,
        clear = searchForm.elements[searchForm.elements.length - 2],
        button = searchForm.elements[searchForm.elements.length - 1],
        params = {
            url: searchForm.getAttribute('data-suggest-url'),
            yandexuid: Ya.ymUid,
            counter: {
                service: 'granny-touch',
                url: '//yandex.' + (searchForm.getAttribute('tld') || 'ru') + '/clck/jclck',
                timeout: 300,
                params: {
                    dtype: 'stred',
                    pid: '0',
                    cid: '2873'
                }
            },
            popupOffset: 11
        };

    searchForm.className += ' mini-suggest';

    input.className += ' mini-suggest__input';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    clear.className += ' mini-suggest__input-clear';
    button.className += ' mini-suggest__button';
    document.getElementsByTagName('TABLE')[0].className += ' yandex-search__layout-table';
    MBEM.initBlockFromNode(searchForm, 'mini-suggest', params);
    MBEM.channel('suggest').trigger('init');

    window.onpageshow = function(event) {
        if (event.persisted) {
            input.value = input.getAttribute('value');
            MBEM.getBlock(searchForm, 'mini-suggest')._onBlur();
        }
    };
});

/* end: ../../blocks-touch-phone/mini-suggest/_init/mini-suggest_init_auto.js */
/* begin: ../../blocks-touch-phone/suggest/__css-bundle/suggest__css-bundle.js */
(function(d) {
    var css = "/* ../../node_modules/mini-suggest/touch.blocks/mini-suggest/mini-suggest.css begin */\n.mini-suggest__popup\n{\n    position: absolute;\n    z-index: 2;\n    left: 0;\n\n    width: 100%;\n\n    font-size: 15px;\n    -webkit-user-select: none;\n       -moz-user-select: none;\n        -ms-user-select: none;\n            user-select: none;\n\n    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);\n}\n\n.mini-suggest__popup_hidden_yes\n{\n    display: none;\n}\n\n.mini-suggest__popup-content\n{\n    padding: 10px 13px 0;\n}\n\n.mini-suggest__popup-spacer\n{\n    position: absolute;\n    top: 100%;\n    left: 0;\n\n    width: 100%;\n    /* Здесь порядочно большая высота, чтобы на разных браузерах (iOS Chrome, AndroidBrowser),\n       не учитывающих размер клавиатуры, можно было увидеть нижнюю подсказку */\n    height: 325px;\n}\n\n.mini-suggest__item\n{\n    /* Фикс для нативного бразуера под Huawei Android 5 */\n    /* https://jing.yandex-team.ru/files/ststeal/22-11-2016_13_16_10.png */\n    /* также нужно для рисования полосочек над пунктами */\n    position: relative;\n\n    -webkit-transition: background-color .15s linear;\n            transition: background-color .15s linear;\n}\n\n.mini-suggest__item_type_tpah\n{\n    display: inline-block;\n    overflow: hidden;\n\n    box-sizing: border-box;\n    max-width: 100%;\n    margin: 0 8px 8px 0;\n    padding: 0 14px;\n\n    line-height: 34px;\n    vertical-align: top;\n    white-space: nowrap;\n    text-overflow: ellipsis;\n\n    border-radius: 4px;\n    background: #f2f2f2;\n}\n\n.mini-suggest__item_type_tpah:active\n{\n    background: #ccc;\n}\n\n.mini-suggest__item_type_fulltext\n{\n    overflow: hidden;\n\n    margin: 0 -13px;\n    padding: 9px 13px 12px;\n\n    line-height: 20px;\n    text-overflow: ellipsis;\n}\n\n.mini-suggest__item_type_fulltext:first-child\n{\n    margin-top: -9px;\n}\n\n.mini-suggest__item_type_nav,\n.mini-suggest__item_type_fact\n{\n    display: block;\n\n    margin: 0 -13px;\n    padding: 10px 13px;\n\n    text-decoration: none;\n\n    outline: none;\n\n    -webkit-tap-highlight-color: rgba(0,0,0,0);\n}\n\n.mini-suggest__item-title,\n.mini-suggest__item-info\n{\n    font-size: 15px;\n    line-height: 20px;\n}\n\n.mini-suggest__item-title\n{\n    display: block;\n\n    font-weight: 700;\n\n    color: #000;\n}\n\n.mini-suggest__item_type_nav .mini-suggest__item-title\n{\n    color: #04b;\n}\n\n.mini-suggest__item-info\n{\n    display: inline-block;\n\n    margin-top: 2px;\n\n    color: #999;\n}\n\n.mini-suggest__item_type_nav .mini-suggest__item-info\n{\n    color: #070;\n}\n\n.mini-suggest__item_type_fact:active,\n.mini-suggest__item_type_nav:active,\n.mini-suggest__item_type_fulltext:active\n{\n    background: #f0f0f0;\n}\n\n/* В WP плохо работает :active, поэтому \"скрываем\" вложенные элементы от кликов */\n.mini-suggest__item-title,\n.mini-suggest__item-info\n{\n    pointer-events: none;\n}\n\n/* ../../node_modules/mini-suggest/touch.blocks/mini-suggest/mini-suggest.css end */\n/* ../../blocks-touch-phone/mini-suggest/mini-suggest.styl begin */\n.mini-suggest__popup {\n  font: 15px/15px 'Helvetica Neue', Roboto, 'Segoe UI', Arial, Helvetica, sans-serif;\n  word-wrap: normal;\n}\n\n/* ../../blocks-touch-phone/mini-suggest/mini-suggest.styl end */\n/* ../../node_modules/mini-suggest/touch.blocks/mini-suggest/_theme/mini-suggest_theme_yandex.css begin */\n.mini-suggest__popup\n{\n    border-bottom: 1px solid rgba(0,0,0,.1);\n}\n\n.mini-suggest__popup:before\n{\n    position: absolute;\n    z-index: -1;\n    /* Для того, чтобы тень не смешивалась с бордером попапа */\n    bottom: -1px;\n    left: 0;\n\n    width: 100%;\n    height: 50%;\n\n    content: '';\n\n    border-radius: .1px; /* old iOS */\n    -webkit-box-shadow: 0 8px 25px -5px rgba(0, 0, 0, .25);\n            box-shadow: 0 8px 25px -5px rgba(0, 0, 0, .25);\n}\n\n/* Фикс для Сафари: перекрываем тень из :before */\n.mini-suggest__popup:after\n{\n    position: absolute;\n    z-index: -1;\n    top: 0;\n    left: 0;\n\n    width: 100%;\n    height: 100%;\n\n    content: '';\n\n    background: #fff;\n}\n\n:not(.mini-suggest__item_type_fulltext) + .mini-suggest__item_type_fulltext\n{\n    padding-top: 12px;\n}\n\n:not(.mini-suggest__item_type_nav) + .mini-suggest__item_type_nav\n{\n    margin-top: 2px;\n    padding-top: 9px;\n}\n\n:not(.mini-suggest__item_type_nav) + .mini-suggest__item_type_nav,\n:not(.mini-suggest__item_type_fact) + .mini-suggest__item_type_fact\n{\n    padding-top: 10px;\n}\n\n.mini-suggest__item_type_tpah + .mini-suggest__item_type_fulltext,\n.mini-suggest__item_type_tpah + .mini-suggest__item_type_nav,\n.mini-suggest__item_type_tpah + .mini-suggest__item_type_fact\n{\n    margin-top: 2px;\n}\n\n:not(.mini-suggest__item_type_fulltext) + .mini-suggest__item_type_fulltext:before,\n:not(.mini-suggest__item_type_nav) + .mini-suggest__item_type_nav:before,\n:not(.mini-suggest__item_type_fact) + .mini-suggest__item_type_fact:before\n{\n    position: absolute;\n    top: 0;\n    right: 13px;\n    left: 13px;\n\n    height: 1px;\n\n    content: '';\n\n    background: #f0f0f0;\n}\n\n/* ../../node_modules/mini-suggest/touch.blocks/mini-suggest/_theme/mini-suggest_theme_yandex.css end */\n/* ../../blocks-touch-phone/mini-suggest/_theme/mini-suggest_theme_yandex.styl begin */\n.mini-suggest__popup {\n  -webkit-tap-highlight-color: rgba(0,0,0,0);\n}\n.mini-suggest__popup:after {\n  display: none;\n}\n.mini-suggest__popup-content {\n  background: #fff;\n}\n\n/* ../../blocks-touch-phone/mini-suggest/_theme/mini-suggest_theme_yandex.styl end */\n",
        style = d.createElement('style');

    d.body.appendChild(style);
    // noinspection JSDeprecatedSymbols
    style.styleSheet ?
        style.styleSheet.cssText = css :
        style.appendChild(d.createTextNode(css));
})(document);

/* end: ../../blocks-touch-phone/suggest/__css-bundle/suggest__css-bundle.js */
/* begin: ../../blocks-touch-phone/image/image.js */
if (Ya.lazyImage === 1) {
    Ya.ready(function() {
        // пропускаем более важные скрипты вперёд
        setTimeout(function() {
            var i, thumbs;

            for (i = 0, thumbs = document.querySelectorAll('.image[data-image-url]'); i < thumbs.length; i++) {
                thumbs[i].src = thumbs[i].getAttribute('data-image-url');
                thumbs[i].removeAttribute('data-image-url');
            }

            for (i = 0, thumbs = document.querySelectorAll('.image[data-bg-url]'); i < thumbs.length; i++) {
                thumbs[i].style.backgroundImage = 'url(' + thumbs[i].getAttribute('data-bg-url') + ')';
                thumbs[i].removeAttribute('data-bg-url');
            }
        }, 0);
    });
}

/* end: ../../blocks-touch-phone/image/image.js */
