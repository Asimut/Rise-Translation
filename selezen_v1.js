document.addEventListener('DOMContentLoaded', function() {
  // Устанавливаем 'uk' как язык по умолчанию, если в localStorage ничего нет
  let currentLanguage = localStorage.getItem('selectedLanguage');
  if (!currentLanguage) {
    localStorage.setItem('selectedLanguage', 'uk');
    currentLanguage = 'uk';
  }
  
  let googleTranslateInitialized = false;

  const INTERFACE_TRANSLATIONS = {
    start: {
      uk: 'РОЗПОЧАТИ',
      pl: 'START',
      en: 'START'
    }
  };

  function updateStartButton(langCode) {
    setTimeout(() => {
      const startButton = document.querySelector('.start-button');
      if (startButton) {
        startButton.textContent = INTERFACE_TRANSLATIONS.start[langCode];
      }
    }, 300);
  }

  function createGoogleTranslateWidget() {
    try {
      if (document.getElementById('google_translate_element')) {
        return;
      }

      const translateDiv = document.createElement('div');
      translateDiv.id = 'google_translate_element';
      translateDiv.style.display = 'none';
      document.body.appendChild(translateDiv);

      if (!googleTranslateInitialized) {
        const script1 = document.createElement('script');
        script1.type = 'text/javascript';
        script1.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        
        script1.onload = function() {
          googleTranslateInitialized = true;
          
          // Устанавливаем начальный язык после загрузки Google Translate
          setTimeout(() => {
            if (currentLanguage !== 'uk') {
              const $select = document.querySelector('.goog-te-combo');
              if ($select) {
                $select.value = currentLanguage;
                $select.dispatchEvent(new Event('change'));
              }
            }
            // Обновляем кнопку START после загрузки
            updateStartButton(currentLanguage);
          }, 500);
        };

        if (!window.googleTranslateElementInit) {
          window.googleTranslateElementInit = function() {
            new google.translate.TranslateElement({
              pageLanguage: 'uk', // Стартовый язык - украинский
              includedLanguages: 'en,pl,uk',
              layout: google.translate.TranslateElement.InlineLayout.HORIZONTAL
            }, 'google_translate_element');
          }
        }

        document.body.appendChild(script1);
      }

    } catch (error) {
      console.error('Error creating Google Translate widget:', error);
    }
  }

  function createLanguageSwitcher() {
    const switcherContainer = document.createElement('div');
    switcherContainer.className = 'language-switcher';
    
    const switcherButton = document.createElement('button');
    switcherButton.className = 'language-switcher__button';
    
    const dropdownContent = document.createElement('div');
    dropdownContent.className = 'language-switcher__dropdown';
    
    const languages = [
      { code: 'uk', name: 'Українська', flag: 'https://static-00.iconduck.com/assets.00/ua-flag-icon-512x341-7m10uaq7.png', displayName: 'Українська' },
      { code: 'pl', name: 'Polski', flag: 'https://static-00.iconduck.com/assets.00/poland-icon-512x384-wgplvl6f.png', displayName: 'Polski' },
      { code: 'en', name: 'English', flag: 'https://static-00.iconduck.com/assets.00/united-states-icon-512x384-m15d49um.png', displayName: 'English' }
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
      try {
        localStorage.setItem('selectedLanguage', lang.code);
        currentLanguage = lang.code;

        const flagImg = switcherButton.querySelector('.language-switcher__flag');
        const nameSpan = switcherButton.querySelector('.language-switcher__name');
        
        if (flagImg && nameSpan) {
          flagImg.src = lang.flag;
          nameSpan.textContent = lang.displayName;
        }

        switcherContainer.classList.remove('active');

        // Обновляем кнопку START
        updateStartButton(lang.code);

        function changeGoogleTranslate() {
          const $frame = document.querySelector('.goog-te-menu-frame');
          if ($frame) {
            const $frameDoc = $frame.contentDocument || $frame.contentWindow.document;
            const items = $frameDoc.querySelectorAll('.goog-te-menu2-item');
            
            items.forEach(item => {
              if (item) {
                if (lang.code === currentLanguage) return;
                
                let shouldClick = false;
                const itemText = item.textContent.toLowerCase();
                
                switch(lang.code) {
                  case 'uk':
                    shouldClick = itemText.includes('украин') || itemText.includes('ukrainian');
                    break;
                  case 'pl':
                    shouldClick = itemText.includes('polish') || itemText.includes('польск');
                    break;
                  case 'en':
                    shouldClick = itemText.includes('english') || itemText.includes('англий');
                    break;
                }

                if (shouldClick) {
                  const clickableDiv = item.querySelector('div');
                  if (clickableDiv) {
                    clickableDiv.click();
                  }
                }
              }
            });
          } else {
            const $select = document.querySelector('.goog-te-combo');
            if ($select) {
              $select.value = lang.code;
              $select.dispatchEvent(new Event('change'));
            }
          }
        }

        setTimeout(changeGoogleTranslate, 100);

        const riseFrame = document.querySelector('iframe');
        if (riseFrame) {
          riseFrame.contentWindow.postMessage({
            type: 'setLanguage',
            language: lang.code
          }, '*');
        }

      } catch (error) {
        console.error('Language change error:', error);
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
      
      item.addEventListener('click', () => changeLanguage(lang));
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
    
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter&display=swap');
      
      /* Google Translate fixes */
      iframe[id=":1.container"] { 
        display: none !important; 
      }
      
      body {
        top: 0 !important;
      }
      
      .goog-logo-link {
        display: none !important;
      }
      
      .goog-te-gadget { 
        color: transparent !important;
      }
      
      .VIpgJd-ZVi9od-l4eHX-hSRGPd {
        display: none;
      }
      
      .goog-te-combo {
        display: none !important;
      }
      
      .skiptranslate.goog-te-gadget {
        display: none !important;
      }
      
      #goog-gt-tt,
      #goog-gt-vt {
        display: none !important;
      }
      
      .VIpgJd-ZVi9od-aZ2wEe-wOHMyf.VIpgJd-ZVi9od-aZ2wEe-wOHMyf-ti6hGc {
        display: none !important;
      }
      
      /* Language Switcher Styles */
      .language-switcher {
        position: relative;
        font-family: 'Inter', sans-serif;
        margin: 20px;
        z-index: 1000;
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
        border-radius: 2px;
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
      }
      
      .language-switcher.active .language-switcher__dropdown {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      
      .language-switcher__item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 16px;
        cursor: pointer;
        transition: background-color 0.3s ease;
        user-select: none;
      }
      
      .language-switcher__item * {
        pointer-events: none;
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
    `;
    
    document.head.appendChild(style);
    
    const targetDiv = document.querySelector('.cover__header-content-title');
    if (targetDiv) {
      targetDiv.parentNode.insertBefore(switcherContainer, targetDiv.nextSibling);
    }
  }

  function checkReadiness() {
    const targetElement = document.querySelector('.cover__header-content-title');
    if (targetElement) {
      if (!document.getElementById('google_translate_element')) {
        createGoogleTranslateWidget();
      }
      if (!document.querySelector('.language-switcher')) {
        createLanguageSwitcher();
      }
    }
  }

  const observer = new MutationObserver((mutations) => {
    checkReadiness();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  checkReadiness();

  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'languageChanged') {
      localStorage.setItem('selectedLanguage', event.data.language);
    }
  });
});