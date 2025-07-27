import { useEffect, useState } from 'react';
import {
  Input,
  Button,
  Card,
  Image,
  Banner,
  Avatar,
  Caption,
  Badge,
  Modal,
  Headline,
  Text,
  Spinner,
} from '@telegram-apps/telegram-ui';
import { Page } from '@/components/Page.jsx';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Supercluster from 'supercluster';
import { useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  initAnalytics, 
  trackPageView, 
  trackMapInteraction, 
  trackMarkerClick, 
  trackSubscriptionCheck,
  trackError,
  trackSessionDuration 
} from '@/lib/analytics';
import avatarIcon from '/images/avatar-icon.png';
import geoIcon from '/images/geo-icon.svg';
import telegramIcon from '/images/telegram-icon.svg';

function MapStub({ showBanner, onCloseBanner, onMarkerClick, showFeedbackModal, setShowFeedbackModal }) {
  const [viewState, setViewState] = useState({
    longitude: 30.5234, // Київ
    latitude: 50.4501,
    zoom: 12,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const watchIdRef = useRef(null);
  const mapRef = useRef();
  const [isMobile, setIsMobile] = useState(false);
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const sessionStartTime = useRef(Date.now());


  // Ініціалізація Telegram WebApp
  useEffect(() => {
    console.log('🚀 Початок ініціалізації Telegram WebApp...');
    
    // Ініціалізуємо Analytics
    initAnalytics();
    trackPageView('Map Page');
    
    // Примусова ініціалізація Telegram WebApp
    if (window.Telegram) {
      console.log('✅ Telegram API знайдено');
      console.log('Telegram object keys:', Object.keys(window.Telegram || {}));
      
      // Спробуємо примусово створити WebApp
      if (!window.Telegram.WebApp) {
        console.log('⚠️ WebApp відсутній, спробуємо створити...');
        
        // Спробуємо різні методи ініціалізації
        if (window.TelegramWebviewProxy) {
          console.log('Використовуємо TelegramWebviewProxy...');
          window.TelegramWebviewProxy.postEvent('web_app_ready', false, {});
        }
        
        // Спробуємо створити WebApp вручну
        if (window.Telegram && !window.Telegram.WebApp) {
          console.log('Спробуємо створити WebApp об\'єкт...');
          // Деякі версії потребують явного створення
          try {
            window.Telegram.WebApp = window.Telegram.WebApp || {};
          } catch (e) {
            console.error('Помилка створення WebApp:', e);
          }
        }
      }
      
      // Додаткова діагностика через 1 секунду
      setTimeout(() => {
        console.log('📊 Діагностика після ініціалізації:');
        console.log('Telegram object keys:', Object.keys(window.Telegram || {}));
        console.log('WebApp після ініціалізації:', !!window.Telegram?.WebApp);
        console.log('WebApp object:', window.Telegram?.WebApp);
        
        if (window.Telegram?.WebApp) {
          const wa = window.Telegram.WebApp;
          console.log('✅ WebApp знайдено!');
          console.log('WebApp version:', wa.version);
          console.log('WebApp platform:', wa.platform);
          console.log('WebApp initData:', wa.initData);
          console.log('WebApp initDataUnsafe:', wa.initDataUnsafe);
          
          // Ініціалізуємо WebApp
          try {
            wa.ready();
            wa.expand();
            console.log('✅ WebApp готовий і розгорнутий');

            // Вимикаємо vertical swipes для запобігання випадкового згортання (Bot API 7.7+)
            if (wa.disableVerticalSwipes) {
              console.log('🚫 Вимикаємо vertical swipes...');
              try {
                wa.disableVerticalSwipes();
                console.log('✅ Vertical swipes вимкнено:', !wa.isVerticalSwipesEnabled);
              } catch (error) {
                console.error('❌ Помилка disableVerticalSwipes:', error);
              }
            } else {
              console.log('⚠️ disableVerticalSwipes API недоступний (потрібна Bot API 7.7+)');
            }

            // Спробуємо увійти в full-screen режим (Bot API 8.0+)
            if (wa.requestFullscreen) {
              console.log('🖥 Увімкнення full-screen режиму...');
              try {
                wa.requestFullscreen();
                
                // Слухаємо події full-screen
                wa.onEvent('fullscreenChanged', () => {
                  console.log('📺 Full-screen змінено:', wa.isFullscreen);
                });
                
                wa.onEvent('fullscreenFailed', (error) => {
                  console.error('❌ Помилка full-screen:', error);
                });
              } catch (error) {
                console.error('❌ Помилка requestFullscreen:', error);
              }
            } else {
              console.log('⚠️ Full-screen API недоступний (потрібна Bot API 8.0+)');
            }
          } catch (e) {
            console.error('Помилка ініціалізації WebApp:', e);
          }
        } else {
          console.error('❌ WebApp все ще відсутній після спроб ініціалізації');
        }
      }, 1000);
      
    } else {
      console.error('❌ Telegram API взагалі не знайдено');
    }
  }, []);

  // Визначаємо, чи це мобільний пристрій
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
  }, []);

  // Завантажуємо локації з Supabase
  useEffect(() => {
    fetchLocations();
  }, []);

  // Відстеження тривалості сесії та cleanup геолокації
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionDuration = Date.now() - sessionStartTime.current;
      trackSessionDuration(sessionDuration);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      // Зупиняємо відстеження геолокації
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      
      window.removeEventListener('beforeunload', handleBeforeUnload);
      const sessionDuration = Date.now() - sessionStartTime.current;
      trackSessionDuration(sessionDuration);
    };
  }, []);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('is_active', true);

      if (error) {
        console.error('Помилка завантаження локацій:', error);
        trackError('Supabase Error', error.message);
        setLocations([]); // Якщо помилка - показуємо пусту карту
      } else {
        setLocations(data || []);
        trackMapInteraction('locations_loaded', { count: data?.length || 0 });
      }
    } catch (error) {
      console.error('Помилка при завантаженні локацій:', error);
      trackError('Fetch Error', error.message);
      setLocations([]); // При будь-якій помилці - показуємо пусту карту
    } finally {
      setIsLoading(false);
    }
  };

  // Визначення місця користувача через Telegram API або стандартний браузерний API
  useEffect(() => {
    // Спробуємо використати Telegram LocationManager API
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.LocationManager) {
      console.log("Використовуємо Telegram LocationManager API");
      
      try {
        window.Telegram.WebApp.LocationManager.requestLocation({
          onSuccess: (location) => {
            console.log("Telegram геолокація успішна:", location);
            setViewState(v => ({
              ...v,
              longitude: location.longitude,
              latitude: location.latitude,
              zoom: 15,
            }));
            setUserLocation({
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy || 10, // Telegram API може не надавати точність
              timestamp: Date.now()
            });
            trackMapInteraction('geolocate_success', { 
              source: 'telegram_api',
              latitude: location.latitude,
              longitude: location.longitude 
            });
          },
          onError: (error) => {
            console.error("Помилка Telegram геолокації:", error);
            setLocationError("Помилка Telegram геолокації: " + error);
            // Спробуємо використати стандартний браузерний API як резервний варіант
            useBrowserGeolocation();
          }
        });
      } catch (e) {
        console.error("Виняток при використанні Telegram LocationManager:", e);
        // Спробуємо використати стандартний браузерний API як резервний варіант
        useBrowserGeolocation();
      }
    } else {
      // Якщо Telegram API недоступний, використовуємо стандартний браузерний API
      console.log("Telegram LocationManager недоступний, використовуємо браузерний API");
      useBrowserGeolocation();
    }
  }, []);

  // Функція для використання стандартного браузерного API геолокації з реальним часом
  const useBrowserGeolocation = () => {
    if (navigator.geolocation) {
      // Спочатку отримуємо поточну позицію
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log("Браузерна геолокація успішна:", pos.coords);
          setViewState(v => ({
            ...v,
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
            zoom: 15,
          }));
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now()
          });
        },
        (err) => {
          console.error("Помилка браузерної геолокації:", err);
          // Спробуємо ще раз з базовими параметрами якщо був таймаут
          if (err.code === err.TIMEOUT) {
            console.log("Спробуємо з базовими параметрами геолокації...");
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                console.log("Базова геолокація успішна:", pos.coords);
                setViewState(v => ({
                  ...v,
                  longitude: pos.coords.longitude,
                  latitude: pos.coords.latitude,
                  zoom: 15,
                }));
                setUserLocation({
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  accuracy: pos.coords.accuracy,
                  timestamp: Date.now()
                });
              },
              () => {
                setLocationError("Не вдалося отримати геолокацію: " + err.message);
              },
              { enableHighAccuracy: false, timeout: 60000, maximumAge: 300000 }
            );
          } else {
            setLocationError("Не вдалося отримати геолокацію: " + err.message);
          }
        },
        { 
          enableHighAccuracy: false, // Вимикаємо високу точність для швидшого відповіді
          timeout: 30000, // Збільшуємо таймаут до 30 секунд
          maximumAge: 60000 // Дозволяємо використовувати кеш до 1 хвилини
        }
      );

      // Тепер запускаємо постійне відстеження
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          console.log("Оновлення геолокації:", pos.coords);
          setUserLocation(prevLocation => {
            // Оновлюємо тільки якщо нова позиція точніша або минуло достатньо часу
            if (!prevLocation || 
                pos.coords.accuracy < prevLocation.accuracy ||
                Date.now() - prevLocation.timestamp > 5000) {
              return {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
                timestamp: Date.now()
              };
            }
            return prevLocation;
          });
        },
        (err) => {
          console.error("Помилка відстеження геолокації:", err);
        },
        { 
          enableHighAccuracy: false, // Швидший відгук
          maximumAge: 60000, // 1 хвилина кешу
          timeout: 20000 // 20 секунд для watchPosition
        }
      );
    } else {
      console.error("Геолокація не підтримується браузером");
      setLocationError("Геолокація не підтримується вашим браузером");
    }
  };

  // Конвертуємо локації у формат GeoJSON для supercluster
  const points = locations.map(location => ({
    type: "Feature",
    properties: { 
      id: location.id, 
      title: location.title, 
      avatar: location.avatar,
      description: location.description,
      address: location.address,
      link: location.link // Додаємо посилання з бази даних
    },
    geometry: { 
      type: "Point", 
      coordinates: [location.longitude, location.latitude] 
    }
  }));

  // ініціалізація supercluster
  const supercluster = new Supercluster({ radius: 40, maxZoom: 18 });
  supercluster.load(points);

  // отримати кластери для поточного viewport
  let clusters = [];
  if (mapRef.current) {
    const bounds = mapRef.current.getMap().getBounds().toArray().flat();
    clusters = supercluster.getClusters(bounds, Math.round(viewState.zoom));
  } else {
    // дефолтні bounds для першого рендера
    clusters = supercluster.getClusters([30.5, 50.4, 30.6, 50.5], Math.round(viewState.zoom));
  }

  // Функції для зміни масштабу
  const handleZoomIn = () => {
    setViewState(v => ({ ...v, zoom: v.zoom + 1 }));
    trackMapInteraction('zoom_in', { zoom: viewState.zoom + 1 });
  };
  
  const handleZoomOut = () => {
    setViewState(v => ({ ...v, zoom: v.zoom - 1 }));
    trackMapInteraction('zoom_out', { zoom: viewState.zoom - 1 });
  };

  // Функція для full-screen режиму
  const handleFullscreen = () => {
    const wa = window.Telegram?.WebApp;
    if (wa && wa.requestFullscreen) {
      try {
        if (wa.isFullscreen) {
          wa.exitFullscreen();
          console.log('🔙 Вихід з full-screen');
        } else {
          wa.requestFullscreen();
          console.log('🖥 Увімкнення full-screen');
        }
      } catch (error) {
        console.error('❌ Помилка full-screen:', error);
      }
    } else {
      console.log('⚠️ Full-screen API недоступний');
    }
  };

  // Функція для toggle vertical swipes
  const handleSwipeToggle = () => {
    const wa = window.Telegram?.WebApp;
    if (wa && wa.disableVerticalSwipes && wa.enableVerticalSwipes) {
      try {
        if (wa.isVerticalSwipesEnabled) {
          wa.disableVerticalSwipes();
          console.log('🚫 Vertical swipes вимкнено');
        } else {
          wa.enableVerticalSwipes();
          console.log('✅ Vertical swipes увімкнено');
        }
      } catch (error) {
        console.error('❌ Помилка toggle swipes:', error);
      }
    } else {
      console.log('⚠️ Vertical swipes API недоступний');
    }
  };

  // Функція для переходу до геолокації користувача
  const handleGeolocate = () => {
    trackMapInteraction('geolocate_requested');
    
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.LocationManager) {
      try {
        window.Telegram.WebApp.LocationManager.requestLocation({
          onSuccess: (location) => {
            setViewState(v => ({
              ...v,
              longitude: location.longitude,
              latitude: location.latitude,
              zoom: 15,
            }));
            setUserLocation({
              latitude: location.latitude,
              longitude: location.longitude,
              accuracy: location.accuracy || 10, // Telegram API може не надавати точність
              timestamp: Date.now()
            });
            trackMapInteraction('geolocate_success', { 
              source: 'telegram_api',
              latitude: location.latitude,
              longitude: location.longitude 
            });
          },
          onError: (error) => {
            console.error("Помилка Telegram геолокації:", error);
            // Спробуємо використати стандартний браузерний API як резервний варіант
            useBrowserGeolocationForButton();
          }
        });
      } catch (e) {
        console.error("Виняток при використанні Telegram LocationManager:", e);
        // Спробуємо використати стандартний браузерний API як резервний варіант
        useBrowserGeolocationForButton();
      }
    } else {
      // Якщо Telegram API недоступний, використовуємо стандартний браузерний API
      useBrowserGeolocationForButton();
    }
  };

  // Функція для використання стандартного браузерного API геолокації при натисканні на кнопку
  const useBrowserGeolocationForButton = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setViewState(v => ({
            ...v,
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
            zoom: 15,
          }));
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: Date.now()
          });
          trackMapInteraction('geolocate_success', { 
            source: 'browser_api',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude 
          });
        },
        (err) => {
          alert('Не вдалося отримати геолокацію: ' + err.message);
          trackError('Browser Geolocation', err.message);
        },
        { 
          enableHighAccuracy: false, // Швидший відгук для кнопки
          timeout: 30000, // 30 секунд таймаут
          maximumAge: 60000 // 1 хвилина кешу
        }
      );
    } else {
      alert('Геолокація не підтримується вашим браузером');
      trackError('Geolocation Not Supported', 'Browser does not support geolocation');
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <Map
        ref={mapRef}
        {...viewState}
        style={{width: '100%', height: '100%'}}
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        onMove={evt => setViewState(evt.viewState)}
        dragRotate={false}
        touchRotate={false}
        touchPitch={false}
        dragPan={true}
        touchZoom={true}
        doubleClickZoom={true}
        keyboard={false}
        pitchWithRotate={false}
      >
        {/* Кластери та маркери */}
        {!isLoading && clusters.map(cluster => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          // Якщо це кластер
          if (cluster.properties.cluster) {
            return (
              <Marker key={`cluster-${cluster.id}`} longitude={longitude} latitude={latitude} offsetLeft={-20} offsetTop={-20}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'rgba(0, 120, 255, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontFamily: "'Helvetica Neue', sans-serif",
                    fontWeight: 500,
                    fontSize: 16,
                    border: '2px solid #fff',
                    boxShadow: '0 0 8px 2px rgba(0,120,255,0.5)'
                  }}
                >
                  {cluster.properties.point_count}
                </div>
              </Marker>
            );
          }
          // Якщо це окремий маркер
          return (
            <Marker key={`marker-${cluster.properties.id}`} longitude={longitude} latitude={latitude} offsetLeft={0} offsetTop={-20}>
              <div onClick={() => onMarkerClick(cluster.properties)} style={{cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4}}>
            <Avatar
                  src={avatarIcon}
                  onError={(e) => {
                    e.target.src = avatarIcon; // Fallback при помилці завантаження
                  }}
                  alt={cluster.properties.title}
                  size={40}
                />
                <Caption caps level="1" weight="2" style={{ color: '#000' }}>{cluster.properties.title}</Caption>
              </div>
            </Marker>
          );
        })}
        {/* Маркер користувача (синя точка з індикатором точності) */}
        {userLocation && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            offsetLeft={-15}
            offsetTop={-15}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              {/* Кільце точності */}
              {userLocation.accuracy && (
                <div
                  style={{
                    position: 'absolute',
                    width: Math.min(userLocation.accuracy / 2, 80), // Обмежуємо максимальний розмір
                    height: Math.min(userLocation.accuracy / 2, 80),
                    borderRadius: '50%',
                    background: 'rgba(0, 120, 255, 0.1)',
                    border: '1px solid rgba(0, 120, 255, 0.3)',
                    zIndex: 1001
                  }}
                />
              )}
              {/* Основна точка користувача */}
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(0, 120, 255, 1)',
                  border: '3px solid #fff',
                  boxShadow: '0 0 12px 3px rgba(0,120,255,0.4)',
                  zIndex: 1002,
                  position: 'relative',
                  animation: 'pulse 2s infinite'
                }}
              />
              
            </div>
          </Marker>
        )}
      </Map>
      {/* Beta badge у верхньому лівому куті */}
      <div style={{position: 'absolute', top: 100, left: 10, zIndex: 10}}>
        <Badge mode="critical" large type='number'>Beta 1.0</Badge>
          </div>
      
      {/* Індикатор завантаження */}
      {isLoading && (
          <div style={{
            position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: 20,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <Spinner size='m' />
          </div>
        )}
      {/* Banner поверх карти */}
      {showBanner && (
        <div style={{position: 'absolute', bottom: 25, left: '50%', transform: 'translateX(-50%)', zIndex: 1, width: '90%', maxWidth: '90%'}}>
          <Banner
            background={<img alt="Nasa streams" src="https://www.nasa.gov/wp-content/uploads/2023/10/streams.jpg?resize=1536,864" style={{width: '150%'}}/>}
            header="Трендові місця поруч з собою!"
            subheader="Інтерактивна карта від медіа «Гуляй, Київ». Досліджуй місто з нами. "
            onCloseIcon={onCloseBanner}
            type="section"
          >
            <Button
              before={<Image size={16} src={telegramIcon} style={{backgroundColor: 'white', borderRadius: '50%', padding: '2px'}} />}
              mode="white"
              size="s"
              onClick={() => window.open('https://t.me/+8Bui7KD5WrJiZjli', '_blank')}
            >
              Детальніше
            </Button>
          </Banner>
        </div>
      )}
      {/* Кнопки масштабування та навігації */}
      <div style={{position: 'absolute', top: 100, right: 12, display: 'flex', flexDirection: 'column', gap: 5}}>
        {/* Кнопка фідбеку */}
        <Button 
          shape="circle" 
          size="m" 
          onClick={() => setShowFeedbackModal(true)}
        >
          💬
        </Button>
        
        {/* Група zoom кнопок без gap */}
        <div style={{display: 'flex', flexDirection: 'column', gap: 0}}>
          <Button mode='bezeled' shape="circle" size="m" onClick={handleZoomIn}>+</Button>
          <Button mode='bezeled' shape="circle" size="m" onClick={handleZoomOut}>-</Button>
        </div>
        {/* Кнопка геолокації окремо */}
        <Button mode='bezeled' shape="circle" size="m" onClick={handleGeolocate}>
          <img src={geoIcon} alt="Геолокація" style={{width: 16, height: 16}} />
        </Button>
      </div>
      
      {/* Повідомлення про помилку геолокації - закоментовано, оскільки в Telegram працює нормально */}
      {/* {locationError && (
        <div style={{
          position: 'absolute', 
          bottom: 70, 
          left: '50%', 
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          padding: '8px 12px',
          borderRadius: 8,
          maxWidth: '80%',
          textAlign: 'center',
          zIndex: 10,
          fontSize: 14,
          color: '#ff3b30'
        }}>
          {locationError}
        </div>
      )} */}
    </div>
  );
}

export function MapPage() {
  const [showBanner, setShowBanner] = useState(true);
  const [showTonBanner, setShowTonBanner] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  // Ініціалізація Telegram WebApp
  useEffect(() => {
    // Чекаємо поки Telegram завантажиться
    const initTelegram = () => {
      if (window.Telegram) {
        // Створюємо WebApp якщо його немає
        if (!window.Telegram.WebApp) {
          window.Telegram.WebApp = window.Telegram.WebApp || {};
        }
        
        if (window.Telegram.WebApp && window.Telegram.WebApp.ready) {
          window.Telegram.WebApp.ready();
          console.log('Telegram WebApp готовий:', window.Telegram.WebApp);
        }
      }
    };
    
    // Спробуємо зараз
    initTelegram();
    
    // І через невеликий час
    setTimeout(initTelegram, 1000);
  }, []);
  
  // Канал, на який потрібно підписатися
  const TELEGRAM_CHANNEL = '-1001968388006'; // Chat ID вашого приватного каналу
  const TELEGRAM_CHANNEL_URL = 'https://t.me/+8Bui7KD5WrJiZjli'; // Замініть на invite link вашого каналу
  const BACKEND_URL = process.env.NODE_ENV === 'production' 
    ? 'https://mini-app-backend-production-826a.up.railway.app' // Railway URL
    : 'http://localhost:3001';
  
  const handleMarkerClick = (locationData) => {
    setSelectedLocation(locationData);
    setShowTonBanner(true);
    trackMarkerClick(locationData.id, locationData.title);
  };

  // Універсальна функція для відкриття посилань
  const openLink = (url) => {
    if (!url) return;
    
    // Перевіряємо чи це Telegram посилання
    if (url.includes('t.me/')) {
      // Для Telegram посилань використовуємо openTelegramLink для плавного переходу
      if (window.Telegram?.WebApp?.openTelegramLink) {
        window.Telegram.WebApp.openTelegramLink(url);
      } else if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    } else {
      // Для зовнішніх посилань використовуємо openLink
      if (window.Telegram?.WebApp?.openLink) {
        window.Telegram.WebApp.openLink(url);
      } else {
        window.open(url, '_blank');
      }
    }
  };
  
  // Функція перевірки підписки на канал
  const checkChannelSubscription = async () => {
    try {
      setIsCheckingSubscription(true);
      trackSubscriptionCheck('check_subscription_started');
      
      // Отримуємо дані користувача з Telegram WebApp
      const tg = window.Telegram?.WebApp;
      const user = tg?.initDataUnsafe?.user;
      
      console.log('🔍 Telegram WebApp data:', tg);
      console.log('👤 User data:', user);
      
      if (!window.Telegram) {
        console.error('Telegram API не знайдено! Відкрийте через Telegram.');
        trackError('Telegram API Not Found', 'User tried to check subscription without Telegram API');
        return false;
      }
      
      if (!tg) {
        console.error('WebApp не ініціалізовано! Налаштуйте Menu Button в BotFather.');
        trackError('WebApp Not Initialized', 'User tried to check subscription without WebApp initialized');
        return false;
      }
      
      if (!tg.initDataUnsafe) {
        console.error('initDataUnsafe відсутній! Mini App запущено не через бота.');
        trackError('initDataUnsafe Missing', 'User tried to check subscription without initDataUnsafe');
        return false;
      }
      
      if (!user) {
        console.error('Не вдалося отримати дані користувача');
        trackError('User Data Not Found', 'Could not retrieve user data for subscription check');
        return false;
      }
      
      // Запит до нашого бекенду для перевірки підписки
      console.log('🌐 Відправляємо запит до:', `${BACKEND_URL}/api/check-subscription`);
      console.log('📤 Дані запиту:', {
        userId: user.id,
        channel: TELEGRAM_CHANNEL,
        initData: tg.initData ? 'present' : 'missing'
      });
      
      const response = await fetch(`${BACKEND_URL}/api/check-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          channel: TELEGRAM_CHANNEL,
          initData: tg.initData || '' // для верифікації на бекенді
        })
      });
      
      console.log('📥 Статус відповіді:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Помилка API:', error);
        trackError('Subscription API Error', error.message);
        return false;
      }
      
      const data = await response.json();
      console.log('✅ Відповідь API:', data);
      
      return data.isSubscribed;
      
    } catch (error) {
      console.error('Помилка перевірки підписки:', error);
      trackError('Subscription Check Error', error.message);
      return false;
    } finally {
      setIsCheckingSubscription(false);
      trackSubscriptionCheck('check_subscription_finished');
    }
  };
  
  // Обробник кліку на кнопку "Детальніше"
  const handleDetailsClick = async (e) => {
    e.preventDefault();
    
    const isSubscribed = await checkChannelSubscription();
    
    if (isSubscribed) {
      // Якщо підписаний - відкриваємо посилання
      const linkToOpen = selectedLocation.link || 'https://nohello.net/en/';
      openLink(linkToOpen);
      trackMapInteraction('details_link_opened', { 
        locationId: selectedLocation.id,
        locationTitle: selectedLocation.title,
        link: linkToOpen 
      });
    } else {
      // Якщо не підписаний - показуємо попап
      setShowSubscribeModal(true);
      trackMapInteraction('subscription_modal_shown', { 
        locationId: selectedLocation.id,
        locationTitle: selectedLocation.title 
      });
    }
  };
  
  // Обробник підписки на канал
  const handleSubscribeClick = () => {
    window.open(TELEGRAM_CHANNEL_URL, '_blank');
    // Закриваємо модальне вікно
    setShowSubscribeModal(false);
    trackMapInteraction('subscribe_button_clicked', { channel: TELEGRAM_CHANNEL });
    
    // Можна додати таймер для повторної перевірки через кілька секунд
    setTimeout(() => {
      // Повторна перевірка після підписки
      checkChannelSubscription().then(isSubscribed => {
        if (isSubscribed) {
          const linkToOpen = selectedLocation?.link || 'https://nohello.net/en/';
          openLink(linkToOpen);
          trackMapInteraction('post_subscription_link_opened', { 
            locationId: selectedLocation?.id,
            locationTitle: selectedLocation?.title,
            link: linkToOpen 
          });
        }
      });
    }, 3000);
  };
  
  return (
    <Page back={false}>
      <div style={{height: '100vh', background: '#181818', padding: 0, position: 'relative'}}>
        <MapStub 
          showBanner={showBanner} 
          onCloseBanner={() => setShowBanner(false)} 
          onMarkerClick={handleMarkerClick}
          showFeedbackModal={showFeedbackModal}
          setShowFeedbackModal={setShowFeedbackModal}
        />
        {showTonBanner && selectedLocation && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
            background: 'transparent',
          }}>
            <div style={{width: '100%', maxWidth: '100%', pointerEvents: 'auto'}}>
              <Banner
                before={<Image size={48} src={avatarIcon} />}
                callout={selectedLocation.address || "Київ"}
                background={<img alt="Location background" src={selectedLocation.avatar} style={{width: '100%', height: '100%', opacity: 0.5, objectFit: "cover"}}/>}
                header={selectedLocation.title}
                subheader={selectedLocation.description || "Опис локації"}
                type="section"
                onCloseIcon={() => setShowTonBanner(false)}
              >
                <Button
                  mode="white"
                  size="s"
                  onClick={handleDetailsClick}
                  loading={isCheckingSubscription}
                >
                  Детальніше
                </Button>
              </Banner>
            </div>
          </div>
        )}
        
        {/* Модальне вікно для підписки */}
        {showSubscribeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 20,
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: 16,
              padding: 24,
              maxWidth: 340,
              width: '100%',
              boxShadow: '0 4px 24px rgba(0, 0, 0, 0.15)',
            }}>
              <Headline weight="2" style={{ marginBottom: 12, textAlign: 'center' }}>
                Підпишіться на канал
              </Headline>
              <Text style={{ marginBottom: 20, textAlign: 'center', color: '#666' }}>
                Щоб отримати доступ до детальної інформації, підпишіться на наш Telegram канал
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Button
                  size="l"
                  stretched
                  onClick={handleSubscribeClick}
                >
                  Підписатися на канал
                </Button>
                <Button
                  mode="bezeled"
                  size="l"
                  stretched
                  onClick={() => setShowSubscribeModal(false)}
                >
                  Закрити
                </Button>
              </div>
            </div>
        </div>
        )}
        
        {/* Modal фідбеку з Telegram UI */}
        <Modal
          open={showFeedbackModal}
          onOpenChange={setShowFeedbackModal}
        >
          <Modal.Header after={
            <Button mode="bezeled" size="s" onClick={() => setShowFeedbackModal(false)}>
              ✕
            </Button>
          }>
            Зв'язок
          </Modal.Header>
          
          <div style={{ padding: '16px 24px 24px 24px' }}>
            <Text style={{ display: 'block', marginBottom: 16, lineHeight: '1.5' }}>
              Якщо у вас є зауваження, проблеми в роботі або пропозиції щодо покращення, будь ласка, пишіть нам.
            </Text>
            
            <Text style={{ display: 'block', marginBottom: 20, lineHeight: '1.5' }}>
              Також в нашому каналі «Гуляй, Київ» та на самій карті доступна реклама.
            </Text>
            
            <Button
              size="l"
              stretched
              onClick={() => window.open('https://t.me/pavlik_ads', '_blank')}
            >
              Написати
            </Button>
        </div>
        </Modal>
      </div>
    </Page>
  );
} 