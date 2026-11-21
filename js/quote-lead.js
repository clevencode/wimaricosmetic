/**
 * Fluxo canónico de orçamento WhatsApp — lead de contato + mensagem.
 * Persistência local só para pré-preencher; sem envio a servidor.
 */
window.QuoteLead = (() => {
  const STORAGE_KEY = 'wimari_lead_v1';

  function emptyLead() {
    return { name: '', phone: '', city: '' };
  }

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyLead();
      const parsed = JSON.parse(raw);
      return {
        name: typeof parsed?.name === 'string' ? parsed.name : '',
        phone: typeof parsed?.phone === 'string' ? parsed.phone : '',
        city: typeof parsed?.city === 'string' ? parsed.city : '',
      };
    } catch {
      return emptyLead();
    }
  }

  function save(lead) {
    const next = {
      name: (lead?.name || '').trim(),
      phone: (lead?.phone || '').trim(),
      city: (lead?.city || '').trim(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  /** Máscara BR: (XX) XXXXX-XXXX / (XX) XXXX-XXXX */
  function formatPhoneInput(value) {
    let d = digitsOnly(value).slice(0, 11);
    if (d.length === 0) return '';
    if (d.length <= 2) return `(${d}`;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) {
      return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    }
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  function phoneDigitsForValidation(phone) {
    let d = digitsOnly(phone);
    if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
    return d;
  }

  function validate(lead) {
    const errors = {};
    const name = (lead?.name || '').trim();
    const city = (lead?.city || '').trim();
    const phoneDigits = phoneDigitsForValidation(lead?.phone);

    if (name.length < 2) {
      errors.name = 'Informe seu nome.';
    }
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      errors.phone = 'Informe um WhatsApp válido com DDD.';
    } else if (phoneDigits.length === 11 && phoneDigits[2] !== '9') {
      errors.phone = 'Celular deve começar com 9 após o DDD.';
    }

    return {
      ok: Object.keys(errors).length === 0,
      errors,
      lead: {
        name,
        phone: formatPhoneInput(phoneDigits),
        city,
      },
    };
  }

  function buildWhatsAppMessage({ brandName, product, lead, available = true }) {
    const brand = brandName || 'Wimari';
    const name = (lead?.name || '').trim() || 'cliente';
    const phone = (lead?.phone || '').trim();
    const city = (lead?.city || '').trim();

    const identity = city
      ? `Olá! Sou ${name} (${phone}), de ${city}.`
      : `Olá! Sou ${name} (${phone}).`;

    if (!product) {
      return `${identity}\nGostaria de falar com a ${brand}.`;
    }

    const ref = product.ref || '—';
    const productName = product.name || 'produto';
    if (available === false) {
      return `${identity}\nGostaria de consultar a disponibilidade de ${productName} (Ref: ${ref}).`;
    }
    return `${identity}\nTenho interesse no produto ${productName} (Ref: ${ref}). Gostaria de um orçamento.`;
  }

  function buildWhatsAppUrl(whatsappNumber, message) {
    const text = encodeURIComponent(message || '');
    return `https://wa.me/${digitsOnly(whatsappNumber)}?text=${text}`;
  }

  return {
    STORAGE_KEY,
    emptyLead,
    load,
    save,
    formatPhoneInput,
    validate,
    buildWhatsAppMessage,
    buildWhatsAppUrl,
  };
})();
