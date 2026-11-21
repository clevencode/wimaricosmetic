window.VITRINE_CONFIG = {
  brandName: 'Wimari',
  brandTagline: 'cosmeticos & Perfumaria',
  whatsappNumber: '555194657868',
  shareBaseUrl: typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '',
  lowStockThreshold: 10,
  /**
   * Firebase (mesmo projeto do BiblosApp). Preferir js/firebase-config.local.js
   * (não versionado) — ver firebase-config.example.js.
   */
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    appId: '',
    messagingSenderId: '',
  },
};
