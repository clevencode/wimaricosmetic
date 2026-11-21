/**
 * Shared catalog persistence for vitrine + admin.
 * Seed: data/products.json | Drafts: localStorage | Publish: export JSON download
 */
window.CatalogStore = (() => {
  const STORAGE_KEY = 'wimari_catalog_v1';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeProduct(product) {
    const p = product && typeof product === 'object' ? { ...product } : {};
    if (typeof p.available !== 'boolean') p.available = true;
    if (!Array.isArray(p.images)) p.images = [];
    if (!Array.isArray(p.specs)) p.specs = [];
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

  function isPreviewMode() {
    try {
      return new URLSearchParams(window.location.search).get('preview') === '1';
    } catch {
      return false;
    }
  }

  function hasLocal() {
    try {
      return Boolean(localStorage.getItem(STORAGE_KEY));
    } catch {
      return false;
    }
  }

  function loadLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return normalizeCatalog(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  function saveLocal(catalog) {
    const normalized = normalizeCatalog(catalog);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  }

  function clearLocal() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function fetchSeed(path) {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error('Não foi possível carregar o catálogo.');
    return normalizeCatalog(await res.json());
  }

  async function loadForVitrine(seedPath) {
    const seed = await fetchSeed(seedPath);
    if (isPreviewMode()) {
      const local = loadLocal();
      if (local) {
        return { catalog: local, source: 'local', preview: true };
      }
    }
    return { catalog: seed, source: 'seed', preview: false };
  }

  async function loadForAdmin(seedPath) {
    const seed = await fetchSeed(seedPath);
    const local = loadLocal();
    if (local) {
      return { catalog: local, source: 'local', seed };
    }
    return { catalog: clone(seed), source: 'seed', seed };
  }

  function exportDownload(catalog, filename = 'products.json') {
    const payload = normalizeCatalog(catalog);
    const blob = new Blob([JSON.stringify(payload, null, 2) + '\n'], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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

  function createEmptyProduct(categories, products) {
    const first = categories?.[0] || { slug: 'skincare', label: 'Skincare' };
    return normalizeProduct({
      id: uniqueId('novo-produto', products),
      ref: '',
      name: '',
      category: { slug: first.slug, label: first.label },
      price: null,
      badge: null,
      available: true,
      shortDescription: '',
      specs: [{ label: '', value: '' }],
      images: [''],
    });
  }

  return {
    STORAGE_KEY,
    clone,
    normalizeProduct,
    normalizeCatalog,
    isPreviewMode,
    hasLocal,
    loadLocal,
    saveLocal,
    clearLocal,
    fetchSeed,
    loadForVitrine,
    loadForAdmin,
    exportDownload,
    slugify,
    uniqueId,
    createEmptyProduct,
  };
})();
