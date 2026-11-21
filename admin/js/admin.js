document.addEventListener('alpine:init', () => {
  Alpine.data('adminApp', () => ({
    loading: true,
    error: null,
    feedback: '',
    feedbackTimer: null,

    categories: [],
    products: [],
    source: 'seed',

    searchQuery: '',
    filterCategory: 'all',
    filterAvailability: 'all',

    editorOpen: false,
    editingId: null,
    draft: null,
    priceOnRequest: false,
    newImageUrl: '',

    async init() {
      try {
        const store = window.CatalogStore;
        if (!store) throw new Error('CatalogStore não carregou.');
        const { catalog, source } = await store.loadForAdmin('../data/products.json');
        this.categories = catalog.categories || [];
        this.products = catalog.products || [];
        this.source = source;
      } catch (err) {
        this.error = err?.message || 'Erro ao carregar catálogo.';
      } finally {
        this.loading = false;
      }
    },

    get filteredProducts() {
      const q = this.searchQuery.trim().toLowerCase();
      return this.products.filter((p) => {
        if (this.filterCategory !== 'all' && p.category?.slug !== this.filterCategory) {
          return false;
        }
        if (this.filterAvailability === 'available' && p.available === false) return false;
        if (this.filterAvailability === 'unavailable' && p.available !== false) return false;
        if (!q) return true;
        const name = (p.name || '').toLowerCase();
        const ref = (p.ref || '').toLowerCase();
        return name.includes(q) || ref.includes(q);
      });
    },

    get resultsLabel() {
      const n = this.filteredProducts.length;
      return n === 1 ? '1 produto' : `${n} produtos`;
    },

    showFeedback(msg) {
      this.feedback = msg;
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = setTimeout(() => {
        this.feedback = '';
      }, 2400);
    },

    formatPrice(price) {
      if (price === null || price === undefined || price === '') return 'Sob consulta';
      const n = Number(price);
      if (Number.isNaN(n)) return 'Sob consulta';
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    persist() {
      const store = window.CatalogStore;
      store.saveLocal({
        categories: this.categories,
        products: this.products,
      });
      this.source = 'local';
    },

    toggleAvailable(product) {
      product.available = product.available === false;
      this.persist();
      this.showFeedback(
        product.available ? 'Produto disponível na vitrine' : 'Produto marcado como indisponível'
      );
    },

    openCreate() {
      const store = window.CatalogStore;
      this.editingId = null;
      this.draft = store.createEmptyProduct(this.categories, this.products);
      this.priceOnRequest = this.draft.price === null;
      this.newImageUrl = '';
      this.editorOpen = true;
      document.body.style.overflow = 'hidden';
    },

    openEdit(product) {
      const store = window.CatalogStore;
      this.editingId = product.id;
      this.draft = store.normalizeProduct(store.clone(product));
      if (!this.draft.specs.length) this.draft.specs = [{ label: '', value: '' }];
      if (!this.draft.images.length) this.draft.images = [''];
      this.priceOnRequest = this.draft.price === null || this.draft.price === undefined;
      this.newImageUrl = '';
      this.editorOpen = true;
      document.body.style.overflow = 'hidden';
    },

    closeEditor() {
      this.editorOpen = false;
      this.editingId = null;
      this.draft = null;
      this.newImageUrl = '';
      document.body.style.overflow = '';
    },

    onCategoryChange() {
      if (!this.draft) return;
      const cat = this.categories.find((c) => c.slug === this.draft.category.slug);
      if (cat) {
        this.draft.category = { slug: cat.slug, label: cat.label };
      }
    },

    onPriceModeChange() {
      if (!this.draft) return;
      if (this.priceOnRequest) {
        this.draft.price = null;
      } else if (this.draft.price === null || this.draft.price === undefined) {
        this.draft.price = 0;
      }
    },

    addSpec() {
      this.draft.specs.push({ label: '', value: '' });
    },

    removeSpec(index) {
      this.draft.specs.splice(index, 1);
      if (!this.draft.specs.length) this.draft.specs.push({ label: '', value: '' });
    },

    addImage() {
      const url = this.newImageUrl.trim();
      if (!url) return;
      const cleaned = (this.draft.images || []).filter(Boolean);
      cleaned.push(url);
      this.draft.images = cleaned;
      this.newImageUrl = '';
    },

    removeImage(index) {
      this.draft.images.splice(index, 1);
    },

    moveImage(index, delta) {
      const next = index + delta;
      if (next < 0 || next >= this.draft.images.length) return;
      const imgs = this.draft.images;
      const tmp = imgs[index];
      imgs[index] = imgs[next];
      imgs[next] = tmp;
    },

    validateDraft() {
      if (!this.draft?.name?.trim()) return 'Informe o nome do produto.';
      if (!this.draft?.ref?.trim()) return 'Informe a referência.';
      if (!this.draft?.category?.slug) return 'Selecione a categoria.';
      if (!this.priceOnRequest) {
        const n = Number(this.draft.price);
        if (Number.isNaN(n) || n < 0) return 'Preço inválido.';
      }
      return null;
    },

    saveDraft() {
      const err = this.validateDraft();
      if (err) {
        this.showFeedback(err);
        return;
      }

      const store = window.CatalogStore;
      const product = store.normalizeProduct(store.clone(this.draft));
      product.name = product.name.trim();
      product.ref = product.ref.trim();
      product.shortDescription = (product.shortDescription || '').trim();
      product.badge = product.badge?.trim() ? product.badge.trim() : null;
      product.images = (product.images || []).map((u) => String(u).trim()).filter(Boolean);
      product.specs = (product.specs || [])
        .map((s) => ({ label: (s.label || '').trim(), value: (s.value || '').trim() }))
        .filter((s) => s.label || s.value);

      if (this.priceOnRequest) {
        product.price = null;
      } else {
        product.price = Number(product.price);
      }

      if (this.editingId) {
        const idx = this.products.findIndex((p) => p.id === this.editingId);
        if (idx === -1) {
          this.showFeedback('Produto não encontrado.');
          return;
        }
        product.id = this.editingId;
        this.products.splice(idx, 1, product);
      } else {
        product.id = store.uniqueId(product.name || product.ref, this.products);
        this.products.unshift(product);
      }

      this.persist();
      this.closeEditor();
      this.showFeedback('Produto salvo nos dados locais');
    },

    deleteDraft() {
      if (!this.editingId) {
        this.closeEditor();
        return;
      }
      if (!confirm('Remover este produto do catálogo local?')) return;
      this.products = this.products.filter((p) => p.id !== this.editingId);
      this.persist();
      this.closeEditor();
      this.showFeedback('Produto removido');
    },

    exportJson() {
      window.CatalogStore.exportDownload({
        categories: this.categories,
        products: this.products,
      });
      this.showFeedback('JSON baixado — substitua data/products.json');
    },

    resetToSeed() {
      if (!confirm('Descartar alterações locais e voltar ao arquivo seed?')) return;
      window.CatalogStore.clearLocal();
      this.loading = true;
      this.init().then(() => {
        this.showFeedback('Alterações locais descartadas');
      });
    },

    onImageError(event) {
      const img = event?.target;
      if (!img || img.dataset.fallbackApplied === '1') return;
      img.dataset.fallbackApplied = '1';
      img.removeAttribute('src');
      img.classList.add('img-fallback');
    },
  }));
});
