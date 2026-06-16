/*
  script.js
  Lógica principal do aplicativo: funções utilitárias, manipulação de cookies,
  armazenamento de agendamentos (localStorage) e interação com a interface.

  Comentários explicam o propósito de cada função e onde são usadas.
*/

/* Nomes de cookie usados pela aplicação */
const COOKIE_NAME_USER = 'user';
const COOKIE_NAME_THEME = 'theme';
const COOKIE_NAME_ROLE = 'role';
const COOKIE_NAME_LAST_APPOINTMENT = 'lastAppointment';


/*
  escapeHtml
  Evita injeção de HTML ao renderizar nomes/valores vindos de cookies/localStorage.
*/
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}


/*
  Funções de cookie: set, get e delete
  - setCookie: grava cookie com opcional tempo de expiração (dias)
  - getCookie: retorna o valor cru do cookie (decodificado) ou null
  - deleteCookie: expira o cookie imediatamente
*/
function setCookie(name, value, days) {
  if (!name) return;
  let expires = '';
  if (days && Number(days) > 0) {
    const date = new Date();
    date.setTime(date.getTime() + Number(days) * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value || '')}${expires}; path=/`;
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const cookie of cookies) {
    const [key, ...valueParts] = cookie.split('=');
    if (decodeURIComponent(key) === name) return decodeURIComponent(valueParts.join('='));
  }
  return null;
}

function deleteCookie(name) {
  if (!name) return;
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}


/*
  listCookies
  Retorna um array com os cookies atuais (nome, valor) e atualiza a tabela
  `cookiesTable` no DOM quando presente.
*/
function listCookies() {
  const cookies = document.cookie ? document.cookie.split('; ').map(entry => {
    const [key, ...valueParts] = entry.split('=');
    return { name: decodeURIComponent(key), value: decodeURIComponent(valueParts.join('=')) };
  }) : [];

  const tbody = document.getElementById('cookiesTable');
  if (!tbody) return cookies; // usado em contextos não-UI também

  tbody.innerHTML = '';
  cookies.forEach(ck => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <button type="button" class="smallEdit" data-name="${encodeURIComponent(ck.name)}" data-value="${encodeURIComponent(ck.value)}">Editar</button>
        <button type="button" class="smallDel" data-name="${encodeURIComponent(ck.name)}">Excluir</button>
      </td>
      <td>${escapeHtml(ck.name)}</td>
      <td>${escapeHtml(ck.value)}</td>
    `;
    tbody.appendChild(tr);
  });

  // liga os handlers dos botões gerados dinamicamente
  attachRowButtons();
  return cookies;
}

/* remove todos os cookies visíveis */
// Remove todos os cookies visíveis
// Uso: ação de limpeza global (ex.: botão 'Limpar cookies')
function clearAllCookies() { listCookies().forEach(c => deleteCookie(c.name)); }


/*
  getCookieObject
  Se o cookie contém JSON, retorna o objeto. Caso contrário, null.
*/
function getCookieObject(name) {
  const raw = getCookie(name);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}


/*
  showResult
  Exibe mensagens de status na área apropriada (`#result` ou `#userInfo`).
*/
function showResult(msg) {
  const el = document.getElementById('result') || document.getElementById('userInfo');
  if (el) el.textContent = msg;
}


/*
  Agendamentos: leitura e gravação em localStorage
*/
function loadAppointments() {
  const raw = localStorage.getItem('appointments');
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveAppointments(list) { localStorage.setItem('appointments', JSON.stringify(list)); }

function renderAppointments() {
  const el = document.getElementById('appointmentsList');
  if (!el) return;
  const list = loadAppointments();
  if (!list.length) { el.textContent = 'Nenhum agendamento.'; return; }

  el.innerHTML = '';
  list.forEach(a => {
    const item = document.createElement('div');
    item.className = 'appointment';
    item.textContent = `${a.service} — ${new Date(a.datetime).toLocaleString()} — R$ ${Number(a.price||0).toFixed(2)} (por ${a.name})`;
    const del = document.createElement('button');
    del.type = 'button'; del.textContent = 'Cancelar';
    del.addEventListener('click', () => {
      const rem = loadAppointments().filter(x => x.id !== a.id);
      saveAppointments(rem);
      showResult('Agendamento cancelado.');
      renderAppointments();
    });
    item.appendChild(del);
    el.appendChild(item);
  });
}


/*
  Serviços: valores padrão e persistência em localStorage
*/
function loadServices() {
  const raw = localStorage.getItem('services');
  if (!raw) return [
    {id:'s1', name:'Consulta Odontológica', price:120.00},
    {id:'s2', name:'Limpeza Dentária', price:80.00},
    {id:'s3', name:'Tratamento Estético', price:200.00},
    {id:'s4', name:'Preenchimento / Botox', price:350.00}
  ];
  try { return JSON.parse(raw); } catch { return []; }
}

function saveServices(list) { localStorage.setItem('services', JSON.stringify(list)); }

function renderServiceOptions() {
  const sel = document.getElementById('serviceSelect'); if (!sel) return;
  sel.innerHTML = '';
  loadServices().forEach(s => { const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.name; sel.appendChild(opt); });
  updatePriceDisplay();
}

function updatePriceDisplay() {
  const sel = document.getElementById('serviceSelect'); const priceEl = document.getElementById('servicePrice');
  if (!sel || !priceEl) return null;
  const s = loadServices().find(x => x.id === sel.value) || loadServices()[0];
  if (s) priceEl.textContent = `R$ ${s.price.toFixed(2)}`;
  return s;
}


/*
  Área do profissional: controle de acesso simples via cookie 'role'
*/
function isProfessional() { return getCookie('role') === 'professional'; }

function renderPricesEditor() {
  const listEl = document.getElementById('pricesList'); if (!listEl) return;
  listEl.innerHTML = '';
  loadServices().forEach(s => {
    const row = document.createElement('div'); row.className = 'price-row';
    row.innerHTML = `<label>${escapeHtml(s.name)}<input data-id="${s.id}" class="priceInput" type="number" min="0" step="0.01" value="${s.price}" /></label>`;
    listEl.appendChild(row);
  });
  // bloquear inputs quando não for profissional
  listEl.querySelectorAll('.priceInput').forEach(i => i.disabled = !isProfessional());
}

function renderProfessionalArea() {
  const editor = document.getElementById('priceEditor'); const pass = document.getElementById('profPass');
  if (editor) editor.classList.toggle('hidden', !isProfessional());
  if (pass) pass.value = '';
  renderPricesEditor();
}


/*
  attachRowButtons
  Liga os botões 'Editar' e 'Excluir' gerados na tabela de cookies.
*/
function attachRowButtons() {
  document.querySelectorAll('.smallDel').forEach(btn => {
    btn.addEventListener('click', e => {
      const name = decodeURIComponent(e.currentTarget.getAttribute('data-name'));
      // Exclui o cookie especificado pelo usuário (ação na tabela de cookies)
      deleteCookie(name);
      showResult(`Cookie "${name}" removido.`);
      listCookies();
    });
  });

  document.querySelectorAll('.smallEdit').forEach(btn => {
    btn.addEventListener('click', e => {
      const t = e.currentTarget;
      const name = decodeURIComponent(t.getAttribute('data-name'));
      const value = decodeURIComponent(t.getAttribute('data-value') || '');
      const nf = document.getElementById('cookieNameEdit');
      const vf = document.getElementById('cookieValueEdit');
      const df = document.getElementById('cookieDaysEdit');
      if (nf) nf.value = name; if (vf) vf.value = value; if (df) df.value = '';
      showResult(`Editando cookie "${name}".`);
    });
  });
}


/*
  Inicialização: liga eventos e renderiza estados iniciais
*/
window.addEventListener('DOMContentLoaded', () => {
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const clearCookiesBtn = document.getElementById('clearCookiesBtn');
  const savePrefBtn = document.getElementById('savePrefBtn');
  const themeSelect = document.getElementById('themeSelect');
  const profLoginBtn = document.getElementById('profLoginBtn');
  const profLogoutBtn = document.getElementById('profLogoutBtn');
  const savePricesBtn = document.getElementById('savePricesBtn');
  const bookBtn = document.getElementById('bookBtn');

  function renderUser() {
    const ui = document.getElementById('userInfo');
    const u = getCookieObject('user');
    if (!u) { if (ui) ui.textContent = 'Não autenticado.'; return; }
    if (ui) ui.textContent = `Logado como ${u.name} (${u.email})`;
    if (userName) userName.value = u.name; if (userEmail) userEmail.value = u.email;
  }

  if (loginBtn) loginBtn.addEventListener('click', () => {
    const name = userName.value.trim(); const email = userEmail.value.trim();
    if (!name) { showResult('Informe seu nome.'); return; }
    // Cria/atualiza cookie 'user' contendo JSON com nome e email (duração: 7 dias)
    setCookie('user', JSON.stringify({ name, email }), 7);
    showResult('Sessão iniciada.'); renderUser();
  });

  if (logoutBtn) logoutBtn.addEventListener('click', () => {
    // Exclui cookie de sessão 'user' (logout)
    deleteCookie('user'); showResult('Sessão encerrada.'); renderUser();
  });
  if (clearCookiesBtn) clearCookiesBtn.addEventListener('click', () => { clearAllCookies(); showResult('Cookies limpos.'); renderUser(); });

  if (savePrefBtn) savePrefBtn.addEventListener('click', () => {
    const t = themeSelect.value;
    // Salva preferência de tema no cookie 'theme' (persistência por 365 dias)
    setCookie('theme', t, 365);
    document.documentElement.dataset.theme = t; showResult('Preferência salva.');
  });
  if (themeSelect) themeSelect.addEventListener('change', () => { document.documentElement.dataset.theme = themeSelect.value; });

  if (profLoginBtn) profLoginBtn.addEventListener('click', () => {
    const pass = document.getElementById('profPass').value || '';
    if (pass === 'admin123') {
      // Cria cookie 'role' = 'professional' para habilitar a área profissional (expira em 1 dia)
      setCookie('role','professional',1); showResult('Entrou como profissional.'); renderProfessionalArea();
    } else showResult('Senha incorreta.');
  });

  if (profLogoutBtn) profLogoutBtn.addEventListener('click', () => {
    // Remove a role profissional do cookie (revoga acesso)
    deleteCookie('role'); showResult('Saída do modo profissional.'); renderProfessionalArea();
  });

  if (savePricesBtn) savePricesBtn.addEventListener('click', () => {
    if (!isProfessional()) { showResult('Apenas profissional pode salvar preços.'); return; }
    const inputs = document.querySelectorAll('.priceInput'); const services = loadServices();
    inputs.forEach(inp => { const id = inp.getAttribute('data-id'); const s = services.find(x=>x.id===id); if (s) s.price = parseFloat(inp.value) || 0; });
    saveServices(services); renderServiceOptions(); showResult('Preços atualizados.');
  });

  if (bookBtn) bookBtn.addEventListener('click', () => {
    const u = getCookieObject('user'); const name = u ? u.name : (userName.value.trim() || 'Visitante');
    const s = updatePriceDisplay(); const service = s ? s.name : (document.getElementById('serviceSelect')?.value || '');
    const dt = document.getElementById('dateTime').value; if (!dt) { showResult('Escolha data e hora.'); return; }
    const a = { id: Date.now().toString(), name, service, datetime: dt, price: s ? s.price : 0 };
    const list = loadAppointments(); list.push(a); saveAppointments(list);
    // Armazena o último agendamento em cookie 'lastAppointment' para referência rápida
    setCookie('lastAppointment', JSON.stringify({ service: a.service, datetime: a.datetime }), 30);
    showResult('Agendamento salvo.'); renderAppointments();
  });

  // botões de cookies
  const refreshBtn = document.getElementById('refreshCookiesBtn'); if (refreshBtn) refreshBtn.addEventListener('click', listCookies);
  const updateBtn = document.getElementById('updateCookieBtn'); if (updateBtn) updateBtn.addEventListener('click', () => {
    const name = document.getElementById('cookieNameEdit').value; const value = document.getElementById('cookieValueEdit').value; const days = document.getElementById('cookieDaysEdit').value || 0;
    if (!name) { showResult('Nenhum cookie selecionado para atualizar.'); return; }
    // Atualiza/Cria cookie manualmente via formulário de edição
    setCookie(name, value, days); showResult(`Cookie "${name}" atualizado.`); listCookies();
  });

  const deleteBtn = document.getElementById('deleteCookieBtn'); if (deleteBtn) deleteBtn.addEventListener('click', () => {
    const name = document.getElementById('cookieNameEdit').value; if (!name) { showResult('Nenhum cookie selecionado para excluir.'); return; }
    // Exclui cookie selecionado pelo formulário
    deleteCookie(name); showResult(`Cookie "${name}" excluído.`); document.getElementById('cookieNameEdit').value=''; document.getElementById('cookieValueEdit').value=''; document.getElementById('cookieDaysEdit').value=''; listCookies();
  });

  // aplicar tema salvo
  const storedTheme = getCookie('theme'); if (storedTheme && themeSelect) { themeSelect.value = storedTheme; document.documentElement.dataset.theme = storedTheme; }

  // inicializações visuais
  renderUser(); renderAppointments(); listCookies(); renderServiceOptions(); renderProfessionalArea();
});
