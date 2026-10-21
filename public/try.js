'use strict';
(()=>{
 document.querySelectorAll('[data-preview]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-preview]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-preview-panel]').forEach(panel=>panel.hidden=panel.dataset.previewPanel!==button.dataset.preview);
  if(matchMedia('(max-width:800px)').matches)document.getElementById('preview-'+button.dataset.preview).scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
 }));
 const box=document.getElementById('experimentar'); if(!box)return;
 let goal='entender';
 const examples={entender:['Comecei a contar do meu dia e o assunto mudou para as contas.','Queria terminar minha história e ter alguns minutos de atenção.','Vou guardar essa percepção por enquanto.'],interesses:['Faz tempo que não ouço música só por prazer.','Queria um momento para algo de que gosto.','Vou escolher duas músicas para uma pausa possível.'],conversa:['Quero terminar de contar uma coisa.','Gostaria de alguns minutos de escuta.','Posso preparar um pedido e decidir depois se quero conversar.']};
 const fields=[...box.querySelectorAll('textarea')],result=document.getElementById('try-result'),form=document.getElementById('try-form');
 box.querySelectorAll('[data-goal]').forEach(b=>b.addEventListener('click',()=>{goal=b.dataset.goal;box.querySelectorAll('[data-goal]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));document.getElementById('try-continue').href='/app?mode=signup&goal='+goal;}));
 document.getElementById('try-example').addEventListener('click',()=>{if(fields.some(f=>f.value.trim())){document.getElementById('try-status').textContent='Para trocar o exemplo, limpe primeiro. Suas palavras foram preservadas.';return;}fields.forEach((f,i)=>f.value=examples[goal][i]);});
 document.getElementById('try-clear').addEventListener('click',()=>{form.reset();result.hidden=true;document.getElementById('try-status').textContent='Palavras apagadas.';fields[0].focus();});
 form.addEventListener('input',()=>{result.hidden=true;});
 form.addEventListener('submit',e=>{e.preventDefault();result.querySelectorAll('[data-answer]').forEach((p,i)=>p.textContent=fields[i].value.trim()||'Deixo esta pergunta em aberto.');result.hidden=false;result.focus();});
 function clear(){fields.forEach(f=>f.value='');result.hidden=true;result.querySelectorAll('[data-answer]').forEach(p=>p.textContent='');}
 window.addEventListener('pagehide',clear);window.addEventListener('pageshow',clear);
 fetch('/api/config').then(r=>r.json()).then(c=>{if(c.testMode)document.querySelectorAll('[data-test]').forEach(x=>x.hidden=false);}).catch(()=>{});
})();
