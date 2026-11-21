document.addEventListener('alpine:init', () => {
  Alpine.data('adminApp', () => ({
    loading: true,
    error: null,
    feedback: '',
    feedbackTimer: null,
    confirmDialog: null,

    authReady: false,
    authUser: null,
    authEmail: '',
    authPassword: '',
    authError: '',
    authBusy: false,

    view: 'home',
    navTab: 'home',

    categories: [],
    products: [],
    source: 'seed',
    lowStockThreshold: window.VITRINE_CONFIG?.lowStockThreshold ?? 10,

    searchQuery: '',
    quickFilter: 'all',
    filterMenuOpen: false,

    editingId: null,

    // Stepper (criar + editar)
    createStep: 1,
    createForm: null,
    skuManual: false,
    accordionUsage: true,
    accordionComposition: false,
    activeOptions: window.CatalogStore?.ACTIVE_OPTIONS || [],
    uploadingPhotos: false,

    async init() {
      this.lowStockThreshold = window.VITRINE_CONFIG?.lowStockThreshold ?? 10;
      this.activeOptions = window.CatalogStore?.ACTIVE_OPTIONS || [];

      if (!window.AdminAuth?.isReady?.()) {
        this.error =
          'Firebase não configurado. Crie js/firebase-config.local.js (ver firebase-config.example.js).';
        this.authReady = true;
        this.loading = false;
        return;
      }

      window.AdminAuth.onAuth(async (user) => {
        this.authUser = user;
        this.authReady = true;
        if (!user) {
          this.categories = [];
          this.products = [];
          this.loading = false;
          this.error = null;
          return;
        }
        await this.loadCatalog();
      });
    },

    get isLoggedIn() {
      return Boolean(this.authUser);
    },

    async login() {
      this.authError = '';
      this.authBusy = true;
      try {
        await window.AdminAuth.signIn(this.authEmail, this.authPassword);
        this.authPassword = '';
      } catch (err) {
        this.authError = err?.message || 'Falha no login.';
      } finally {
        this.authBusy = false;
      }
    },

    async logout() {
      await window.AdminAuth.signOut();
      this.view = 'home';
      this.navTab = 'home';
      this.showFeedback('Sessão encerrada');
    },

    async loadCatalog() {
      this.loading = true;
      this.error = null;
      try {
        const store = window.CatalogStore;
        if (!store) throw new Error('CatalogStore não carregou.');
        const { catalog, source, seeded } = await store.loadForAdmin('../data/products.json');
        this.categories = catalog.categories || [];
        this.products = catalog.products || [];
        this.source = source;
        if (seeded) this.showFeedback('Catálogo inicial enviado ao Firebase');
      } catch (err) {
        this.error = err?.message || 'Erro ao carregar catálogo.';
      } finally {
        this.loading = false;
      }
    },

    goHome() {
      this.view = 'home';
      this.navTab = 'home';
    },

    goProducts() {
      this.view = 'products';
      this.navTab = 'products';
    },

    setNav(tab) {
      if (tab === 'products') {
        this.goProducts();
        return;
      }
      if (tab === 'home' || tab === 'dashboard') {
        this.goHome();
        return;
      }
      if (tab === 'profile') {
        this.navTab = 'profile';
        return;
      }
      this.navTab = tab;
      this.showFeedback('Pedidos em breve');
    },

    get productsCountLabel() {
      const n = this.products.length;
      return n === 1 ? '1 produto no catálogo' : `${n} produtos no catálogo`;
    },

    hasPhoto(product) {
      return (product?.images || []).some((url) => Boolean(String(url || '').trim()));
    },

    hasDescription(product) {
      return Boolean(product?.shortDescription?.trim());
    },

    isDraft(product) {
      if (!product) return true;
      if (product.draft === true) return true;
      return !this.hasPhoto(product) || !this.hasDescription(product);
    },

    isActive(product) {
      return product?.available !== false && !this.isDraft(product);
    },

    isLowStock(product) {
      const stock = Number(product?.stock);
      if (Number.isNaN(stock)) return false;
      const alert =
        typeof product?.stockAlert === 'number'
          ? product.stockAlert
          : this.lowStockThreshold;
      return stock <= alert;
    },

    productVolume(product) {
      const specs = product?.specs || [];
      const hit = specs.find((s) => {
        const label = (s.label || '').toLowerCase();
        return label === 'volume' || label === 'conteúdo' || label === 'conteudo';
      });
      return hit?.value?.trim() || '';
    },

    productTitle(product) {
      const volume = this.productVolume(product);
      const name = product?.name?.trim() || 'Sem nome';
      return volume ? `${name} - ${volume}` : name;
    },

    draftGaps(product) {
      const gaps = [];
      if (!this.hasDescription(product)) gaps.push('Falta descrição');
      if (!this.hasPhoto(product)) gaps.push('Falta foto');
      return gaps;
    },

    setQuickFilter(value) {
      this.quickFilter = value;
    },

    toggleFilterMenu() {
      this.filterMenuOpen = !this.filterMenuOpen;
    },

    closeFilterMenu() {
      this.filterMenuOpen = false;
    },

    applyQuickFilter(value) {
      this.setQuickFilter(value);
      this.closeFilterMenu();
    },

    get quickFilterLabel() {
      if (this.quickFilter === 'all') return 'Todos';
      if (this.quickFilter === 'active') return 'Ativos';
      if (this.quickFilter === 'low_stock') return 'Estoque baixo';
      if (this.quickFilter === 'drafts') return 'Rascunhos';
      if (this.quickFilter.startsWith('cat:')) {
        const slug = this.quickFilter.slice(4);
        return this.categories.find((c) => c.slug === slug)?.label || slug;
      }
      return 'Filtro';
    },

    get filteredProducts() {
      const q = this.searchQuery.trim().toLowerCase();
      return this.products.filter((p) => {
        if (this.quickFilter === 'active' && !this.isActive(p)) return false;
        if (this.quickFilter === 'low_stock' && !this.isLowStock(p)) return false;
        if (this.quickFilter === 'drafts' && !this.isDraft(p)) return false;
        if (this.quickFilter.startsWith('cat:')) {
          const slug = this.quickFilter.slice(4);
          if (p.category?.slug !== slug) return false;
        }
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

    get productsHeaderCount() {
      return this.filteredProducts.length;
    },

    showFeedback(msg) {
      this.feedback = msg;
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = setTimeout(() => {
        this.feedback = '';
      }, 2400);
    },

    askConfirm({ title, message, confirmLabel = 'Confirmar', danger = false } = {}) {
      return new Promise((resolve) => {
        this.confirmDialog = {
          title: title || 'Confirmar',
          message: message || '',
          confirmLabel,
          danger: !!danger,
          resolve,
        };
      });
    },

    resolveConfirm(ok) {
      const dialog = this.confirmDialog;
      this.confirmDialog = null;
      if (dialog?.resolve) dialog.resolve(!!ok);
    },

    formatPrice(price) {
      if (price === null || price === undefined || price === '') return 'Sob consulta';
      const n = Number(price);
      if (Number.isNaN(n)) return 'Sob consulta';
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    },

    formatStock(product) {
      const stock = Number(product?.stock);
      const n = Number.isNaN(stock) ? 0 : stock;
      return `${n} un.`;
    },

    async persist() {
      const store = window.CatalogStore;
      await store.saveCatalog({
        categories: this.categories,
        products: this.products,
      });
      this.source = 'firebase';
    },

    // —— Create stepper ——
    get createStepLabel() {
      if (this.createStep === 1) return 'Passo 1 de 3: Visual e Básico';
      if (this.createStep === 2) return 'Passo 2 de 3: Descrição';
      return 'Passo 3 de 3: Preço e Estoque';
    },

    get isEditing() {
      return Boolean(this.editingId);
    },

    get formTitle() {
      return this.isEditing ? 'Editar Produto' : 'Novo Produto';
    },

    get createPrimaryLabel() {
      if (this.createStep === 1) return 'Continuar para Descrição';
      if (this.createStep === 2) return 'Continuar para Preço';
      return this.isEditing ? 'Salvar alterações ✓' : 'Publicar Produto ✓';
    },

    get createMargin() {
      const price = Number(this.createForm?.price);
      const cost = Number(this.createForm?.costPrice);
      if (!this.createForm || Number.isNaN(price) || Number.isNaN(cost) || price <= 0 || cost < 0) {
        return null;
      }
      const profit = price - cost;
      const pct = (profit / price) * 100;
      return {
        pct: pct.toFixed(1),
        profit: profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      };
    },

    get createPhotoCount() {
      return (this.createForm?.images || []).length;
    },

    openCreate() {
      const store = window.CatalogStore;
      this.editingId = null;
      this.createForm = store.createEmptyProduct(this.categories, this.products);
      this.createStep = 1;
      this.skuManual = false;
      this.accordionUsage = true;
      this.accordionComposition = false;
      this.view = 'create';
      this.navTab = 'products';
      window.scrollTo(0, 0);
    },

    hydrateFormFromProduct(product) {
      const store = window.CatalogStore;
      const form = store.normalizeProduct(store.clone(product));
      if (!form.usage) {
        const uso = (form.specs || []).find((s) => (s.label || '').toLowerCase() === 'uso');
        if (uso?.value) form.usage = uso.value;
      }
      if (!form.composition) {
        const comp = (form.specs || []).find((s) =>
          (s.label || '').toLowerCase().startsWith('composi')
        );
        if (comp?.value) form.composition = comp.value;
      }
      if (!Array.isArray(form.images)) form.images = [];
      if (!Array.isArray(form.actives)) form.actives = [];
      if (!Array.isArray(form.variations)) form.variations = [];
      return form;
    },

    openEdit(product) {
      this.editingId = product.id;
      this.createForm = this.hydrateFormFromProduct(product);
      this.createStep = 1;
      this.skuManual = true;
      this.accordionUsage = true;
      this.accordionComposition = Boolean(this.createForm.composition);
      this.view = 'create';
      this.navTab = 'products';
      window.scrollTo(0, 0);
    },

    closeCreate() {
      this.createForm = null;
      this.createStep = 1;
      this.skuManual = false;
      this.editingId = null;
      this.view = 'products';
      this.navTab = 'products';
    },

    createBack() {
      if (this.createStep > 1) {
        this.createStep -= 1;
        window.scrollTo(0, 0);
        return;
      }
      this.closeCreate();
    },

    onCreateCategoryChange() {
      if (!this.createForm) return;
      const cat = this.categories.find((c) => c.slug === this.createForm.category.slug);
      if (cat) {
        this.createForm.category = { slug: cat.slug, label: cat.label };
      }
      if (!this.skuManual) {
        this.createForm.ref = window.CatalogStore.suggestSku(
          this.createForm.category.slug,
          this.products
        );
      }
    },

    onSkuInput() {
      this.skuManual = true;
    },

    selectCreateCategory(slug) {
      if (!this.createForm) return;
      this.createForm.category.slug = slug;
      this.onCreateCategoryChange();
    },

    toggleActive(label) {
      if (!this.createForm) return;
      const list = this.createForm.actives || [];
      const idx = list.indexOf(label);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(label);
      this.createForm.actives = [...list];
    },

    isActiveSelected(label) {
      return (this.createForm?.actives || []).includes(label);
    },

    generateDescription() {
      if (!this.createForm) return;
      const name = this.createForm.name?.trim() || 'este produto';
      const actives = (this.createForm.actives || []).join(', ');
      const activeLine = actives
        ? `Com ${actives}, entrega cuidado diário com textura agradável e resultado visível.`
        : 'Fórmula pensada para o dia a dia, com textura agradável e resultado visível.';
      this.createForm.shortDescription = `${name} da Wimari. ${activeLine} Ideal para quem busca eficácia com sensação leve na pele.`;
      this.showFeedback('Descrição sugerida gerada');
    },

    bumpStock(delta) {
      if (!this.createForm) return;
      const next = Math.max(0, (Number(this.createForm.stock) || 0) + delta);
      this.createForm.stock = next;
    },

    addVariation() {
      if (!this.createForm) return;
      this.createForm.variations.push({ name: '', stock: 0 });
    },

    removeVariation(index) {
      this.createForm.variations.splice(index, 1);
    },

    removeCreateImage(index) {
      this.createForm.images.splice(index, 1);
    },

    moveCreateImage(index, delta) {
      const next = index + delta;
      const imgs = this.createForm.images;
      if (next < 0 || next >= imgs.length) return;
      const tmp = imgs[index];
      imgs[index] = imgs[next];
      imgs[next] = tmp;
    },

    async compressImageFile(file, maxWidth = 900, quality = 0.72) {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, maxWidth / bitmap.width);
      const w = Math.round(bitmap.width * scale);
      const h = Math.round(bitmap.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return canvas.toDataURL('image/jpeg', quality);
    },

    async onPhotoFilesSelected(event) {
      const files = Array.from(event.target?.files || []);
      event.target.value = '';
      if (!files.length || !this.createForm) return;

      const room = 5 - this.createForm.images.length;
      if (room <= 0) {
        this.showFeedback('Limite de 5 fotos');
        return;
      }

      this.uploadingPhotos = true;
      try {
        const slice = files.slice(0, room);
        let i = 0;
        for (const file of slice) {
          if (!file.type.startsWith('image/')) continue;
          const dataUrl = await this.compressImageFile(file);
          const url = await window.CatalogStore.uploadImage(dataUrl, {
            productId: this.createForm.id || this.editingId || 'novo',
            index: this.createForm.images.length + i,
          });
          this.createForm.images.push(url);
          i += 1;
        }
      } catch (err) {
        this.showFeedback(err?.message || 'Não foi possível enviar a imagem');
      } finally {
        this.uploadingPhotos = false;
      }
    },

    validateCreateStep1() {
      if (!this.createForm?.name?.trim()) return 'Informe o nome do produto.';
      return null;
    },

    async createPrimaryAction() {
      if (this.createStep === 1) {
        const err = this.validateCreateStep1();
        if (err) {
          this.showFeedback(err);
          return;
        }
        this.createStep = 2;
        window.scrollTo(0, 0);
        return;
      }
      if (this.createStep === 2) {
        this.createStep = 3;
        window.scrollTo(0, 0);
        return;
      }
      await this.publishCreate();
    },

    buildCreateProduct(asDraft) {
      const store = window.CatalogStore;
      const product = store.normalizeProduct(store.clone(this.createForm));
      product.name = (product.name || '').trim() || 'Produto sem nome';
      product.ref = (product.ref || '').trim() || store.suggestSku(product.category.slug, this.products);
      product.shortDescription = (product.shortDescription || '').trim();
      product.usage = (product.usage || '').trim();
      product.composition = (product.composition || '').trim();
      product.images = (product.images || []).filter(Boolean);
      product.actives = (product.actives || []).filter(Boolean);
      product.stock = Number(product.stock) || 0;
      product.stockAlert =
        typeof product.stockAlert === 'number' && !Number.isNaN(product.stockAlert)
          ? product.stockAlert
          : 5;
      product.costPrice =
        product.costPrice === null || product.costPrice === '' || product.costPrice === undefined
          ? null
          : Number(product.costPrice);
      if (product.costPrice !== null && (Number.isNaN(product.costPrice) || product.costPrice < 0)) {
        product.costPrice = null;
      }
      product.price =
        product.price === null || product.price === '' || product.price === undefined
          ? null
          : Number(product.price);
      if (product.price !== null && (Number.isNaN(product.price) || product.price < 0)) {
        product.price = null;
      }
      product.hasVariations = product.hasVariations === true;
      product.variations = product.hasVariations
        ? (product.variations || [])
            .map((v) => ({
              name: (v.name || '').trim(),
              stock: Number(v.stock) || 0,
            }))
            .filter((v) => v.name)
        : [];
      product.draft = asDraft;
      product.badge = product.badge?.trim() ? product.badge.trim() : null;

      const specs = [];
      if (product.usage) specs.push({ label: 'Uso', value: product.usage });
      if (product.composition) specs.push({ label: 'Composição', value: product.composition });
      (product.specs || []).forEach((s) => {
        const label = (s.label || '').trim();
        const value = (s.value || '').trim();
        if (!label && !value) return;
        if (label === 'Uso' || label === 'Composição') return;
        specs.push({ label, value });
      });
      product.specs = specs;

      if (this.editingId) {
        product.id = this.editingId;
        const existing = this.products.find((p) => p.id === this.editingId);
        product.available =
          existing && typeof existing.available === 'boolean' ? existing.available : true;
      } else {
        product.id = store.uniqueId(product.name || product.ref, this.products);
        product.available = true;
      }
      return product;
    },

    async commitFormProduct(product) {
      if (this.editingId) {
        const idx = this.products.findIndex((p) => p.id === this.editingId);
        if (idx === -1) {
          this.showFeedback('Produto não encontrado.');
          return false;
        }
        this.products.splice(idx, 1, product);
      } else {
        this.products.unshift(product);
      }
      try {
        await this.persist();
        return true;
      } catch (err) {
        this.showFeedback(err?.message || 'Falha ao salvar no Firebase');
        return false;
      }
    },

    async saveCreateDraft() {
      if (!this.createForm) return;
      const ok = await this.askConfirm({
        title: 'Salvar rascunho',
        message: 'Salvar este produto como rascunho e voltar à lista?',
        confirmLabel: 'Salvar rascunho',
      });
      if (!ok) return;
      const product = this.buildCreateProduct(true);
      if (!(await this.commitFormProduct(product))) return;
      this.closeCreate();
      this.showFeedback('Rascunho salvo');
    },

    async publishCreate() {
      if (!this.createForm) return;
      const err = this.validateCreateStep1();
      if (err) {
        this.createStep = 1;
        this.showFeedback(err);
        return;
      }
      const wasEditing = this.isEditing;
      const ok = await this.askConfirm({
        title: wasEditing ? 'Salvar alterações' : 'Publicar produto',
        message: wasEditing
          ? 'Confirmar e salvar as alterações deste produto?'
          : 'Publicar este produto no catálogo?',
        confirmLabel: wasEditing ? 'Salvar' : 'Publicar',
      });
      if (!ok) return;
      const product = this.buildCreateProduct(false);
      if (!(await this.commitFormProduct(product))) return;
      this.closeCreate();
      this.showFeedback(wasEditing ? 'Alterações salvas' : 'Produto publicado');
    },

    async deleteCurrentProduct() {
      if (!this.editingId) return;
      const name = (this.createForm?.name || '').trim() || 'este produto';
      const ok = await this.askConfirm({
        title: 'Remover produto',
        message: `Remover “${name}” do catálogo? Esta ação não pode ser desfeita aqui.`,
        confirmLabel: 'Remover',
        danger: true,
      });
      if (!ok) return;
      this.products = this.products.filter((p) => p.id !== this.editingId);
      try {
        await this.persist();
        this.closeCreate();
        this.showFeedback('Produto removido');
      } catch (err) {
        this.showFeedback(err?.message || 'Falha ao remover');
      }
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
