export type PizzaCategory = 'mais-pedidas' | 'tradicionais' | 'gourmet' | 'doces';

export type BadgeTone = 'red' | 'gold';

export interface PizzaItem {
  id: string;
  title: string;
  category: PizzaCategory;
  description: string;
  badge: string;
  badgeTone: BadgeTone;
  tagLeft: string;
  tagRight: string;
  imageUrl: string;
  order: number;
  active: boolean;
  updatedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type SocialPlatform = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'whatsapp' | 'website';

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  label: string;
  url: string;
  active: boolean;
}

export interface SiteSettings {
  heroImageUrl: string;
  deliveryImageUrl: string;
  announcementText: string;
  whatsappNumber: string;
  whatsappDisplay: string;
  contactEmail: string;
  socialLinks: SocialLink[];
  updatedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MediaAsset {
  id: string;
  name: string;
  mimeType: 'image/jpeg' | 'image/webp' | 'image/png';
  dataUrl: string;
  sizeBytes: number;
  uploadedBy: string;
  createdAt?: unknown;
}
