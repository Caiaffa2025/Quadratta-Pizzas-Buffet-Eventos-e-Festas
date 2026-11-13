import type { PizzaCategory, PizzaItem, SiteSettings } from '../types/cms';

export const ADMIN_EMAIL = 'scaiaffa2014@gmail.com';

export const CATEGORY_LABELS: Record<PizzaCategory, string> = {
  'mais-pedidas': 'As Mais Pedidas nas Festas',
  tradicionais: 'Tradicionais Clássicas',
  gourmet: 'Especiais & Gourmet',
  doces: 'Doces Gourmet',
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroImageUrl:
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=2000&q=80',
  deliveryImageUrl: '/src/assets/images/pizza_delivery_artesanal_1794589738742.jpg',
  announcementText:
    'Agenda 2026/2027 aberta para festas e eventos — e agora também atendemos via Delivery!',
  whatsappNumber: '5511984937529',
  whatsappDisplay: '(11) 98493-7529',
  contactEmail: 'scaiaffa2014@gmail.com',
  socialLinks: [
    {
      id: 'social-instagram',
      platform: 'instagram',
      label: 'Instagram da Quadratta Pizzas',
      url: 'https://instagram.com',
      active: true,
    },
    {
      id: 'social-facebook',
      platform: 'facebook',
      label: 'Facebook da Quadratta Pizzas',
      url: 'https://facebook.com',
      active: true,
    },
  ],
};

export const DEFAULT_PIZZAS: Omit<PizzaItem, 'createdAt' | 'updatedAt' | 'updatedBy'>[] = [
  // AS MAIS PEDIDAS NAS FESTAS
  {
    id: 'mais-pedidas-calabresa',
    title: 'Calabresa Especial com Cebola Roxa',
    category: 'mais-pedidas',
    description:
      'A campeã absoluta dos eventos. Fatias finas de calabresa defumada artesanal crocante, cebola roxa marinada em azeite extravirgem, azeitonas pretas chilenas e orégano fresco.',
    badge: '★ 1º Lugar em Festas',
    badgeTone: 'red',
    tagLeft: 'Massa de Fermentação 48h',
    tagRight: 'A Mais Pedida',
    imageUrl: '/src/assets/images/pizza_calabresa_artesanal_1794405899725.jpg',
    order: 1,
    active: true,
  },
  {
    id: 'mais-pedidas-frango-catupiry',
    title: 'Frango com Catupiry Original',
    category: 'mais-pedidas',
    description:
      'Peito de frango desfiado suculento refogado com ervas finas na panela, coberto com espirais generosas do legítimo Catupiry cremoso e gratinado na hora a 450°C.',
    badge: '★ Favorita das Famílias',
    badgeTone: 'red',
    tagLeft: 'Catupiry Original',
    tagRight: 'Super Cremosa',
    imageUrl: '/src/assets/images/pizza_frango_catupiry_1794405898615.jpg',
    order: 2,
    active: true,
  },
  {
    id: 'mais-pedidas-parma-rucula',
    title: 'Parma com Rúcula & Grana Padano',
    category: 'mais-pedidas',
    description:
      'Símbolo de requinte em casamentos e confraternizações. Molho pelati, muçarela fior di latte, fatias nobres de presunto cru tipo Parma, folhas frescas de rúcula e lascas de Grana Padano.',
    badge: '★ Top Casamentos & Corp',
    badgeTone: 'gold',
    tagLeft: 'Presunto Cru Italiano',
    tagRight: 'Grana Padano Nobre',
    imageUrl: '/src/assets/images/pizza_rucula_parma_gourmet_1794407037310.jpg',
    order: 3,
    active: true,
  },
  {
    id: 'mais-pedidas-nutella-morango',
    title: 'Nutella com Morangos Frescos',
    category: 'mais-pedidas',
    description:
      'A sobremesa mais disputada da festa. Massa leve crocante com base de chocolate, farta camada de autêntica Nutella cremosa, morangos frescos fatiados e raspas enroladas de chocolate belga.',
    badge: '★ Campeã de Sobremesa',
    badgeTone: 'red',
    tagLeft: 'Nutella Original',
    tagRight: 'Chocolate Belga',
    imageUrl: '/src/assets/images/pizza_doce_nutella_morango_1794405692986.jpg',
    order: 4,
    active: true,
  },
  {
    id: 'mais-pedidas-quatro-queijos',
    title: 'Quatro Queijos Nobres',
    category: 'mais-pedidas',
    description:
      'Fusão cremosa e borbulhante de muçarela derretida, provolone curado aromático, gorgonzola suave e Catupiry original gratinado sob fogo alto de 450°C.',
    badge: '★ Unanimidade Cremosa',
    badgeTone: 'red',
    tagLeft: 'Blend Nobre Cremoso',
    tagRight: 'Gratinado na Hora',
    imageUrl: '/src/assets/images/pizza_quatro_queijos_nobres_1794406379160.jpg',
    order: 5,
    active: true,
  },
  {
    id: 'mais-pedidas-margherita',
    title: 'Margherita Especial',
    category: 'mais-pedidas',
    description:
      'A tradição italiana perfeita. Molho de tomate pelati San Marzano, muçarela fior di latte macia, rodelas de tomate fresco da horta, manjericão gigante aromático e azeite extravirgem.',
    badge: '★ O Clássico Imbatível',
    badgeTone: 'red',
    tagLeft: 'Pelati San Marzano',
    tagRight: 'Fior di Latte',
    imageUrl: '/src/assets/images/pizza_margherita_especial_1794406832373.jpg',
    order: 6,
    active: true,
  },

  // TRADICIONAIS CLÁSSICAS
  {
    id: 'tradicionais-margherita',
    title: 'Margherita Especial',
    category: 'tradicionais',
    description:
      'Molho de tomate pelati San Marzano, muçarela fior di latte, rodelas de tomate fresco, manjericão gigante da horta e azeite extravirgem aromatizado.',
    badge: '★ Clássico da Casa',
    badgeTone: 'red',
    tagLeft: 'Massa de Fermentação 48h',
    tagRight: '100% Artesanal',
    imageUrl: '/src/assets/images/pizza_margherita_especial_1794406832373.jpg',
    order: 1,
    active: true,
  },
  {
    id: 'tradicionais-calabresa',
    title: 'Calabresa com Cebola Roxa',
    category: 'tradicionais',
    description:
      'Fatias bem finas de calabresa defumada artesanal, cebola roxa marinada em azeite, azeitonas pretas chilenas e orégano fresco desidratado.',
    badge: '',
    badgeTone: 'red',
    tagLeft: 'Calabresa Premium',
    tagRight: 'Crocante',
    imageUrl: '/src/assets/images/pizza_calabresa_artesanal_1794405899725.jpg',
    order: 2,
    active: true,
  },
  {
    id: 'tradicionais-quatro-queijos',
    title: 'Quatro Queijos Nobres',
    category: 'tradicionais',
    description:
      'Combinação harmoniosa de muçarela derretida, provolone curado, gorgonzola suave e requeijão cremoso tipo Catupiry original gratinado.',
    badge: '',
    badgeTone: 'red',
    tagLeft: 'Blend Cremoso',
    tagRight: 'Gratinado na Hora',
    imageUrl: '/src/assets/images/pizza_quatro_queijos_nobres_1794406379160.jpg',
    order: 3,
    active: true,
  },
  {
    id: 'tradicionais-frango-catupiry',
    title: 'Frango com Catupiry Legítimo',
    category: 'tradicionais',
    description:
      'Peito de frango desfiado suavemente temperado na panela com ervas finas, coberto com o autêntico requeijão Catupiry e milho doce opcional.',
    badge: '',
    badgeTone: 'red',
    tagLeft: 'Catupiry Original',
    tagRight: 'Tempero Autoral',
    imageUrl: '/src/assets/images/pizza_frango_catupiry_1794405898615.jpg',
    order: 4,
    active: true,
  },
  {
    id: 'tradicionais-portuguesa',
    title: 'Portuguesa Tradicional',
    category: 'tradicionais',
    description:
      'Presunto cozido fatiado fininho, muçarela, ovos cozidos ralados, rodelas de cebola roxa, ervilhas frescas e azeitonas pretas.',
    badge: '',
    badgeTone: 'red',
    tagLeft: 'Receita Familiar',
    tagRight: 'Equilíbrio Perfeito',
    imageUrl: '/src/assets/images/pizza_portuguesa_tradicional_1794406216612.jpg',
    order: 5,
    active: true,
  },
  {
    id: 'tradicionais-napolitana',
    title: 'Napolitana Clássica',
    category: 'tradicionais',
    description:
      'Muçarela de primeira qualidade, rodelas de tomates selecionados, alho frito dourado crocante e queijo parmesão ralado na hora.',
    badge: '',
    badgeTone: 'red',
    tagLeft: 'Alho Dourado Crocante',
    tagRight: 'Parmesão Curado',
    imageUrl: '/src/assets/images/pizza_napolitana_classica_1794406507183.jpg',
    order: 6,
    active: true,
  },

  // ESPECIAIS & GOURMET
  {
    id: 'gourmet-parma-rucula',
    title: 'Parma com Rúcula & Grana Padano',
    category: 'gourmet',
    description:
      'Molho pelati, muçarela fior di latte, fatias nobres de presunto tipo Parma cru, folhas frescas de rúcula selvagem e lascas generosas de Grana Padano.',
    badge: '★ Mais Pedida em Casamentos',
    badgeTone: 'gold',
    tagLeft: 'Presunto Cru Italiano',
    tagRight: 'Lascas de Grana Padano',
    imageUrl: '/src/assets/images/pizza_rucula_parma_gourmet_1794407037310.jpg',
    order: 1,
    active: true,
  },
  {
    id: 'gourmet-pepperoni-hot-honey',
    title: 'Pepperoni com Mel Picante (Hot Honey)',
    category: 'gourmet',
    description:
      'Fatias generosas de pepperoni artesanal crocante, muçarela especial e fio generoso de mel silvestre infusionado com pimenta calabresa.',
    badge: '★ Tendência Gourmet',
    badgeTone: 'red',
    tagLeft: 'Mel Silvestre & Pimenta',
    tagRight: 'Pepperoni Crocante',
    imageUrl:
      'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
    order: 2,
    active: true,
  },

  // DOCES GOURMET
  {
    id: 'doces-nutella-morango',
    title: 'Nutella com Morangos Frescos',
    category: 'doces',
    description:
      'Massa leve crocante com base de chocolate, camada generosa de autêntica Nutella, lâminas de morangos frescos selecionados e raspas de chocolate belga.',
    badge: '★ A favorita dos eventos',
    badgeTone: 'red',
    tagLeft: 'Nutella Original',
    tagRight: 'Chocolate Belga',
    imageUrl: '/src/assets/images/pizza_doce_nutella_morango_1794405692986.jpg',
    order: 1,
    active: true,
  },
  {
    id: 'doces-romeu-julieta',
    title: 'Romeu & Julieta da Canastra',
    category: 'doces',
    description:
      'Goiabada cascão artesanal derretida no ponto certo com queijo meia-cura da Serra da Canastra levemente gratinado no forno.',
    badge: '',
    badgeTone: 'gold',
    tagLeft: 'Queijo da Canastra',
    tagRight: 'Goiabada Cascão',
    imageUrl: '/src/assets/images/pizza_romeu_julieta_1794405694979.jpg',
    order: 2,
    active: true,
  },
  {
    id: 'doces-banana-doce-leite',
    title: 'Banana Flambada com Doce de Leite',
    category: 'doces',
    description:
      'Fatias finas de banana prata caramelizadas, canela aromática do Ceilão e doce de leite argentino cremoso salpicado com castanhas.',
    badge: '',
    badgeTone: 'gold',
    tagLeft: 'Doce de Leite Argentino',
    tagRight: 'Canela Aromática',
    imageUrl: '/src/assets/images/pizza_banana_docedeleite_1794405694048.jpg',
    order: 3,
    active: true,
  },
];
