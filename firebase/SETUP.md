# Firebase Wimari — setup da Web app

## Automático (recomendado)

Com Firebase CLI já ligada à conta:

```bash
# projeto default em .firebaserc (ou passe --project=ID)
node scripts/setup-firebase.mjs
```

Isto:

1. Cria a Web app `wimari` se não existir  
2. Escreve `js/firebase-config.local.js`  
3. Faz deploy de [`firestore.rules`](firestore.rules) + [`storage.rules`](storage.rules)  

```bash
node scripts/setup-firebase.mjs --project=outro-id
node scripts/setup-firebase.mjs --skip-deploy
```

## Ainda manual no Console

A CLI **não** ativa Auth nem cria users de forma fiável sem Admin SDK:

1. **Authentication → Sign-in method** → Email/Password  
2. **Users** → e-mail/senha da cliente  
3. **Authorized domains** → `localhost`, `wimaricosmetic.vercel.app`

## Primeiro uso

`/admin/` → login → se `catalog/main` estiver vazio, o seed `data/products.json` é enviado.

## Ordem dos scripts na página

`config.js` → `firebase-config.js` → `firebase-config.local.js` → `firebase.js`
