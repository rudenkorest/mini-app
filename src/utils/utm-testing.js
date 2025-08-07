/**
 * Утиліти для тестування UTM Analytics
 */

// Приклади посилань для тестування з параметром startapp:
export const TEST_LINKS = {
  // Базове посилання без UTM
  basic: 'https://t.me/GulyaiMapBot/kyiv',
  
  // З startapp параметром
  withStartApp: 'https://t.me/GulyaiMapBot/kyiv?startapp=utm_source-instagram',
  
  // З кількома UTM параметрами через дефіс
  withMultipleUTM: 'https://t.me/GulyaiMapBot/kyiv?startapp=utm_source-instagram-utm_campaign-launch2025',
  
  // З різними локаціями
  differentLocation: 'https://t.me/GulyaiMapBot/lviv?startapp=utm_source-facebook-utm_campaign-city_promo',
  
  // Тільки UTM без location
  onlyUTM: 'https://t.me/GulyaiMapBot?startapp=utm_source-twitter-utm_campaign-general',
  
  // З підкресленнями замість дефісів
  withUnderscores: 'https://t.me/GulyaiMapBot/kyiv?startapp=utm_source_instagram_utm_campaign_launch2025'
};

/**
 * Симулює різні start_param для тестування з startapp
 */
export const simulateStartParamsWithStartApp = () => {
  const testCases = [
    // Базовий випадок - тільки location
    'kyiv',
    
    // Location з UTM через дефіс
    'utm_source-instagram',
    
    // Кілька UTM параметрів через дефіс
    'utm_source-instagram-utm_campaign-launch2025',
    
    // UTM через підкреслення
    'utm_source_instagram_utm_campaign_launch2025',
    
    // Складний випадок з location
    'kyiv-utm_source-facebook-utm_campaign-city_promo-utm_medium-social'
  ];
  
  console.log('🧪 Тестові start_param з startapp:');
  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}. "${testCase}"`);
  });
  
  return testCases;
};

/**
 * Перевіряє правильність парсингу UTM параметрів з startapp
 */
export const validateStartAppParsing = (startParam) => {
  console.log('🔍 Тестування парсингу startapp:', startParam);
  
  try {
    let utmParams = {};
    
    // Метод 1: Парсинг через дефіси
    if (startParam.includes('utm_') && startParam.includes('-')) {
      const utmRegex = /utm_(\w+)-([^-]+)/g;
      let match;
      
      while ((match = utmRegex.exec(startParam)) !== null) {
        const [, utmKey, utmValue] = match;
        utmParams[`utm_${utmKey}`] = utmValue;
      }
    }
    
    // Метод 2: Парсинг через підкреслення
    if (startParam.includes('utm_') && startParam.includes('_')) {
      const utmRegex = /utm_(\w+)_([^_]+)/g;
      let match;
      
      while ((match = utmRegex.exec(startParam)) !== null) {
        const [, utmKey, utmValue] = match;
        utmParams[`utm_${utmKey}`] = utmValue;
      }
    }
    
    // Знаходимо location
    const locationMatch = startParam.match(/^([^-_]+)/);
    const location = locationMatch && !locationMatch[1].startsWith('utm') ? locationMatch[1] : null;
    
    console.log('📍 Location:', location);
    console.log('📊 UTM параметри:', utmParams);
    
    return { location, utmParams };
  } catch (error) {
    console.error('❌ Помилка валідації startapp:', error);
    return { location: null, utmParams: {} };
  }
};

/**
 * Тестує конкретний випадок з вашим посиланням
 */
export const testYourLink = () => {
  const testStartParam = 'utm_source-instagram';
  
  console.log('🧪 Тестування вашого посилання:');
  console.log('🔗 https://t.me/GulyaiMapBot/kyiv?startapp=utm_source-instagram');
  console.log('📝 start_param:', testStartParam);
  
  const result = validateStartAppParsing(testStartParam);
  
  console.log('✅ Результат парсингу:', result);
  
  if (result.utmParams.utm_source === 'instagram') {
    console.log('🎉 UTM source "instagram" успішно розпізнано!');
  } else {
    console.log('❌ UTM source не розпізнано правильно');
  }
  
  return result;
};