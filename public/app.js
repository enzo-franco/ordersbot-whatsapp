const elements = {
  pill: document.getElementById('connection-pill'),
  connection: document.getElementById('connection-content'),
  notice: document.getElementById('notice'),
  groupList: document.getElementById('group-list'),
  groupCount: document.getElementById('group-count'),
  refresh: document.getElementById('refresh-groups'),
  weekdayMessages: document.getElementById('weekday-messages'),
  preview: document.getElementById('preview-text'),
  previewDay: document.getElementById('preview-day'),
  enabled: document.getElementById('enabled'),
  save: document.getElementById('save'),
  saveStatus: document.getElementById('save-status'),
  history: document.getElementById('history-list'),
  testGroup: document.getElementById('test-group'),
  testDay: document.getElementById('test-day'),
  sendTest: document.getElementById('send-test'),
  testStatus: document.getElementById('test-status')
};

let groupData = [];
let selectedIds = new Set();
let initialized = false;
let busy = false;
let testBusy = false;
let connectionReady = false;
let savedSelectedIds = new Set();
let weekdayMessages = {};
let savedWeekdayMessages = {};
const weekdayNames = { Mon: 'Segunda-feira', Tue: 'Terça-feira', Wed: 'Quarta-feira', Thu: 'Quinta-feira', Fri: 'Sexta-feira' };

function showNotice(text) {
  elements.notice.hidden = !text;
  elements.notice.textContent = text || '';
}

function updatePreview() {
  elements.preview.textContent = weekdayMessages[elements.previewDay.value] || 'Sua mensagem aparecerá aqui.';
}

function renderWeekdayEditors() {
  elements.weekdayMessages.replaceChildren();
  for (const [day, name] of Object.entries(weekdayNames)) {
    const wrapper = document.createElement('div');
    wrapper.className = 'weekday-editor';
    const label = document.createElement('label');
    label.htmlFor = `weekday-${day}`;
    label.textContent = name;
    const textarea = document.createElement('textarea');
    textarea.id = `weekday-${day}`;
    textarea.maxLength = 1000;
    textarea.rows = 5;
    textarea.value = weekdayMessages[day] || '';
    const count = document.createElement('small');
    count.textContent = `${textarea.value.length}/1000`;
    textarea.addEventListener('input', () => {
      weekdayMessages[day] = textarea.value;
      count.textContent = `${textarea.value.length}/1000`;
      updatePreview();
      elements.saveStatus.textContent = 'Alterações ainda não salvas.';
    });
    wrapper.append(label, textarea, count);
    elements.weekdayMessages.append(wrapper);
  }
}

function updateCount() {
  const count = selectedIds.size;
  elements.groupCount.textContent = count === 1 ? '1 grupo selecionado' : `${count} grupos selecionados`;
}

function renderGroups() {
  elements.groupList.replaceChildren();
  if (!groupData.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Nenhum grupo disponível. Confira a conexão e atualize a lista.';
    elements.groupList.append(p);
  }
  for (const group of groupData) {
    const label = document.createElement('label');
    label.className = 'group-row';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedIds.has(group.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedIds.add(group.id);
      else selectedIds.delete(group.id);
      updateCount();
      elements.saveStatus.textContent = 'Alterações ainda não salvas.';
    });
    const avatar = document.createElement('span');
    avatar.className = 'group-avatar';
    avatar.textContent = group.name.trim().slice(0, 1).toUpperCase() || 'G';
    const name = document.createElement('span');
    name.className = 'group-name';
    name.textContent = group.name;
    label.append(checkbox, avatar, name);
    elements.groupList.append(label);
  }
  updateCount();
}

function renderTestGroups() {
  const previous = elements.testGroup.value;
  elements.testGroup.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Escolha um grupo salvo';
  elements.testGroup.append(placeholder);
  for (const group of groupData.filter(item => savedSelectedIds.has(item.id))) {
    const option = document.createElement('option');
    option.value = group.id;
    option.textContent = group.name;
    elements.testGroup.append(option);
  }
  if ([...elements.testGroup.options].some(option => option.value === previous)) elements.testGroup.value = previous;
  elements.sendTest.disabled = !connectionReady || !elements.testGroup.value || testBusy;
}

function renderConnection(state) {
  const labels = { connecting: 'Conectando…', qr: 'Aguardando QR Code', ready: 'WhatsApp conectado', error: 'Erro de conexão', disconnected: 'Desconectado' };
  elements.pill.textContent = labels[state.connection] || 'Verificando…';
  elements.pill.dataset.state = state.connection;
  elements.connection.replaceChildren();
  const p = document.createElement('p');
  if (state.connection === 'qr' && state.qrDataUrl) {
    p.textContent = 'No celular, abra WhatsApp → Dispositivos conectados → Conectar dispositivo e escaneie o código.';
    const image = document.createElement('img');
    image.src = state.qrDataUrl;
    image.alt = 'QR Code para conectar o WhatsApp';
    image.className = 'qr-image';
    elements.connection.append(p, image);
  } else {
    const messages = {
      connecting: 'Iniciando a sessão do WhatsApp. Isso pode levar alguns instantes.',
      ready: 'Tudo pronto. Escolha os grupos e salve o agendamento.',
      error: 'Não foi possível iniciar o WhatsApp. Verifique o erro e reinicie o aplicativo.',
      disconnected: 'A sessão foi desconectada. Reinicie o aplicativo para conectar novamente.'
    };
    p.textContent = messages[state.connection] || 'Aguardando conexão…';
    elements.connection.append(p);
  }
  if (state.connectionError) {
    const error = document.createElement('p');
    error.className = 'error-text';
    error.textContent = state.connectionError;
    elements.connection.append(error);
  }
}

function renderHistory(items) {
  elements.history.replaceChildren();
  if (!items.length) {
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Os envios aparecerão aqui.';
    elements.history.append(p);
  }
  for (const item of items.slice(0, 8)) {
    const row = document.createElement('div');
    row.className = 'history-row';
    const left = document.createElement('div');
    const name = document.createElement('strong');
    name.textContent = item.kind === 'test' ? `Teste: ${item.groupName}` : item.kind === 'manual' ? `Envio imediato: ${item.groupName}` : item.groupName;
    const date = document.createElement('small');
    date.textContent = new Date(item.at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    left.append(name, date);
    const status = document.createElement('span');
    status.className = `history-status ${item.status}`;
    status.textContent = { enviado: 'Enviado', falhou: 'Falhou', iniciando: 'Em andamento' }[item.status] || item.status;
    if (item.error) status.title = item.error;
    row.append(left, status);
    elements.history.append(row);
  }
}

async function api(path, options) {
  const response = await fetch(path, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Falha na comunicação.');
  return data;
}

async function refreshState() {
  try {
    const state = await api('/api/state');
    showNotice('');
    renderConnection(state);
    connectionReady = state.connection === 'ready';
    const oldIds = groupData.map(group => group.id).join('|');
    groupData = state.groups;
    if (!initialized) {
      selectedIds = new Set(state.settings.selectedGroupIds);
      savedSelectedIds = new Set(state.settings.selectedGroupIds);
      weekdayMessages = { ...state.settings.weekdayMessages };
      savedWeekdayMessages = { ...state.settings.weekdayMessages };
      elements.enabled.checked = state.settings.enabled;
      renderWeekdayEditors();
      updatePreview();
      initialized = true;
      renderGroups();
      renderTestGroups();
    } else if (groupData.map(group => group.id).join('|') !== oldIds) {
      renderGroups();
      renderTestGroups();
    }
    elements.sendTest.disabled = !connectionReady || !elements.testGroup.value || testBusy;
    renderHistory(state.history);
    elements.refresh.disabled = state.connection !== 'ready' || busy;
  } catch (error) {
    showNotice(`Não foi possível carregar o painel: ${error.message}`);
  }
}

elements.previewDay.addEventListener('change', updatePreview);
elements.enabled.addEventListener('change', () => { elements.saveStatus.textContent = 'Alterações ainda não salvas.'; });
elements.refresh.addEventListener('click', async () => {
  busy = true;
  elements.refresh.disabled = true;
  try {
    const data = await api('/api/groups/refresh', { method: 'POST' });
    groupData = data.groups;
    renderGroups();
    renderTestGroups();
    showNotice('Lista de grupos atualizada.');
  } catch (error) { showNotice(error.message); }
  finally { busy = false; elements.refresh.disabled = false; }
});
elements.save.addEventListener('click', async () => {
  elements.save.disabled = true;
  try {
    await api('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekdayMessages, selectedGroupIds: [...selectedIds], enabled: elements.enabled.checked })
    });
    savedSelectedIds = new Set(selectedIds);
    savedWeekdayMessages = Object.fromEntries(Object.entries(weekdayMessages).map(([day, message]) => [day, message.trim()]));
    renderTestGroups();
    elements.saveStatus.textContent = 'Agendamento salvo.';
    showNotice('');
  } catch (error) { elements.saveStatus.textContent = error.message; }
  finally { elements.save.disabled = false; }
});

elements.testGroup.addEventListener('change', () => {
  elements.sendTest.disabled = !connectionReady || !elements.testGroup.value || testBusy;
});
elements.sendTest.addEventListener('click', async () => {
  const groupId = elements.testGroup.value;
  const weekday = elements.testDay.value;
  const group = groupData.find(item => item.id === groupId);
  if (!group || !savedSelectedIds.has(groupId)) return;
  const text = `[TESTE DO BOT — não é o envio agendado]\n\n${savedWeekdayMessages[weekday]}`;
  if (!window.confirm(`Enviar a mensagem de ${weekdayNames[weekday]} agora para “${group.name}”?\n\n${text}`)) return;
  testBusy = true;
  elements.sendTest.disabled = true;
  elements.testStatus.textContent = 'Enviando teste…';
  try {
    await api('/api/test-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groupId, weekday })
    });
    elements.testStatus.textContent = `Teste enviado para ${group.name}. Confira a mensagem no grupo.`;
    await refreshState();
  } catch (error) {
    elements.testStatus.textContent = `O teste falhou: ${error.message}`;
    await refreshState();
  } finally {
    testBusy = false;
    elements.sendTest.disabled = !connectionReady || !elements.testGroup.value;
  }
});

refreshState();
setInterval(refreshState, 5000);
