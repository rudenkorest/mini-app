import { useLaunchParams, miniApp, useSignal } from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';
import { Navigate, Route, Routes, HashRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { trackAppLaunch } from '@/lib/utm-analytics.js';

import { routes } from '@/navigation/routes.jsx';

export function App() {
  const lp = useLaunchParams();
  const isDark = useSignal(miniApp.isDark);

  // Відстеження запуску додатку з location та UTM-контекстом
  useEffect(() => {
    // Отримуємо location з start_param (наприклад, "kyiv")
    const startParam = lp.startParam;
    let location = null;
    
    if (startParam) {
      // Розділяємо на location та UTM параметри
      const parts = startParam.split('?');
      if (parts.length > 0) {
        location = parts[0]; // Перша частина - це location
      }
    }
    
    trackAppLaunch(location);
  }, [lp.startParam]);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(lp.platform) ? 'ios' : 'base'}
    >
      <HashRouter>
        <Routes>
          {routes.map((route) => (
            <Route
              key={route.path}
              path={route.path}
              element={<route.Component />}
            />
          ))}
          <Route path="*" element={<Navigate to="/"/>}/>
        </Routes>
      </HashRouter>
    </AppRoot>
  );
}
