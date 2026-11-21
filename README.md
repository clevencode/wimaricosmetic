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

## Admin + Firebase (zero custo Spark)

Mesmo projeto Firebase do **BiblosApp** (`audiobible-9b689` ou o teu). Auth e-mail/senha, catálogo em Firestore `catalog/main`, fotos em Storage `product-images/`.

### Setup rápido

1. Console Firebase → **Authentication** → ativar Email/Password → criar utilizadora da cliente  
2. Publicar rules em [`firebase/firestore.rules`](firebase/firestore.rules) e [`firebase/storage.rules`](firebase/storage.rules)  
3. Auth → Settings → **Authorized domains**: `localhost`, `wimaricosmetic.vercel.app`  
4. Config local (não versionada):

```powershell
# A partir das VITE_FIREBASE_* do BiblosApp → js/firebase-config.local.js
# Ou copie js/firebase-config.example.js e preencha
```

5. Abrir `/admin/` → login → no 1º acesso o seed `data/products.json` é enviado ao Firestore se o doc estiver vazio  

### Fluxo do painel

1. Login → **Início** / **Produtos** / criar-editar (stepper 3 passos)  
2. Persistência **só no Firebase** (sem localStorage de catálogo)  
3. Vitrine lê Firestore; se Firebase falhar/indisponível, fallback de leitura ao seed JSON  

Rascunhos (`draft: true`) não entram na vitrine. `available: false` aparece com selo Indisponível.

## Personalizar

| O quê | Onde |
| --- | --- |
| Número do WhatsApp | `js/config.js` → `whatsappNumber` (somente dígitos, com DDI) |
| Nome da marca | `js/config.js` → `brandName` / `brandTagline` |
| Firebase | `js/firebase-config.local.js` (ver example) |
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
