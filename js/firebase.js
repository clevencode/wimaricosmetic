/**
 * Init Firebase Wimari (Auth + Firestore + Storage).
 * Config canónica: js/firebase-config.js
 * Override local: js/firebase-config.local.js
 * Setup: firebase/SETUP.md
 */
window.WimariFirebase = (() => {
  const CATALOG_DOC_PATH = { collection: 'catalog', id: 'main' };
  const STORAGE_PREFIX = 'product-images';

  let app = null;
  let auth = null;
  let db = null;
  let storage = null;

  function cleanEnv(value) {
    return String(value ?? '')
      .trim()
      .replace(/^["']|["']$/g, '');
  }

  function readOptions() {
    const fromFile = window.WIMARI_FIREBASE_CONFIG || {};
    const fromConfig = window.VITRINE_CONFIG?.firebase || {};
    // local (último script) / ficheiro canónico prevalece sobre VITRINE_CONFIG vazio
    const merged = { ...fromConfig, ...fromFile };
    const apiKey = cleanEnv(merged.apiKey);
    const authDomain = cleanEnv(merged.authDomain);
    const projectId = cleanEnv(merged.projectId);
    const appId = cleanEnv(merged.appId);
    if (!apiKey || !authDomain || !projectId || !appId) return null;
    const storageBucket =
      cleanEnv(merged.storageBucket) || `${projectId}.appspot.com`;
    const messagingSenderId = cleanEnv(merged.messagingSenderId) || undefined;
    return { apiKey, authDomain, projectId, storageBucket, appId, messagingSenderId };
  }

  function isConfigured() {
    return readOptions() != null && typeof window.firebase !== 'undefined';
  }

  function ensureApp() {
    if (app) return app;
    if (typeof window.firebase === 'undefined') {
      throw new Error('Firebase SDK não carregou.');
    }
    const options = readOptions();
    if (!options) {
      throw new Error('Firebase não configurado — veja firebase/SETUP.md');
    }
    if (!firebase.apps.length) {
      app = firebase.initializeApp(options);
    } else {
      app = firebase.app();
    }
    return app;
  }

  function getAuth() {
    if (auth) return auth;
    ensureApp();
    auth = firebase.auth();
    return auth;
  }

  function getDb() {
    if (db) return db;
    ensureApp();
    db = firebase.firestore();
    return db;
  }

  function getStorage() {
    if (storage) return storage;
    ensureApp();
    storage = firebase.storage();
    return storage;
  }

  function catalogRef() {
    return getDb().collection(CATALOG_DOC_PATH.collection).doc(CATALOG_DOC_PATH.id);
  }

  function onAuth(callback) {
    return getAuth().onAuthStateChanged(callback);
  }

  async function signIn(email, password) {
    const cred = await getAuth().signInWithEmailAndPassword(String(email || '').trim(), password);
    return cred.user;
  }

  async function signOut() {
    await getAuth().signOut();
  }

  function currentUser() {
    try {
      return getAuth().currentUser;
    } catch {
      return null;
    }
  }

  function requireUser() {
    const user = currentUser();
    if (!user) {
      const err = new Error('Faça login para continuar.');
      err.code = 'auth/required';
      throw err;
    }
    return user;
  }

  async function loadCatalog() {
    const snap = await catalogRef().get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    return {
      categories: data.categories || [],
      products: data.products || [],
      updatedAt: data.updatedAt || null,
    };
  }

  async function saveCatalog(catalog) {
    requireUser();
    const payload = {
      categories: catalog?.categories || [],
      products: catalog?.products || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await catalogRef().set(payload, { merge: false });
    return payload;
  }

  async function seedCatalogIfEmpty(seedCatalog) {
    requireUser();
    const snap = await catalogRef().get();
    if (snap.exists) return { seeded: false, catalog: snap.data() };
    const payload = {
      categories: seedCatalog?.categories || [],
      products: seedCatalog?.products || [],
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    await catalogRef().set(payload);
    return { seeded: true, catalog: payload };
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl || '').split(',');
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/jpeg';
    const raw = atob(parts[1] || '');
    const arr = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  async function uploadProductImage(dataUrlOrBlob, { productId, index } = {}) {
    requireUser();
    const blob =
      dataUrlOrBlob instanceof Blob ? dataUrlOrBlob : dataUrlToBlob(dataUrlOrBlob);
    const safeId = String(productId || 'produto').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'produto';
    const name = `${STORAGE_PREFIX}/${safeId}/${Date.now()}-${index || 0}.jpg`;
    const ref = getStorage().ref().child(name);
    await ref.put(blob, { contentType: blob.type || 'image/jpeg' });
    return ref.getDownloadURL();
  }

  return {
    CATALOG_DOC_PATH,
    isConfigured,
    ensureApp,
    getAuth,
    getDb,
    getStorage,
    onAuth,
    signIn,
    signOut,
    currentUser,
    requireUser,
    loadCatalog,
    saveCatalog,
    seedCatalogIfEmpty,
    uploadProductImage,
  };
})();
