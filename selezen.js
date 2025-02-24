let isInitialized = false;
      
      document.addEventListener('DOMContentLoaded', function() {
        if (isInitialized) {
          console.log('[DEBUG] Already initialized, skipping...');
          return;
        }
      
        isInitialized = true;
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
      
        
        cleanupExistingSwitchers();
      
        function setGoogleTransCookie(fromLang, toLang) {
          const googTransValue = `/${fromLang}/${toLang}`;
          let host = window.location.hostname;
          if (host.indexOf('www.') === 0) {
            host = host.replace('www.', '');
          }
      
          
          document.cookie = `googtrans=; path=/; domain=${host}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
          document.cookie = `googtrans=; path=/; domain=.${host}; expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
          document.cookie = 'googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
      
          
          document.cookie = `googtrans=${googTransValue}; path=/; domain=.${host};`;
          document.cookie = `googtrans=${googTransValue}; path=/;`;
      
          console.log('[DEBUG] setGoogleTransCookie:', googTransValue, 'domain=', host);
          window.location.reload();
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
                  new google.translate.TranslateElement({
                    pageLanguage: 'uk',
                    includedLanguages: 'uk,pl,en',
                    layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL
                  }, 'google_translate_element');
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
            localStorage.setItem('selectedLanguage', lang.code);
            currentLanguage = lang.code;
      
            const flagImg = switcherButton.querySelector('.language-switcher__flag');
            const nameSpan = switcherButton.querySelector('.language-switcher__name');
            if (flagImg && nameSpan) {
              flagImg.src = lang.flag;
              nameSpan.textContent = lang.displayName;
            }
            switcherContainer.classList.remove('active');
      
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
      
        
        window.addEventListener('beforeunload', function() {
          if (observer) observer.disconnect();
          cleanupExistingSwitchers();
        });
      
        window.addEventListener('message', function(event) {
          if (event.data && event.data.type === 'languageChanged') {
            localStorage.setItem('selectedLanguage', event.data.language);
          }
        });
      });