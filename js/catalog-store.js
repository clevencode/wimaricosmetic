/**
 * Catálogo canónico — Firebase Firestore (catalog/main).
 * Fallback de leitura: data/products.json só se Firebase não estiver configurado (dev).
 * Escrita: apenas Firestore autenticado (sem dual path localStorage).
 */
window.CatalogStore = (() => {
  const CATEGORY_SKU_PREFIX = {
    skincare: 'SK',
    maquiagem: 'MQ',
    corpo: 'CP',
    cabelos: 'CB',
    kits: 'KT',
  };

  const ACTIVE_OPTIONS = [
    'Vitamina C',
    'Vegano',
    'Cruelty-Free',
    'Sem Parabenos',
    'Ácido Hialurônico',
    'Dermatologicamente Testado',
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeProduct(product) {
    const p = product && typeof product === 'object' ? { ...product } : {};
    if (typeof p.available !== 'boolean') p.available = true;
    if (typeof p.draft !== 'boolean') p.draft = false;
    if (typeof p.stock !== 'number' || Number.isNaN(p.stock) || p.stock < 0) {
      p.stock = 0;
    }
    if (typeof p.stockAlert !== 'number' || Number.isNaN(p.stockAlert) || p.stockAlert < 0) {
      p.stockAlert = 5;
    }
    if (p.costPrice === undefined) p.costPrice = null;
    else if (p.costPrice !== null) {
      const cost = Number(p.costPrice);
      p.costPrice = Number.isNaN(cost) || cost < 0 ? null : cost;
    }
    if (!Array.isArray(p.images)) p.images = [];
    if (!Array.isArray(p.specs)) p.specs = [];
    if (!Array.isArray(p.actives)) p.actives = [];
    if (typeof p.usage !== 'string') p.usage = '';
    if (typeof p.composition !== 'string') p.composition = '';
    if (typeof p.hasVariations !== 'boolean') p.hasVariations = false;
    if (!Array.isArray(p.variations)) p.variations = [];
    if (p.badge === undefined) p.badge = null;
    if (p.price === undefined) p.price = null;
    if (!p.category || typeof p.category !== 'object') {
      p.category = { slug: '', label: '' };
    }
    return p;
  }

  function normalizeCatalog(data) {
    const raw = data && typeof data === 'object' ? data : {};
    return {
      categories: Array.isArray(raw.categories) ? clone(raw.categories) : [],
      products: Array.isArray(raw.products)
        ? raw.products.map((p) => normalizeProduct(p))
        : [],
    };
  }

  function firebaseReady() {
    return Boolean(window.WimariFirebase?.isConfigured?.());
  }

  async function fetchSeed(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error('Não foi possível carregar o catálogo seed.');
    return normalizeCatalog(await res.json());
  }

  async function loadFromFirebase() {
    const raw = await window.WimariFirebase.loadCatalog();
    if (!raw) return null;
    return normalizeCatalog(raw);
  }

  async function saveCatalog(catalog) {
    if (!firebaseReady()) {
      throw new Error('Firebase não configurado — não é possível salvar.');
    }
    const normalized = normalizeCatalog(catalog);
    await window.WimariFirebase.saveCatalog(normalized);
    return normalized;
  }

  async function loadForVitrine(seedPath) {
    if (firebaseReady()) {
      try {
        const cloud = await loadFromFirebase();
        if (cloud) {
          return { catalog: cloud, source: 'firebase', preview: false };
        }
      } catch (err) {
        console.warn('[CatalogStore] Firebase leitura falhou, usando seed', err);
      }
    }
    const seed = await fetchSeed(seedPath);
    return { catalog: seed, source: 'seed', preview: false };
  }

  async function loadForAdmin(seedPath) {
    const seed = await fetchSeed(seedPath);
    if (!firebaseReady()) {
      return { catalog: clone(seed), source: 'seed', seed, firebase: false };
    }
    try {
      let cloud = await loadFromFirebase();
      if (!cloud) {
        const result = await window.WimariFirebase.seedCatalogIfEmpty(seed);
        cloud = normalizeCatalog(result.catalog);
        return {
          catalog: cloud,
          source: 'firebase',
          seed,
          firebase: true,
          seeded: result.seeded,
        };
      }
      return { catalog: cloud, source: 'firebase', seed, firebase: true, seeded: false };
    } catch (err) {
      if (err?.code === 'auth/required' || /login/i.test(err?.message || '')) {
        throw err;
      }
      console.warn('[CatalogStore] Admin Firebase falhou', err);
      throw new Error(err?.message || 'Falha ao carregar catálogo no Firebase.');
    }
  }

  function slugify(text) {
    return String(text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48);
  }

  function uniqueId(base, products) {
    const root = slugify(base) || `produto-${Date.now()}`;
    const ids = new Set((products || []).map((p) => p.id));
    if (!ids.has(root)) return root;
    let i = 2;
    while (ids.has(`${root}-${i}`)) i += 1;
    return `${root}-${i}`;
  }

  function categorySkuPrefix(slug) {
    return CATEGORY_SKU_PREFIX[slug] || 'GN';
  }

  function suggestSku(categorySlug, products) {
    const prefix = categorySkuPrefix(categorySlug);
    const re = new RegExp(`^WM-${prefix}-(\\d+)$`, 'i');
    let max = 0;
    (products || []).forEach((p) => {
      const m = String(p.ref || '').match(re);
      if (m) max = Math.max(max, Number(m[1]));
    });
    const next = String(max + 1).padStart(3, '0');
    return `WM-${prefix}-${next}`;
  }

  function createEmptyProduct(categories, products) {
    const first = categories?.[0] || { slug: 'skincare', label: 'Skincare' };
    return normalizeProduct({
      id: uniqueId('novo-produto', products),
      ref: suggestSku(first.slug, products),
      name: '',
      category: { slug: first.slug, label: first.label },
      price: null,
      costPrice: null,
      badge: null,
      available: true,
      draft: true,
      stock: 0,
      stockAlert: 5,
      shortDescription: '',
      usage: '',
      composition: '',
      actives: [],
      hasVariations: false,
      variations: [],
      specs: [{ label: 'Volume', value: '' }],
      images: [],
    });
  }

  async function uploadImage(blobOrDataUrl, meta) {
    if (!firebaseReady()) throw new Error('Firebase não configurado.');
    return window.WimariFirebase.uploadProductImage(blobOrDataUrl, meta);
  }

  return {
    ACTIVE_OPTIONS,
    CATEGORY_SKU_PREFIX,
    clone,
    normalizeProduct,
    normalizeCatalog,
    firebaseReady,
    fetchSeed,
    loadForVitrine,
    loadForAdmin,
    saveCatalog,
    uploadImage,
    slugify,
    uniqueId,
    categorySkuPrefix,
    suggestSku,
    createEmptyProduct,
  };
})();
