import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { DEFAULT_PIZZAS, DEFAULT_SITE_SETTINGS } from '../data/defaultSiteData';
import type { MediaAsset, PizzaCategory, PizzaItem, SiteSettings, SocialLink } from '../types/cms';

export function sanitizeId(raw: string): string {
  const cleaned = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || `item-${Date.now()}`;
}

function getRequiredUid(): string {
  if (!auth.currentUser?.uid) {
    throw new Error('Faça login como administrador para salvar alterações.');
  }
  return auth.currentUser.uid.slice(0, 128);
}

export function resolveImageSrc(imageUrl: string, mediaMap: Record<string, MediaAsset>): string {
  if (!imageUrl) return '';
  if (imageUrl.startsWith('media:')) {
    const mediaId = imageUrl.slice(6);
    return mediaMap[mediaId]?.dataUrl || '';
  }
  return imageUrl;
}

export async function createPizza(
  input: Omit<PizzaItem, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>,
  customId?: string
): Promise<string> {
  const uid = getRequiredUid();
  const id = sanitizeId(customId || `${input.category}-${input.title}-${Date.now().toString(36)}`);
  const path = `pizzas/${id}`;

  const payload = {
    title: input.title.trim().slice(0, 100),
    category: input.category as PizzaCategory,
    description: input.description.trim().slice(0, 500),
    badge: (input.badge || '').trim().slice(0, 60),
    badgeTone: input.badgeTone === 'gold' ? 'gold' : 'red',
    tagLeft: (input.tagLeft || '').trim().slice(0, 60),
    tagRight: (input.tagRight || '').trim().slice(0, 60),
    imageUrl: input.imageUrl.trim().slice(0, 2048),
    order: Math.min(10000, Math.max(0, Number(input.order) || 0)),
    active: Boolean(input.active),
    updatedBy: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'pizzas', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePizza(
  id: string,
  input: Omit<PizzaItem, 'id' | 'createdAt' | 'updatedAt' | 'updatedBy'>
): Promise<void> {
  const uid = getRequiredUid();
  const path = `pizzas/${id}`;

  const payload = {
    title: input.title.trim().slice(0, 100),
    category: input.category as PizzaCategory,
    description: input.description.trim().slice(0, 500),
    badge: (input.badge || '').trim().slice(0, 60),
    badgeTone: input.badgeTone === 'gold' ? 'gold' : 'red',
    tagLeft: (input.tagLeft || '').trim().slice(0, 60),
    tagRight: (input.tagRight || '').trim().slice(0, 60),
    imageUrl: input.imageUrl.trim().slice(0, 2048),
    order: Math.min(10000, Math.max(0, Number(input.order) || 0)),
    active: Boolean(input.active),
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'pizzas', id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePizza(id: string): Promise<void> {
  getRequiredUid();
  const path = `pizzas/${id}`;
  try {
    await deleteDoc(doc(db, 'pizzas', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function seedDefaultPizzas(): Promise<void> {
  const uid = getRequiredUid();
  const batch = writeBatch(db);
  for (const pizza of DEFAULT_PIZZAS) {
    const ref = doc(db, 'pizzas', pizza.id);
    batch.set(ref, {
      title: pizza.title.slice(0, 100),
      category: pizza.category,
      description: pizza.description.slice(0, 500),
      badge: (pizza.badge || '').slice(0, 60),
      badgeTone: pizza.badgeTone,
      tagLeft: (pizza.tagLeft || '').slice(0, 60),
      tagRight: (pizza.tagRight || '').slice(0, 60),
      imageUrl: pizza.imageUrl.slice(0, 2048),
      order: pizza.order,
      active: pizza.active,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'pizzas');
  }
}

export async function uploadMediaAsset(asset: {
  name: string;
  mimeType: 'image/jpeg' | 'image/webp' | 'image/png';
  dataUrl: string;
  sizeBytes: number;
}): Promise<string> {
  const uid = getRequiredUid();
  const id = sanitizeId(`img-${Date.now().toString(36)}-${asset.name.replace(/\.[^.]+$/, '')}`);
  const path = `media/${id}`;

  const payload = {
    name: asset.name.trim().slice(0, 120),
    mimeType: asset.mimeType,
    dataUrl: asset.dataUrl,
    sizeBytes: asset.sizeBytes,
    uploadedBy: uid,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'media', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  getRequiredUid();
  const path = `media/${id}`;
  try {
    await deleteDoc(doc(db, 'media', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSiteSettings(settings: SiteSettings): Promise<void> {
  const uid = getRequiredUid();
  const path = 'settings/site';
  const ref = doc(db, 'settings', 'site');

  const cleanDigits = settings.whatsappNumber.replace(/\D/g, '').slice(0, 20);
  if (cleanDigits.length < 8) {
    throw new Error('Informe um número de WhatsApp válido (apenas dígitos, com DDI e DDD, ex: 5511984937529).');
  }

  const cleanSocialLinks: SocialLink[] = (settings.socialLinks || []).slice(0, 12).map((link, idx) => ({
    id: sanitizeId(link.id || `social-${idx}-${link.platform}`).slice(0, 64),
    platform: link.platform,
    label: (link.label || link.platform).trim().slice(0, 60),
    url: (link.url || '').trim().slice(0, 512),
    active: Boolean(link.active),
  }));

  const basePayload = {
    heroImageUrl: (settings.heroImageUrl || DEFAULT_SITE_SETTINGS.heroImageUrl).trim().slice(0, 2048),
    deliveryImageUrl: (settings.deliveryImageUrl || DEFAULT_SITE_SETTINGS.deliveryImageUrl).trim().slice(0, 2048),
    announcementText: (settings.announcementText || DEFAULT_SITE_SETTINGS.announcementText).trim().slice(0, 220),
    whatsappNumber: cleanDigits,
    whatsappDisplay: (settings.whatsappDisplay || DEFAULT_SITE_SETTINGS.whatsappDisplay).trim().slice(0, 40),
    contactEmail: (settings.contactEmail || DEFAULT_SITE_SETTINGS.contactEmail).trim().slice(0, 120),
    socialLinks: cleanSocialLinks,
    updatedBy: uid,
    updatedAt: serverTimestamp(),
  };

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      await updateDoc(ref, basePayload);
    } else {
      await setDoc(ref, {
        ...basePayload,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
