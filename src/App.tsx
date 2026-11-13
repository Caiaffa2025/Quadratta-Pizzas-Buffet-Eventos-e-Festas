import { useEffect, useState } from 'react';
import { AdminPanel } from './components/AdminPanel';
import { DEFAULT_SITE_SETTINGS } from './data/defaultSiteData';
import { startCmsSync } from './services/cmsSync';
import type { MediaAsset, PizzaItem, SiteSettings } from './types/cms';

export default function App() {
  const [adminOpen, setAdminOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash === '#admin' || window.location.search.includes('admin=1');
  });
  const [pizzas, setPizzas] = useState<PizzaItem[]>([]);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  useEffect(() => {
    const stopSync = startCmsSync({
      onPizzasChange: setPizzas,
      onMediaChange: setMedia,
      onSettingsChange: setSiteSettings,
    });

    const handleTriggerClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-open-admin]')) {
        event.preventDefault();
        setAdminOpen(true);
      }
    };

    const handleHashChange = () => {
      if (window.location.hash === '#admin') {
        setAdminOpen(true);
      }
    };

    document.addEventListener('click', handleTriggerClick);
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      stopSync();
      document.removeEventListener('click', handleTriggerClick);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handleClose = () => {
    setAdminOpen(false);
    if (window.location.hash === '#admin') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <AdminPanel
      isOpen={adminOpen}
      onClose={handleClose}
      pizzas={pizzas}
      media={media}
      siteSettings={siteSettings}
    />
  );
}
