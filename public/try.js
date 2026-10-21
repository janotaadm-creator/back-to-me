'use strict';
(() => {
  const box = document.getElementById('experimentar');
  if (!box) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const form = document.getElementById('try-form');
  const fields = [...form.querySelectorAll('textarea')];
  const rows = fields.map(field => field.closest('.field'));
  const result = document.getElementById('try-result');
  const steps = [...form.querySelectorAll('[data-reflection-step]')];
  const hint = document.getElementById('reflection-hint');
  const back = document.getElementById('reflection-back');
  const next = document.getElementById('reflection-next');
  const submit = document.getElementById('reflection-submit');
  const status = document.getElementById('try-status');
  let goal = 'entender';
  let step = 0;
  const examples = {
    entender: ['Comecei a contar do meu dia e o assunto mudou para as contas.', 'Queria terminar minha história e ter alguns minutos de atenção.', 'Vou guardar essa percepção por enquanto.'],
    interesses: ['Faz tempo que não ouço música só por prazer.', 'Queria um momento para algo de que gosto.', 'Vou escolher duas músicas para uma pausa possível.'],
    conversa: ['Quero terminar de contar uma coisa.', 'Gostaria de alguns minutos de escuta.', 'Posso preparar um pedido e decidir depois se quero conversar.']
  };
  const hints = ['Comece por uma cena pequena. Também pode usar o exemplo abaixo.', 'Agora, olhe para o que você gostaria de ter recebido.', 'Pode ser um passo pequeno, guardar a ideia ou fazer uma pausa.'];

  function showStep(index, focus = false) {
    step = index;
    form.hidden = false;
    rows.forEach((row, i) => { row.hidden = i !== step; });
    steps.forEach((item, i) => {
      item.classList.toggle('is-current', i === step);
      item.classList.toggle('is-previous', i < step);
      if (i === step) item.setAttribute('aria-current', 'step');
      else item.removeAttribute('aria-current');
    });
    hint.textContent = hints[step];
    back.hidden = step === 0;
    next.hidden = step === 2;
    next.textContent = fields[step].value.trim() ? 'Continuar' : 'Continuar sem escrever';
    submit.hidden = step !== 2;
    result.hidden = true;
    if (focus) fields[step].focus();
  }
  form.querySelector('.reflection-steps').hidden = false;
  form.querySelector('.reflection-controls').hidden = false;
  hint.hidden = false;
  document.getElementById('reflection-edit').hidden = false;
  box.classList.add('guided-reflection');
  showStep(0);
  back.addEventListener('click', () => showStep(Math.max(0, step - 1), true));
  next.addEventListener('click', () => showStep(Math.min(2, step + 1), true));
  document.getElementById('reflection-edit').addEventListener('click', () => showStep(0, true));
  box.querySelectorAll('[data-goal]').forEach(button => button.addEventListener('click', () => {
    goal = button.dataset.goal;
    box.querySelectorAll('[data-goal]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    document.getElementById('try-continue').href = '/app?mode=signup&goal=' + goal;
    status.textContent = 'Caminho escolhido: ' + button.textContent + '. Suas palavras continuam aqui.';
  }));
  document.getElementById('try-example').addEventListener('click', () => {
    if (fields.some(field => field.value.trim())) {
      status.textContent = 'Para trocar o exemplo, limpe primeiro. Suas palavras foram preservadas.';
      return;
    }
    fields.forEach((field, i) => { field.value = examples[goal][i]; });
    showStep(0);
    status.textContent = 'Exemplo fictício preenchido. Avance para conhecer as três partes.';
  });
  document.getElementById('try-clear').addEventListener('click', () => {
    clear();
    status.textContent = 'Palavras apagadas.';
    fields[0].focus();
  });
  form.addEventListener('input', () => {
    result.hidden = true;
    next.textContent = fields[step].value.trim() ? 'Continuar' : 'Continuar sem escrever';
    status.textContent = '';
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (step < 2) { showStep(step + 1, true); return; }
    result.querySelectorAll('[data-answer]').forEach((paragraph, i) => {
      paragraph.textContent = fields[i].value.trim() || 'Deixo esta pergunta em aberto.';
    });
    form.hidden = true;
    result.hidden = false;
    result.focus();
  });
  function clear() {
    fields.forEach(field => { field.value = ''; });
    result.querySelectorAll('[data-answer]').forEach(paragraph => { paragraph.textContent = ''; });
    status.textContent = '';
    showStep(0);
  }
  window.addEventListener('pagehide', clear);
  window.addEventListener('pageshow', clear);

  // Theme selection and exploration feedback stay in this page, with no storage or tracking.
  const picker = document.querySelector('.course-picker');
  const courseGrid = document.querySelector('.course-paths');
  const courses = [...document.querySelectorAll('.course-path')];
  const feedback = document.querySelector('.course-feedback');
  const opened = new Set();
  picker.hidden = false;
  feedback.hidden = false;
  picker.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    const choice = button.dataset.course;
    picker.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    courses.forEach((course, i) => { course.hidden = choice !== 'all' && choice !== String(i); });
    courseGrid.classList.toggle('single-path', choice !== 'all');
  }));
  courses.forEach(course => course.querySelectorAll('details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (!details.open) return;
      opened.add(details);
      details.classList.add('was-opened');
      feedback.textContent = opened.size === 1 ? 'Você abriu 1 exercício. Explore o que chamar sua atenção.' : 'Você abriu ' + opened.size + ' exercícios nesta visita. Pode seguir no seu ritmo.';
    });
  }));

  // Only one sample plays at a time; playback always starts with the visitor.
  const audios = [...document.querySelectorAll('audio')];
  audios.forEach(audio => {
    const note = document.createElement('p');
    note.className = 'audio-feedback';
    note.hidden = true;
    note.setAttribute('role', 'status');
    audio.after(note);
    const preview = audio.closest('details');
    if (preview) preview.addEventListener('toggle', () => { if (!preview.open) audio.pause(); });
    audio.addEventListener('play', () => {
      audios.forEach(other => { if (other !== audio) other.pause(); });
      note.hidden = false;
      note.textContent = 'Uma pausa para ouvir. Você pode parar quando quiser.';
    });
    audio.addEventListener('pause', () => { note.hidden = true; });
    audio.addEventListener('ended', () => { note.textContent = 'A amostra terminou. Leve o que foi útil para você.'; note.hidden = false; });
  });

  const dock = document.querySelector('.journey-dock');
  const targets = ['como-funciona', 'por-dentro', 'planos'].map(id => document.getElementById(id));
  let scheduled = false;
  function updateNavigation() {
    scheduled = false;
    dock.hidden = document.querySelector('.hero').getBoundingClientRect().bottom > 0;
    let active = targets[0].id;
    targets.forEach(target => { if (target.getBoundingClientRect().top < innerHeight * .55) active = target.id; });
    dock.querySelectorAll('a').forEach(link => {
      if (link.hash === '#' + active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  function scheduleNavigation() {
    if (!scheduled) { scheduled = true; requestAnimationFrame(updateNavigation); }
  }
  addEventListener('scroll', scheduleNavigation, { passive: true });
  addEventListener('resize', scheduleNavigation);
  updateNavigation();

  // One gentle entrance per content block. Content remains visible without JS or motion.
  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      if (!motion.matches) entry.target.classList.add('arrived');
      reveals.unobserve(entry.target);
    }), { threshold: .12 });
    document.querySelectorAll('.scene-list li, .sample-lesson, .kit-item, .course-path, .plan').forEach(element => reveals.observe(element));
  }
  fetch('/api/config').then(response => response.json()).then(config => {
    if (config.testMode) document.querySelectorAll('[data-test]').forEach(element => { element.hidden = false; });
  }).catch(() => {});
})();
