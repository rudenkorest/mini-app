import { useEffect, useCallback } from 'react';
import { trackEventWithUTM, getStoredUTMParams } from '@/lib/utm-analytics.js';

/**
 * Хук для роботи з UTM Analytics
 */
export const useUTMAnalytics = () => {
  const utmParams = getStoredUTMParams();

  const trackEvent = useCallback((eventName, eventData = {}) => {
    trackEventWithUTM(eventName, eventData);
  }, []);

  const trackPageView = useCallback((pageName) => {
    trackEventWithUTM('page_view', {
      event_category: 'Navigation',
      event_label: pageName,
      page_title: pageName,
      page_location: window.location.href
    });
  }, []);

  const trackUserAction = useCallback((action, details = {}) => {
    trackEventWithUTM('user_action', {
      event_category: 'Interaction',
      event_label: action,
      action_details: JSON.stringify(details)
    });
  }, []);

  return {
    utmParams,
    trackEvent,
    trackPageView,
    trackUserAction
  };
}; 