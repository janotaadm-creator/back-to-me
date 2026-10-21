'use strict';
(() => {
  const root = document.getElementById('app');
  const key = 'back-to-me.token';
  let token = ''; try { token = sessionStorage.getItem(key) || ''; } catch {}
  let user, config, today, cards = [], view = 'today', selectedDay = null, cardIndex = 0;
  let authMode = 'signup', notice = '', busy = false, generation = 0, paymentCheck = 0;
  let paymentSession = location.pathname === '/success' ? new URLSearchParams(location.search).get('session_id') : null;
  if (location.pathname === '/cancel') notice = 'Checkout cancelado. Você pode continuar sua jornada.';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = n => String(n).padStart(2, '0');
  const tierName = tier => tier === 'Basico' ? 'Básico' : tier;
  const wordmark = '<span class="wordmark">back to me<span class="brand-dot">.</span></span>';
  const testBadge = () => config?.testMode ? '<span class="badge test-badge">Modo de teste</span>' : '';
  function saveToken(value) { token = value; try { value ? sessionStorage.setItem(key, value) : sessionStorage.removeItem(key); } catch {} }
  function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 4500); }
  async function api(path, options = {}) {
    const activeToken = token;
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}), ...options.headers } });
    const data = await response.json();
    if (!response.ok) {
      if ((response.status === 401 || response.status === 403 && data.error === 'Invalid or expired token') && !path.startsWith('/auth/login') && activeToken === token) logout('Sua sessão terminou. Entre novamente.');
      const error = new Error(response.status === 409 ? 'Este e-mail já tem uma conta. Use a aba Entrar.' : path === '/auth/login' && response.status === 401 ? 'E-mail ou senha incorretos.' : response.status === 400 ? 'Confira os dados informados e tente novamente.' : response.status === 403 ? 'Seu acesso atual não inclui este conteúdo.' : 'Não foi possível concluir. Tente novamente.');
      error.status = response.status; throw error;
    }
    return data;
  }
  async function loadAccount() {
    const current = generation, activeToken = token;
    const [profile, daily, history] = await Promise.all([api('/auth/me'), api('/api/cards/today'), api('/api/cards/history')]);
    if (current !== generation || activeToken !== token) return false;
    user = profile.user; today = daily; cards = history.cards; render(); return true;
  }
  function logout(message = '') { generation++; paymentCheck++; saveToken(''); user = null; cards = []; busy = false; authMode = 'login'; notice = message; render(); }
  function renderAuth() {
    root.innerHTML = `<div class="auth-layout"><section class="intro"><div>${wordmark}</div><div class="intro-copy"><p class="eyebrow">UM TEMPO PARA SE OUVIR</p><h1>Um encontro<br>com você.</h1><p>Pequenos convites para se conhecer melhor. Uma pausa, uma reflexão e uma ação de cada vez.</p><div class="intro-steps"><span>01 · Pausar</span><span>02 · Refletir</span><span>03 · Agir</span></div></div><p class="intro-footer">Sua jornada começa no seu ritmo.</p></section><main class="auth-panel" id="main"><div class="auth-box"><div class="auth-top"><span>SEU ESPAÇO DE AUTOCONHECIMENTO</span>${testBadge()}</div><h2>${authMode === 'signup' ? 'Comece por você.' : 'Que bom ter você aqui.'}</h2><p>${authMode === 'signup' ? 'Crie sua conta e explore os primeiros 10 dias gratuitamente.' : 'Entre para continuar de onde parou.'}</p><div class="auth-tabs" role="tablist" aria-label="Acesso à conta"><button role="tab" aria-selected="${authMode === 'signup'}" data-action="auth" data-mode="signup">Criar conta</button><button role="tab" aria-selected="${authMode === 'login'}" data-action="auth" data-mode="login">Entrar</button></div>${notice ? `<p class="notice">${esc(notice)}</p>` : ''}<form id="auth-form"><div class="field"><label for="email">Seu e-mail</label><input id="email" name="email" type="email" autocomplete="email" placeholder="voce@exemplo.com" maxlength="254" required></div><div class="field"><label for="password">Sua senha</label><input id="password" name="password" type="password" autocomplete="${authMode === 'signup' ? 'new-password' : 'current-password'}" minlength="${authMode === 'signup' ? 8 : 1}" maxlength="72" required>${authMode === 'signup' ? '<small>Use pelo menos 8 caracteres.</small>' : ''}</div><p class="form-error" id="auth-error" role="alert"></p><button class="primary" type="submit">${authMode === 'signup' ? 'Criar minha conta' : 'Entrar no meu espaço'} <span aria-hidden="true">↗</span></button></form><p class="auth-note">Um programa de reflexão pessoal. Não substitui acompanhamento psicológico ou médico.</p></div></main></div>`;
  }
  function render() {
    if (!config) return;
    if (!user) { renderAuth(); return; }
    const tabs = [['today', 'Hoje'], ['journey', 'Sua jornada'], ['plans', 'Seu acesso']];
    root.innerHTML = `<div class="shell"><aside class="sidebar">${wordmark}<nav aria-label="Principal">${tabs.map(([id, label], i) => `<button class="nav-button" ${view === id ? 'aria-current="page"' : ''} data-action="view" data-view="${id}"><span class="nav-number">0${i + 1}</span>${label}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="account-email">${esc(user.email)}</span><button class="text-button" data-action="logout">Sair da conta ↗</button></div></aside><div class="workspace"><header class="topbar"><span>UM PASSO DE CADA VEZ</span><div class="topbar-right">${testBadge()}<span class="badge">${esc(tierName(user.tier))}</span><button class="text-button mobile-logout" data-action="logout">Sair</button></div></header><main id="main">${notice ? `<div class="notice" role="status">${esc(notice)}${paymentSession ? ' <button class="text-button" data-action="payment">Verificar pagamento</button>' : ''}</div>` : ''}${view === 'plans' ? plansPage() : view === 'journey' ? journeyPage() : dailyPage()}</main><footer class="app-footer">Autoconhecimento é um processo. Respeite seu tempo.<br>Este conteúdo não substitui acompanhamento psicológico ou médico.</footer></div></div>`;
  }
  function dailyPage() {
    const day = selectedDay || today.dayNumber;
    const list = selectedDay ? cards.filter(c => c.dia_do_mes === day) : today.cards;
    const card = list[Math.min(cardIndex, Math.max(0, list.length - 1))];
    const count = list.filter(c => c.completed).length;
    return `<div class="page-heading"><p class="eyebrow">DIA ${number(day)} / 30</p><h1>${selectedDay ? 'Um espaço para refletir.' : 'Hoje, volte para você.'}</h1><p>${today.programEnded && !selectedDay ? 'Os 30 dias passaram. Você pode revisitar os conteúdos disponíveis na sua jornada.' : 'Não precisa ter todas as respostas. Comece com uma pausa.'}</p></div>${selectedDay ? '<button class="text-button" data-action="view" data-view="journey">← Voltar à jornada</button>' : ''}<div class="daily-layout">${card ? `<article class="reflection-card"><div class="card-top"><span class="eyebrow">${esc(card.tema_semana)}</span><span class="card-counter">${number(cardIndex + 1)} / 03</span></div><p class="eyebrow">PARA INSPIRAR</p><h2 class="motivation">${esc(card.motivacao)}</h2><p class="eyebrow">PARA SE OUVIR</p><p class="reflection-text">${esc(card.reflexao)}</p><div class="action-box"><p class="eyebrow">UMA PEQUENA AÇÃO</p><p>${esc(card.acao)}</p></div><div class="card-actions"><button class="primary" data-action="complete" data-id="${card.card_id}" ${card.completed ? 'disabled' : ''}>${card.completed ? '✓ Concluído' : 'Marcar como concluído'}</button>${cardIndex < list.length - 1 ? '<button class="text-button" data-action="next">Próximo card →</button>' : '<span class="card-counter">Último card deste dia</span>'}</div></article>` : `<div class="reflection-card empty"><p class="eyebrow">CONTINUE NO SEU RITMO</p><h2>Este dia faz parte de outro acesso.</h2><p>Você pode revisitar os cards já disponíveis ou conhecer os acessos Pro e Premium.</p><button class="primary" data-action="view" data-view="plans">Conhecer os acessos</button><button class="text-button" data-action="view" data-view="journey">Revisitar minha jornada →</button></div>`}<aside class="day-panel"><div><p class="eyebrow">SEU MOMENTO DE HOJE</p><h3>Três pequenos passos.</h3><div class="progress-line"><progress value="${count}" max="3" aria-label="Cards concluídos neste dia"></progress></div><p class="progress-copy">${count} de 3 cards concluídos</p><div class="card-selector">${list.map((c, i) => `<button data-action="card" data-index="${i}" aria-pressed="${cardIndex === i}"><span class="step-circle">${c.completed ? '✓' : number(i + 1)}</span><span>Card ${number(i + 1)}</span></button>`).join('')}</div></div><p class="aside-note">Leia com calma. Se quiser, anote suas reflexões em um caderno. Aqui, salvamos apenas quais cards você concluiu.</p></aside></div>`;
  }
  function journeyPage() {
    const completed = cards.filter(c => c.completed).length;
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const finished = days.filter(day => cards.filter(c => c.dia_do_mes === day && c.completed).length === 3).length;
    return `<div class="page-heading"><p class="eyebrow">SUA JORNADA</p><h1>Cada pausa conta.</h1><p>Volte aos seus cards quando quiser. Seu progresso fica salvo na sua conta.</p></div><div class="stats"><div class="stat"><strong>${completed}<small> / ${cards.length}</small></strong><span>cards concluídos</span></div><div class="stat"><strong>${finished}</strong><span>dias com os 3 cards concluídos</span></div><div class="stat"><strong>${cards.length / 3}</strong><span>dias de conteúdo disponíveis</span></div></div><div class="journey-grid">${days.map(day => { const group = cards.filter(c => c.dia_do_mes === day); const done = group.filter(c => c.completed).length; return `<button class="day-tile ${!group.length ? 'locked' : ''} ${day === today.dayNumber ? 'is-today' : ''}" data-action="day" data-day="${day}" ${!group.length ? 'data-locked="true"' : ''}><strong>Dia ${number(day)}</strong><span>${group.length ? `${done} / 3 concluídos${day === today.dayNumber ? ' · Hoje' : ''}` : `Acesso ${day <= 20 ? 'Pro' : 'Premium'}`}</span></button>`; }).join('')}</div>`;
  }
  function plansPage() {
    const money = cents => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: config.currency }).format(cents / 100);
    return `<div class="page-heading"><p class="eyebrow">SEU ACESSO</p><h1>Mais espaço para você.</h1><p>Escolha quanto da jornada deseja explorar.</p></div>${config.testMode ? '<p class="notice">Ambiente de teste: os pagamentos são simulados, sem cobrança real.</p>' : ''}<div class="plan-list">${[['Basico', 10, 30], ['Pro', 20, 60], ['Premium', 30, 90]].map(([tier, days, total]) => `<article class="plan ${user.tier === tier ? 'current' : ''}"><p class="eyebrow">${tierName(tier)}</p><h2 class="price">${tier === 'Basico' ? 'Gratuito' : money(config.prices[tier])}</h2><p class="price-note">${tier === 'Basico' ? 'Para começar' : 'Pagamento único · em dólar americano'}</p><ul><li>${days} dias de conteúdo</li><li>${total} cards de motivação, reflexão e ação</li><li>${tier === 'Basico' ? 'Primeiros 10 dias da jornada' : 'Acesso por 30 dias após o pagamento'}</li></ul>${user.tier === tier ? '<button class="secondary" disabled>Seu acesso atual</button>' : tier === 'Basico' ? '<p class="price-note">Incluído no seu acesso</p>' : user.tier === 'Premium' ? '<p class="price-note">Incluído no Premium</p>' : `<button class="primary" data-action="checkout" data-tier="${tier}">${config.testMode ? 'Testar' : 'Escolher'} ${tier} ↗</button>`}</article>`).join('')}</div><p class="plans-note">Cada dia contém 3 cards. Pro libera os dias 1 a 20; Premium, os dias 1 a 30. Não há renovação automática. Depois do vencimento, os primeiros 10 dias continuam disponíveis.</p>`;
  }
  async function checkPayment() {
    if (!paymentSession || !token || !user) return;
    const check = ++paymentCheck, current = generation;
    notice = 'Conferindo a confirmação do pagamento…'; render();
    try {
      for (let i = 0; i < 10; i++) {
        if (check !== paymentCheck || current !== generation) return;
        const status = await api('/api/stripe/status?session_id=' + encodeURIComponent(paymentSession));
        if (check !== paymentCheck || current !== generation) return;
        if (status.status === 'active') {
          const active = new Date(status.expires_at) > new Date();
          notice = active ? `Pagamento ${config.testMode ? 'de teste ' : ''}confirmado. Seu acesso ${status.tier} está liberado.` : 'Este pagamento foi confirmado, mas o período de acesso já terminou.';
          paymentSession = null; history.replaceState(null, '', '/'); await loadAccount(); return;
        }
        if (status.status === 'failed') { notice = 'O pagamento não foi concluído. Você pode tentar novamente em Seu acesso.'; render(); return; }
        if (i < 9) await new Promise(resolve => setTimeout(resolve, 2000));
      }
      notice = 'A confirmação ainda está pendente. Aguarde um pouco e verifique novamente.'; render();
    } catch { if (current === generation) { notice = 'Não conseguimos verificar este pagamento. Entre na conta usada no checkout e tente novamente.'; render(); } }
  }
  root.addEventListener('submit', async event => {
    if (event.target.id !== 'auth-form') return;
    event.preventDefault(); if (busy) return;
    const form = event.target, button = form.querySelector('button[type=submit]'), error = document.getElementById('auth-error');
    const values = new FormData(form); busy = true; button.disabled = true; button.textContent = 'Só um instante…'; error.textContent = '';
    try {
      const result = await api('/auth/' + authMode, { method: 'POST', body: JSON.stringify({ email: values.get('email'), password: values.get('password') }) });
      saveToken(result.token); generation++; notice = ''; selectedDay = null; view = 'today'; cardIndex = 0;
      if (await loadAccount()) { window.scrollTo(0, 0); void checkPayment(); }
    } catch (err) { if (document.contains(error)) error.textContent = err.message; else toast(err.message); }
    finally { busy = false; if (document.contains(button)) { button.disabled = false; button.textContent = authMode === 'signup' ? 'Criar minha conta ↗' : 'Entrar no meu espaço ↗'; } }
  });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'logout') { logout(); return; }
    if (action === 'auth') { if (!busy) { authMode = button.dataset.mode; notice = ''; render(); } return; }
    if (action === 'view') { view = button.dataset.view; selectedDay = null; cardIndex = 0; render(); window.scrollTo(0, 0); return; }
    if (action === 'card') { cardIndex = Number(button.dataset.index); render(); return; }
    if (action === 'next') { cardIndex++; render(); return; }
    if (action === 'day') { if (button.dataset.locked) view = 'plans'; else { view = 'today'; selectedDay = Number(button.dataset.day); cardIndex = 0; } render(); window.scrollTo(0, 0); return; }
    if (action === 'payment') { void checkPayment(); return; }
    if (busy) return;
    const current = generation; busy = true; button.disabled = true;
    try {
      if (action === 'complete') {
        await api('/api/actions/mark-complete', { method: 'POST', body: JSON.stringify({ card_id: Number(button.dataset.id) }) });
        if (current !== generation) return;
        await loadAccount(); toast('Mais um momento dedicado a você. Progresso salvo.');
      }
      if (action === 'checkout') {
        button.textContent = 'Abrindo checkout…';
        const result = await api('/api/stripe/checkout', { method: 'POST', body: JSON.stringify({ tier: button.dataset.tier }) });
        if (current !== generation) return;
        const url = new URL(result.url); if (url.origin !== 'https://checkout.stripe.com') throw new Error('Não foi possível abrir o checkout.');
        location.assign(url.href);
      }
    } catch (err) { if (current === generation) { toast(err.message); render(); } }
    finally { busy = false; if (document.contains(button)) button.disabled = false; }
  });
  async function boot() {
    try {
      config = await api('/api/config');
      if (token) { if (await loadAccount()) void checkPayment(); } else render();
    } catch {
      if (!token && config) { render(); return; }
      root.innerHTML = '<main id="main" class="initial"><h1>Vamos tentar de novo?</h1><p>Não conseguimos carregar seu espaço. Confira sua conexão.</p><button class="primary" id="retry">Tentar novamente</button></main>';
      document.getElementById('retry').addEventListener('click', boot);
    }
  }
  void boot();
})();
