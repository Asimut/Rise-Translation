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

  /**
   * Устанавливаем googtrans в cookie и перезагружаем страницу,
   * но БЕЗ domain=... — это снизит вероятность проблем в iFrame.
   */
  function setGoogleTransCookie(fromLang, toLang) {
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
    
    // Перезагружаем только если реально изменился язык
    const currentTrans = document.cookie.split(';').find(c => c.trim().startsWith('googtrans='));
    if (!currentTrans || currentTrans.split('=')[1] !== googTransValue) {
      window.location.reload();
    }
  }

  function createGoogleTranslateWidget() {
    try {
      const existingElement = document.getElementById('google_translate_element');
      if (existingElement) existingElement.remove();

      const translateDiv = document.createElement('div');
      translateDiv.id = 'google_translate_element';
      translateDiv.style.display = 'none';
      document.body.appendChild(translateDiv);

      if (!googleTranslateInitialized) {
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        script.onload = function() {
          googleTranslateInitialized = true;
          console.log('[DEBUG] Google Translate script loaded');
        };

        if (!window.googleTranslateElementInit) {
          window.googleTranslateElementInit = function() {
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
                  // Разрешаем переключение только на язык, выбранный пользователем
                  return originalSelectLanguage.call(this, a);
                };
              }
              
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
              layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL,
              autoDisplay: false,
              gaTrack: false
            }, 'google_translate_element');
            
            // Выполняем немедленную инициализацию только если язык не украинский
            setTimeout(function() {
              const combo = document.querySelector('.goog-te-combo');
              // Проверяем, что текущий язык не украинский перед переключением
              if (combo && currentLanguage !== 'uk') {
                console.log('[DEBUG] Initializing with non-default language:', currentLanguage);
                try {
                  combo.value = currentLanguage;
                  combo.dispatchEvent(new Event('change'));
                } catch(e) {
                  console.error('[DEBUG] Error during initial language change:', e);
                }
              } else {
                // Убеждаемся, что мы находимся на украинском языке
                console.log('[DEBUG] Initializing with default Ukrainian language');
                if (combo && combo.value !== 'uk') {
                  combo.value = 'uk';
                }
              }
              forceHideGoogleBanner();
            }, 1000);
          };
        }
        document.body.appendChild(script);
      }
    } catch (error) {
      console.error('[DEBUG] Error creating Google Translate widget:', error);
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
      
      localStorage.setItem('selectedLanguage', lang.code);
      currentLanguage = lang.code;

      const flagImg = switcherButton.querySelector('.language-switcher__flag');
      const nameSpan = switcherButton.querySelector('.language-switcher__name');
      if (flagImg && nameSpan) {
        flagImg.src = lang.flag;
        nameSpan.textContent = lang.displayName;
      }
      switcherContainer.classList.remove('active');
      
      // Прямая манипуляция с Google Translate до перезагрузки
      try {
        if (window.google && window.google.translate) {
          const combo = document.querySelector('.goog-te-combo');
          if (combo) {
            // Сначала программно меняем выбор
            combo.value = lang.code;
            combo.dispatchEvent(new Event('change'));
            console.log('[DEBUG] Direct manipulation of Google Translate dropdown');
          }
        }
      } catch(e) {
        console.error('[DEBUG] Error during direct manipulation:', e);
      }

      // Используем небольшую задержку перед установкой куки
      // Сбрасываем флаг пользовательского переключения через короткое время
      setTimeout(function() {
        window._userInitiatedSwitch = false;
        
        switch (lang.code) {
          case 'uk':
            setGoogleTransCookie('uk', 'uk');
            break;
          case 'pl':
            setGoogleTransCookie('uk', 'pl');
            break;
          case 'en':
            setGoogleTransCookie('uk', 'en');
            break;
        }
      }, 50);
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
      .VIpgJd-ZVi9od-aZ2wEe-wOHMyf.VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
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
    // Проверяем наличие польского языка в куках Google
    const cookieTrans = document.cookie.split(';').find(c => c.trim().startsWith('googtrans='));
    if (cookieTrans) {
      const langFromCookie = cookieTrans.split('=')[1].split('/')[2];
      if (langFromCookie === 'pl' && currentLanguage === 'uk') {
        console.log('[DEBUG] Detected unwanted automatic switch to Polish, resetting...');
        // Принудительно сбрасываем куки
        ['', window.location.hostname, `.${window.location.hostname}`].forEach(domain => {
          document.cookie = `googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;${domain ? ` domain=${domain};` : ''}`;
        });
        
        // Если в течение 1 секунды после загрузки происходит автопереключение, сбрасываем
        setTimeout(function() {
          if (document.documentElement.lang === 'pl') {
            console.log('[DEBUG] Forced reset to Ukrainian from automatic Polish');
            window.location.reload();
          }
        }, 1000);
      }
    }
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
});