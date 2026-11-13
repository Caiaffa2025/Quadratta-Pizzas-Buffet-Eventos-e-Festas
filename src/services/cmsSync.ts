import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { DEFAULT_SITE_SETTINGS } from '../data/defaultSiteData';
import type { MediaAsset, PizzaCategory, PizzaItem, SiteSettings, SocialLink, SocialPlatform } from '../types/cms';
import { resolveImageSrc } from './cmsFirestore';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSocialSvg(platform: SocialPlatform): string {
  switch (platform) {
    case 'instagram':
      return '<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>';
    case 'facebook':
      return '<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.688 5H18V0h-3.808C10.597 0 9 1.583 9 4.615V8z"/></svg>';
    case 'tiktok':
      return '<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>';
    case 'youtube':
      return '<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>';
    case 'whatsapp':
      return '<svg class="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654z"/></svg>';
    default:
      return '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';
  }
}

function renderPizzaCard(pizza: PizzaItem, mediaMap: Record<string, MediaAsset>, isFeaturedTab: boolean): string {
  const imgSrc = resolveImageSrc(pizza.imageUrl, mediaMap);
  const borderClass = isFeaturedTab
    ? 'border-brand-gold/40 shadow-goldGlow/10'
    : 'border-brand-border hover:border-brand-gold/40 transition-all duration-300';

  const badgeHtml = pizza.badge
    ? `<span class="absolute top-3 right-3 ${
        pizza.badgeTone === 'gold' ? 'bg-brand-gold text-brand-dark' : 'bg-brand-red text-white'
      } text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">${escapeHtml(
        pizza.badge
      )}</span>`
    : '';

  const tagsHtml =
    pizza.tagLeft || pizza.tagRight
      ? `<div class="mt-4 pt-3 border-t border-brand-border/60 flex items-center justify-between text-xs text-brand-gold">
          <span>${escapeHtml(pizza.tagLeft || '')}</span>
          <span>${escapeHtml(pizza.tagRight || '')}</span>
        </div>`
      : '';

  return `
    <div class="bg-brand-card rounded-2xl overflow-hidden border ${borderClass} flex flex-col justify-between">
      <div class="relative h-48 overflow-hidden bg-brand-surface">
        <img
          src="${escapeHtml(imgSrc)}"
          alt="${escapeHtml(pizza.title)}"
          referrerpolicy="no-referrer"
          class="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
        />
        ${badgeHtml}
      </div>
      <div class="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h3 class="font-serif text-xl font-bold text-white mb-2">${escapeHtml(pizza.title)}</h3>
          <p class="text-sm text-brand-cream/70 leading-relaxed">${escapeHtml(pizza.description)}</p>
        </div>
        ${tagsHtml}
      </div>
    </div>
  `;
}

function applyPizzasToDom(pizzas: PizzaItem[], mediaMap: Record<string, MediaAsset>) {
  if (pizzas.length === 0) return;

  const categories: PizzaCategory[] = ['mais-pedidas', 'tradicionais', 'gourmet', 'doces'];
  for (const cat of categories) {
    const container = document.getElementById(`tab-${cat}`);
    if (!container) continue;

    const items = pizzas
      .filter((p) => p.active && p.category === cat)
      .sort((a, b) => a.order - b.order);

    // Adjust gourmet grid neatly for 2 vs 3+ items
    if (cat === 'gourmet') {
      const isHidden = container.classList.contains('hidden');
      container.className =
        items.length <= 2
          ? `menu-tab-content ${isHidden ? 'hidden ' : ''}grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6`
          : `menu-tab-content ${isHidden ? 'hidden ' : ''}grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`;
    }

    if (items.length === 0) {
      container.innerHTML =
        '<div class="col-span-full text-center py-10 text-sm text-brand-cream/60">Nenhum sabor cadastrado nesta categoria no momento.</div>';
    } else {
      container.innerHTML = items.map((item) => renderPizzaCard(item, mediaMap, cat === 'mais-pedidas')).join('');
    }
  }
}

function applySettingsToDom(settings: SiteSettings, mediaMap: Record<string, MediaAsset>) {
  const announcementEl = document.getElementById('announcement-text');
  if (announcementEl && settings.announcementText) {
    announcementEl.textContent = settings.announcementText;
  }

  const heroImg = document.getElementById('hero-bg-img') as HTMLImageElement | null;
  const resolvedHero = resolveImageSrc(settings.heroImageUrl, mediaMap);
  if (heroImg && resolvedHero) {
    heroImg.src = resolvedHero;
  }

  const deliveryImg = document.getElementById('delivery-img') as HTMLImageElement | null;
  const resolvedDelivery = resolveImageSrc(settings.deliveryImageUrl, mediaMap);
  if (deliveryImg && resolvedDelivery) {
    deliveryImg.src = resolvedDelivery;
  }

  const phoneLink = document.getElementById('footer-phone-link') as HTMLAnchorElement | null;
  if (phoneLink) {
    phoneLink.href = `https://wa.me/${settings.whatsappNumber}`;
    phoneLink.textContent = `WhatsApp / Telefone: ${settings.whatsappDisplay}`;
  }

  const emailLink = document.getElementById('footer-email-link') as HTMLAnchorElement | null;
  if (emailLink && settings.contactEmail) {
    emailLink.href = `mailto:${settings.contactEmail}`;
    emailLink.textContent = settings.contactEmail;
  }

  // Update all WhatsApp anchor links across page preserving query strings
  (window as unknown as Record<string, string>).__QUADRATTA_WHATSAPP__ = settings.whatsappNumber;
  document.querySelectorAll<HTMLAnchorElement>('a[href^="https://wa.me/"]').forEach((anchor) => {
    try {
      const url = new URL(anchor.href);
      anchor.href = `https://wa.me/${settings.whatsappNumber}${url.search}`;
    } catch {
      anchor.href = `https://wa.me/${settings.whatsappNumber}`;
    }
  });
  document.dispatchEvent(new CustomEvent('quadratta:whatsapp-updated'));

  // Update Footer Social Links
  const socialContainer = document.getElementById('footer-social-links');
  if (socialContainer) {
    const activeLinks: SocialLink[] = (settings.socialLinks || []).filter(
      (link) => link.active && link.url.trim().length > 0
    );
    if (activeLinks.length === 0) {
      socialContainer.innerHTML =
        '<span class="text-xs text-brand-cream/50">Em breve novas redes sociais.</span>';
    } else {
      socialContainer.innerHTML = activeLinks
        .map((link) => {
          const safeUrl = /^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`;
          return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(
            link.label
          )}" title="${escapeHtml(
            link.label
          )}" class="w-9 h-9 rounded-lg bg-brand-surface border border-brand-border flex items-center justify-center text-brand-cream hover:text-brand-gold hover:border-brand-gold transition-colors">${getSocialSvg(
            link.platform
          )}</a>`;
        })
        .join('');
    }
  }
}

export interface CmsSubscriptionCallbacks {
  onPizzasChange?: (pizzas: PizzaItem[]) => void;
  onMediaChange?: (media: MediaAsset[]) => void;
  onSettingsChange?: (settings: SiteSettings) => void;
}

export function startCmsSync(callbacks?: CmsSubscriptionCallbacks): () => void {
  let latestPizzas: PizzaItem[] = [];
  let latestMediaMap: Record<string, MediaAsset> = {};
  let latestSettings: SiteSettings = DEFAULT_SITE_SETTINGS;

  const unsubMedia = onSnapshot(
    collection(db, 'media'),
    (snap) => {
      const list: MediaAsset[] = [];
      const map: Record<string, MediaAsset> = {};
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Omit<MediaAsset, 'id'>;
        const asset: MediaAsset = { id: docSnap.id, ...data };
        list.push(asset);
        map[docSnap.id] = asset;
      });
      latestMediaMap = map;
      callbacks?.onMediaChange?.(list);
      applyPizzasToDom(latestPizzas, latestMediaMap);
      applySettingsToDom(latestSettings, latestMediaMap);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'media');
    }
  );

  const unsubPizzas = onSnapshot(
    collection(db, 'pizzas'),
    (snap) => {
      const list: PizzaItem[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as Omit<PizzaItem, 'id'>;
        list.push({ id: docSnap.id, ...data });
      });
      latestPizzas = list;
      callbacks?.onPizzasChange?.(list);
      applyPizzasToDom(latestPizzas, latestMediaMap);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'pizzas');
    }
  );

  const unsubSettings = onSnapshot(
    doc(db, 'settings', 'site'),
    (docSnap) => {
      if (docSnap.exists()) {
        latestSettings = docSnap.data() as SiteSettings;
      } else {
        latestSettings = DEFAULT_SITE_SETTINGS;
      }
      callbacks?.onSettingsChange?.(latestSettings);
      applySettingsToDom(latestSettings, latestMediaMap);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/site');
    }
  );

  return () => {
    unsubMedia();
    unsubPizzas();
    unsubSettings();
  };
}
