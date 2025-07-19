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
} from '@telegram-apps/telegram-ui';
import { Page } from '@/components/Page.jsx';
import ReactMapGL, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Supercluster from 'supercluster';
import { useRef } from 'react';

function MapStub({ showBanner, onCloseBanner, onMarkerClick }) {
  const [viewport, setViewport] = useState({
    longitude: 30.5234, // Київ
    latitude: 50.4501,
    zoom: 12,
    width: '100%',
    height: '100%',
  });
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef();

  // Визначення місця користувача через стандартний браузерний API
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setViewport(v => ({
            ...v,
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
            zoom: 15,
            transitionDuration: 1000,
          }));
          setUserLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          // Користувач відмовив або сталася помилка
        }
      );
    }
  }, []);

  // Масив маркерів у форматі GeoJSON
  const points = [
    {
      type: "Feature",
      properties: { id: 1, title: "Kyiv Food Market", avatar: "https://i.ibb.co/gFc2zJYp/photo-2025-07-18-19-04-34.jpg" },
      geometry: { type: "Point", coordinates: [30.5234, 50.4501] }
    },
    {
      type: "Feature",
      properties: { id: 2, title: "Ibiza", avatar: "https://i.ibb.co/gFc2zJYp/photo-2025-07-18-19-04-34.jpg" },
      geometry: { type: "Point", coordinates: [30.5234, 50.4541] }
    },
    {
      type: "Feature",
      properties: { id: 3, title: "Pizza Spot", avatar: "https://i.ibb.co/gFc2zJYp/photo-2025-07-18-19-04-34.jpg" },
      geometry: { type: "Point", coordinates: [30.5264, 50.4521] }
    }
  ];

  // ініціалізація supercluster
  const supercluster = new Supercluster({ radius: 40, maxZoom: 18 });
  supercluster.load(points);

  // отримати кластери для поточного viewport
  let clusters = [];
  if (mapRef.current) {
    const bounds = mapRef.current.getMap().getBounds().toArray().flat();
    clusters = supercluster.getClusters(bounds, Math.round(viewport.zoom));
  } else {
    // дефолтні bounds для першого рендера
    clusters = supercluster.getClusters([30.5, 50.4, 30.6, 50.5], Math.round(viewport.zoom));
  }

  // Функції для зміни масштабу
  const handleZoomIn = () => setViewport(v => ({ ...v, zoom: v.zoom + 1 }));
  const handleZoomOut = () => setViewport(v => ({ ...v, zoom: v.zoom - 1 }));

  // Функція для переходу до геолокації користувача
  const handleGeolocate = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setViewport(v => ({
            ...v,
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
            zoom: 15,
            transitionDuration: 1000, // плавна анімація
            width: v.width,
            height: v.height,
          }));
        },
        (err) => {
          alert('Не вдалося отримати геолокацію: ' + err.message);
        }
      );
    } else {
      alert('Геолокація не підтримується вашим браузером');
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      // borderRadius: 16, // видалено, щоб не обрізати карту
      overflow: 'hidden',
      position: 'relative',
    }}>
      <ReactMapGL
        ref={mapRef}
        {...viewport}
        width="100%"
        height="100%"
        mapStyle="mapbox://styles/mapbox/streets-v11"
        mapboxApiAccessToken={import.meta.env.VITE_MAPBOX_TOKEN}
        onViewportChange={setViewport}
      >
        {/* Кластери та маркери */}
        {clusters.map(cluster => {
          const [longitude, latitude] = cluster.geometry.coordinates;
          // Якщо це кластер
          if (cluster.properties.cluster) {
            return (
              <Marker key={`cluster-${cluster.id}`} longitude={longitude} latitude={latitude} offsetLeft={-20} offsetTop={-20}>
                <Badge large mode="primary" type="number">
                  {cluster.properties.point_count}
                </Badge>
              </Marker>
            );
          }
          // Якщо це окремий маркер
          return (
            <Marker key={`marker-${cluster.properties.id}`} longitude={longitude} latitude={latitude} offsetLeft={-24} offsetTop={-48}>
              <div onClick={onMarkerClick} style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8}}>
                <Avatar
                  src={cluster.properties.avatar}
                  alt={cluster.properties.title}
                  size={48}
                />
                <Caption caps level="1" weight="2" style={{ color: '#000' }}>{cluster.properties.title}</Caption>
              </div>
            </Marker>
          );
        })}
        {/* Маркер користувача (синя точка) */}
        {userLocation && (
          <Marker
            longitude={userLocation.longitude}
            latitude={userLocation.latitude}
            offsetLeft={-12}
            offsetTop={-12}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'rgba(0, 120, 255, 0.7)',
                border: '2px solid #fff',
                boxShadow: '0 0 8px 2px rgba(0,120,255,0.5)'
              }}
            />
          </Marker>
        )}
      </ReactMapGL>
      {/* Banner поверх карти */}
      {showBanner && (
        <div style={{position: 'absolute', bottom: 25, right: 20, zIndex: 10, width: '90%', maxWidth: '90%'}}>
          <Banner
            background={<img alt="Nasa streams" src="https://www.nasa.gov/wp-content/uploads/2023/10/streams.jpg?resize=1536,864" style={{width: '150%'}}/>}
            header="Двіж поряд"
            subheader="Інтерактивна карта локацій Києва"
            onCloseIcon={onCloseBanner}
            type="section"
          >
            <Button
              mode="white"
              size="s"
            >
              Перейти в канал
            </Button>
          </Banner>
        </div>
      )}
      {/* Кнопки масштабування та навігації */}
      <div style={{position: 'absolute', top: 80, right: 12, display: 'flex', flexDirection: 'column', gap: 8}}>
        <Button shape="circle" size="m" onClick={handleZoomIn}>+</Button>
        <Button shape="circle" size="m" onClick={handleZoomOut}>-</Button>
        <Button shape="circle" size="m" onClick={handleGeolocate}>→</Button>
      </div>
    </div>
  );
}

export function MapPage() {
  const [showBanner, setShowBanner] = useState(true);
  const [showTonBanner, setShowTonBanner] = useState(false);
  return (
    <Page back={false}>
      <div style={{height: '100vh', background: '#181818', padding: 0, position: 'relative'}}>
        <MapStub showBanner={showBanner} onCloseBanner={() => setShowBanner(false)} onMarkerClick={() => setShowTonBanner(true)} />
        {showTonBanner && (
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
                before={<Image size={48} src="https://i.ibb.co/gFc2zJYp/photo-2025-07-18-19-04-34.jpg" />}
                callout="Київ, вул. Васильківська 38"
                background={<img alt="Nasa streams" src="https://royaldesign.ua/file/495/cc/ts/PT/filename_thumbnail.G7vG.jpg" style={{width: '100%', height: '100%', opacity: 0.5, objectFit: "cover"}}/>}
                header="Kyiv Food Market"
                subheader="Київський ринок їжі, простір з ресторанами і барами"
                type="section"
                onCloseIcon={() => setShowTonBanner(false)}
              >
                <Button
                  mode="white"
                  size="s"
                >
                  Детальніше
                </Button>
              </Banner>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
} 