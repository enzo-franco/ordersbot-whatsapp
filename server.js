const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const QRCode = require('qrcode');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { TIME_ZONE, localDate, scheduledDate } = require('./scheduler');
const { WEEKDAYS, DEFAULT_WEEKDAY_MESSAGES, messageForDate } = require('./messages');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const LOG_FILE = path.join(DATA_DIR, 'connection.log');
const DEFAULT_MESSAGE = 'Bom dia! Espero que estejam bem. Gostaria de saber se desejam fazer algum pedido hoje. Fico à disposição para ajudar.';
const PORT = Number(process.env.PORT || 3000);

fs.mkdirSync(DATA_DIR, { recursive: true });

function logEvent(event, error) {
  const detail = error ? `: ${error.stack || error.message || String(error)}` : '';
  fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${event}${detail}\n`);
}

process.on('uncaughtException', error => { logEvent('uncaughtException', error); process.exit(1); });
process.on('unhandledRejection', error => { logEvent('unhandledRejection', error); process.exit(1); });

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  const tempFile = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(tempFile, file);
}

let settings = readJson(SETTINGS_FILE, {
  message: DEFAULT_MESSAGE,
  weekdayMessages: DEFAULT_WEEKDAY_MESSAGES,
  selectedGroupIds: [],
  enabled: false
});
if (!settings.weekdayMessages) {
  settings.weekdayMessages = { ...DEFAULT_WEEKDAY_MESSAGES };
  writeJson(SETTINGS_FILE, settings);
}
let history = readJson(HISTORY_FILE, []);
if (!Array.isArray(history)) throw new Error('Histórico inválido em data/history.json');

let connection = 'connecting';
let phase = 'starting';
let qrDataUrl = null;
let connectionError = null;
let groups = [];
let sending = false;
let testSending = false;
let readyInProgress = false;

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const browserPath = chromeCandidates.find(candidate => candidate && fs.existsSync(candidate));

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(ROOT, '.wwebjs_auth') }),
  puppeteer: {
    headless: true,
    ...(browserPath ? { executablePath: browserPath } : {})
  }
});

async function refreshGroups() {
  if (connection !== 'ready') throw new Error('Conecte o WhatsApp para carregar os grupos.');
  // getChats() da versão atual falha ao serializar alguns IDs do WhatsApp Web.
  // Ler só os campos necessários evita serializar mensagens e metadados antigos.
  const chats = await client.pupPage.evaluate(() => {
    const models = window.require('WAWebCollections').Chat.getModelsArray();
    return models.map(chat => {
      const wid = chat.id;
      const id = wid?._serialized || wid?.id ||
        (wid?.user && wid?.server ? `${wid.user}@${wid.server}` : String(wid));
      return {
        id,
        name: chat.formattedTitle || chat.name || 'Grupo sem nome',
        isGroup: Boolean(chat.groupMetadata) || wid?.isGroup?.() === true,
        isReadOnly: Boolean(chat.groupMetadata?.announce)
      };
    });
  });
  groups = chats
    .filter(chat => chat.isGroup && !chat.isReadOnly && typeof chat.id === 'string' && chat.id.endsWith('@g.us'))
    .map(chat => ({ id: chat.id, name: chat.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return groups;
}

function saveHistory(entry) {
  const index = entry.kind === 'test' ? -1 : history.findIndex(item => (item.kind || 'scheduled') === (entry.kind || 'scheduled') && item.date === entry.date && item.groupId === entry.groupId);
  if (index >= 0) history[index] = entry;
  else history.unshift(entry);
  history = history.slice(0, 500);
  writeJson(HISTORY_FILE, history);
}

async function runScheduledSend(now = new Date()) {
  if (sending || connection !== 'ready' || !settings.enabled) return;
  const date = scheduledDate(now);
  if (!date) return;

  sending = true;
  try {
    const { selectedGroupIds } = settings;
    const message = messageForDate(date, settings.weekdayMessages);
    for (const groupId of selectedGroupIds) {
      if (history.some(item => item.kind !== 'test' && item.date === date && item.groupId === groupId)) continue;
      const groupName = groups.find(group => group.id === groupId)?.name || groupId;
      const entry = { date, groupId, groupName, status: 'iniciando', at: new Date().toISOString() };
      // Persiste antes do envio: após uma queda, não haverá repetição automática incerta.
      saveHistory(entry);
      try {
        if (!groups.some(group => group.id === groupId)) throw new Error('Grupo indisponível para envio.');
        await client.sendMessage(groupId, message, { waitUntilMsgSent: true, sendSeen: false, linkPreview: false });
        entry.status = 'enviado';
      } catch (error) {
        entry.status = 'falhou';
        entry.error = error.message;
      }
      entry.at = new Date().toISOString();
      saveHistory(entry);
    }
  } finally {
    sending = false;
  }
}

async function runManualSend() {
  if (connection !== 'ready') throw new Error('O WhatsApp precisa estar conectado.');
  if (sending || testSending) throw new Error('Já existe um envio em andamento.');
  if (!settings.selectedGroupIds.length) throw new Error('Nenhum grupo foi selecionado.');
  const date = localDate(new Date());
  const message = messageForDate(date, settings.weekdayMessages);
  const { selectedGroupIds } = settings;
  sending = true;
  const result = { sent: 0, failed: 0, skipped: 0 };
  try {
    for (const groupId of selectedGroupIds) {
      if (history.some(item => item.kind === 'manual' && item.date === date && item.groupId === groupId)) {
        result.skipped++;
        continue;
      }
      const groupName = groups.find(group => group.id === groupId)?.name || groupId;
      const entry = { kind: 'manual', date, groupId, groupName, status: 'iniciando', at: new Date().toISOString() };
      // Marca antes do envio para evitar repetir uma mensagem após uma interrupção.
      saveHistory(entry);
      try {
        if (!groups.some(group => group.id === groupId)) throw new Error('Grupo indisponível para envio.');
        await client.sendMessage(groupId, message, { waitUntilMsgSent: true, sendSeen: false, linkPreview: false });
        entry.status = 'enviado';
        result.sent++;
      } catch (error) {
        entry.status = 'falhou';
        entry.error = error.message;
        result.failed++;
      }
      entry.at = new Date().toISOString();
      saveHistory(entry);
    }
  } finally {
    sending = false;
  }
  return result;
}

client.on('qr', async qr => {
  logEvent('qr');
  connection = 'qr';
  phase = 'waiting-for-qr';
  connectionError = null;
  try { qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 320 }); }
  catch (error) { connectionError = error.message; }
});
client.on('authenticated', () => { logEvent('authenticated'); connection = 'connecting'; phase = 'authenticated'; qrDataUrl = null; });
async function markReady(source) {
  if (connection === 'ready' || readyInProgress) return;
  readyInProgress = true;
  logEvent(source);
  connection = 'ready';
  phase = 'ready';
  qrDataUrl = null;
  connectionError = null;
  try { await refreshGroups(); }
  catch (error) { logEvent('refreshGroups failed', error); connectionError = `Falha ao carregar grupos: ${error.message}`; }
  runScheduledSend().catch(error => { connectionError = error.message; });
  readyInProgress = false;
}
client.on('ready', () => { markReady('ready event').catch(error => { logEvent('markReady failed', error); readyInProgress = false; }); });
client.on('auth_failure', message => { logEvent('auth_failure', message); connection = 'error'; phase = 'auth-failure'; connectionError = message; });
client.on('disconnected', reason => { logEvent('disconnected', reason); connection = 'disconnected'; phase = 'disconnected'; connectionError = String(reason); groups = []; });

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function bodyJson(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 10000) throw new Error('Dados muito grandes.');
  }
  return JSON.parse(text);
}

const staticFiles = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/style.css': ['style.css', 'text/css; charset=utf-8'],
  '/test.css': ['test.css', 'text/css; charset=utf-8'],
  '/weekdays.css': ['weekdays.css', 'text/css; charset=utf-8']
};

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  const origin = req.headers.origin;
  if (origin && origin !== `http://127.0.0.1:${PORT}` && origin !== `http://localhost:${PORT}`) {
    return json(res, 403, { error: 'Origem não permitida.' });
  }
  try {
    if (req.method === 'GET' && pathname === '/api/state') {
      return json(res, 200, { connection, connectionError, qrDataUrl, groups, settings, history: history.slice(0, 30), timeZone: TIME_ZONE });
    }
    if (req.method === 'GET' && pathname === '/api/diagnostics') {
      const page = client.pupPage;
      let browser = null;
      if (page) {
        try {
          browser = await page.evaluate(() => ({
            readyState: document.readyState,
            hasWWebJS: Boolean(window.WWebJS),
            hasWhatsAppCollections: Boolean(window.require?.('WAWebCollections')),
            socketState: window.require?.('WAWebSocketModel')?.Socket?.state,
            hasSynced: window.require?.('WAWebSocketModel')?.Socket?.hasSynced,
            bodyLength: document.body?.innerText?.length || 0
          }));
        } catch (error) { browser = { error: error.message }; }
      }
      return json(res, 200, { connection, phase, pagePresent: Boolean(page), browser });
    }
    if (req.method === 'POST' && pathname === '/api/groups/refresh') {
      return json(res, 200, { groups: await refreshGroups() });
    }
    if (req.method === 'PUT' && pathname === '/api/settings') {
      const input = await bodyJson(req);
      const weekdayMessages = {};
      for (const day of WEEKDAYS) {
        const message = String(input.weekdayMessages?.[day] || '').trim();
        if (!message || message.length > 1000) throw new Error(`A mensagem de ${day} deve ter de 1 a 1000 caracteres.`);
        weekdayMessages[day] = message;
      }
      const selectedGroupIds = input.selectedGroupIds;
      if (!Array.isArray(selectedGroupIds) || selectedGroupIds.some(id => typeof id !== 'string')) throw new Error('Selecione grupos válidos.');
      if (new Set(selectedGroupIds).size !== selectedGroupIds.length) throw new Error('Há grupos repetidos.');
      const allowed = new Set([...groups.map(group => group.id), ...settings.selectedGroupIds]);
      if (selectedGroupIds.some(id => !allowed.has(id))) throw new Error('Atualize a lista de grupos e selecione novamente.');
      if (input.enabled && selectedGroupIds.length === 0) throw new Error('Selecione ao menos um grupo antes de ativar.');
      if (typeof input.enabled !== 'boolean') throw new Error('Estado do agendamento inválido.');
      settings = { ...settings, weekdayMessages, selectedGroupIds, enabled: input.enabled };
      writeJson(SETTINGS_FILE, settings);
      return json(res, 200, { settings });
    }
    if (req.method === 'POST' && pathname === '/api/test-send') {
      if (connection !== 'ready') throw new Error('O WhatsApp precisa estar conectado para enviar um teste.');
      if (testSending || sending) throw new Error('Já existe um envio em andamento. Aguarde um momento.');
      testSending = true;
      try {
        const { groupId, weekday } = await bodyJson(req);
        const group = groups.find(item => item.id === groupId);
        if (!group || !settings.selectedGroupIds.includes(groupId)) throw new Error('Escolha um dos grupos salvos no agendamento.');
        if (!WEEKDAYS.includes(weekday)) throw new Error('Escolha um dia útil para o teste.');
        const recentTest = history.some(item => item.kind === 'test' && item.groupId === groupId && item.status === 'enviado' && Date.now() - Date.parse(item.at) < 5 * 60 * 1000);
        if (recentTest) throw new Error('Um teste já foi enviado a este grupo nos últimos 5 minutos.');
        const message = `[TESTE DO BOT — não é o envio agendado]\n\n${settings.weekdayMessages[weekday]}`;
        try {
          await client.sendMessage(groupId, message, { waitUntilMsgSent: true, sendSeen: false, linkPreview: false });
          const entry = { kind: 'test', date: new Date().toISOString().slice(0, 10), groupId, groupName: group.name, status: 'enviado', at: new Date().toISOString() };
          saveHistory(entry);
          return json(res, 200, { status: 'enviado', groupName: group.name });
        } catch (error) {
          const entry = { kind: 'test', date: new Date().toISOString().slice(0, 10), groupId, groupName: group.name, status: 'falhou', at: new Date().toISOString(), error: error.message };
          saveHistory(entry);
          throw error;
        }
      } finally {
        testSending = false;
      }
    }
    if (req.method === 'POST' && pathname === '/api/send-now') {
      const input = await bodyJson(req);
      if (input.confirm !== 'SEND_TODAY') throw new Error('Confirmação inválida.');
      const result = await runManualSend();
      logEvent(`manual send: ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped`);
      return json(res, 200, result);
    }
    if (req.method === 'GET' && staticFiles[pathname]) {
      const [file, type] = staticFiles[pathname];
      res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
      return fs.createReadStream(path.join(ROOT, 'public', file)).pipe(res);
    }
    return json(res, 404, { error: 'Página não encontrada.' });
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Painel: http://127.0.0.1:${PORT}`);
  logEvent('starting');
  client.initialize().catch(error => { logEvent('initialize failed', error); connection = 'error'; connectionError = error.message; });
  setInterval(() => runScheduledSend().catch(error => { connectionError = error.message; }), 15000);
  setInterval(async () => {
    if (connection !== 'connecting' || phase !== 'authenticated' || !client.pupPage) return;
    try {
      const connected = await client.pupPage.evaluate(() => {
        const socket = window.require?.('WAWebSocketModel')?.Socket;
        return Boolean(window.WWebJS && socket?.state === 'CONNECTED' && socket?.hasSynced);
      });
      if (connected) await markReady('ready after sync');
    } catch (error) { logEvent('sync check failed', error); }
  }, 10000);
});
