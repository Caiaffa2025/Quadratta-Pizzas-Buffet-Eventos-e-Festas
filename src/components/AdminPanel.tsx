import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import {
  Check,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Lock,
  LogOut,
  Pencil,
  Pizza,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { auth, db, googleProvider } from '../firebase';
import { ADMIN_EMAIL, CATEGORY_LABELS, DEFAULT_SITE_SETTINGS } from '../data/defaultSiteData';
import {
  createPizza,
  deleteMediaAsset,
  deletePizza,
  resolveImageSrc,
  saveSiteSettings,
  seedDefaultPizzas,
  updatePizza,
  uploadMediaAsset,
} from '../services/cmsFirestore';
import type {
  BadgeTone,
  MediaAsset,
  PizzaCategory,
  PizzaItem,
  SiteSettings,
  SocialLink,
  SocialPlatform,
} from '../types/cms';
import { compressImageFile } from '../utils/imageUpload';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pizzas: PizzaItem[];
  media: MediaAsset[];
  siteSettings: SiteSettings;
}

type AdminTab = 'cardapio' | 'galeria' | 'redes';

interface PizzaFormState {
  id: string | null;
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
}

const EMPTY_PIZZA_FORM: PizzaFormState = {
  id: null,
  title: '',
  category: 'mais-pedidas',
  description: '',
  badge: '',
  badgeTone: 'red',
  tagLeft: 'Massa de Fermentação 48h',
  tagRight: 'Artesanal',
  imageUrl: '',
  order: 10,
  active: true,
};

const PLATFORM_OPTIONS: { value: SocialPlatform; label: string }[] = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'whatsapp', label: 'WhatsApp / Grupo' },
  { value: 'website', label: 'Site / Link Externo' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  pizzas,
  media,
  siteSettings,
}) => {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>('cardapio');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Menu tab state
  const [categoryFilter, setCategoryFilter] = useState<'all' | PizzaCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPizza, setEditingPizza] = useState<PizzaFormState | null>(null);
  const [showGalleryForPizza, setShowGalleryForPizza] = useState(false);
  const [confirmDeletePizzaId, setConfirmDeletePizzaId] = useState<string | null>(null);

  // Gallery tab state
  const [confirmDeleteMediaId, setConfirmDeleteMediaId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const galleryFileInputRef = useRef<HTMLInputElement | null>(null);
  const pizzaFileInputRef = useRef<HTMLInputElement | null>(null);
  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const deliveryFileInputRef = useRef<HTMLInputElement | null>(null);

  // Settings & Social links state
  const [draftSettings, setDraftSettings] = useState<SiteSettings>(siteSettings);
  const [newSocialPlatform, setNewSocialPlatform] = useState<SocialPlatform>('instagram');
  const [newSocialLabel, setNewSocialLabel] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  useEffect(() => {
    setDraftSettings({
      ...DEFAULT_SITE_SETTINGS,
      ...siteSettings,
      socialLinks: Array.isArray(siteSettings.socialLinks) ? siteSettings.socialLinks : [],
    });
  }, [siteSettings]);

  const mediaMap = useMemo(() => {
    const map: Record<string, MediaAsset> = {};
    media.forEach((m) => {
      map[m.id] = m;
    });
    return map;
  }, [media]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthError(null);
      if (!currentUser) {
        setIsAdmin(false);
        setCheckingAuth(false);
        return;
      }

      if (currentUser.emailVerified && currentUser.email === ADMIN_EMAIL) {
        setIsAdmin(true);
        setCheckingAuth(false);
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
        setIsAdmin(Boolean(currentUser.emailVerified && adminSnap.exists()));
      } catch {
        setIsAdmin(false);
      } finally {
        setCheckingAuth(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!statusMessage) return;
    const timer = setTimeout(() => setStatusMessage(null), 5000);
    return () => clearTimeout(timer);
  }, [statusMessage]);

  const notify = (type: 'success' | 'error', text: string) => {
    setStatusMessage({ type, text });
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao autenticar com o Google.';
      setAuthError(msg);
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIsAdmin(false);
  };

  const filteredPizzas = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return pizzas
      .filter((p) => (categoryFilter === 'all' ? true : p.category === categoryFilter))
      .filter((p) =>
        q
          ? p.title.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            (p.badge || '').toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.order - b.order;
      });
  }, [pizzas, categoryFilter, searchQuery]);

  const handleSeedDefaults = async () => {
    setBusy(true);
    try {
      await seedDefaultPizzas();
      notify('success', 'Cardápio inicial importado com sucesso! Agora você pode editar, adicionar ou excluir pizzas.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao importar cardápio padrão.');
    } finally {
      setBusy(false);
    }
  };

  const handleSavePizza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPizza) return;
    if (editingPizza.title.trim().length < 2) {
      notify('error', 'O nome da pizza precisa ter pelo menos 2 caracteres.');
      return;
    }
    if (editingPizza.description.trim().length < 5) {
      notify('error', 'A descrição precisa ter pelo menos 5 caracteres.');
      return;
    }
    if (!editingPizza.imageUrl.trim()) {
      notify('error', 'Escolha ou faça upload de uma imagem para a pizza.');
      return;
    }

    setBusy(true);
    try {
      const data = {
        title: editingPizza.title.trim(),
        category: editingPizza.category,
        description: editingPizza.description.trim(),
        badge: editingPizza.badge.trim(),
        badgeTone: editingPizza.badgeTone,
        tagLeft: editingPizza.tagLeft.trim(),
        tagRight: editingPizza.tagRight.trim(),
        imageUrl: editingPizza.imageUrl.trim(),
        order: Number(editingPizza.order) || 1,
        active: editingPizza.active,
      };
      if (editingPizza.id) {
        await updatePizza(editingPizza.id, data);
        notify('success', `Pizza "${data.title}" atualizada com sucesso!`);
      } else {
        await createPizza(data);
        notify('success', `Pizza "${data.title}" incluída no cardápio!`);
      }
      setEditingPizza(null);
      setShowGalleryForPizza(false);
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao salvar pizza.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeletePizza = async (id: string) => {
    setBusy(true);
    try {
      await deletePizza(id);
      setConfirmDeletePizzaId(null);
      notify('success', 'Pizza excluída do cardápio.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao excluir pizza.');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadFiles = async (
    files: FileList | null,
    onUploaded?: (mediaRef: string) => void
  ) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      let lastRef = '';
      for (const file of Array.from(files)) {
        const compressed = await compressImageFile(file);
        const mediaId = await uploadMediaAsset(compressed);
        lastRef = `media:${mediaId}`;
      }
      if (onUploaded && lastRef) {
        onUploaded(lastRef);
      }
      notify(
        'success',
        files.length > 1
          ? `${files.length} imagens enviadas com sucesso para a plataforma!`
          : 'Imagem enviada com sucesso para a plataforma!'
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao fazer upload da imagem.');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteMedia = async (id: string) => {
    setBusy(true);
    try {
      await deleteMediaAsset(id);
      setConfirmDeleteMediaId(null);
      notify('success', 'Imagem removida da galeria.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao excluir imagem.');
    } finally {
      setBusy(false);
    }
  };

  const handleApplyMediaToBanner = async (target: 'heroImageUrl' | 'deliveryImageUrl', mediaId: string) => {
    setBusy(true);
    try {
      const updated = {
        ...draftSettings,
        [target]: `media:${mediaId}`,
      };
      await saveSiteSettings(updated);
      setDraftSettings(updated);
      notify(
        'success',
        target === 'heroImageUrl'
          ? 'Imagem aplicada ao Banner Principal com sucesso!'
          : 'Imagem aplicada à Seção Delivery com sucesso!'
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao atualizar imagem do banner.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddSocialLink = () => {
    if (!newSocialUrl.trim()) {
      notify('error', 'Informe a URL da rede social (ex: https://instagram.com/suapizzaria).');
      return;
    }
    if (draftSettings.socialLinks.length >= 12) {
      notify('error', 'Limite máximo de 12 links de redes sociais atingido.');
      return;
    }
    const platformObj = PLATFORM_OPTIONS.find((p) => p.value === newSocialPlatform);
    const label = newSocialLabel.trim() || `${platformObj?.label || 'Rede Social'} da Quadratta Pizzas`;
    const normalizedUrl = /^https?:\/\//i.test(newSocialUrl.trim())
      ? newSocialUrl.trim()
      : `https://${newSocialUrl.trim()}`;

    const newLink: SocialLink = {
      id: `social-${newSocialPlatform}-${Date.now().toString(36)}`,
      platform: newSocialPlatform,
      label: label.slice(0, 60),
      url: normalizedUrl.slice(0, 512),
      active: true,
    };

    setDraftSettings((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, newLink],
    }));
    setNewSocialLabel('');
    setNewSocialUrl('');
  };

  const handleUpdateSocialField = (
    id: string,
    field: keyof SocialLink,
    value: string | boolean
  ) => {
    setDraftSettings((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link) =>
        link.id === id ? { ...link, [field]: value } : link
      ),
    }));
  };

  const handleRemoveSocialLink = (id: string) => {
    setDraftSettings((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((link) => link.id !== id),
    }));
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveSiteSettings(draftSettings);
      notify('success', 'Configurações, banners, contatos e redes sociais salvos e publicados no site!');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao salvar configurações.');
    } finally {
      setBusy(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 overflow-y-auto">
      <div className="w-full max-w-6xl bg-brand-dark border border-brand-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Top Admin Header */}
        <div className="bg-brand-darker border-b border-brand-border px-4 sm:px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/50 flex items-center justify-center text-brand-gold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-white leading-tight">
                Painel Administrativo Quadratta
              </h2>
              <p className="text-xs text-brand-cream/60">
                Gerencie cardápio, upload de imagens, banners e redes sociais em tempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {user && (
              <div className="hidden md:flex items-center gap-2 bg-brand-card border border-brand-border px-3 py-1.5 rounded-lg text-xs text-brand-cream/80">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{user.email}</span>
              </div>
            )}
            {user && (
              <button
                type="button"
                onClick={handleSignOut}
                className="px-3 py-2 rounded-lg bg-brand-card hover:bg-brand-surface border border-brand-border text-xs font-semibold text-brand-cream/80 hover:text-white flex items-center gap-1.5 cursor-pointer"
                title="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-brand-card hover:bg-brand-surface border border-brand-border text-brand-cream/80 hover:text-white cursor-pointer"
              aria-label="Fechar painel administrativo"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`px-6 py-3 text-xs sm:text-sm font-medium flex items-center justify-between gap-3 border-b ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-700/50 text-emerald-200'
                : 'bg-red-950/80 border-red-700/50 text-red-200'
            }`}
          >
            <span>{statusMessage.text}</span>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Auth Gate or Dashboard */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {checkingAuth ? (
            <div className="py-20 text-center text-sm text-brand-cream/70">
              Verificando sessão administrativa...
            </div>
          ) : !user ? (
            <div className="max-w-md mx-auto my-10 bg-brand-card border border-brand-border rounded-2xl p-8 text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-surface border border-brand-gold/40 flex items-center justify-center text-brand-gold">
                <Lock className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-serif text-2xl font-bold text-white">Acesso Restrito</h3>
                <p className="text-sm text-brand-cream/70 mt-2 leading-relaxed">
                  Entre com sua conta Google autorizada (<strong className="text-brand-gold">{ADMIN_EMAIL}</strong>) para alterar o cardápio, fazer upload de fotos e gerenciar as redes sociais.
                </p>
              </div>
              {authError && (
                <div className="p-3 rounded-xl bg-red-950/70 border border-red-700/50 text-xs text-red-200">
                  {authError}
                </div>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-6 rounded-xl bg-brand-red hover:bg-brand-redHover text-white font-bold text-sm shadow-lg transition-all cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Conectando...' : 'Entrar com Google'}
              </button>
            </div>
          ) : !isAdmin ? (
            <div className="max-w-md mx-auto my-10 bg-brand-card border border-red-700/40 rounded-2xl p-8 text-center space-y-4">
              <h3 className="font-serif text-xl font-bold text-white">Conta sem permissão</h3>
              <p className="text-sm text-brand-cream/75">
                A conta <strong>{user.email}</strong> não possui permissão de administrador. Faça login com <strong>{ADMIN_EMAIL}</strong>.
              </p>
              <button
                type="button"
                onClick={handleSignOut}
                className="px-6 py-2.5 rounded-xl bg-brand-surface hover:bg-brand-border text-white text-sm font-semibold cursor-pointer"
              >
                Trocar de Conta
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Navigation Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-border pb-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('cardapio')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      activeTab === 'cardapio'
                        ? 'bg-brand-red text-white border border-brand-red'
                        : 'bg-brand-card text-brand-cream/80 hover:text-white border border-brand-border'
                    }`}
                  >
                    <Pizza className="w-4 h-4" />
                    <span>Cardápio ({pizzas.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('galeria')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      activeTab === 'galeria'
                        ? 'bg-brand-red text-white border border-brand-red'
                        : 'bg-brand-card text-brand-cream/80 hover:text-white border border-brand-border'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Upload & Galeria ({media.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('redes')}
                    className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                      activeTab === 'redes'
                        ? 'bg-brand-red text-white border border-brand-red'
                        : 'bg-brand-card text-brand-cream/80 hover:text-white border border-brand-border'
                    }`}
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Redes Sociais, Banners & Contato</span>
                  </button>
                </div>

                {activeTab === 'cardapio' && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPizza({ ...EMPTY_PIZZA_FORM, order: pizzas.length + 1 });
                      setShowGalleryForPizza(false);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-goldHover text-brand-dark text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Incluir Nova Pizza</span>
                  </button>
                )}
              </div>

              {/* TAB 1: CARDÁPIO */}
              {activeTab === 'cardapio' && (
                <div className="space-y-6">
                  {pizzas.length === 0 && (
                    <div className="bg-brand-card border border-brand-gold/40 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-brand-gold" />
                          <span>Sincronizar Cardápio Inicial</span>
                        </h3>
                        <p className="text-xs sm:text-sm text-brand-cream/70 mt-1">
                          O banco de dados ainda está vazio. Importe todos os 17 sabores atuais do site para editar, reordenar ou excluir diretamente aqui.
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={handleSeedDefaults}
                        className="px-5 py-3 rounded-xl bg-brand-gold hover:bg-brand-goldHover text-brand-dark font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        {busy ? 'Importando...' : 'Importar Cardápio Atual'}
                      </button>
                    </div>
                  )}

                  {/* Pizza Create/Edit Form */}
                  {editingPizza && (
                    <form
                      onSubmit={handleSavePizza}
                      className="bg-brand-card border border-brand-gold/50 rounded-2xl p-5 sm:p-6 space-y-5"
                    >
                      <div className="flex items-center justify-between border-b border-brand-border pb-3">
                        <h3 className="font-serif text-lg font-bold text-white">
                          {editingPizza.id ? `Alterar Pizza: ${editingPizza.title}` : 'Incluir Nova Pizza'}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPizza(null);
                            setShowGalleryForPizza(false);
                          }}
                          className="text-brand-cream/60 hover:text-white cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Nome da Pizza *
                          </label>
                          <input
                            type="text"
                            required
                            maxLength={100}
                            value={editingPizza.title}
                            onChange={(e) =>
                              setEditingPizza({ ...editingPizza, title: e.target.value })
                            }
                            placeholder="Ex: Calabresa Especial com Cebola Roxa"
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Categoria *
                          </label>
                          <select
                            value={editingPizza.category}
                            onChange={(e) =>
                              setEditingPizza({
                                ...editingPizza,
                                category: e.target.value as PizzaCategory,
                              })
                            }
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          >
                            <option value="mais-pedidas">As Mais Pedidas nas Festas</option>
                            <option value="tradicionais">Tradicionais Clássicas</option>
                            <option value="gourmet">Especiais & Gourmet</option>
                            <option value="doces">Doces Gourmet</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Descrição dos Ingredientes *
                          </label>
                          <textarea
                            required
                            rows={3}
                            maxLength={500}
                            value={editingPizza.description}
                            onChange={(e) =>
                              setEditingPizza({ ...editingPizza, description: e.target.value })
                            }
                            placeholder="Descreva os ingredientes e diferenciais..."
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Selo de Destaque (opcional)
                          </label>
                          <input
                            type="text"
                            maxLength={60}
                            value={editingPizza.badge}
                            onChange={(e) =>
                              setEditingPizza({ ...editingPizza, badge: e.target.value })
                            }
                            placeholder="Ex: ★ 1º Lugar em Festas"
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Cor do Selo
                          </label>
                          <select
                            value={editingPizza.badgeTone}
                            onChange={(e) =>
                              setEditingPizza({
                                ...editingPizza,
                                badgeTone: e.target.value as BadgeTone,
                              })
                            }
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          >
                            <option value="red">Vermelho Quadratta</option>
                            <option value="gold">Dourado Premium</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Etiqueta Inferior Esquerda
                          </label>
                          <input
                            type="text"
                            maxLength={60}
                            value={editingPizza.tagLeft}
                            onChange={(e) =>
                              setEditingPizza({ ...editingPizza, tagLeft: e.target.value })
                            }
                            placeholder="Ex: Massa de Fermentação 48h"
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Etiqueta Inferior Direita
                          </label>
                          <input
                            type="text"
                            maxLength={60}
                            value={editingPizza.tagRight}
                            onChange={(e) =>
                              setEditingPizza({ ...editingPizza, tagRight: e.target.value })
                            }
                            placeholder="Ex: A Mais Pedida"
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                            Ordem de Exibição
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={10000}
                            value={editingPizza.order}
                            onChange={(e) =>
                              setEditingPizza({
                                ...editingPizza,
                                order: parseInt(e.target.value, 10) || 0,
                              })
                            }
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-6">
                          <input
                            id="pizza-active-toggle"
                            type="checkbox"
                            checked={editingPizza.active}
                            onChange={(e) =>
                              setEditingPizza({ ...editingPizza, active: e.target.checked })
                            }
                            className="w-4 h-4 accent-brand-gold"
                          />
                          <label
                            htmlFor="pizza-active-toggle"
                            className="text-sm font-medium text-white cursor-pointer"
                          >
                            Exibir esta pizza no cardápio público
                          </label>
                        </div>

                        {/* Image Selection & Upload */}
                        <div className="md:col-span-2 bg-brand-surface/60 border border-brand-border rounded-xl p-4 space-y-3">
                          <label className="block text-xs font-semibold text-brand-cream/80">
                            Imagem da Pizza *
                          </label>
                          <div className="flex flex-col sm:flex-row gap-4 items-start">
                            <div className="w-32 h-24 rounded-xl bg-brand-dark border border-brand-border overflow-hidden shrink-0 flex items-center justify-center">
                              {editingPizza.imageUrl ? (
                                <img
                                  src={resolveImageSrc(editingPizza.imageUrl, mediaMap)}
                                  alt="Prévia da pizza"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <ImageIcon className="w-7 h-7 text-brand-cream/30" />
                              )}
                            </div>

                            <div className="flex-1 w-full space-y-2.5">
                              <input
                                type="text"
                                required
                                maxLength={2048}
                                value={editingPizza.imageUrl}
                                onChange={(e) =>
                                  setEditingPizza({ ...editingPizza, imageUrl: e.target.value })
                                }
                                placeholder="Cole uma URL (https://...) ou faça upload ao lado"
                                className="w-full bg-brand-dark border border-brand-border rounded-xl px-3.5 py-2 text-xs text-white focus:border-brand-gold focus:outline-none"
                              />
                              <div className="flex flex-wrap gap-2">
                                <input
                                  ref={pizzaFileInputRef}
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={(e) => {
                                    handleUploadFiles(e.target.files, (mediaRef) => {
                                      setEditingPizza((prev) =>
                                        prev ? { ...prev, imageUrl: mediaRef } : prev
                                      );
                                    });
                                    e.target.value = '';
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => pizzaFileInputRef.current?.click()}
                                  className="px-3.5 py-2 rounded-lg bg-brand-red hover:bg-brand-redHover text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Fazer Upload de Nova Foto</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowGalleryForPizza((v) => !v)}
                                  className="px-3.5 py-2 rounded-lg bg-brand-card hover:bg-brand-border border border-brand-border text-brand-cream text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                  <Layers className="w-3.5 h-3.5 text-brand-gold" />
                                  <span>Escolher da Galeria ({media.length})</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {showGalleryForPizza && (
                            <div className="pt-3 border-t border-brand-border">
                              {media.length === 0 ? (
                                <p className="text-xs text-brand-cream/60">
                                  Nenhuma imagem na galeria ainda. Clique em "Fazer Upload de Nova Foto".
                                </p>
                              ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                                  {media.map((asset) => (
                                    <button
                                      key={asset.id}
                                      type="button"
                                      onClick={() => {
                                        setEditingPizza({
                                          ...editingPizza,
                                          imageUrl: `media:${asset.id}`,
                                        });
                                        setShowGalleryForPizza(false);
                                      }}
                                      className={`relative h-16 rounded-lg overflow-hidden border-2 cursor-pointer ${
                                        editingPizza.imageUrl === `media:${asset.id}`
                                          ? 'border-brand-gold'
                                          : 'border-brand-border hover:border-brand-gold/60'
                                      }`}
                                    >
                                      <img
                                        src={asset.dataUrl}
                                        alt={asset.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPizza(null);
                            setShowGalleryForPizza(false);
                          }}
                          className="px-4 py-2.5 rounded-xl bg-brand-surface hover:bg-brand-border text-xs sm:text-sm font-semibold text-white cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={busy}
                          className="px-6 py-2.5 rounded-xl bg-brand-gold hover:bg-brand-goldHover text-brand-dark text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer disabled:opacity-60"
                        >
                          <Check className="w-4 h-4" />
                          <span>{busy ? 'Salvando...' : 'Salvar Pizza'}</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCategoryFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          categoryFilter === 'all'
                            ? 'bg-brand-gold text-brand-dark'
                            : 'bg-brand-card text-brand-cream/80 border border-brand-border'
                        }`}
                      >
                        Todas
                      </button>
                      {(Object.keys(CATEGORY_LABELS) as PizzaCategory[]).map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                            categoryFilter === cat
                              ? 'bg-brand-gold text-brand-dark'
                              : 'bg-brand-card text-brand-cream/80 border border-brand-border'
                          }`}
                        >
                          {CATEGORY_LABELS[cat]}
                        </button>
                      ))}
                    </div>

                    <div className="relative sm:w-64">
                      <Search className="w-4 h-4 text-brand-cream/50 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar sabor..."
                        className="w-full bg-brand-card border border-brand-border rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-brand-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Pizzas List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredPizzas.map((pizza) => (
                      <div
                        key={pizza.id}
                        className="bg-brand-card border border-brand-border rounded-2xl p-4 flex gap-4 items-start"
                      >
                        <img
                          src={resolveImageSrc(pizza.imageUrl, mediaMap)}
                          alt={pizza.title}
                          className="w-24 h-24 rounded-xl object-cover bg-brand-surface shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-brand-gold">
                                {CATEGORY_LABELS[pizza.category]} · #{pizza.order}
                              </span>
                              <h4 className="font-serif text-base font-bold text-white truncate">
                                {pizza.title}
                              </h4>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                pizza.active
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/40'
                                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                              }`}
                            >
                              {pizza.active ? 'Ativa' : 'Oculta'}
                            </span>
                          </div>
                          <p className="text-xs text-brand-cream/70 line-clamp-2 mt-1">
                            {pizza.description}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPizza({
                                  id: pizza.id,
                                  title: pizza.title,
                                  category: pizza.category,
                                  description: pizza.description,
                                  badge: pizza.badge || '',
                                  badgeTone: pizza.badgeTone || 'red',
                                  tagLeft: pizza.tagLeft || '',
                                  tagRight: pizza.tagRight || '',
                                  imageUrl: pizza.imageUrl,
                                  order: pizza.order,
                                  active: pizza.active,
                                });
                                setShowGalleryForPizza(false);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-brand-surface hover:bg-brand-border text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5 text-brand-gold" />
                              <span>Alterar</span>
                            </button>

                            {confirmDeletePizzaId === pizza.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDeletePizza(pizza.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-bold text-white cursor-pointer"
                                >
                                  Confirmar Exclusão
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeletePizzaId(null)}
                                  className="px-2.5 py-1.5 rounded-lg bg-brand-surface text-xs text-brand-cream/80 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeletePizzaId(pizza.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/60 border border-red-800/40 text-xs font-semibold text-red-200 flex items-center gap-1.5 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: UPLOAD & GALERIA */}
              {activeTab === 'galeria' && (
                <div className="space-y-6">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      handleUploadFiles(e.dataTransfer.files);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                      isDragging
                        ? 'border-brand-gold bg-brand-gold/10'
                        : 'border-brand-border bg-brand-card hover:border-brand-gold/50'
                    }`}
                  >
                    <input
                      ref={galleryFileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        handleUploadFiles(e.target.files);
                        e.target.value = '';
                      }}
                    />
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-brand-surface border border-brand-border flex items-center justify-center text-brand-gold mb-4">
                      <Upload className="w-6 h-6" />
                    </div>
                    <h3 className="font-serif text-lg font-bold text-white">
                      Fazer Upload de Novas Imagens
                    </h3>
                    <p className="text-xs sm:text-sm text-brand-cream/70 mt-1 max-w-lg mx-auto">
                      Arraste e solte fotos aqui ou selecione arquivos JPG, PNG ou WebP do seu dispositivo. As imagens são otimizadas automaticamente para carregamento rápido.
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => galleryFileInputRef.current?.click()}
                      className="mt-5 px-6 py-3 rounded-xl bg-brand-red hover:bg-brand-redHover text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{busy ? 'Enviando...' : 'Selecionar Imagens'}</span>
                    </button>
                  </div>

                  {media.length === 0 ? (
                    <div className="text-center py-12 text-sm text-brand-cream/60 bg-brand-card rounded-2xl border border-brand-border">
                      Nenhuma imagem enviada ainda. Use o botão acima para subir suas primeiras fotos.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {media.map((asset) => (
                        <div
                          key={asset.id}
                          className="bg-brand-card border border-brand-border rounded-2xl overflow-hidden flex flex-col justify-between"
                        >
                          <div className="h-44 bg-brand-surface relative">
                            <img
                              src={asset.dataUrl}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] px-2 py-0.5 rounded-md">
                              {Math.round(asset.sizeBytes / 1024)} KB
                            </span>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="text-xs font-semibold text-white truncate">
                              {asset.name}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApplyMediaToBanner('heroImageUrl', asset.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-surface hover:bg-brand-border text-[11px] font-semibold text-brand-gold cursor-pointer"
                              >
                                Usar no Banner
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleApplyMediaToBanner('deliveryImageUrl', asset.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-brand-surface hover:bg-brand-border text-[11px] font-semibold text-white cursor-pointer"
                              >
                                Usar no Delivery
                              </button>
                              {confirmDeleteMediaId === asset.id ? (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => handleDeleteMedia(asset.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600 text-[11px] font-bold text-white cursor-pointer"
                                >
                                  Confirmar
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteMediaId(asset.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-[11px] font-semibold text-red-200 cursor-pointer"
                                >
                                  Excluir
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: REDES SOCIAIS, BANNERS & CONTATO */}
              {activeTab === 'redes' && (
                <form onSubmit={handleSaveSettings} className="space-y-8">
                  {/* Social Links Section */}
                  <div className="bg-brand-card border border-brand-border rounded-2xl p-5 sm:p-6 space-y-5">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-white">
                        Links das Redes Sociais
                      </h3>
                      <p className="text-xs text-brand-cream/70 mt-1">
                        Adicione, edite ou remova os links das suas redes sociais exibidos no rodapé da plataforma.
                      </p>
                    </div>

                    {/* Existing Social Links */}
                    <div className="space-y-3">
                      {draftSettings.socialLinks.length === 0 ? (
                        <p className="text-xs text-brand-cream/60 py-2">
                          Nenhuma rede social adicionada ainda. Use o formulário abaixo para adicionar.
                        </p>
                      ) : (
                        draftSettings.socialLinks.map((link) => (
                          <div
                            key={link.id}
                            className="bg-brand-surface/70 border border-brand-border rounded-xl p-3.5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                          >
                            <div className="md:col-span-3">
                              <select
                                value={link.platform}
                                onChange={(e) =>
                                  handleUpdateSocialField(
                                    link.id,
                                    'platform',
                                    e.target.value as SocialPlatform
                                  )
                                }
                                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:border-brand-gold focus:outline-none"
                              >
                                {PLATFORM_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-3">
                              <input
                                type="text"
                                maxLength={60}
                                value={link.label}
                                onChange={(e) =>
                                  handleUpdateSocialField(link.id, 'label', e.target.value)
                                }
                                placeholder="Título / Nome"
                                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:border-brand-gold focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-4">
                              <input
                                type="text"
                                maxLength={512}
                                value={link.url}
                                onChange={(e) =>
                                  handleUpdateSocialField(link.id, 'url', e.target.value)
                                }
                                placeholder="https://instagram.com/..."
                                className="w-full bg-brand-dark border border-brand-border rounded-lg px-3 py-2 text-xs text-white focus:border-brand-gold focus:outline-none"
                              />
                            </div>
                            <div className="md:col-span-2 flex items-center justify-end gap-2">
                              <label className="flex items-center gap-1.5 text-xs text-brand-cream/80 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={link.active}
                                  onChange={(e) =>
                                    handleUpdateSocialField(link.id, 'active', e.target.checked)
                                  }
                                  className="accent-brand-gold"
                                />
                                <span>Ativo</span>
                              </label>
                              <button
                                type="button"
                                onClick={() => handleRemoveSocialLink(link.id)}
                                className="p-2 rounded-lg bg-red-950/60 hover:bg-red-900/70 text-red-200 cursor-pointer"
                                title="Remover rede social"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Add New Social Link */}
                    <div className="pt-4 border-t border-brand-border">
                      <span className="block text-xs font-semibold text-brand-gold mb-2.5">
                        + Adicionar Nova Rede Social
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-3">
                          <select
                            value={newSocialPlatform}
                            onChange={(e) =>
                              setNewSocialPlatform(e.target.value as SocialPlatform)
                            }
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-xs text-white focus:border-brand-gold focus:outline-none"
                          >
                            {PLATFORM_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="md:col-span-3">
                          <input
                            type="text"
                            maxLength={60}
                            value={newSocialLabel}
                            onChange={(e) => setNewSocialLabel(e.target.value)}
                            placeholder="Descrição (ex: Nosso Instagram)"
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-xs text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>
                        <div className="md:col-span-4">
                          <input
                            type="text"
                            maxLength={512}
                            value={newSocialUrl}
                            onChange={(e) => setNewSocialUrl(e.target.value)}
                            placeholder="https://instagram.com/quadrattapizzas"
                            className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2.5 text-xs text-white focus:border-brand-gold focus:outline-none"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <button
                            type="button"
                            onClick={handleAddSocialLink}
                            className="w-full py-2.5 px-3 rounded-xl bg-brand-gold hover:bg-brand-goldHover text-brand-dark text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Adicionar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Platform Banners */}
                  <div className="bg-brand-card border border-brand-border rounded-2xl p-5 sm:p-6 space-y-5">
                    <h3 className="font-serif text-lg font-bold text-white">
                      Imagens Principais da Plataforma
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Hero Image */}
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-brand-cream/80">
                          Banner Principal (Topo)
                        </label>
                        <div className="h-36 rounded-xl overflow-hidden bg-brand-surface border border-brand-border">
                          <img
                            src={resolveImageSrc(draftSettings.heroImageUrl, mediaMap)}
                            alt="Banner Principal"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <input
                          type="text"
                          maxLength={2048}
                          value={draftSettings.heroImageUrl}
                          onChange={(e) =>
                            setDraftSettings({ ...draftSettings, heroImageUrl: e.target.value })
                          }
                          className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:border-brand-gold focus:outline-none"
                        />
                        <input
                          ref={heroFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            handleUploadFiles(e.target.files, (mediaRef) =>
                              setDraftSettings((prev) => ({ ...prev, heroImageUrl: mediaRef }))
                            );
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => heroFileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-lg bg-brand-surface hover:bg-brand-border text-xs font-semibold text-brand-gold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Nova Foto do Banner</span>
                        </button>
                      </div>

                      {/* Delivery Image */}
                      <div className="space-y-2.5">
                        <label className="block text-xs font-semibold text-brand-cream/80">
                          Imagem da Seção Delivery
                        </label>
                        <div className="h-36 rounded-xl overflow-hidden bg-brand-surface border border-brand-border">
                          <img
                            src={resolveImageSrc(draftSettings.deliveryImageUrl, mediaMap)}
                            alt="Imagem Delivery"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <input
                          type="text"
                          maxLength={2048}
                          value={draftSettings.deliveryImageUrl}
                          onChange={(e) =>
                            setDraftSettings({ ...draftSettings, deliveryImageUrl: e.target.value })
                          }
                          className="w-full bg-brand-surface border border-brand-border rounded-xl px-3 py-2 text-xs text-white focus:border-brand-gold focus:outline-none"
                        />
                        <input
                          ref={deliveryFileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={(e) => {
                            handleUploadFiles(e.target.files, (mediaRef) =>
                              setDraftSettings((prev) => ({ ...prev, deliveryImageUrl: mediaRef }))
                            );
                            e.target.value = '';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => deliveryFileInputRef.current?.click()}
                          className="px-3.5 py-2 rounded-lg bg-brand-surface hover:bg-brand-border text-xs font-semibold text-brand-gold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Nova Foto do Delivery</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Announcement */}
                  <div className="bg-brand-card border border-brand-border rounded-2xl p-5 sm:p-6 space-y-4">
                    <h3 className="font-serif text-lg font-bold text-white">
                      Contato & Faixa de Aviso
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                          Número WhatsApp (somente dígitos)
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={20}
                          value={draftSettings.whatsappNumber}
                          onChange={(e) =>
                            setDraftSettings({
                              ...draftSettings,
                              whatsappNumber: e.target.value.replace(/\D/g, ''),
                            })
                          }
                          placeholder="5511984937529"
                          className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                          Telefone Exibido no Rodapé
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={40}
                          value={draftSettings.whatsappDisplay}
                          onChange={(e) =>
                            setDraftSettings({ ...draftSettings, whatsappDisplay: e.target.value })
                          }
                          placeholder="(11) 98493-7529"
                          className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                          E-mail de Contato
                        </label>
                        <input
                          type="email"
                          required
                          maxLength={120}
                          value={draftSettings.contactEmail}
                          onChange={(e) =>
                            setDraftSettings({ ...draftSettings, contactEmail: e.target.value })
                          }
                          placeholder="scaiaffa2014@gmail.com"
                          className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-xs font-semibold text-brand-cream/80 mb-1.5">
                          Texto da Faixa Superior de Avisos
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={220}
                          value={draftSettings.announcementText}
                          onChange={(e) =>
                            setDraftSettings({
                              ...draftSettings,
                              announcementText: e.target.value,
                            })
                          }
                          className="w-full bg-brand-surface border border-brand-border rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-brand-gold focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl bg-brand-card hover:bg-brand-surface border border-brand-border text-xs sm:text-sm font-semibold text-brand-cream/80 inline-flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Ver Site</span>
                    </button>
                    <button
                      type="submit"
                      disabled={busy}
                      className="px-7 py-3 rounded-xl bg-brand-red hover:bg-brand-redHover text-white text-sm font-bold flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" />
                      <span>{busy ? 'Salvando...' : 'Salvar Todas as Configurações'}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
