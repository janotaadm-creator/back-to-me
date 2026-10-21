'use strict';
(() => {
  const root = document.getElementById('app');
  const key = 'back-to-me.token';
  let token = ''; try { token = sessionStorage.getItem(key) || ''; } catch {}
  let user, config, today, cards = [], view = 'start', selectedDay = null, cardIndex = 0;
  let authMode = new URLSearchParams(location.search).get('mode') === 'login' ? 'login' : 'signup', notice = '', busy = false, generation = 0, paymentCheck = 0;
  let experience, billing={subscriptions:[]}, journal=[], exerciseId='cena', audioUrl=null;
  const query=new URLSearchParams(location.search);
  if(query.has('plan')) view='plans';
  let paymentSession = location.pathname === '/success' ? new URLSearchParams(location.search).get('session_id') : null;
  if (location.pathname === '/cancel') notice = 'Checkout cancelado. Você pode continuar sua jornada.';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = n => String(n).padStart(2, '0');
  const tierName = tier => ({Basico:'Gratuito',MeuEspaco:'Meu Espaço',Pro:'Pro anterior',Premium:'Premium anterior'}[tier]||tier);
  const wordmark = '<a class="wordmark" href="/" aria-label="Back to Me · página inicial">back to me <span class="brand-heart"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2s-7.6-4.6-10.1-9.4C.2 8.5 2.2 4.4 6.1 4.4c2.3 0 3.8 1.3 4.7 2.7.5.7.9.7 1.4 0 .9-1.4 2.4-2.7 4.7-2.7 3.9 0 5.9 4.1 4.2 7.4-2.5 4.8-9.1 9.4-9.1 9.4z"/></svg></span></a>';
  const testBadge = () => config?.testMode ? '<span class="badge test-badge">Modo de teste</span>' : '';
  function saveToken(value) { token = value; try { value ? sessionStorage.setItem(key, value) : sessionStorage.removeItem(key); } catch {} }
  function toast(message) { const el = document.getElementById('toast'); el.textContent = message; el.hidden = false; clearTimeout(toast.timer); toast.timer = setTimeout(() => { el.hidden = true; }, 4500); }
  async function api(path, options = {}) {
    const activeToken = token;
    const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}), ...options.headers } });
    const data = await response.json();
    if (!response.ok) {
      if ((response.status === 401 || response.status === 403 && data.error === 'Invalid or expired token') && !path.startsWith('/auth/login') && activeToken === token) logout('Sua sessão terminou. Entre novamente.');
      const error = new Error(response.status === 409 ? (path.startsWith('/auth/')?'Este e-mail já tem uma conta. Use a aba Entrar.':'Já existe um checkout ou assinatura. Aguarde a confirmação ou gerencie Seu acesso.') : path === '/auth/login' && response.status === 401 ? 'E-mail ou senha incorretos.' : response.status === 400 ? 'Confira os dados informados e tente novamente.' : response.status === 403 ? 'Seu acesso atual não inclui este conteúdo.' : 'Não foi possível concluir. Tente novamente.');
      error.status = response.status; throw error;
    }
    return data;
  }
  async function loadAccount() {
    const current = generation, activeToken = token;
    const [profile, daily, history,exp,sub,notes] = await Promise.all([api('/auth/me'), api('/api/cards/today'), api('/api/cards/history'),api('/api/experience'),api('/api/stripe/subscription'),api('/api/experience/journal')]);
    if (current !== generation || activeToken !== token) return false;
    user = profile.user; today = daily; cards = history.cards; experience=exp;billing=sub;journal=notes.entries; render(); return true;
  }
  function logout(message = '') { generation++; paymentCheck++; saveToken(''); user = null; cards = [];journal=[];experience=null;if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;} busy = false; authMode = 'login'; notice = message; render(); }
  function renderAuth() {
    root.innerHTML = `<div class="auth-layout"><section class="intro"><div>${wordmark}</div><div class="intro-copy"><p class="eyebrow">UM TEMPO PARA SE OUVIR</p><h1>Abra espaço para <em>você</em>, de novo.</h1><p>Pequenos convites para se conhecer melhor. Uma pausa, uma reflexão e uma ação de cada vez.</p><div class="intro-steps"><span>01 · Pausar</span><span>02 · Refletir</span><span>03 · Agir</span></div></div><p class="intro-footer">Sua jornada começa no seu ritmo.</p></section><main class="auth-panel" id="main"><div class="auth-box"><a class="auth-home" href="/">← Voltar à página inicial</a><div class="auth-top"><span>SEU ESPAÇO DE AUTOCONHECIMENTO</span>${testBadge()}</div><h2>${authMode === 'signup' ? 'Comece por você.' : 'Que bom ter você aqui.'}</h2><p>${authMode === 'signup' ? 'Crie sua conta para acompanhar três experiências iniciais. Sem cartão. Os primeiros 10 dias de cards também estão incluídos.' : 'Entre para continuar de onde parou.'}</p><div class="auth-tabs" role="tablist" aria-label="Acesso à conta"><button role="tab" aria-selected="${authMode === 'signup'}" data-action="auth" data-mode="signup">Criar conta</button><button role="tab" aria-selected="${authMode === 'login'}" data-action="auth" data-mode="login">Entrar</button></div>${notice ? `<p class="notice">${esc(notice)}</p>` : ''}<form id="auth-form"><div class="field"><label for="email">Seu e-mail</label><input id="email" name="email" type="email" autocomplete="email" placeholder="voce@exemplo.com" maxlength="254" required></div><div class="field"><label for="password">Sua senha</label><input id="password" name="password" type="password" autocomplete="${authMode === 'signup' ? 'new-password' : 'current-password'}" minlength="${authMode === 'signup' ? 8 : 1}" maxlength="72" required>${authMode === 'signup' ? '<small>Use pelo menos 8 caracteres.</small>' : ''}</div><p class="form-error" id="auth-error" role="alert"></p><button class="primary" type="submit">${authMode === 'signup' ? 'Criar minha conta' : 'Entrar no meu espaço'} <span aria-hidden="true">↗</span></button></form><p class="auth-note">Um programa de reflexão pessoal. Não substitui acompanhamento psicológico ou médico.</p></div></main></div>`;
  }
  function render() {
    if (!config) return;
    if (!user) { renderAuth(); return; }
    const tabs = [['start','Começar'],['today','Hoje'],['library','Biblioteca'],['journal','Meu caderno'],['review','Minha semana'],['workshops','Oficinas'],['journey','Jornada'],['plans','Seu acesso']];
    root.innerHTML = `<div class="shell"><aside class="sidebar">${wordmark}<nav aria-label="Principal">${tabs.map(([id, label], i) => `<button class="nav-button" ${view === id ? 'aria-current="page"' : ''} data-action="view" data-view="${id}"><span class="nav-number">0${i + 1}</span>${label}</button>`).join('')}</nav><div class="sidebar-bottom"><span class="account-email">${esc(user.email)}</span><button class="text-button" data-action="logout">Sair da conta ↗</button></div></aside><div class="workspace"><header class="topbar"><span>UM PASSO DE CADA VEZ</span><div class="topbar-right">${testBadge()}<span class="badge">${esc(tierName(user.tier))}</span><button class="text-button mobile-logout" data-action="logout">Sair</button></div></header><main id="main">${notice ? `<div class="notice" role="status">${esc(notice)}${paymentSession ? ' <button class="text-button" data-action="payment">Verificar pagamento</button>' : ''}</div>` : ''}${({start:startPage,library:libraryPage,exercise:exercisePage,journal:journalPage,review:reviewPage,workshops:workshopsPage,plans:plansPage,journey:journeyPage,today:dailyPage}[view]||startPage)()}</main><footer class="app-footer">Autoconhecimento é um processo. Respeite seu tempo.<br>Este conteúdo não substitui acompanhamento psicológico ou médico.</footer></div></div>`;
  }
  function dailyPage() {
    const day = selectedDay || today.dayNumber;
    const list = selectedDay ? cards.filter(c => c.dia_do_mes === day) : today.cards;
    const card = list[Math.min(cardIndex, Math.max(0, list.length - 1))];
    const count = list.filter(c => c.completed).length;
    return `<div class="page-heading"><p class="eyebrow">DIA ${number(day)} / 30</p><h1>${selectedDay ? 'Um espaço para refletir.' : 'Hoje, volte para você.'}</h1><p>${today.programEnded && !selectedDay ? 'Os 30 dias passaram. Você pode revisitar os conteúdos disponíveis na sua jornada.' : 'Escolha um dos cards. Os demais são complementos opcionais; você não precisa concluir tudo.'}</p></div>${selectedDay ? '<button class="text-button" data-action="view" data-view="journey">← Voltar à jornada</button>' : ''}<div class="daily-layout">${card ? `<article class="reflection-card"><div class="card-top"><span class="eyebrow">${esc(card.tema_semana)}</span><span class="card-counter">${number(cardIndex + 1)} / 03</span></div><p class="eyebrow">PARA INSPIRAR</p><h2 class="motivation">${esc(card.motivacao)}</h2><p class="eyebrow">PARA SE OUVIR</p><p class="reflection-text">${esc(card.reflexao)}</p><div class="action-box"><p class="eyebrow">UMA PEQUENA AÇÃO</p><p>${esc(card.acao)}</p></div><div class="card-actions"><button class="primary" data-action="complete" data-id="${card.card_id}" ${card.completed ? 'disabled' : ''}>${card.completed ? '✓ Concluído' : 'Marcar como concluído'}</button>${cardIndex < list.length - 1 ? '<button class="text-button" data-action="next">Próximo card →</button>' : '<span class="card-counter">Último card deste dia</span>'}</div></article>` : `<div class="reflection-card empty"><p class="eyebrow">CONTINUE NO SEU RITMO</p><h2>Este dia faz parte de outro acesso.</h2><p>Você pode revisitar os cards já disponíveis ou conhecer as assinaturas.</p><button class="primary" data-action="view" data-view="plans">Conhecer os acessos</button><button class="text-button" data-action="view" data-view="journey">Revisitar minha jornada →</button></div>`}<aside class="day-panel"><div><p class="eyebrow">SEU MOMENTO DE HOJE</p><h3>Um passo de cada vez.</h3><div class="progress-line"><progress value="${count}" max="3" aria-label="Cards concluídos neste dia"></progress></div><p class="progress-copy">${count} de 3 cards concluídos</p><div class="card-selector">${list.map((c, i) => `<button data-action="card" data-index="${i}" aria-pressed="${cardIndex === i}"><span class="step-circle">${c.completed ? '✓' : number(i + 1)}</span><span>Card ${number(i + 1)}</span></button>`).join('')}</div></div><p class="aside-note">Leia com calma. Se quiser, anote suas reflexões em um caderno. Você também pode usar o caderno opcional do Meu Espaço para guardar suas palavras.</p></aside></div>`;
  }
  function journeyPage() {
    const completed = cards.filter(c => c.completed).length;
    const days = Array.from({ length: 30 }, (_, i) => i + 1);
    const finished = days.filter(day => cards.filter(c => c.dia_do_mes === day && c.completed).length === 3).length;
    return `<div class="page-heading"><p class="eyebrow">SUA JORNADA</p><h1>Cada pausa conta.</h1><p>Volte aos seus cards quando quiser. Seu progresso fica salvo na sua conta.</p></div><div class="stats"><div class="stat"><strong>${completed}<small> / ${cards.length}</small></strong><span>cards concluídos</span></div><div class="stat"><strong>${finished}</strong><span>dias com os 3 cards concluídos</span></div><div class="stat"><strong>${cards.length / 3}</strong><span>dias de conteúdo disponíveis</span></div></div><div class="journey-grid">${days.map(day => { const group = cards.filter(c => c.dia_do_mes === day); const done = group.filter(c => c.completed).length; return `<button class="day-tile ${!group.length ? 'locked' : ''} ${day === today.dayNumber ? 'is-today' : ''}" data-action="day" data-day="${day}" ${!group.length ? 'data-locked="true"' : ''}><strong>Dia ${number(day)}</strong><span>${group.length ? `${done} / 3 concluídos${day === today.dayNumber ? ' · Hoje' : ''}` : 'Incluído nas assinaturas'}</span></button>`; }).join('')}</div>`;
  }
  const heading = (k,h,p) => `<div class="page-heading"><p class="eyebrow">${k}</p><h1>${h}</h1><p>${p}</p></div>`;
  const go = (v,label) => `<button class="secondary" data-action="view" data-view="${v}">${label}</button>`;
  function startPage() {
    const done=experience.state.completed,first=['cena','momento','revisitar'];
    const step=experience.continuity.length?experience.continuity[Math.floor(Math.max(0,Date.now()-new Date(user.created_at).getTime()-30*86400000)/(7*86400000))%experience.continuity.length]:null;
    return heading('SEU PRIMEIRO ESPAÇO','Comece pelo que faz sentido.','Três experiências para conhecer o seu ritmo. Você pode ler, ouvir, escrever ou pausar.')+`<div class="goal-options" aria-label="Seu objetivo">${experience.paths.map(p=>`<button data-action="goal" data-goal="${p.id}" aria-pressed="${experience.state.goal===p.id}">${esc(p.title)}</button>`).join('')}</div><div class="experience-list">${first.map((id,i)=>{const e=experience.exercises.find(e=>e.id===id);return `<article class="resource"><span class="eyebrow">${done.includes(id)?'✓ CONCLUÍDO':'EXPERIÊNCIA '+(i+1)}</span><h2>${esc(e.title)}</h2><p>${esc(e.intro)}</p><button class="primary" data-action="exercise" data-id="${id}">${done.includes(id)?'Revisitar':'Experimentar'}</button></article>`;}).join('')}</div>${first.every(id=>done.includes(id))?`<div class="recommend-panel"><p class="eyebrow">SE QUISER CONTINUAR</p><h2>Encontre um exercício para o seu momento.</h2><p>No Meu Espaço, escolha por situação e alterne entre ouvir, ler ou escrever.</p>${go('plans','Conhecer Meu Espaço · US$19/mês')}</div>`:''}${step&&today.programEnded?`<section class="recommend-panel"><p class="eyebrow">DEPOIS DOS 30 DIAS · CICLO DE QUATRO PRÁTICAS SEMANAIS</p><h2>${esc(step.title)}</h2><p>${esc(step.text)}</p>${go('journey','Escolher um card para revisitar')}</section>`:''}<div class="page-links">${go('today','Ver meu exercício diário')}${go('review','Revisar minha semana')}<button class="text-button" data-action="reminder">Baixar lembrete semanal opcional</button></div>`;
  }
  function libraryPage(){
    const groups=[...experience.paths,...experience.monthlyPaths];
    return heading('BIBLIOTECA','O que você quer explorar?','Três percursos disponíveis e uma coleção de três novos percursos, liberados nos meses 2, 3 e 4 da sua conta.')+groups.map(p=>`<section class="path-group"><h2>${esc(p.title)}</h2>${p.releaseMonth?`<p class="muted">A partir do mês ${p.releaseMonth+1} da conta · Meu Espaço e Aprofundar</p>`:''}<div class="experience-list">${p.ids.map(id=>{const e=experience.exercises.find(e=>e.id===id),waiting=e.releaseMonth>experience.month;return `<article class="resource"><h3>${esc(e.title)}</h3><p>${e.locked?(waiting?'Abre no mês '+(e.releaseMonth+1)+' da sua conta.':'Incluído no Meu Espaço e Aprofundar.'):esc(e.intro)}</p><button class="${e.locked?'secondary':'primary'}" data-action="${e.locked?'view':'exercise'}" data-view="plans" data-id="${id}" ${waiting&&experience.level>=2?'disabled':''}>${e.locked?(waiting?'Disponível em breve':'Conhecer os planos'):'Abrir exercício'}</button></article>`;}).join('')}</div></section>`).join('')+(experience.conversationTemplates.length?`<section class="reflection-card"><h2>Seis exemplos para adaptar</h2><p>São frases de partida, não garantias de resposta. Você pode guardar e não enviar.</p>${experience.conversationTemplates.map(t=>`<details><summary>${esc(t.title)}</summary><p>${esc(t.text)}</p></details>`).join('')}</section>`:'');
  }
  function exercisePage(){
    const e=experience.exercises.find(e=>e.id===exerciseId);if(!e||e.locked)return libraryPage();
    return heading('SEU MOMENTO',esc(e.title),esc(e.intro))+`<article class="reflection-card exercise-sheet"><p class="muted">Campos opcionais. As respostas ficam só nesta tela até você escolher salvar no caderno.</p>${experience.audioIds.includes(e.id)?`<button class="secondary" data-action="audio" data-id="${e.id}">Ouvir orientação · narração digital</button><div id="audio-slot"></div>`:''}<form id="exercise-form">${e.questions.map((q,i)=>`<label for="answer-${i}">${esc(q)}</label><textarea id="answer-${i}" name="answer-${i}" rows="3" maxlength="1800" placeholder="Você também pode deixar em branco."></textarea>`).join('')}<p class="muted">${esc(e.choice)}</p><div class="page-links"><button class="primary" type="submit">Reunir minhas palavras</button><button class="text-button" type="button" data-action="example">Usar exemplo fictício</button><button class="text-button" type="button" data-action="clear-exercise">Limpar</button></div></form><section id="exercise-result" hidden tabindex="-1"><h2>Nas suas palavras.</h2><div id="answers"></div><div class="page-links"><button class="primary" data-action="finish-exercise">Concluir experiência</button>${experience.level>=2?'<button class="secondary" data-action="save-reflection">Salvar no caderno</button>':''}</div><p>Esse exercício foi útil para você?</p><button class="secondary" data-action="useful" data-value="yes">Sim</button> <button class="secondary" data-action="useful" data-value="no">Não desta vez</button></section></article>`;
  }
  function reviewPage(){return heading('SUA REVISÃO','O que vale levar para a próxima semana?','Uma pausa para observar, sem notas ou metas obrigatórias.')+`<article class="reflection-card exercise-sheet"><form id="review-form"><label for="review-one">O que ajudou, mesmo que um pouco?</label><textarea id="review-one" name="one" rows="3" maxlength="2000"></textarea><label for="review-two">O que você prefere adaptar ou deixar de lado?</label><textarea id="review-two" name="two" rows="3" maxlength="2000"></textarea><label for="review-three">Qual pequeno espaço quer reservar para si?</label><textarea id="review-three" name="three" rows="3" maxlength="2000"></textarea><p>Você pode deixar tudo em aberto. Nada é salvo automaticamente.</p>${experience.level>=2?'<button class="primary" type="submit">Salvar revisão no caderno</button>':'<button class="secondary" type="button" data-action="view" data-view="start">Encerrar minha revisão</button>'}</form></article>${experience.level>=2?'<div class="resource"><h2>Uma forma de revisar</h2><p>Escolha uma situação concreta. Compare o que esperava com o que observou, sem atribuir intenções a outras pessoas. Pergunte a si: repetir, adaptar, trocar ou pausar? Uma resposta curta é suficiente.</p></div>':''}`;}
  function journalPage(){return heading('CADERNO OPCIONAL','Um lugar para suas palavras.','Só guardamos o que você escolher salvar. Você pode ler, exportar e excluir suas notas mesmo depois de cancelar.')+`<p class="notice">Notas protegidas na base de dados; não são criptografia ponta a ponta. Evite usar em dispositivos compartilhados e saia da conta ao terminar.</p>${experience.level>=2?`<form id="journal-form" class="reflection-card exercise-sheet"><label for="journal-title">Título</label><input id="journal-title" name="title" maxlength="120" required><label for="journal-text">O que quer guardar?</label><textarea id="journal-text" name="content" maxlength="8000" rows="5" required></textarea><button class="primary" type="submit">Salvar esta nota</button></form>`:go('plans','Conhecer Meu Espaço para escrever novas notas')}<button class="text-button" data-action="export-journal">Exportar minhas notas</button><div class="experience-list">${journal.length?journal.map(e=>`<article class="resource"><small>${new Date(e.created_at).toLocaleDateString('pt-BR')}</small><h2>${esc(e.title)}</h2><p class="journal-text">${esc(e.content)}</p><button class="text-button" data-action="delete-journal" data-id="${e.id}">Excluir esta nota</button></article>`).join(''):'<p>Nenhuma nota salva. Seu caderno pode começar quando você quiser.</p>'}</div>`;}
  function workshopsPage(){return heading('APROFUNDAR','Um tema, com mais calma.','Oficinas narradas com texto e material de aplicação. Cerca de20min com pausas; gravação de cerca de 4 min, com voz digital. Sem atendimento individual.')+experience.workshops.map(w=>`<article class="reflection-card workshop"><p class="eyebrow">OFICINA ${w.releaseMonth+1} · ${w.releaseMonth>experience.month?'DISPONÍVEL NO MÊS '+(w.releaseMonth+1):'COLEÇÃO ABRIR ESPAÇO'}</p><h2>${esc(w.title)}</h2>${w.locked?`<p>${experience.level<3?'Incluída no Aprofundar.':'A próxima oficina abre no mês indicado do seu percurso.'}</p>${experience.level<3?go('plans','Conhecer Aprofundar'):''}`:`<button class="secondary" data-action="audio" data-id="${w.id}">Ouvir oficina</button><div id="audio-${w.id}"></div>${w.chapters.map(c=>`<details><summary>${esc(c.title)} · ${c.minutes}min com prática</summary><p>${esc(c.text)}</p></details>`).join('')}<button class="text-button" data-action="download-workshop" data-id="${w.id}">Baixar material de aplicação</button>`}</article>`).join('');}
  function plansPage(){
    const active=billing.subscriptions.find(s=>!['canceled','incomplete_expired'].includes(s.billing_status));
    return heading('SEU ACESSO','Escolha seu espaço.','Assinaturas mensais em dólar americano. Experimente gratuitamente e escolha quando fizer sentido.')+`${config.testMode?'<p class="notice">Ambiente de teste: pagamentos simulados, sem cobrança real.</p>':''}${active?`<section class="notice"><h2>${esc(tierName(active.tier))}</h2><p>${active.cancel_at_period_end?'Renovação cancelada.':'Renovação mensal.'} ${active.expires_at?'Acesso pago até '+new Date(active.expires_at).toLocaleDateString('pt-BR')+'.':''}</p>${active.billing_status==='past_due'?'<p>O último pagamento não foi confirmado. O acesso não é estendido enquanto estiver pendente.</p>':''}${!active.cancel_at_period_end?`<button class="secondary" data-action="cancel-subscription" data-id="${active.id}">Cancelar renovação</button>`:''}<p>Para trocar de plano, cancele a renovação e escolha outro após o período atual terminar.</p></section>`:''}<div class="pricing-grid">${config.plans.map(p=>`<article class="pricing-card ${p.recommended?'recommended':''}">${p.recommended?'<span class="recommend-badge">Recomendado</span>':''}<h2>${esc(p.name)}</h2><p>${esc(p.description)}</p><p class="plan-amount">US$${p.cents/100}<small>/mês</small></p><ul>${p.features.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><button class="${p.recommended?'primary':'secondary'}" data-action="checkout" data-tier="${p.id}" ${active?'disabled':''}>${active?'Gerencie seu acesso acima':(config.testMode?'Testar ':'Assinar ')+p.name}</button></article>`).join('')}</div><p class="plans-note">Renovação automática mensal. Cancele em Seu acesso para impedir a próxima cobrança. Você mantém o período já pago, o progresso e a leitura/exportação/exclusão das suas notas. Acesso gratuito: primeiros 10 dias, 30 cards e três experiências iniciais. A coleção inicial de oficinas tem três edições liberadas mensalmente.</p>${['Pro','Premium'].includes(user.tier)?'<p class="notice">Seu acesso anterior por prazo continua válido até o vencimento original.</p>':''}`;
  }
  function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:name.endsWith('.ics')?'text/calendar;charset=utf-8':'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  async function emit(name){try{await api('/api/experience/event',{method:'POST',body:JSON.stringify({event:name})});}catch{}}
  async function saveJournal(title,content){await api('/api/experience/journal',{method:'POST',body:JSON.stringify({title,content})});journal=(await api('/api/experience/journal')).entries;toast('Nota salva no seu caderno.');}
  async function checkPayment() {
    if (!paymentSession || !token || !user) return;
    const check = ++paymentCheck, current = generation;
    notice = 'Conferindo a confirmação do pagamento…'; render();
    try {
      for (let i = 0; i < 10; i++) {
        if (check !== paymentCheck || current !== generation) return;
        let status; try { status = await api('/api/stripe/status?session_id=' + encodeURIComponent(paymentSession)); } catch(e) { if(e.status!==404) throw e; status={status:'pending'}; }
        if (check !== paymentCheck || current !== generation) return;
        if (status.status === 'active') {
          const active = new Date(status.expires_at) > new Date();
          notice = active ? `Pagamento ${config.testMode ? 'de teste ' : ''}confirmado. Seu acesso ${status.tier} está liberado.` : 'Este pagamento foi confirmado, mas o período de acesso já terminou.';
          paymentSession = null; history.replaceState(null, '', '/app'); await loadAccount(); return;
        }
        if (status.status === 'failed') { notice = 'O pagamento não foi concluído. Você pode tentar novamente em Seu acesso.'; render(); return; }
        if (i < 9) await new Promise(resolve => setTimeout(resolve, 2000));
      }
      notice = 'A confirmação ainda está pendente. Aguarde um pouco e verifique novamente.'; render();
    } catch { if (current === generation) { notice = 'Não conseguimos verificar este pagamento. Entre na conta usada no checkout e tente novamente.'; render(); } }
  }
  root.addEventListener('submit', async event => {
    if(event.target.id==='exercise-form') {event.preventDefault();const e=experience.exercises.find(e=>e.id===exerciseId),box=document.getElementById('answers');box.replaceChildren();e.questions.forEach((q,i)=>{const h=document.createElement('h3'),p=document.createElement('p');h.textContent=q;p.textContent=document.getElementById('answer-'+i).value.trim()||'Deixo em aberto.';box.append(h,p);});document.getElementById('exercise-result').hidden=false;document.getElementById('exercise-result').focus();return;}
    if(['journal-form','review-form'].includes(event.target.id)){event.preventDefault();if(busy)return;busy=true;const data=new FormData(event.target),button=event.target.querySelector('button[type=submit]');button.disabled=true;try{await saveJournal(event.target.id==='journal-form'?data.get('title'):'Minha revisão semanal',event.target.id==='journal-form'?data.get('content'):['O que ajudou: '+data.get('one'),'O que adaptar: '+data.get('two'),'Meu próximo espaço: '+data.get('three')].join('\n\n'));view='journal';render();}catch(e){toast(e.message);}finally{busy=false;button.disabled=false;}return;}
    if (event.target.id !== 'auth-form') return;
    event.preventDefault(); if (busy) return;
    const form = event.target, button = form.querySelector('button[type=submit]'), error = document.getElementById('auth-error');
    const values = new FormData(form); busy = true; button.disabled = true; button.textContent = 'Só um instante…'; error.textContent = '';
    try {
      const result = await api('/auth/' + authMode, { method: 'POST', body: JSON.stringify({ email: values.get('email'), password: values.get('password') }) });
      saveToken(result.token); generation++; notice = ''; selectedDay = null; view = query.has('plan')?'plans':'start'; cardIndex = 0;
      if(['entender','interesses','conversa'].includes(query.get('goal'))) await api('/api/experience/state',{method:'POST',body:JSON.stringify({goal:query.get('goal')})});
      if (await loadAccount()) { window.scrollTo(0, 0); void checkPayment(); }
    } catch (err) { if (document.contains(error)) error.textContent = err.message; else toast(err.message); }
    finally { busy = false; if (document.contains(button)) { button.disabled = false; button.textContent = authMode === 'signup' ? 'Criar minha conta ↗' : 'Entrar no meu espaço ↗'; } }
  });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
    const action = button.dataset.action;
    if (action === 'logout') { logout(); return; }
    if (action === 'auth') { if (!busy) { authMode = button.dataset.mode; notice = ''; render(); } return; }
    if (action === 'view') {if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}if(button.dataset.view==='plans')void emit('offer_viewed'); view = button.dataset.view; selectedDay = null; cardIndex = 0; render(); window.scrollTo(0, 0); return; }
    if (action === 'card') { cardIndex = Number(button.dataset.index); render(); return; }
    if (action === 'next') { cardIndex++; render(); return; }
    if (action === 'day') { if (button.dataset.locked) view = 'plans'; else { view = 'today'; selectedDay = Number(button.dataset.day); cardIndex = 0; } render(); window.scrollTo(0, 0); return; }
    if (action === 'payment') { void checkPayment(); return; }
    if(action==='exercise'){exerciseId=button.dataset.id;view='exercise';render();void emit('exercise_started');return;}
    if(action==='example'){const e=experience.exercises.find(e=>e.id===exerciseId),fields=[...document.querySelectorAll('#exercise-form textarea')];if(fields.some(f=>f.value.trim())){toast('Limpe primeiro para trocar o exemplo. Suas palavras foram preservadas.');return;}fields.forEach((f,i)=>f.value=e.example[i]);return;}
    if(action==='clear-exercise'){document.getElementById('exercise-form').reset();document.getElementById('exercise-result').hidden=true;return;}
    if(action==='reminder'){const date=new Date();date.setDate(date.getDate()+1);const day=date.getFullYear()+String(date.getMonth()+1).padStart(2,'0')+String(date.getDate()).padStart(2,'0');download('back-to-me-lembrete.ics',['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Back to Me//PT','BEGIN:VEVENT','UID:'+Date.now()+'@back-to-me','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),'DTSTART;VALUE=DATE:'+day,'RRULE:FREQ=WEEKLY;COUNT=4','SUMMARY:Meu momento Back to Me','DESCRIPTION:Uma pausa opcional. Abra o app quando fizer sentido.','END:VEVENT','END:VCALENDAR'].join('\r\n'));toast('Importe o arquivo no seu calendário se quiser. Você controla os avisos e pode apagar o lembrete.');return;}
    if(action==='export-journal'){download('back-to-me-meu-caderno.txt',journal.map(e=>e.title+'\n'+new Date(e.created_at).toLocaleDateString('pt-BR')+'\n'+e.content).join('\n\n---\n\n'));return;}
    if(action==='download-workshop'){const w=experience.workshops.find(w=>w.id===button.dataset.id);if(w&&!w.locked)download(w.id+'.txt',w.title+'\n\n'+w.chapters.map(c=>c.title+' · '+c.minutes+'min\n'+c.text).join('\n\n'));return;}
    if (busy) return;
    const current = generation; busy = true; button.disabled = true;
    try {
      if(action==='goal'){await api('/api/experience/state',{method:'POST',body:JSON.stringify({goal:button.dataset.goal})});await loadAccount();}
      if(action==='finish-exercise'){await api('/api/experience/state',{method:'POST',body:JSON.stringify({complete:exerciseId})});await emit('exercise_completed');view='start';await loadAccount();toast('Experiência concluída. Você pode voltar quando quiser.');}
      if(action==='save-reflection'){const e=experience.exercises.find(e=>e.id===exerciseId);await saveJournal(e.title,document.getElementById('answers').innerText);}
      if(action==='useful'){await emit('useful_'+button.dataset.value);toast('Obrigada. Registramos apenas sua avaliação, sem as respostas.');}
      if(action==='audio'){const r=await fetch('/api/experience/audio/'+encodeURIComponent(button.dataset.id),{headers:{Authorization:'Bearer '+token}});if(!r.ok)throw new Error('Este áudio não está disponível no seu acesso.');const blob=await r.blob();if(current!==generation)return;if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl=URL.createObjectURL(blob);const a=document.createElement('audio');a.controls=true;a.src=audioUrl;a.setAttribute('aria-label','Narração digital do exercício');const slot=document.getElementById('audio-'+button.dataset.id)||document.getElementById('audio-slot');slot.replaceChildren(a);await emit('audio_played');}
      if(action==='delete-journal'){if(!confirm('Excluir esta nota definitivamente? Exporte uma cópia antes, se quiser.'))return;await api('/api/experience/journal/'+button.dataset.id,{method:'DELETE'});journal=(await api('/api/experience/journal')).entries;render();toast('Nota excluída.');}
      if(action==='cancel-subscription'){if(!confirm('Cancelar a próxima renovação? Seu acesso continua até o fim do período já pago.'))return;await api('/api/stripe/subscription/cancel',{method:'POST',body:JSON.stringify({id:Number(button.dataset.id)})});await loadAccount();toast('Renovação cancelada.');}
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
  root.addEventListener('input',event=>{if(event.target.closest('#exercise-form')){const r=document.getElementById('exercise-result');if(r)r.hidden=true;}});
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
