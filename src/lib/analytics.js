// Google Analytics utility для Telegram Mini App

// Measurement ID з environment variables
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

// Ініціалізація Analytics
export const initAnalytics = () => {
  if (!GA_MEASUREMENT_ID) {
    console.warn('GA_MEASUREMENT_ID не знайдено в environment variables');
    return;
  }

  // Отримуємо дані користувача з Telegram
  const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  
  if (window.gtag) {
    // Додаткова конфігурація з Telegram даними
    window.gtag('config', GA_MEASUREMENT_ID, {
      custom_map: {
        'telegram_user_id': telegramUser?.id || 'anonymous',
        'telegram_username': telegramUser?.username || 'unknown',
        'telegram_language': telegramUser?.language_code || 'uk',
        'is_premium': telegramUser?.is_premium || false,
        'platform': window.Telegram?.WebApp?.platform || 'unknown'
      }
    });

    console.log('📊 Google Analytics ініціалізовано для Telegram Mini App');
  } else {
    console.warn('⚠️ gtag не знайдено - перевірте що скрипт завантажився');
  }
};

// Відстеження переглядів сторінок
export const trackPageView = (pageName) => {
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'page_view', {
      page_title: pageName,
      page_location: window.location.href,
      custom_parameter_1: 'telegram_mini_app'
    });
    console.log(`📄 Page view: ${pageName}`);
  }
};

// Відстеження взаємодій з картою
export const trackMapInteraction = (action, details = {}) => {
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'map_interaction', {
      event_category: 'Map',
      event_label: action,
      custom_parameter_1: JSON.stringify(details)
    });
    console.log(`🗺️ Map interaction: ${action}`, details);
  }
};

// Відстеження кліків на маркери
export const trackMarkerClick = (locationId, locationTitle) => {
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'marker_click', {
      event_category: 'Location',
      event_label: locationTitle,
      location_id: locationId
    });
    console.log(`📍 Marker click: ${locationTitle} (ID: ${locationId})`);
  }
};

// Відстеження підписки на канал
export const trackSubscriptionCheck = (isSubscribed) => {
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'subscription_check', {
      event_category: 'Engagement',
      event_label: isSubscribed ? 'subscribed' : 'not_subscribed',
      is_subscribed: isSubscribed
    });
    console.log(`📺 Subscription check: ${isSubscribed ? 'subscribed' : 'not_subscribed'}`);
  }
};

// Відстеження помилок
export const trackError = (errorType, errorMessage) => {
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'exception', {
      description: `${errorType}: ${errorMessage}`,
      fatal: false
    });
    console.log(`❌ Error tracked: ${errorType} - ${errorMessage}`);
  }
};

// Відстеження часу на сторінці
export const trackSessionDuration = (duration) => {
  if (window.gtag && GA_MEASUREMENT_ID) {
    window.gtag('event', 'session_duration', {
      event_category: 'Engagement',
      event_label: 'time_on_page',
      value: Math.round(duration / 1000) // в секундах
    });
    console.log(`⏱️ Session duration: ${Math.round(duration / 1000)}s`);
  }
}; 