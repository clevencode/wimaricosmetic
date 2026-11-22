/**
 * Auth admin Wimari — Firebase email/senha (Web app dedicada).
 */
window.AdminAuth = (() => {
  function fb() {
    return window.WimariFirebase;
  }

  function isReady() {
    return Boolean(fb()?.isConfigured?.());
  }

  function onAuth(callback) {
    if (!isReady()) {
      callback(null);
      return () => {};
    }
    try {
      fb().ensureApp();
      return fb().onAuth(callback);
    } catch {
      callback(null);
      return () => {};
    }
  }

  async function signIn(email, password) {
    if (!isReady()) throw new Error('Firebase não configurado.');
    return fb().signIn(email, password);
  }

  async function signOut() {
    if (!isReady()) return;
    await fb().signOut();
  }

  function currentUser() {
    try {
      return fb()?.currentUser?.() ?? null;
    } catch {
      return null;
    }
  }

  return { isReady, onAuth, signIn, signOut, currentUser };
})();
