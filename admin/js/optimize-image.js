/**
 * Otimização client-side de fotos de produto (canvas nativo).
 * Max edge 1200px, WebP @ 0.82 (fallback JPEG).
 */
window.WimariImageOptimize = (() => {
  const MAX_EDGE = 1200;
  const QUALITY = 0.82;

  function toBlob(canvas, type, quality) {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), type, quality);
    });
  }

  function supportsWebpExport(canvas) {
    try {
      return canvas.toDataURL('image/webp').startsWith('data:image/webp');
    } catch {
      return false;
    }
  }

  function uniqueName(ext) {
    const rand = Math.random().toString(36).slice(2, 7);
    return `wm-prod-${Date.now()}-${rand}.${ext}`;
  }

  /**
   * @param {File} file
   * @returns {Promise<{ blob: Blob, fileName: string, contentType: string, width: number, height: number }>}
   */
  async function optimizeProductImage(file) {
    if (!file || typeof file !== 'object') {
      throw new Error('Arquivo de imagem inválido.');
    }
    const type = String(file.type || '');
    if (!type.startsWith('image/')) {
      throw new Error('Selecione apenas arquivos de imagem.');
    }

    let bitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      throw new Error(
        'Não foi possível ler esta imagem. Tente JPG/PNG ou converta HEIC no aparelho.',
      );
    }

    try {
      const maxSide = Math.max(bitmap.width, bitmap.height);
      const scale = Math.min(1, MAX_EDGE / maxSide);
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas indisponível neste navegador.');
      ctx.drawImage(bitmap, 0, 0, width, height);

      let contentType = 'image/webp';
      let ext = 'webp';
      let blob = null;

      if (supportsWebpExport(canvas)) {
        blob = await toBlob(canvas, 'image/webp', QUALITY);
      }
      if (!blob || blob.size === 0) {
        contentType = 'image/jpeg';
        ext = 'jpg';
        blob = await toBlob(canvas, 'image/jpeg', QUALITY);
      }
      if (!blob || blob.size === 0) {
        throw new Error('Falha ao comprimir a imagem.');
      }

      return {
        blob,
        fileName: uniqueName(ext),
        contentType,
        width,
        height,
      };
    } finally {
      bitmap.close?.();
    }
  }

  return { optimizeProductImage, MAX_EDGE, QUALITY };
})();
