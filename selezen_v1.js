
// 11.04.Немедленно выполняем самый приоритетный код перед DOMContentLoaded
// Блокируем языки на самом раннем этапе
(function() {
  // Глобальный флаг для отслеживания пользовательских действий
  window._userInitiatedSwitch = false;
  
  // Принудительно установить украинский язык в HTML только при первой загрузке
  if(document.documentElement && !localStorage.getItem('userChangedLanguage')) {
    document.documentElement.lang = 'uk';
  }
  
  // Защита от показа неправильного языка
  window._lastSetLanguage = localStorage.getItem('selectedLanguage') || 'uk';
  
  // Очистка всех куки Google Translate на самом раннем этапе
  // только если пользователь не выбрал язык вручную
  if(!localStorage.getItem('userChangedLanguage')) {
    const domains = ['', window.location.hostname, `.${window.location.hostname}`];
    domains.forEach(domain => {
      document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ''}`;
    });
    
    // Устанавливаем украинский язык в localStorage только при первом запуске
    try {
      if(!localStorage.getItem('selectedLanguage')) {
        localStorage.setItem('selectedLanguage', 'uk');
      }
    } catch(e) {}
  }
  
  // Блокируем языковое автоопределение браузера, но только для автоматического определения
  if(navigator.languages) {
    const originalLanguages = navigator.languages;
    Object.defineProperty(navigator, 'languages', {
      get: function() {
        // Если это пользовательское действие, возвращаем реальные языки
        if(window._userInitiatedSwitch || localStorage.getItem('userChangedLanguage')) {
          return originalLanguages;
        }
        // Иначе приоритет украинскому
        return ['uk-UA', 'uk', 'en'];
      }
    });
  }
  
  // Блокируем попытки Google Translate получить доступ к определенным API
  // только для автоматических запросов
  const originalPostMessage = window.postMessage;
  window.postMessage = function(message, targetOrigin, transfer) {
    if(!window._userInitiatedSwitch && !localStorage.getItem('userChangedLanguage') && 
       typeof message === 'object' && message && message.action && 
       (message.action.includes('translate') || 
       (typeof message.action === 'string' && message.action.toLowerCase().includes('lang')))) {
      console.log('[DEBUG] Blocked potential automatic translation message:', message.action);
      return;
    }
    return originalPostMessage.call(this, message, targetOrigin, transfer);
  };
  
  // Создаем стили для блокировки Google элементов немедленно
  const style = document.createElement('style');
  style.textContent = `
    .goog-te-banner-frame, .goog-te-gadget-icon, .goog-te-gadget-simple, 
    .goog-te-menu-frame, .goog-te-gadget, .goog-te-menu-value, 
    .goog-logo-link, .goog-te-banner, .skiptranslate {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      height: 0 !important;
      width: 0 !important;
    }
    
    body {
      top: 0 !important;
      position: static !important;
    }
  `;
  
  // Вставляем стили в самом начале head или body
  if(document.head) {
    document.head.appendChild(style);
  } else if(document.body) {
    document.body.appendChild(style);
  } else {
    // Если DOM еще не готов, ждем и вставляем при первой возможности
    document.addEventListener('DOMContentLoaded', function() {
      document.head.appendChild(style);
    });
  }
})();

// Глобальная защита от переключения языка, но только для автоматических изменений
window._forceUkrainianLanguage = function() {
  const currentLang = document.documentElement.lang;
  const savedLang = localStorage.getItem('selectedLanguage') || 'uk';
  
  // Сохраняем последний установленный язык для проверки синхронизации
  window._lastSetLanguage = savedLang;
  
  // Если пользователь уже менял язык и текущий язык не соответствует сохраненному
  if(localStorage.getItem('userChangedLanguage') && currentLang !== savedLang) {
    console.log('[DEBUG] User previously changed language. Setting to saved preference:', savedLang);
    document.documentElement.lang = savedLang;
    return;
  }
  
  // Если языка нет или он польский, и это не пользовательское действие
  if((!currentLang || currentLang === 'pl' || (currentLang !== savedLang && !window._userInitiatedSwitch)) && 
     !window._userInitiatedSwitch && 
     !localStorage.getItem('userChangedLanguage')) {
    console.log('[DEBUG] Preventing automatic language change to:', currentLang);
    document.documentElement.lang = 'uk';
    
    // Очищаем куки Google Translate только для автоматических изменений
    const domains = ['', window.location.hostname, `.${window.location.hostname}`];
    domains.forEach(domain => {
      document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ''}`;
    });
  }
};

// Регулярно проверяем и принудительно устанавливаем язык
setInterval(window._forceUkrainianLanguage, 300);

let isInitialized = false;

document.addEventListener('DOMContentLoaded', function() {
  if (isInitialized) {
    console.log('[DEBUG] Already initialized, skipping...');
    return;
  }

  isInitialized = true;
  
  // Принудительно блокируем польский язык по умолчанию в LMS
  // Это наиболее радикальное решение проблемы автоматического переключения
  if (window.self !== window.top) { // Проверка на iframe (LMS)
    // Явно очищаем любые куки Google Translate до начала инициализации
    const domains = ['', window.location.hostname, `.${window.location.hostname}`];
    domains.forEach(domain => {
      document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ''}`;
    });
    localStorage.setItem('selectedLanguage', 'uk');
    
    // Блокируем автоматическое переключение через переопределение связанных методов Google
    // Это перехватит попытки автоматического переключения
    const originalWindowOpen = window.open;
    window.open = function(url, ...args) {
      if (url && typeof url === 'string' && url.includes('translate.google.com')) {
        console.log('[DEBUG] Blocking automatic Google Translate redirect');
        return null;
      }
      return originalWindowOpen.call(this, url, ...args);
    };
    
    // Дополнительная защита - перехватываем fetch и XMLHttpRequest для запросов к Google Translate
    const originalFetch = window.fetch;
    window.fetch = function(url, ...args) {
      if (url && typeof url === 'string' && url.includes('translate.google.com')) {
        console.log('[DEBUG] Blocking Google Translate fetch:', url);
        return Promise.reject(new Error('Blocked'));
      }
      return originalFetch.call(this, url, ...args);
    };
    
    // Блокирование автоматической установки языка через атрибут html
    const originalDocumentWriteProperty = Object.getOwnPropertyDescriptor(Document.prototype, 'write');
    if (originalDocumentWriteProperty && originalDocumentWriteProperty.configurable) {
      Object.defineProperty(Document.prototype, 'write', {
        value: function(...args) {
          // Если содержит строку с указанием польского языка, блокируем
          if (args.some(arg => typeof arg === 'string' && arg.includes('lang="pl"'))) {
            console.log('[DEBUG] Blocked attempt to set Polish language via document.write');
            return;
          }
          return originalDocumentWriteProperty.value.apply(this, args);
        },
        writable: true,
        configurable: true
      });
    }
    
    // Блокировка автоматического изменения атрибута lang
    const htmlElement = document.documentElement;
    const originalHtmlLangDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'lang');
    
    if (originalHtmlLangDescriptor && originalHtmlLangDescriptor.configurable) {
      Object.defineProperty(htmlElement, 'lang', {
        get: function() {
          return originalHtmlLangDescriptor.get.call(this);
        },
        set: function(value) {
          // Блокируем автоматическую установку польского языка
          if (value === 'pl' && localStorage.getItem('selectedLanguage') === 'uk' && !window._userInitiatedSwitch) {
            console.log('[DEBUG] Blocked automatic setting of lang="pl" attribute');
            return;
          }
          return originalHtmlLangDescriptor.set.call(this, value);
        },
        configurable: true
      });
    }
  }
  
  let currentLanguage = localStorage.getItem('selectedLanguage') || 'uk';
  let googleTranslateInitialized = false;
  let observer;

  function forceHideGoogleBanner() {
    const bannerFrames = document.querySelectorAll(`
      .goog-te-banner-frame, iframe.goog-te-banner-frame,
      .goog-te-menu-frame, iframe.goog-te-menu-frame,
      .goog-te-balloon-frame, .goog-te-balloon-frame *,
      .skiptranslate
    `);
    bannerFrames.forEach(el => {
      el.style.display = 'none';
      el.style.visibility = 'hidden';
      el.style.height = '0';
      el.style.margin = '0';
      el.style.border = 'none';
      el.style.backgroundColor = 'transparent';
    });

    document.body.style.position = 'static';
    document.body.style.top = '0';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    
    // Дополнительно скрываем логотип и связанные элементы Google
    const googleElements = document.querySelectorAll(`
      .goog-te-gadget-icon,
      .goog-te-gadget-simple,
      .goog-te-gadget,
      .goog-te-menu-value,
      .goog-logo-link,
      .goog-te-banner,
      #goog-gt-,
      .goog-te-banner-frame,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-text-highlight,
      .trans-target-highlighted
    `);
    
    googleElements.forEach(el => {
      if (el) {
        el.style.display = 'none';
        el.style.visibility = 'hidden';
        el.style.opacity = '0';
        el.style.height = '0';
        el.style.width = '0';
        el.style.position = 'absolute';
        el.style.left = '-9999px';
      }
    });
    
    // Удаление логотипа Google из DOM если он есть
    const googleLogos = document.querySelectorAll('.goog-logo-link, .goog-te-gadget-link');
    googleLogos.forEach(logo => {
      try { 
        if (logo && logo.parentNode) {
          logo.parentNode.removeChild(logo);
        }
      } catch(e) { console.error('[DEBUG] Error removing Google logo:', e); }
    });
  }

  // Функция для полного удаления и блокировки логотипа Google Translate
  function removeGoogleBranding() {
    // Удаление элементов Google Translate
    const googleElements = document.querySelectorAll(`
      .goog-te-gadget-icon,
      .goog-te-gadget-simple,
      .goog-te-gadget,
      .goog-te-menu-value,
      .goog-logo-link,
      .goog-te-banner,
      #goog-gt-,
      .goog-te-banner-frame,
      .skiptranslate,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-text-highlight,
      .trans-target-highlighted,
      .VIpgJd-ZVi9od-l4eHX-hSRGPd,
      .VIpgJd-ZVi9od-aZ2wEe-wOHMyf
    `);

    googleElements.forEach(el => {
      try {
        if (el) {
          el.style.display = 'none';
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
          el.style.height = '0';
          el.style.width = '0';
          el.style.position = 'absolute';
          el.style.left = '-9999px';
        }
      } catch(e) { console.error('[DEBUG] Error removing Google element:', e); }
    });
    
    // Сбрасываем стили для body
    document.body.style.position = 'static';
    document.body.style.top = '0';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
  }

  // Функция для полного сброса переводчика в случае проблем
  function resetTranslator() {
    // 1. Удаляем все связанные с Google Translate cookies
    const cookiesToDelete = ['googtrans', 'googtransopt'];
    const domains = [
      '',
      window.location.hostname,
      `.${window.location.hostname}`,
      window.location.host,
      `.${window.location.host}`,
      '.google.com',
      '.googleusercontent.com',
      '.googleapis.com'
    ];
    
    cookiesToDelete.forEach(name => {
      domains.forEach(domain => {
        const cookieStr = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ''}`;
        document.cookie = cookieStr;
        document.cookie = `${cookieStr} SameSite=None; Secure;`;
      });
    });
    
    // 2. Удаляем все элементы Google Translate и связанные стили
    cleanupExistingSwitchers();
    
    // 3. Подчищаем вручную
    const elementsToRemove = [
      ...document.querySelectorAll('iframe[id^=":"]'),
      ...document.querySelectorAll('.skiptranslate'),
      ...document.querySelectorAll('style[id^="goog-"]'),
      ...document.querySelectorAll('link[id^="goog-"]')
    ];
    elementsToRemove.forEach(el => {
      try { el.remove(); } catch(e) { console.error('[DEBUG] Clean error:', e); }
    });
    
    // 4. Сбрасываем localStorage и перезагружаем
    localStorage.setItem('selectedLanguage', 'uk');
    
    // 5. Отложенная перезагрузка страницы
    console.log('[DEBUG] Full translator reset completed');
    setTimeout(() => window.location.reload(), 100);
  }

  // Делаем функцию доступной глобально для аварийного сброса
  window.resetTranslator = resetTranslator;

  function cleanupExistingSwitchers() {
    const elements = [
      ...document.querySelectorAll('.language-switcher'),
      ...document.querySelectorAll('#google_translate_element'),
      ...document.querySelectorAll('style[data-switcher-styles]')
    ];
    elements.forEach(el => {
      try { el.remove(); }
      catch (e) { console.error('[DEBUG] Error removing element:', e); }
    });
  }

  // Функция для обхода кеширования перевода Google
  function bypassGoogleTranslateCache() {
    // 1. Более агрессивная очистка cookie
    const cookieNames = ['googtrans', 'googtransopt', '_ga_translate', 'googtrans_sess', 'googtc'];
    const domains = [
      '', 
      window.location.hostname, 
      `.${window.location.hostname}`,
      window.location.host,
      `.${window.location.host}`,
      '.google.com',
      '.googleusercontent.com',
      '.googleapis.com',
      '.translate.goog'
    ];
    
    cookieNames.forEach(name => {
      domains.forEach(domain => {
        // Разные варианты удаления cookie для максимальной эффективности
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ''}`;
        document.cookie = `${name}=; path=/; max-age=0;${domain ? ` domain=${domain};` : ''}`;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure;${domain ? ` domain=${domain};` : ''}`;
      });
    });
    
    // 2. Очистка localStorage от Google Translate
    try {
      const translateKeys = Object.keys(localStorage)
        .filter(key => key.includes('googtrans') || key.includes('translate') || key.includes('goog'));
      
      translateKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Сохраняем только выбранный язык
      const selectedLang = localStorage.getItem('selectedLanguage') || 'uk';
      localStorage.setItem('selectedLanguage', selectedLang);
    } catch(e) {
      console.error('[DEBUG] LocalStorage cleanup error:', e);
    }
    
    // 3. Очистка sessionStorage
    try {
      const translateSessionKeys = Object.keys(sessionStorage)
        .filter(key => key.includes('googtrans') || key.includes('translate') || key.includes('goog'));
      
      translateSessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
      });
    } catch(e) {
      console.error('[DEBUG] SessionStorage cleanup error:', e);
    }
    
    // 4. Удаление скриптов и iframe Google Translate из DOM
    ['script', 'iframe', 'link'].forEach(tagName => {
      document.querySelectorAll(`${tagName}[src*="translate.google"], ${tagName}[href*="translate.google"]`)
        .forEach(el => {
          try { el.remove(); } catch(e) {}
        });
    });
    
    // 5. Добавление уникального параметра к URL для обхода кеша
    const timestamp = Date.now();
    if (window.google && window.google.translate) {
      try {
        // Сброс внутреннего кеша Google Translate (если доступно)
        if (window.google.translate.TranslateService) {
          window.google.translate.TranslateService.getInstance().clearTranslations();
        }
        
        // Сброс состояния через сброс DOM-элементов
        document.getElementById('google_translate_element')?.remove();
        document.querySelectorAll('.goog-te-combo').forEach(el => el.remove());
      } catch(e) {
        console.error('[DEBUG] Google Translate reset error:', e);
      }
    }
    
    console.log('[DEBUG] Translation cache bypass complete:', timestamp);
    return timestamp;
  }

  // Изменяем функцию changeLanguage
  function changeLanguage(lang) {
    console.log('[DEBUG] Change language to:', lang.code);
    
    // Устанавливаем флаг пользовательского переключения
    window._userInitiatedSwitch = true;
    
    // Разрешаем переключение только если язык отличается от текущего
    if (lang.code === currentLanguage) {
      console.log('[DEBUG] Language already set to:', lang.code);
      return;
    }
    
    // Очищаем кеш переводчика перед переключением
    const timestamp = bypassGoogleTranslateCache();
    
    // Отмечаем, что пользователь сам изменил язык
    localStorage.setItem('userChangedLanguage', 'true');
    localStorage.setItem('selectedLanguage', lang.code);
    currentLanguage = lang.code;

    const flagImg = switcherButton.querySelector('.language-switcher__flag');
    const nameSpan = switcherButton.querySelector('.language-switcher__name');
    if (flagImg && nameSpan) {
      flagImg.src = lang.flag;
      nameSpan.textContent = lang.displayName;
    }
    switcherContainer.classList.remove('active');
    
    // Сначала выполняем предварительную очистку до переключения
    removeGoogleBranding();
    
    // Прямая манипуляция с Google Translate
    try {
      if (window.google && window.google.translate) {
        const combo = document.querySelector('.goog-te-combo');
        if (combo) {
          // Сначала программно меняем выбор
          combo.value = lang.code;
          combo.dispatchEvent(new Event('change'));
          console.log('[DEBUG] Direct manipulation of Google Translate dropdown');
          
          // Устанавливаем атрибут lang на HTML элементе напрямую
          document.documentElement.lang = lang.code;
        }
      }
    } catch(e) {
      console.error('[DEBUG] Error during direct manipulation:', e);
    }

    // Используем несколько волн очистки после переключения
    setTimeout(removeGoogleBranding, 100);
    setTimeout(removeGoogleBranding, 500);
    
    // После переключения языка принудительно перезагружаем страницу с параметром кеша
    setTimeout(() => {
      // Добавляем параметр для обхода кеша
      const separator = window.location.href.includes('?') ? '&' : '?';
      window.location.href = `${window.location.href.split('#')[0]}${separator}_gtlc=${timestamp}${window.location.hash || ''}`;
    }, 100);
  }

  // Добавляем в setGoogleTransCookie функционал обхода кеша
  function setGoogleTransCookie(fromLang, toLang) {
    // Очищаем кеш переводчика
    const timestamp = bypassGoogleTranslateCache();
    
    const googTransValue = `/${fromLang}/${toLang}`;

    // Защита от нежелательных переключений в iframe
    if (window.self !== window.top && toLang !== currentLanguage) {
      console.log('[DEBUG] Preventing language mismatch in iframe. Requested:', toLang, 'Current:', currentLanguage);
      if (toLang !== 'uk' && currentLanguage === 'uk') {
        // Разрешаем переключение с украинского на другие языки
        console.log('[DEBUG] Allowing switch from Ukrainian to:', toLang);
      } else if (toLang === 'uk' && currentLanguage !== 'uk') {
        // Разрешаем переключение на украинский с любого языка
        console.log('[DEBUG] Allowing switch back to Ukrainian from:', currentLanguage);
      } else {
        // Обновляем localStorage для синхронизации с текущим состоянием
        localStorage.setItem('selectedLanguage', currentLanguage);
        console.log('[DEBUG] Keeping current language:', currentLanguage);
        return;
      }
    }
    
    // Очищаем куки более тщательно
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=${window.location.hostname};`;
    document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; domain=.${window.location.hostname};`;

    // Устанавливаем новые куки на разных уровнях
    document.cookie = `googtrans=${googTransValue}; path=/;`;
    document.cookie = `googtrans=${googTransValue}; path=/; domain=${window.location.hostname};`;
    document.cookie = `googtrans=${googTransValue}; path=/; domain=.${window.location.hostname};`;

    // Принудительно обновляем состояние Google Translate
    if (window.google && window.google.translate) {
      const combo = document.querySelector('.goog-te-combo');
      if (combo) {
        combo.value = toLang;
        combo.dispatchEvent(new Event('change'));
      }
    }

    console.log('[DEBUG] setGoogleTransCookie:', googTransValue);
    
    // При перезагрузке страницы добавляем параметр для обхода кеша браузера
    const currentTrans = document.cookie.split(';').find(c => c.trim().startsWith('googtrans='));
    if (!currentTrans || currentTrans.split('=')[1] !== googTransValue) {
      console.log('[DEBUG] Reloading page after language change');
      const separator = window.location.href.includes('?') ? '&' : '?';
      window.location.href = `${window.location.href.split('#')[0]}${separator}_gtlc=${timestamp}${window.location.hash || ''}`;
    }
  }

  function createGoogleTranslateWidget() {
    try {
      const existingElement = document.getElementById('google_translate_element');
      if (existingElement) existingElement.remove();

      const translateDiv = document.createElement('div');
      translateDiv.id = 'google_translate_element';
      translateDiv.style.display = 'none';
      translateDiv.style.position = 'absolute';
      translateDiv.style.left = '-9999px';
      translateDiv.style.top = '-9999px';
      translateDiv.style.visibility = 'hidden';
      translateDiv.style.opacity = '0';
      translateDiv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(translateDiv);

      if (!googleTranslateInitialized) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.onload = function() {
          googleTranslateInitialized = true;
          console.log('[DEBUG] Google Translate script loaded');
          
          // Дополнительное скрытие элементов после загрузки скрипта
          setTimeout(forceHideGoogleBanner, 100);
          setTimeout(forceHideGoogleBanner, 500);
          setTimeout(forceHideGoogleBanner, 1000);
        };

        if (!window.googleTranslateElementInit) {
          window.googleTranslateElementInit = function() {
            // Предварительное переопределение стилей до инициализации
            const hideStyleTag = document.createElement('style');
            hideStyleTag.textContent = `
              .goog-te-gadget-simple, .goog-te-gadget, .goog-logo-link, .goog-te-banner {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                width: 0 !important;
                position: absolute !important;
                left: -9999px !important;
                top: -9999px !important;
                pointer-events: none !important;
              }
            `;
            document.head.appendChild(hideStyleTag);
            
            // Предварительно переопределяем поведение Google Translate
            if (window.self !== window.top) { // Только в iframe (LMS)
              // Защита от автоматического переключения на польский
              const originalSelectLanguage = google.translate.TranslateElement.prototype.selectLanguage;
              if (originalSelectLanguage) {
                google.translate.TranslateElement.prototype.selectLanguage = function(a) {
                  // Блокируем автоматические вызовы selectLanguage для польского
                  if (a === 'pl' && currentLanguage === 'uk' && !window._userInitiatedSwitch) {
                    console.log('[DEBUG] Blocked automatic switch to Polish by Google Translate');
                    return false;
                  }
                  
                  // Блокировка автоматического переключения на английский
                  if (a === 'en' && currentLanguage === 'uk' && !window._userInitiatedSwitch) {
                    console.log('[DEBUG] Blocked automatic switch to English by Google Translate');
                    return false;
                  }
                  
                  // Разрешаем переключение только на язык, выбранный пользователем
                  return originalSelectLanguage.call(this, a);
                };
              }
              
              // Перехватываем создание DOM-элементов
              const originalCreateElement = document.createElement;
              document.createElement = function(tagName) {
                const element = originalCreateElement.call(this, tagName);
                
                // Если создается элемент от Google Translate, добавляем скрывающие стили
                if (element && typeof element.className === 'string') {
                  const observer = new MutationObserver(function(mutations) {
                    mutations.forEach(function(mutation) {
                      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        const className = element.className;
                        if (className && typeof className === 'string' && 
                           (className.includes('goog-') || 
                            className.includes('skiptranslate') || 
                            className.includes('VIpgJd'))) {
                          element.style.display = 'none';
                          element.style.visibility = 'hidden';
                          element.style.opacity = '0';
                          element.style.height = '0';
                          element.style.width = '0';
                          element.style.position = 'absolute';
                          element.style.left = '-9999px';
                          element.style.top = '-9999px';
                        }
                      }
                    });
                  });
                  
                  observer.observe(element, { attributes: true });
                }
                
                return element;
              };
              
              // Создадим глобальный флаг для отслеживания пользовательских действий
              window._userInitiatedSwitch = false;
              document.addEventListener('click', function() {
                // Устанавливаем флаг на короткое время при клике пользователя
                window._userInitiatedSwitch = true;
                setTimeout(function() {
                  window._userInitiatedSwitch = false;
                }, 2000);
              }, true);
            }
          
            new google.translate.TranslateElement({
              pageLanguage: 'uk',
              includedLanguages: 'uk,pl,en',
              layout: google.translate.TranslateElement.InlineLayout.NO_FRAME,
              autoDisplay: false,
              gaTrack: false
            }, 'google_translate_element');
            
            // Дополнительно скрываем ВСЕ элементы Google Translate
            setTimeout(forceHideGoogleBanner, 0);
            
            // Выполняем немедленную инициализацию только если язык не украинский
            setTimeout(function() {
              const preferredLanguage = localStorage.getItem('selectedLanguage') || 'uk';
              const combo = document.querySelector('.goog-te-combo');
              
              // Проверяем наличие флага userChangedLanguage
              if (localStorage.getItem('userChangedLanguage') && combo && preferredLanguage !== 'uk') {
                console.log('[DEBUG] Initializing with user-selected language:', preferredLanguage);
                try {
                  combo.value = preferredLanguage;
                  combo.dispatchEvent(new Event('change'));
                } catch(e) {
                  console.error('[DEBUG] Error during initial language change:', e);
                }
              } else {
                // Убеждаемся, что мы находимся на украинском языке
                console.log('[DEBUG] Initializing with default Ukrainian language');
                if (combo && combo.value !== 'uk') {
                  combo.value = 'uk';
                  combo.dispatchEvent(new Event('change'));
                }
              }
              forceHideGoogleBanner();
              
              // Создадим усиленный наблюдатель для мультитаргетного отслеживания
              setupMultiTargetObserver();
            }, 1000);
          };
        }
        document.body.appendChild(script);
      }
    } catch (error) {
      console.error('[DEBUG] Error creating Google Translate widget:', error);
    }
  }

  // Функция создания мультиобсервера для контроля DOM-изменений
  function setupMultiTargetObserver() {
    try {
      // Наблюдаемые атрибуты Google Translate элементов
      const targetsToObserve = [
        { selector: 'html', attributes: ['lang'] },
        { selector: 'body', attributes: ['style'] },
        { selector: '.goog-te-combo', attributes: ['value'] },
        { selector: '.language-switcher__button', attributes: ['data-lang'] }
      ];
      
      // Создаем наблюдателя изменений HTML
      const htmlObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'lang') {
            const currentLang = document.documentElement.lang;
            const savedLang = localStorage.getItem('selectedLanguage') || 'uk';

            // Если язык изменился и это не пользовательское действие
            if (currentLang !== savedLang && !window._userInitiatedSwitch) {
              console.log('[DEBUG] MultiObserver detected HTML lang change to:', currentLang);
              
              if (!localStorage.getItem('userChangedLanguage')) {
                // Возвращаем украинский если не было пользовательского выбора
                document.documentElement.lang = 'uk';
              } else {
                // Иначе устанавливаем сохраненный язык
                document.documentElement.lang = savedLang;
              }
            }
          }
        });
      });
      
      // Отслеживаем HTML элемент
      htmlObserver.observe(document.documentElement, { 
        attributes: true,
        attributeFilter: ['lang']
      });
      
      // Наблюдатель для body, особенно для style с top: 40px от Google Translate
      const bodyObserver = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
            if (document.body.style.top && document.body.style.top !== '0px') {
              document.body.style.top = '0';
            }
          }
        });
      });
      
      // Отслеживаем body
      bodyObserver.observe(document.body, { 
        attributes: true,
        attributeFilter: ['style']
      });
      
      // Наблюдаем за состоянием комбобокса Google Translate
      // Используем интервал для постоянного сканирования DOM на наличие combo
      const comboInterval = setInterval(function() {
        const combo = document.querySelector('.goog-te-combo');
        if (combo) {
          // Очищаем интервал после обнаружения
          clearInterval(comboInterval);
          
          // Создаем наблюдателя для комбобокса
          const comboObserver = new MutationObserver(function(mutations) {
            // После изменения значения комбобокса
            const currentComboValue = combo.value;
            const savedLang = localStorage.getItem('selectedLanguage') || 'uk';
            
            console.log('[DEBUG] Combo value observed:', currentComboValue, 'Saved lang:', savedLang);
            
            // Если язык отличается от сохраненного и нет пользовательского действия
            if (currentComboValue !== savedLang && !window._userInitiatedSwitch) {
              console.log('[DEBUG] Detected unwanted combo change to:', currentComboValue);
              
              if (!localStorage.getItem('userChangedLanguage')) {
                // Возвращаем украинский
                combo.value = 'uk';
                // Пытаемся корректно имитировать изменение
                combo.dispatchEvent(new Event('change'));
              } else {
                // Восстанавливаем пользовательский выбор
                combo.value = savedLang;
                combo.dispatchEvent(new Event('change'));
              }
            }
          });
          
          // Начинаем наблюдение за изменениями
          comboObserver.observe(combo, { 
            attributes: true, 
            attributeFilter: ['value'] 
          });
          
          // Также отслеживаем события change
          combo.addEventListener('change', function(e) {
            const newValue = e.target.value;
            console.log('[DEBUG] Combo change event:', newValue, 'UserInitiated:', window._userInitiatedSwitch);
            
            // Если это не пользовательское действие и не соответствует сохраненному
            if (!window._userInitiatedSwitch && newValue !== localStorage.getItem('selectedLanguage')) {
              console.log('[DEBUG] Blocking automatic combo change');
              // Отменяем событие если возможно
              e.preventDefault();
              e.stopPropagation();
              
              // Возвращаем предыдущее значение
              setTimeout(function() {
                combo.value = localStorage.getItem('selectedLanguage') || 'uk';
              }, 0);
              
              return false;
            }
          }, true);
        }
      }, 500);
      
      console.log('[DEBUG] Multi-target observer setup complete');
    } catch(e) {
      console.error('[DEBUG] Error setting up multi-target observer:', e);
    }
  }

  function createLanguageSwitcher() {
    const existing = document.querySelector('.language-switcher');
    if (existing) existing.remove();

    const switcherContainer = document.createElement('div');
    switcherContainer.className = 'language-switcher';
    switcherContainer.setAttribute('data-initialized', 'true');

    const switcherButton = document.createElement('button');
    switcherButton.className = 'language-switcher__button';

    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'language-switcher__dropdown';

    const languages = [
      { code: 'uk', name: 'Ukrainian', flag: 'https://static-00.iconduck.com/assets.00/ua-flag-icon-512x341-7m10uaq7.png', displayName: 'Українська' },
      { code: 'pl', name: 'Polish',    flag: 'https://static-00.iconduck.com/assets.00/poland-icon-512x384-wgplvl6f.png',     displayName: 'Polish' },
      { code: 'en', name: 'English',   flag: 'https://static-00.iconduck.com/assets.00/united-states-icon-512x384-m15d49um.png', displayName: 'English' }
    ];

    const currentLangData = languages.find(lang => lang.code === currentLanguage) || languages[0];

    const buttonContent = document.createElement('div');
    buttonContent.className = 'language-switcher__button-content';
    buttonContent.innerHTML = `
      <img src="${currentLangData.flag}" alt="${currentLangData.name}" class="language-switcher__flag">
      <span class="language-switcher__name">${currentLangData.displayName}</span>
      <img src="https://cdn-icons-png.flaticon.com/512/271/271210.png" class="language-switcher__arrow" alt="arrow">
    `;
    switcherButton.appendChild(buttonContent);

    function changeLanguage(lang) {
      console.log('[DEBUG] Change language to:', lang.code);
      
      // Устанавливаем флаг пользовательского переключения
      window._userInitiatedSwitch = true;
      
      // Разрешаем переключение только если язык отличается от текущего
      if (lang.code === currentLanguage) {
        console.log('[DEBUG] Language already set to:', lang.code);
        return;
      }
      
      // Очищаем кеш переводчика перед переключением
      const timestamp = bypassGoogleTranslateCache();
      
      // Отмечаем, что пользователь сам изменил язык
      localStorage.setItem('userChangedLanguage', 'true');
      localStorage.setItem('selectedLanguage', lang.code);
      currentLanguage = lang.code;

      const flagImg = switcherButton.querySelector('.language-switcher__flag');
      const nameSpan = switcherButton.querySelector('.language-switcher__name');
      if (flagImg && nameSpan) {
        flagImg.src = lang.flag;
        nameSpan.textContent = lang.displayName;
      }
      switcherContainer.classList.remove('active');
      
      // Сначала выполняем предварительную очистку до переключения
      removeGoogleBranding();
      
      // Прямая манипуляция с Google Translate
      try {
        if (window.google && window.google.translate) {
          const combo = document.querySelector('.goog-te-combo');
          if (combo) {
            // Сначала программно меняем выбор
            combo.value = lang.code;
            combo.dispatchEvent(new Event('change'));
            console.log('[DEBUG] Direct manipulation of Google Translate dropdown');
            
            // Устанавливаем атрибут lang на HTML элементе напрямую
            document.documentElement.lang = lang.code;
          }
        }
      } catch(e) {
        console.error('[DEBUG] Error during direct manipulation:', e);
      }

      // Используем несколько волн очистки после переключения
      setTimeout(removeGoogleBranding, 100);
      setTimeout(removeGoogleBranding, 500);
      
      // После переключения языка принудительно перезагружаем страницу с параметром кеша
      setTimeout(() => {
        // Добавляем параметр для обхода кеша
        const separator = window.location.href.includes('?') ? '&' : '?';
        window.location.href = `${window.location.href.split('#')[0]}${separator}_gtlc=${timestamp}${window.location.hash || ''}`;
      }, 100);
    }

    languages.forEach(lang => {
      const item = document.createElement('div');
      item.className = 'language-switcher__item';
      item.setAttribute('data-lang', lang.code);
      item.innerHTML = `
        <img src="${lang.flag}" alt="${lang.name}" class="language-switcher__flag">
        <span class="language-switcher__name">${lang.displayName}</span>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        changeLanguage(lang);
      });
      dropdownContent.appendChild(item);
    });

    switcherButton.addEventListener('click', (e) => {
      e.stopPropagation();
      switcherContainer.classList.toggle('active');
    });

    document.addEventListener('click', () => {
      switcherContainer.classList.remove('active');
    });

    switcherContainer.appendChild(switcherButton);
    switcherContainer.appendChild(dropdownContent);

    // Подключаем стили
    const style = document.createElement('style');
    style.setAttribute('data-switcher-styles', 'true');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');

      /* Скрываем (или обнуляем) все видимые элементы баннера Google Translate */
      #google_translate_element,
      .goog-te-combo,
      .goog-te-gadget,
      .goog-logo-link,
      iframe[id=":1.container"],
      .VIpgJd-ZVi9od-l4eHX-hSRGPd,
      #goog-gt-tt,
      #goog-gt-vt,
      .skiptranslate.goog-te-gadget,
      .VIpgJd-ZVi9od-aZ2wEe-wOHMyf.VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc,
      .goog-te-gadget-icon,
      .goog-te-gadget-simple,
      .goog-te-gadget,
      .goog-te-menu-value,
      .goog-logo-link,
      .goog-te-banner,
      #goog-gt-,
      .goog-tooltip,
      .goog-tooltip:hover,
      .goog-text-highlight,
      .VIpgJd-yAWNEb-VIpgJd-fmcmS-sn54Q {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        pointer-events: none !important;
        max-height: 0 !important;
        max-width: 0 !important;
        overflow: hidden !important;
        z-index: -9999 !important;
      }

      /* Скрываем всплывающий баннер «Translated to…» и серую полосу */
      .goog-te-banner-frame,
      iframe.goog-te-banner-frame,
      .goog-te-menu-frame,
      iframe.goog-te-menu-frame,
      .goog-te-balloon-frame,
      .goog-te-balloon-frame *,
      .skiptranslate {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        background-color: transparent !important;
        position: fixed !important;
        top: -9999px !important;
        left: -9999px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -9999 !important;
      }

      /* Сбрасываем body, если Google Translate пытается добавить top: 40px */
      body {
        position: static !important;
        top: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .language-switcher {
        position: relative;
        font-family: 'Inter', sans-serif;
        margin: 20px;
        min-width: 200px;
        width: fit-content;
      }

      .language-switcher__button {
        width: 100%;
        background: white;
        border: none;
        padding: 0;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      }

      .language-switcher__button-content {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 16px;
        min-width: 200px;
      }

      .language-switcher__flag {
        width: 41px;
        height: 27px;
        border-radius: 3px;
        box-shadow: 0 1px 2px rgba(0,0,0,0.1);
        object-fit: cover;
        flex-shrink: 0;
      }

      .language-switcher__arrow {
        width: 14px;
        height: 14px;
        transition: transform 0.3s ease;
        transform: rotate(0deg);
        margin-left: auto;
        flex-shrink: 0;
      }
      .language-switcher.active .language-switcher__arrow {
        transform: rotate(-180deg);
      }

      .language-switcher__dropdown {
        position: absolute;
        top: calc(100% + 18px);
        left: 0;
        right: 0;
        background: white;
        border-radius: 10px;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        opacity: 0;
        visibility: hidden;
        transform: translateY(-10px);
        transition: all 0.3s ease;
        min-width: 200px;
        width: 100%;
        z-index: 9999999999;
      }
      .language-switcher.active .language-switcher__dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .language-switcher__item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        min-height: 56px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        user-select: none;
        pointer-events: auto;
      }
      .language-switcher__item:hover {
        background-color: rgba(0,0,0,0.05);
      }
      .language-switcher__item:first-child {
        border-radius: 10px 10px 0 0;
      }
      .language-switcher__item:last-child {
        border-radius: 0 0 10px 10px;
      }

      .language-switcher__name {
        font-size: 14px;
        color: #333;
        font-weight: 400;
        white-space: nowrap;
        flex-grow: 1;
      }

      @media (max-width: 480px) {
        .language-switcher__item:not(:first-child) {
          padding-top: 0;
          min-height: 40px;
        }
        .language-switcher__dropdown {
          top: calc(100% + 6px);
        }
      }
    `;
    document.head.appendChild(style);

    const targetDiv = document.querySelector('.cover__header-content-title');
    if (targetDiv) {
      targetDiv.parentNode.insertBefore(switcherContainer, targetDiv.nextSibling);
    }
  }

  function checkReadiness() {
    forceHideGoogleBanner();

    const targetElement = document.querySelector('.cover__header-content-title');
    if (targetElement && !document.querySelector('.language-switcher[data-initialized="true"]')) {
      cleanupExistingSwitchers();
      createGoogleTranslateWidget();
      createLanguageSwitcher();
    }
    
    // Добавляем автоматическое обнаружение проблемы "зависания" перевода
    if (localStorage.getItem('selectedLanguage') !== 'uk') {
      // Проверка на несоответствие выбранного языка и реального состояния
      setTimeout(function() {
        try {
          // Проверяем, совпадает ли текущий язык с сохраненным в localStorage
          const cookieTrans = document.cookie.split(';')
            .find(c => c.trim().startsWith('googtrans='));
          
          if (cookieTrans) {
            const langFromCookie = cookieTrans.split('=')[1].split('/')[2];
            const langFromStorage = localStorage.getItem('selectedLanguage');
            
            if (langFromCookie !== langFromStorage) {
              console.log('[DEBUG] Detected mismatch between cookie language and selected language', 
                { cookie: langFromCookie, selected: langFromStorage });
              
              // Попытка синхронизировать
              const combo = document.querySelector('.goog-te-combo');
              if (combo) {
                combo.value = langFromStorage;
                combo.dispatchEvent(new Event('change'));
                console.log('[DEBUG] Forced language correction');
              }
            }
          }
        } catch(e) {
          console.error('[DEBUG] Error during language check:', e);
        }
      }, 2000);
    }
  }

  function startObserver() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      forceHideGoogleBanner();
      requestAnimationFrame(checkReadiness);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  startObserver();
  checkReadiness();
  
  // Создаем наблюдатель за изменением языка документа (атрибут lang на HTML)
  if (window.self !== window.top) { // Только в LMS
    let lastUserAction = Date.now();
    let langMonitorStarted = false;
    
    // Отслеживаем пользовательские действия (клики) для понимания, когда переключение языка происходит по инициативе пользователя
    document.addEventListener('click', function() {
      lastUserAction = Date.now();
    }, true);
    
    // Функция для мониторинга языка страницы
    const monitorPageLanguage = () => {
      // Если окно не видимо, пропускаем проверку
      if (document.hidden) return;
      
      const currentDocLang = document.documentElement.lang;
      
      // Если язык переключился на польский, и это не было вызвано пользователем недавно (за последние 2 секунды)
      if (currentDocLang === 'pl' && currentLanguage === 'uk' && (Date.now() - lastUserAction > 2000)) {
        console.log('[DEBUG] Detected automatic switch to Polish language without user action, resetting');
        // Сбрасываем куки и перезагружаем страницу
        resetTranslator();
      }
    };
    
    // Запускаем мониторинг только если он еще не запущен
    if (!langMonitorStarted) {
      setInterval(monitorPageLanguage, 1000); // Проверка каждую секунду
      langMonitorStarted = true;
      console.log('[DEBUG] Language monitor started');
    }
  }
  
  // Дополнительная проверка для LMS - предотвращаем автоматическое переключение языка
  if (window.self !== window.top) { // Проверка на iframe (LMS)
    // Агрессивное предотвращение переключения на польский язык
    setInterval(function() {
      // Проверяем, не изменился ли язык в HTML на польский
      if (document.documentElement.lang === 'pl' && currentLanguage === 'uk' && !window._userInitiatedSwitch) {
        console.log('[DEBUG] Detected unwanted automatic HTML language change to Polish, reverting...');
        document.documentElement.lang = 'uk';
      }
      
      // Проверяем наличие польского языка в куках Google
      const cookieTrans = document.cookie.split(';').find(c => c.trim().startsWith('googtrans='));
      if (cookieTrans) {
        const langFromCookie = cookieTrans.split('=')[1].split('/')[2];
        if (langFromCookie === 'pl' && currentLanguage === 'uk' && !window._userInitiatedSwitch) {
          console.log('[DEBUG] Detected unwanted automatic switch to Polish in cookies, resetting...');
          // Принудительно сбрасываем куки
          ['', window.location.hostname, `.${window.location.hostname}`].forEach(domain => {
            document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ''}`;
          });
          
          // Если переключение упорно сохраняется, применяем более радикальные меры
          if (document.documentElement.lang === 'pl') {
            // Не перезагружаем страницу, а пробуем немедленно восстановить
            document.documentElement.lang = 'uk';
            if (window.google && window.google.translate) {
              try {
                const combo = document.querySelector('.goog-te-combo');
                if (combo) {
                  combo.value = 'uk';
                  combo.dispatchEvent(new Event('change'));
                }
              } catch(e) {
                console.error('[DEBUG] Error during forced language reset:', e);
              }
            }
          }
        }
      }
    }, 500); // Проверка каждые 500 мс
    
    // Перехватываем все изменения body для удаления top: 40px
    const bodyObserver = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (document.body.style.top && document.body.style.top !== '0px' && document.body.style.top !== '0') {
            document.body.style.top = '0';
          }
        }
      });
    });
    
    bodyObserver.observe(document.body, { attributes: true });
  }

  window.addEventListener('beforeunload', function() {
    if (observer) observer.disconnect();
    cleanupExistingSwitchers();
  });

  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'languageChanged') {
      localStorage.setItem('selectedLanguage', event.data.language);
    }
  });
  
  // Добавляем секретную кнопку сброса для администраторов (доступна по Alt+Shift+R)
  document.addEventListener('keydown', function(e) {
    // Alt+Shift+R = быстрый сброс переводчика
    if (e.altKey && e.shiftKey && e.key === 'R') {
      console.log('[DEBUG] Admin reset triggered via keyboard shortcut');
      resetTranslator();
    }
  });
  
  // Запускаем полное удаление логотипов при загрузке
  removeGoogleBranding();
  
  // Запускаем с интервалами для предотвращения появления логотипа
  setTimeout(removeGoogleBranding, 500);
  setTimeout(removeGoogleBranding, 1000);
  setTimeout(removeGoogleBranding, 2000);
  
  // Регулярная проверка и удаление
  setInterval(removeGoogleBranding, 5000);
});
