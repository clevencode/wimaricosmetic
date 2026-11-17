# Maison Nuée — Vitrine Digital

Catálogo mobile-first de cosméticos **sem carrinho e sem pagamento**. Visitantes filtram produtos e iniciam conversa no WhatsApp com nome e referência já preenchidos.

## Como abrir

O `fetch` do JSON exige um servidor local (não use `file://`):

```bash
npx --yes serve .
```

Depois abra o endereço indicado no terminal (geralmente `http://localhost:3000`).

## Personalizar

| O quê | Onde |
| --- | --- |
| Número do WhatsApp | `js/config.js` → `whatsappNumber` (somente dígitos, com DDI) |
| Nome da marca | `js/config.js` → `brandName` |
| Produtos / categorias | `data/products.json` |

## Funcionalidades

- Busca + filtro de categoria combinados
- Bottom sheet (mobile) / modal (desktop) com specs
- CTA WhatsApp com mensagem automática
- Compartilhar via Web Share API (fallback: copiar link)
- Deep link `#produto/{id}`
- Empty state com “Limpar filtros”

## Stack

HTML5 + Tailwind CSS (CDN) + Alpine.js + JSON estático.
