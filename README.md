# Wimari — Vitrine Digital

Catálogo mobile-first de **cosméticos & perfumaria** sem carrinho e sem pagamento. Visitantes filtram produtos, informam contato básico e abrem o WhatsApp com mensagem pronta (produto + dados do lead).

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

### Produção (Vercel)

| Página | URL |
| --- | --- |
| Vitrine | https://wimaricosmetic.vercel.app/ |
| Painel admin | https://wimaricosmetic.vercel.app/admin/ |

## Admin + Firebase (Web app Wimari)

Auth e-mail/senha, catálogo em Firestore `catalog/main`, fotos em Storage `product-images/`.

**Setup:** [`firebase/SETUP.md`](firebase/SETUP.md)

```bash
# Automatiza Web app + config.local + deploy das rules
node scripts/setup-firebase.mjs
```

Ainda no Console: ativar Email/Password, criar user da cliente, authorized domains.

Persistência só no Firebase. Vitrine lê Firestore (fallback de leitura: seed JSON).

## Personalizar

| O quê | Onde |
| --- | --- |
| Número do WhatsApp | `js/config.js` → `whatsappNumber` (somente dígitos, com DDI) |
| Nome da marca | `js/config.js` → `brandName` / `brandTagline` |
| Firebase | `js/firebase-config.js` + `.local.js` — ver [`firebase/SETUP.md`](firebase/SETUP.md) |
| Seed inicial | `data/products.json` (só bootstrap) |

## Funcionalidades

- Tela inicial com navbar (Home · Produtos · Sobre) e rotas `#home` / `#produtos` / `#sobre` (contato dentro de Sobre; `#contato` redireciona)
- Busca + filtro de categoria na página Produtos
- Bottom sheet (mobile) / modal (desktop) com specs
- CTA WhatsApp com formulário de contato (nome + WhatsApp; cidade opcional) e mensagem automática
- Lead pré-preenchido via `localStorage` (`wimari_lead_v1`) — ver `js/quote-lead.js`
- Compartilhar via Web Share API (fallback: copiar link)
- Deep link `#produto/{id}`
- Empty state com “Limpar filtros”
- Painel admin com Auth Firebase + CRUD sincronizado (Firestore)

## Stack

HTML5 + Tailwind CSS (CDN) + Alpine.js + Firebase (Auth, Firestore, Storage) + seed JSON.

## Ícones

Padronizados em [`css/icons.css`](css/icons.css):

- Classe base `.icon` — outline 24×24, `stroke-width: 2`, caps arredondados
- Tamanhos: `.icon--sm` · `.icon--md` · `.icon--lg` · `.icon--xl`
- Exceção de marca: `.icon--brand` (WhatsApp filled)

## Marca

Paleta do logo: rosa `#ff2d92`, lima `#c8e84a`, preto `#111111`, laranja de apoio `#ff6a2a`.
