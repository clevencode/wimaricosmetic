/**
 * Automatiza o que a CLI Firebase permite para a Web app Wimari:
 * 1) lista/cria app Web "wimari"
 * 2) escreve js/firebase-config.local.js
 * 3) faz deploy das rules (Firestore + Storage)
 *
 * Pré-requisito: `npx firebase login` (já autenticado).
 *
 * Uso:
 *   node scripts/setup-firebase.mjs
 *   node scripts/setup-firebase.mjs --project=SEU_PROJECT_ID
 *   node scripts/setup-firebase.mjs --skip-deploy
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const skipDeploy = args.includes('--skip-deploy');
const projectArg = args.find((a) => a.startsWith('--project='));
const displayName = 'wimari';

function readDefaultProject() {
  try {
    const rc = JSON.parse(readFileSync(path.join(root, '.firebaserc'), 'utf8'));
    return rc?.projects?.default || '';
  } catch {
    return '';
  }
}

const projectId = (projectArg?.split('=')[1] || process.env.FIREBASE_PROJECT_ID || readDefaultProject()).trim();
if (!projectId) {
  console.error('Defina o projeto: --project=ID ou .firebaserc → projects.default');
  process.exit(1);
}

function runFirebase(firebaseArgs, { json = false } = {}) {
  const bin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const full = ['--yes', 'firebase-tools@latest', ...firebaseArgs, '--project', projectId];
  if (json) full.push('--json');
  const out = execFileSync(bin, full, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  return out;
}

function parseJsonOutput(raw) {
  const text = String(raw || '').trim();
  const start = text.indexOf('{');
  if (start === -1) throw new Error(`Resposta CLI sem JSON:\n${text.slice(0, 400)}`);
  return JSON.parse(text.slice(start));
}

console.log(`Projeto: ${projectId}`);
console.log('1/3 — Apps Web…');

let appsPayload;
try {
  appsPayload = parseJsonOutput(runFirebase(['apps:list', 'WEB'], { json: true }));
} catch (err) {
  console.error('Falha ao listar apps. Faça `npx firebase login` e tente de novo.');
  console.error(err.message || err);
  process.exit(1);
}

const result = appsPayload.result || appsPayload;
const list = Array.isArray(result) ? result : result?.apps || [];
let webApp = list.find((a) => {
  const name = String(a.displayName || a.name || '').toLowerCase();
  return name === displayName || name.includes('wimari');
});

if (!webApp) {
  console.log(`Criando app Web "${displayName}"…`);
  const created = parseJsonOutput(
    runFirebase(['apps:create', 'WEB', displayName], { json: true }),
  );
  webApp = created.result || created;
}

const appId = webApp.appId || webApp.app_id || webApp.name?.split('/').pop();
if (!appId) {
  console.error('Não foi possível obter appId da Web app.', webApp);
  process.exit(1);
}
console.log(`App: ${webApp.displayName || displayName} (${appId})`);

console.log('2/3 — SDK config → js/firebase-config.local.js');
const sdk = parseJsonOutput(runFirebase(['apps:sdkconfig', 'WEB', appId], { json: true }));
const cfg = sdk.result?.sdkConfig || sdk.result || sdk.sdkConfig || sdk;
const localPath = path.join(root, 'js', 'firebase-config.local.js');
const file = `/**
 * Gerado por scripts/setup-firebase.mjs — NÃO commit (gitignored).
 * Projeto: ${projectId} · App: ${displayName}
 */
window.WIMARI_FIREBASE_CONFIG = {
  apiKey: ${JSON.stringify(cfg.apiKey || '')},
  authDomain: ${JSON.stringify(cfg.authDomain || '')},
  projectId: ${JSON.stringify(cfg.projectId || projectId)},
  storageBucket: ${JSON.stringify(cfg.storageBucket || `${projectId}.appspot.com`)},
  messagingSenderId: ${JSON.stringify(cfg.messagingSenderId || '')},
  appId: ${JSON.stringify(cfg.appId || appId)},
};
`;
writeFileSync(localPath, file, 'utf8');
console.log(`Escrito: ${localPath}`);

if (!skipDeploy) {
  console.log('3/3 — Deploy rules (Firestore + Storage)…');
  if (!existsSync(path.join(root, 'firebase.json'))) {
    console.error('firebase.json em falta.');
    process.exit(1);
  }
  try {
    const deployOut = runFirebase(['deploy', '--only', 'firestore:rules,storage']);
    console.log(deployOut);
  } catch (err) {
    console.warn('Deploy de rules falhou (pode precisar ativar Firestore/Storage no Console).');
    console.warn(err.stderr || err.message || err);
  }
} else {
  console.log('3/3 — Deploy ignorado (--skip-deploy)');
}

console.log(`
Automatizado: Web app + config local + rules (se deploy ok).

Ainda manual no Console (API limitada):
  • Authentication → Email/Password (ativar)
  • Users → criar e-mail/senha da cliente
  • Authorized domains → localhost + wimaricosmetic.vercel.app

Depois: abrir /admin/ e entrar.
`);
