document.addEventListener('alpine:init', () => {
  Alpine.data('catalogApp', () => ({
    brandName: window.VITRINE_CONFIG?.brandName || 'Wimari',
    brandTagline: window.VITRINE_CONFIG?.brandTagline || 'cosmeticos & Perfumaria',
    whatsappNumber: window.VITRINE_CONFIG?.whatsappNumber || '555194657868',

    loading: true,
    error: null,
    products: [],
    categories: [],
    dataSource: 'seed',
    previewMode: false,

    searchQuery: '',
    activeCategory: 'all',
    filterMenuOpen: false,

    selectedProduct: null,
    galleryIndex: 0,
    sheetOpen: false,
    lastFocusEl: null,

    shareFeedback: '',
    shareFeedbackTimer: null,

    // Orçamento WhatsApp — lead de contato (caminho único)
    leadOpen: false,
    leadProduct: null,
    leadForm: { name: '', phone: '', city: '' },
    leadErrors: {},

    async init() {
      try {
        const store = window.CatalogStore;
        if (!store) throw new Error('CatalogStore não carregou.');
        const { catalog, source, preview } = await store.loadForVitrine('data/products.json');
        this.categories = catalog.categories || [];
        this.products = catalog.products || [];
        this.dataSource = source;
        this.previewMode = Boolean(preview);
        this.hydrateLeadForm();
        this.openFromHash();
      } catch (err) {
        this.error = err?.message || 'Erro ao carregar produtos.';
      } finally {
        this.loading = false;
      }

      window.addEventListener('hashchange', () => this.openFromHash());
      window.addEventListener('keydown', (e) => this.onGlobalKeydown(e));
    },

    hydrateLeadForm() {
      const QuoteLead = window.QuoteLead;
      if (!QuoteLead) return;
      this.leadForm = QuoteLead.load();
    },

    get filteredProducts() {
      const q = this.searchQuery.trim().toLowerCase();
      return this.products.filter((p) => {
        if (p.draft === true) return false;
        const catOk =
          this.activeCategory === 'all' || p.category?.slug === this.activeCategory;
        if (!catOk) return false;
        if (!q) return true;
        const name = (p.name || '').toLowerCase();
        const ref = (p.ref || '').toLowerCase();
        return name.includes(q) || ref.includes(q);
      });
    },

    isAvailable(product) {
      return product?.available !== false;
    },

    get hasActiveFilters() {
      return this.searchQuery.trim() !== '' || this.activeCategory !== 'all';
    },

    get resultsLabel() {
      const n = this.filteredProducts.length;
      const noun = n === 1 ? 'produto' : 'produtos';
      if (!this.hasActiveFilters) return `${n} ${noun}`;
      return `${n} ${noun} encontrados`;
    },

    formatPrice(price) {
      if (price === null || price === undefined) return 'Sob consulta';
      return price.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
    },

    setCategory(slug) {
      this.activeCategory = slug;
    },

    toggleFilterMenu() {
      this.filterMenuOpen = !this.filterMenuOpen;
    },

    closeFilterMenu() {
      this.filterMenuOpen = false;
    },

    applyCategory(slug) {
      this.setCategory(slug);
      this.closeFilterMenu();
    },

    get activeCategoryLabel() {
      if (this.activeCategory === 'all') return 'Todos';
      return this.categories.find((c) => c.slug === this.activeCategory)?.label || this.activeCategory;
    },

    clearFilters() {
      this.searchQuery = '';
      this.activeCategory = 'all';
      this.closeFilterMenu();
    },

    onImageError(event) {
      const img = event?.target;
      if (!img || img.dataset.fallbackApplied === '1') return;
      img.dataset.fallbackApplied = '1';
      img.removeAttribute('src');
      img.alt = img.alt || 'Imagem indisponível';
      img.classList.add('img-fallback');
    },

    focusableInSheet() {
      const root = this.$refs.sheetPanel;
      if (!root) return [];
      return Array.from(
        root.querySelectorAll(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    },

    focusSheet() {
      this.$nextTick(() => {
        const root = this.$refs.sheetPanel;
        const closeBtn = root?.querySelector('[data-sheet-close]');
        if (closeBtn) {
          closeBtn.focus();
          return;
        }
        const first = this.focusableInSheet()[0];
        first?.focus();
      });
    },

    onGlobalKeydown(e) {
      if (this.leadOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.closeQuoteLead();
        }
        return;
      }

      if (!this.sheetOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeProduct();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusables = this.focusableInSheet();
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    },

    openProduct(product) {
      this.lastFocusEl = document.activeElement;
      this.selectedProduct = product;
      this.galleryIndex = 0;
      this.sheetOpen = true;
      document.body.style.overflow = 'hidden';
      history.replaceState(null, '', `#produto/${product.id}`);
      this.focusSheet();
    },

    closeProduct() {
      this.sheetOpen = false;
      this.selectedProduct = null;
      this.galleryIndex = 0;
      document.body.style.overflow = '';
      if (location.hash.startsWith('#produto/')) {
        history.replaceState(null, '', location.pathname + location.search);
      }
      this.$nextTick(() => {
        if (this.lastFocusEl && typeof this.lastFocusEl.focus === 'function') {
          this.lastFocusEl.focus();
        }
        this.lastFocusEl = null;
      });
    },

    openFromHash() {
      const match = location.hash.match(/^#produto\/(.+)$/);
      if (!match) {
        if (this.sheetOpen) this.closeProduct();
        return;
      }
      const id = decodeURIComponent(match[1]);
      const product = this.products.find((p) => p.id === id);
      if (product) {
        if (!this.sheetOpen || this.selectedProduct?.id !== product.id) {
          this.openProduct(product);
        }
      }
    },

    nextImage() {
      const imgs = this.selectedProduct?.images || [];
      if (imgs.length < 2) return;
      this.galleryIndex = (this.galleryIndex + 1) % imgs.length;
    },

    prevImage() {
      const imgs = this.selectedProduct?.images || [];
      if (imgs.length < 2) return;
      this.galleryIndex = (this.galleryIndex - 1 + imgs.length) % imgs.length;
    },

    openQuoteLead(product = null) {
      const QuoteLead = window.QuoteLead;
      if (!QuoteLead) {
        this.showShareFeedback('Fluxo de orçamento indisponível');
        return;
      }
      this.hydrateLeadForm();
      this.leadErrors = {};
      this.leadProduct = product || null;
      this.leadOpen = true;
      document.body.style.overflow = 'hidden';
      this.$nextTick(() => {
        this.$refs.leadNameInput?.focus();
      });
    },

    closeQuoteLead() {
      this.leadOpen = false;
      this.leadProduct = null;
      this.leadErrors = {};
      if (!this.sheetOpen) {
        document.body.style.overflow = '';
      }
    },

    onLeadPhoneInput(event) {
      const QuoteLead = window.QuoteLead;
      if (!QuoteLead) return;
      this.leadForm.phone = QuoteLead.formatPhoneInput(event?.target?.value);
    },

    get leadTitle() {
      if (this.leadProduct && !this.isAvailable(this.leadProduct)) {
        return 'Consultar disponibilidade';
      }
      if (this.leadProduct) return 'Solicitar orçamento';
      return 'Falar no WhatsApp';
    },

    get leadSubmitLabel() {
      if (this.leadProduct && !this.isAvailable(this.leadProduct)) {
        return 'Continuar no WhatsApp';
      }
      if (this.leadProduct) return 'Enviar orçamento no WhatsApp';
      return 'Abrir WhatsApp';
    },

    submitQuoteLead() {
      const QuoteLead = window.QuoteLead;
      if (!QuoteLead) return;

      const result = QuoteLead.validate(this.leadForm);
      this.leadErrors = result.errors;
      if (!result.ok) {
        if (result.errors.name) this.$refs.leadNameInput?.focus();
        else if (result.errors.phone) this.$refs.leadPhoneInput?.focus();
        return;
      }

      const lead = QuoteLead.save(result.lead);
      this.leadForm = { ...lead };

      const product = this.leadProduct;
      const message = QuoteLead.buildWhatsAppMessage({
        brandName: this.brandName,
        product,
        lead,
        available: product ? this.isAvailable(product) : true,
      });
      const url = QuoteLead.buildWhatsAppUrl(this.whatsappNumber, message);

      this.closeQuoteLead();
      window.open(url, '_blank', 'noopener,noreferrer');
    },

    productShareUrl(product) {
      const base =
        window.VITRINE_CONFIG?.shareBaseUrl ||
        window.location.origin + window.location.pathname;
      return `${base}#produto/${product.id}`;
    },

    showShareFeedback(msg) {
      this.shareFeedback = msg;
      clearTimeout(this.shareFeedbackTimer);
      this.shareFeedbackTimer = setTimeout(() => {
        this.shareFeedback = '';
      }, 2200);
    },

    async shareProduct(product) {
      if (!product) return;
      const url = this.productShareUrl(product);
      const payload = {
        title: `${product.name} — ${this.brandName}`,
        text: `Confira ${product.name} (Ref: ${product.ref}) na ${this.brandName}.`,
        url,
      };

      try {
        if (navigator.share) {
          await navigator.share(payload);
          return;
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }

      try {
        await navigator.clipboard.writeText(url);
        this.showShareFeedback('Link copiado');
      } catch {
        this.showShareFeedback('Não foi possível compartilhar');
      }
    },
  }));
});
