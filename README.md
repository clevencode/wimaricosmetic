# Wimari — Vitrine Digital

Catálogo mobile-first de **cosméticos & perfumaria** sem carrinho e sem pagamento. Visitantes filtram produtos e iniciam conversa no WhatsApp com nome e referência já preenchidos.

## Como abrir

O `fetch` do JSON exige um servidor local (não use `file://`):

```bash
npx --yes serve .
```

Depois abra o endereço indicado no terminal (geralmente `http://localhost:3000`).

| Página | URL |
| --- | --- |
| Vitrine | `http://localhost:3000/` |
| Painel admin | `http://localhost:3000/admin/` |
| Preview dos dados locais | `http://localhost:3000/?preview=1` |

## Admin platform Wimari (MVP local)

Fluxo do painel (`/admin/`):

1. **Início** — Ver produtos criados · Criar novo produto  
2. **Visualizador de Produtos Criados** (mobile) — busca, chips, cards, bottom nav + FAB `+`  
3. **Criar / Editar Produto** — mesmo stepper 3 passos (visual → descrição → preço/estoque); rascunho, publicar/salvar ou remover (na edição)

Campos extras: `stock`, `stockAlert`, `draft`, `costPrice`, `actives`, `usage`, `composition`, `hasVariations`, `variations`.  
Estoque baixo usa `stockAlert` do produto (fallback: `lowStockThreshold` em `js/config.js`).

- Sem autenticação nesta fase (aviso no topo do painel)
- Edições ficam no **localStorage** do navegador (`wimari_catalog_v3`)
- Fotos no create: upload câmera/galeria (comprimidas em data URL, máx. 5)
- “Gerar com IA”: template local a partir do nome + ativos (sem API externa)
- A vitrine pública continua lendo `data/products.json` até você exportar e substituir o arquivo
- Use **Exportar JSON** no admin, baixe `products.json` e substitua `data/products.json` para publicar
- **Preview** (`/?preview=1`) mostra a vitrine com os dados locais do admin, antes de publicar
- Rascunhos (`draft: true`) **não** entram na vitrine pública
- Produtos com `available: false` **aparecem** na vitrine com o selo “Indisponível”

Se a lista do admin parecer antiga, limpe o localStorage ou use **Descartar locais**.

## Personalizar

| O quê | Onde |
| --- | --- |
| Número do WhatsApp | `js/config.js` → `whatsappNumber` (somente dígitos, com DDI) |
| Nome da marca | `js/config.js` → `brandName` / `brandTagline` |
| Produtos / categorias | `data/products.json` (ou via `/admin`) |

## Funcionalidades

- Busca + filtro de categoria combinados
- Bottom sheet (mobile) / modal (desktop) com specs
- CTA WhatsApp com mensagem automática
- Compartilhar via Web Share API (fallback: copiar link)
- Deep link `#produto/{id}`
- Empty state com “Limpar filtros”
- Painel admin com CRUD local + export JSON

## Stack

HTML5 + Tailwind CSS (CDN) + Alpine.js + JSON estático (+ localStorage no admin).

## Ícones

Padronizados em [`css/icons.css`](css/icons.css):

- Classe base `.icon` — outline 24×24, `stroke-width: 2`, caps arredondados
- Tamanhos: `.icon--sm` · `.icon--md` · `.icon--lg` · `.icon--xl`
- Exceção de marca: `.icon--brand` (WhatsApp filled)

## Marca

Paleta do logo: rosa `#ff2d92`, lima `#c8e84a`, preto `#111111`, laranja de apoio `#ff6a2a`.
