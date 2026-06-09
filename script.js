function setCookie(name, value, days) {
  if (!name) return;
  // Remover cookie existente com mesmo nome/path antes de definir
  try { deleteCookie(name); } catch (e) {}
  let expires = '';
  if (days && Number(days) > 0) {
    const date = new Date();
    date.setTime(date.getTime() + Number(days) * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = encodeURIComponent(name) + '=' + encodeURIComponent(value || '') + expires + '; path=/';
}

function getCookie(name) {
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (let c of cookies) {
    const [k, ...v] = c.split('=');
    if (decodeURIComponent(k) === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

function deleteCookie(name) {
  if (!name) return;
  document.cookie = encodeURIComponent(name) + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

function listCookies() {
  const cookies = document.cookie ? document.cookie.split('; ').map(c => {
    const [k, ...v] = c.split('=');
    return { name: decodeURIComponent(k), value: decodeURIComponent(v.join('=')) };
  }) : [];
  const tbody = document.getElementById('cookiesTable');
  if (!tbody) return cookies;
  tbody.innerHTML = '';
  for (let ck of cookies) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><button data-name="${encodeURIComponent(ck.name)}" data-value="${encodeURIComponent(ck.value)}" class="smallEdit">Editar</button> <button data-name="${encodeURIComponent(ck.name)}" class="smallDel">Excluir</button></td><td>${escapeHtml(ck.name)}</td><td>${escapeHtml(ck.value)}</td>`;
    tbody.appendChild(tr);
  }
  attachRowButtons();
  return cookies;
}

function clearAllCookies() {
  const cookies = listCookies();
  cookies.forEach(c => deleteCookie(c.name));
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];});
}

function attachRowButtons(){
  document.querySelectorAll('.smallDel').forEach(btn => {
    btn.removeEventListener && btn.removeEventListener('click', ()=>{});
    btn.addEventListener('click', e => {
      const name = decodeURIComponent(e.currentTarget.getAttribute('data-name'));
      deleteCookie(name);
      showResult(`Cookie "${name}" removido.`);
      listCookies();
    });
  });

  document.querySelectorAll('.smallEdit').forEach(btn => {
    btn.removeEventListener && btn.removeEventListener('click', ()=>{});
    btn.addEventListener('click', e => {
      const name = decodeURIComponent(e.currentTarget.getAttribute('data-name'));
      const value = decodeURIComponent(e.currentTarget.getAttribute('data-value') || '');
      const nameField = document.getElementById('cookieNameEdit');
      const valueField = document.getElementById('cookieValueEdit');
      const daysField = document.getElementById('cookieDaysEdit');
      if (nameField) nameField.value = name;
      if (valueField) valueField.value = value;
      if (daysField) daysField.value = '';
      showResult(`Editando cookie "${name}".`);
    });
  });
}

function showResult(txt){
  const el = document.getElementById('result') || document.getElementById('userInfo');
  if (el) el.textContent = txt;
}

window.addEventListener('DOMContentLoaded', () => {
  // Autenticação simples via cookie
  const userName = document.getElementById('userName');
  const userEmail = document.getElementById('userEmail');
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const clearCookiesBtn = document.getElementById('clearCookiesBtn');
  const userInfo = document.getElementById('userInfo');

  const themeSelect = document.getElementById('themeSelect');
  const savePrefBtn = document.getElementById('savePrefBtn');

  const serviceSelect = document.getElementById('serviceSelect');
  const dateTime = document.getElementById('dateTime');
  const bookBtn = document.getElementById('bookBtn');
  const appointmentsList = document.getElementById('appointmentsList');
  const servicePrice = document.getElementById('servicePrice');
  const profPass = document.getElementById('profPass');
  const profLoginBtn = document.getElementById('profLoginBtn');
  const profLogoutBtn = document.getElementById('profLogoutBtn');
  const priceEditor = document.getElementById('priceEditor');
  const pricesList = document.getElementById('pricesList');
  const savePricesBtn = document.getElementById('savePricesBtn');

  function getUserFromCookie(){
    const txt = getCookie('user');
    if (!txt) return null;
    try{ return JSON.parse(txt); }catch(e){ return null; }
  }

  function renderUser(){
    const u = getUserFromCookie();
    if (u){
      userInfo.textContent = `Logado como ${u.name} (${u.email})`;
      userName.value = u.name;
      userEmail.value = u.email;
    } else {
      userInfo.textContent = 'Não autenticado.';
    }
  }

  loginBtn.addEventListener('click', ()=>{
    const name = userName.value.trim();
    const email = userEmail.value.trim();
    if (!name) { showResult('Informe seu nome.'); return; }
    const obj = { name, email };
    setCookie('user', JSON.stringify(obj), 7);
    showResult('Sessão iniciada.');
    renderUser();
  });

  logoutBtn.addEventListener('click', ()=>{
    deleteCookie('user');
    showResult('Sessão encerrada.');
    renderUser();
  });

  clearCookiesBtn.addEventListener('click', ()=>{
    clearAllCookies();
    showResult('Cookies limpos.');
    renderUser();
  });

  // Preferências
  savePrefBtn.addEventListener('click', ()=>{
    const theme = themeSelect.value;
    setCookie('theme', theme, 365);
    document.documentElement.setAttribute('data-theme', theme);
    showResult('Preferência salva.');
  });

  // Agendamentos: armazenamos em localStorage e gravamos resumo no cookie lastAppointment
  function loadAppointments(){
    const raw = localStorage.getItem('appointments');
    try{ return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
  }

  function saveAppointments(list){
    localStorage.setItem('appointments', JSON.stringify(list));
  }

  function renderAppointments(){
    const list = loadAppointments();
    if (!list.length){ appointmentsList.textContent = 'Nenhum agendamento.'; return; }
    appointmentsList.innerHTML = '';
    list.forEach(a => {
      const el = document.createElement('div');
      el.className = 'appointment';
      el.textContent = `${a.service} — ${new Date(a.datetime).toLocaleString()} — R$ ${Number(a.price||0).toFixed(2)} (por ${a.name})`;
      const del = document.createElement('button');
      del.textContent = 'Cancelar';
      del.addEventListener('click', ()=>{
        const rem = loadAppointments().filter(x=>x.id!==a.id);
        saveAppointments(rem);
        showResult('Agendamento cancelado.');
        renderAppointments();
      });
      el.appendChild(del);
      appointmentsList.appendChild(el);
    });
  }

  // Serviços e preços (persistidos em localStorage). Estrutura: [{id, name, price}]
  function loadServices(){
    const raw = localStorage.getItem('services');
    if (!raw) return [
      {id:'s1', name:'Consulta Odontológica', price:120.00},
      {id:'s2', name:'Limpeza Dentária', price:80.00},
      {id:'s3', name:'Tratamento Estético', price:200.00},
      {id:'s4', name:'Preenchimento / Botox', price:350.00}
    ];
    try{ return JSON.parse(raw); }catch(e){ return []; }
  }

  function saveServices(list){
    localStorage.setItem('services', JSON.stringify(list));
  }

  function renderServiceOptions(){
    const list = loadServices();
    serviceSelect.innerHTML = '';
    list.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      serviceSelect.appendChild(opt);
    });
    updatePriceDisplay();
  }

  function updatePriceDisplay(){
    const list = loadServices();
    const sel = serviceSelect.value;
    const s = list.find(x=>x.id===sel) || list[0];
    if (s && servicePrice) servicePrice.textContent = `R$ ${s.price.toFixed(2)}`;
    return s;
  }

  serviceSelect && serviceSelect.addEventListener('change', updatePriceDisplay);

  // Profissional: autenticação simples via senha e cookie 'role=professional'
  function isProfessional(){ return getCookie('role')==='professional'; }

  profLoginBtn && profLoginBtn.addEventListener('click', ()=>{
    const pass = profPass.value || '';
    // senha hardcoded para demonstração
    if (pass === 'admin123'){
      setCookie('role','professional',1);
      showResult('Entrou como profissional.');
      renderProfessionalArea();
    } else showResult('Senha incorreta.');
  });

  profLogoutBtn && profLogoutBtn.addEventListener('click', ()=>{
    deleteCookie('role');
    showResult('Saída do modo profissional.');
    renderProfessionalArea();
  });

  function renderProfessionalArea(){
    const ok = isProfessional();
    if (priceEditor) priceEditor.style.display = ok ? 'block' : 'none';
    if (profPass) profPass.value = '';
    renderPricesEditor();
  }

  function renderPricesEditor(){
    if (!pricesList) return;
    const list = loadServices();
    pricesList.innerHTML = '';
    list.forEach(s=>{
      const row = document.createElement('div');
      row.className = 'price-row';
      row.innerHTML = `<label>${escapeHtml(s.name)}<input data-id="${s.id}" class="priceInput" type="number" min="0" step="0.01" value="${s.price}" /></label>`;
      pricesList.appendChild(row);
    });
    // se não for profissional, desabilitar inputs
    const inputs = pricesList.querySelectorAll('.priceInput');
    inputs.forEach(i=> i.disabled = !isProfessional());
  }

  savePricesBtn && savePricesBtn.addEventListener('click', ()=>{
    if (!isProfessional()){ showResult('Apenas profissional pode salvar preços.'); return; }
    const inputs = pricesList.querySelectorAll('.priceInput');
    const list = loadServices();
    inputs.forEach(inp=>{
      const id = inp.getAttribute('data-id');
      const s = list.find(x=>x.id===id);
      if (s) s.price = parseFloat(inp.value) || 0;
    });
    saveServices(list);
    renderServiceOptions();
    showResult('Preços atualizados.');
  });


  bookBtn.addEventListener('click', ()=>{
    const u = getUserFromCookie();
    const name = u ? u.name : (userName.value.trim() || 'Visitante');
    const s = updatePriceDisplay();
    const service = s ? s.name : serviceSelect.value;
    const price = s ? s.price : 0;
    const dt = dateTime.value;
    if (!dt){ showResult('Escolha data e hora.'); return; }
    const a = { id: Date.now().toString(), name, service, datetime: dt, price };
    const list = loadAppointments();
    list.push(a);
    saveAppointments(list);
    setCookie('lastAppointment', JSON.stringify({ service: a.service, datetime: a.datetime }), 30);
    showResult('Agendamento salvo.');
    renderAppointments();
  });

  // Inicialização
  const theme = getCookie('theme');
  if (theme) themeSelect.value = theme;
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  renderUser();
  renderAppointments();
  // Cookies panel: opções de manipulação
  const updateCookieBtn = document.getElementById('updateCookieBtn');
  const deleteCookieBtn = document.getElementById('deleteCookieBtn');
  const refreshCookiesBtn = document.getElementById('refreshCookiesBtn');

  if (refreshCookiesBtn) refreshCookiesBtn.addEventListener('click', ()=> listCookies());

  if (updateCookieBtn) updateCookieBtn.addEventListener('click', ()=>{
    const name = document.getElementById('cookieNameEdit').value;
    const value = document.getElementById('cookieValueEdit').value;
    const days = document.getElementById('cookieDaysEdit').value || 0;
    if (!name) { showResult('Nenhum cookie selecionado para atualizar.'); return; }
    setCookie(name, value, days);
    showResult(`Cookie "${name}" atualizado.`);
    listCookies();
  });

  if (deleteCookieBtn) deleteCookieBtn.addEventListener('click', ()=>{
    const name = document.getElementById('cookieNameEdit').value;
    if (!name) { showResult('Nenhum cookie selecionado para excluir.'); return; }
    deleteCookie(name);
    showResult(`Cookie "${name}" excluído.`);
    document.getElementById('cookieNameEdit').value = '';
    document.getElementById('cookieValueEdit').value = '';
    document.getElementById('cookieDaysEdit').value = '';
    listCookies();
  });

  // Preencher lista inicial de cookies
  listCookies();
  // Inicializar serviços e área profissional
  renderServiceOptions();
  renderProfessionalArea();
});
