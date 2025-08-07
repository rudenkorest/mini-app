// UTM Analytics для Telegram Mini App
import { retrieveLaunchParams } from '@telegram-apps/sdk-react';

// GA4 Measurement ID
const GA_MEASUREMENT_ID = 'G-8V3LE3FJ5W';

// Флаг для відстеження ініціалізації
let isAnalyticsInitialized = false;

/**
 * Парсить UTM-параметри з start_param для формату startapp=utm_source-instagram
 * @param {string} startParam - start_param з Telegram WebApp
 * @returns {Object} - об'єкт з UTM-параметрами та додатковими даними
 */
export const parseUTMParams = (startParam) => {
  if (!startParam) {
    return {};
  }

  try {
    console.log('🔍 Отримано start_param:', startParam);
    
    let utmParams = {};
    
    // Перевіряємо чи startParam містить UTM параметри
    if (startParam.includes('utm_')) {
      // Розбиваємо на частини за дефісом або підкресленням
      const parts = startParam.split(/[-_]/);
      
      // Шукаємо UTM параметри
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPart = parts[i + 1];
        
        if (part.startsWith('utm')) {
          const utmKey = part;
          const utmValue = nextPart;
          
          if (utmValue && !utmValue.startsWith('utm')) {
            utmParams[utmKey] = utmValue;
            i++; // Пропускаємо наступну частину, оскільки вона вже оброблена
          }
        }
      }
    }
    
    // Додатково перевіряємо чи є location (наприклад, "kyiv")
    // Location зазвичай не містить "utm_" префікс
    const locationParts = startParam.split(/[-_]/).filter(part => 
      !part.startsWith('utm') && part.length > 0
    );
    
    if (locationParts.length > 0) {
      // Беремо першу частину, яка не є UTM параметром
      const location = locationParts[0];
      if (location && location !== startParam) {
        utmParams.location = location;
      }
    }

    console.log('🔍 UTM параметри знайдено:', utmParams);
    return utmParams;
  } catch (error) {
    console.error('❌ Помилка парсингу UTM параметрів:', error);
    return {};
  }
};

/**
 * Альтернативний метод парсингу для різних форматів
 * @param {string} startParam - start_param з Telegram WebApp
 * @returns {Object} - об'єкт з UTM-параметрами
 */
export const parseUTMParamsAdvanced = (startParam) => {
  if (!startParam) {
    return {};
  }

  try {
    console.log(' Розширений парсинг start_param:', startParam);
    
    let utmParams = {};
    
    // Метод 1: Парсинг через дефіси (utm_source-instagram)
    if (startParam.includes('utm_') && startParam.includes('-')) {
      const utmRegex = /utm_(\w+)-([^-]+)/g;
      let match;
      
      while ((match = utmRegex.exec(startParam)) !== null) {
        const [, utmKey, utmValue] = match;
        utmParams[`utm_${utmKey}`] = utmValue;
      }
    }
    
    // Метод 2: Парсинг через підкреслення (utm_source_instagram)
    if (startParam.includes('utm_') && startParam.includes('_')) {
      const utmRegex = /utm_(\w+)_([^_]+)/g;
      let match;
      
      while ((match = utmRegex.exec(startParam)) !== null) {
        const [, utmKey, utmValue] = match;
        utmParams[`utm_${utmKey}`] = utmValue;
      }
    }
    
    // Метод 3: Парсинг через URLSearchParams (utm_source=instagram&utm_campaign=launch)
    if (startParam.includes('=') && startParam.includes('&')) {
      const urlParams = new URLSearchParams(startParam);
      
      const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
      utmKeys.forEach(key => {
        const value = urlParams.get(key);
        if (value) {
          utmParams[key] = value;
        }
      });
    }
    
    // Знаходимо location (частина без UTM префіксів)
    const locationMatch = startParam.match(/^([^-_]+)/);
    if (locationMatch && !locationMatch[1].startsWith('utm')) {
      utmParams.location = locationMatch[1];
    }

    console.log('🔍 Розширені UTM параметри знайдено:', utmParams);
    return utmParams;
  } catch (error) {
    console.error('❌ Помилка розширеного парсингу UTM параметрів:', error);
    return {};
  }
};

/**
 * Ініціалізує Google Analytics 4 з UTM-даними
 * @param {Object} utmParams - UTM-параметри
 */
export const initGA4WithUTM = (utmParams = {}) => {
  if (isAnalyticsInitialized) {
    console.log('📊 GA4 вже ініціалізовано');
    return;
  }

  if (!window.gtag) {
    console.warn('⚠️ gtag не знайдено - перевірте що скрипт завантажився');
    return;
  }

  try {
    // Отримуємо дані користувача з Telegram
    const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
    const platform = window.Telegram?.WebApp?.platform || 'unknown';
    
    // Базова конфігурація GA4
    const config = {
      custom_map: {
        'telegram_user_id': telegramUser?.id || 'anonymous',
        'telegram_username': telegramUser?.username || 'unknown',
        'telegram_language': telegramUser?.language_code || 'uk',
        'is_premium': telegramUser?.is_premium || false,
        'platform': platform,
        'mini_app_version': '1.0.0',
        'bot_username': 'GulyaiMapBot'
      }
    };

    // Додаємо UTM-параметри до конфігурації
    if (Object.keys(utmParams).length > 0) {
      config.custom_map = {
        ...config.custom_map,
        ...utmParams
      };
    }

    // Ініціалізуємо GA4
    window.gtag('config', GA_MEASUREMENT_ID, config);
    
    isAnalyticsInitialized = true;
    console.log(' Google Analytics 4 ініціалізовано з UTM-даними');
    
    // Відправляємо подію utm_tracking
    if (Object.keys(utmParams).length > 0) {
      trackUTMEvent(utmParams);
    }
    
  } catch (error) {
    console.error('❌ Помилка ініціалізації GA4:', error);
  }
};

/**
 * Відправляє подію utm_tracking з UTM-даними
 * @param {Object} utmParams - UTM-параметри
 */
export const trackUTMEvent = (utmParams) => {
  if (!window.gtag || !isAnalyticsInitialized) {
    console.warn('⚠️ GA4 не ініціалізовано');
    return;
  }

  try {
    const eventData = {
      event_category: 'Traffic',
      event_label: 'utm_tracking',
      custom_parameter_1: JSON.stringify(utmParams),
      ...utmParams
    };

    window.gtag('event', 'utm_tracking', eventData);
    console.log(' UTM tracking event відправлено:', eventData);
    
  } catch (error) {
    console.error('❌ Помилка відправки UTM event:', error);
  }
};

/**
 * Основний функціонал для ініціалізації UTM Analytics
 */
export const initUTMAnalytics = () => {
  try {
    // Отримуємо launch params з Telegram SDK
    const launchParams = retrieveLaunchParams();
    const startParam = launchParams.startParam;
    
    console.log(' Launch params отримано:', launchParams);
    console.log('🔗 Start param:', startParam);
    
    // Парсимо UTM-параметри (спочатку пробуємо розширений метод)
    let utmParams = parseUTMParamsAdvanced(startParam);
    
    // Якщо розширений метод не знайшов параметри, пробуємо базовий
    if (Object.keys(utmParams).length === 0) {
      utmParams = parseUTMParams(startParam);
    }
    
    // Ініціалізуємо GA4 з UTM-даними
    initGA4WithUTM(utmParams);
    
    // Зберігаємо UTM-дані в localStorage для подальшого використання
    if (Object.keys(utmParams).length > 0) {
      localStorage.setItem('telegram_utm_params', JSON.stringify(utmParams));
      console.log('💾 UTM параметри збережено в localStorage');
    }
    
  } catch (error) {
    console.error('❌ Помилка ініціалізації UTM Analytics:', error);
  }
};

/**
 * Отримує збережені UTM-параметри з localStorage
 * @returns {Object} - збережені UTM-параметри
 */
export const getStoredUTMParams = () => {
  try {
    const stored = localStorage.getItem('telegram_utm_params');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('❌ Помилка отримання збережених UTM параметрів:', error);
    return {};
  }
};

/**
 * Відстеження подій з UTM-контекстом
 * @param {string} eventName - назва події
 * @param {Object} eventData - дані події
 */
export const trackEventWithUTM = (eventName, eventData = {}) => {
  if (!window.gtag || !isAnalyticsInitialized) {
    console.warn('⚠️ GA4 не ініціалізовано');
    return;
  }

  try {
    const utmParams = getStoredUTMParams();
    
    const enhancedEventData = {
      ...eventData,
      ...utmParams,
      custom_parameter_1: JSON.stringify(utmParams)
    };

    window.gtag('event', eventName, enhancedEventData);
    console.log(` Event "${eventName}" відправлено з UTM-контекстом:`, enhancedEventData);
    
  } catch (error) {
    console.error('❌ Помилка відправки event з UTM:', error);
  }
};

/**
 * Відстеження запуску додатку з конкретним location
 * @param {string} location - локація (наприклад, "kyiv")
 */
export const trackAppLaunch = (location = null) => {
  if (!window.gtag || !isAnalyticsInitialized) {
    console.warn('⚠️ GA4 не ініціалізовано');
    return;
  }

  try {
    const utmParams = getStoredUTMParams();
    
    const eventData = {
      event_category: 'App',
      event_label: 'app_launch',
      location: location || utmParams.location || 'unknown',
      bot_username: 'GulyaiMapBot',
      ...utmParams
    };

    window.gtag('event', 'app_launch', eventData);
    console.log('🚀 App launch event відправлено:', eventData);
    
  } catch (error) {
    console.error('❌ Помилка відправки app launch event:', error);
  }
}; 