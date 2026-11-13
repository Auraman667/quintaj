import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM,VirtualConsole} from 'jsdom';
import * as core from '../lib/timetable-core.mjs';
import {practicalFor} from '../lib/practical.mjs';
import {schoolBreaksFor,closureEvents} from '../lib/school-breaks.mjs';
import {datesIn} from '../lib/events.mjs';
const payload=JSON.parse(await fs.readFile('data.json','utf8'));
const html=(await fs.readFile('index.html','utf8')).replace('<script src="./personal-agenda.js?v=cal1"></script>','<script>'+await fs.readFile('personal-agenda.js','utf8')+'</script>').replace('<script src="./appearance.js?v=night6"></script>','<script>'+await fs.readFile('appearance.js','utf8')+'</script>');
const KEY='quintaj-personal-agenda-v1';
async function site(saved){const errors=[],requests=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));const dom=new JSDOM(html,{url:'https://example.github.io/quintaj/',runScripts:'dangerously',virtualConsole:vc,beforeParse(w){w.QuintaJSchedule=core;w.TextEncoder=TextEncoder;w.fetch=async url=>{requests.push(url);return {ok:true,headers:{get:()=>null},json:async()=>payload};};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};if(saved)w.localStorage.setItem(KEY,saved);}});await new Promise(r=>setTimeout(r,150));return {dom,w:dom.window,d:dom.window.document,errors,requests};}

test('agenda privata: salvataggio, riapertura, completamento, eliminazione e testo sicuro',async()=>{
 const a=await site();let saved;
 try{a.d.getElementById('phone-help').click();assert.ok(!a.d.getElementById('tasks-page').classList.contains('hidden'));a.d.getElementById('task-text').value='Esercizi 12–18 <img src=x onerror=alert(1)>';a.d.getElementById('task-due').value='2026-11-20';a.d.getElementById('task-form').dispatchEvent(new a.w.Event('submit',{cancelable:true}));saved=a.w.localStorage.getItem(KEY);assert.equal(JSON.parse(saved).tasks.length,1);assert.equal(a.d.querySelectorAll('#task-list img').length,0);assert.deepEqual(a.errors,[]);assert.ok(a.requests.every(url=>url==='./data.json'));}finally{a.dom.window.close();}
 const b=await site(saved);
 try{assert.match(b.d.getElementById('task-list').textContent,/Esercizi 12/);const check=b.d.querySelector('[data-task-toggle]');check.checked=true;check.dispatchEvent(new b.w.Event('change',{bubbles:true}));assert.equal(JSON.parse(b.w.localStorage.getItem(KEY)).tasks[0].done,true);b.d.getElementById('task-filter').value='all';b.d.getElementById('task-filter').dispatchEvent(new b.w.Event('change'));b.d.querySelector('[data-task-delete]').click();assert.equal(JSON.parse(b.w.localStorage.getItem(KEY)).tasks.length,0);}finally{b.dom.window.close();}
});

test('agenda: errore di salvataggio esplicito, importazione validata e nessuna perdita dei dati esistenti',async()=>{
 const a=await site();try{
  const original=a.w.Storage.prototype.setItem;a.w.Storage.prototype.setItem=()=>{throw Error('Storage full');};a.d.getElementById('task-text').value='Non perdere questo testo';a.d.getElementById('task-form').dispatchEvent(new a.w.Event('submit',{cancelable:true}));assert.match(a.d.getElementById('task-status').textContent,/non.*conservata/i);assert.equal(a.d.getElementById('task-text').value,'Non perdere questo testo');a.w.Storage.prototype.setItem=original;
  const file=a.d.getElementById('task-file');Object.defineProperty(file,'files',{configurable:true,value:[{size:500,text:async()=>JSON.stringify({version:1,tasks:[{id:'import-1',text:'Compito importato',due:'2026-12-01',done:false}]})}]});await file.onchange({target:file});assert.equal(JSON.parse(a.w.localStorage.getItem(KEY)).tasks.length,1);
  Object.defineProperty(file,'files',{configurable:true,value:[{size:100,text:async()=>'{"version":1,"tasks":[{"bad":true}]}'}]});await file.onchange({target:file});assert.match(a.d.getElementById('task-status').textContent,/non valida/);assert.equal(JSON.parse(a.w.localStorage.getItem(KEY)).tasks.length,1);
 }finally{a.dom.window.close();}
});

test('spiegazione: niente costi, obblighi o sede dedotti dall’intestazione',()=>{
 const record={title:'Laboratorio per alunni',published:'2026-11-12',documents:[{text:'Sede Centrale Verona Trento Via Ugo Bassi. Oggetto: Laboratorio per alunni. Il 20 novembre è previsto un laboratorio per gli alunni.'}]};const p=practicalFor(record,{title:record.title,events:[]},datesIn);assert.match(p.cost,/non specificati/);assert.match(p.participation,/non specifica/);assert.equal(p.where,'Non specificato nella circolare.');
});

test('calendario: weekend blu, prossime pause e spiegazione hackathon per il giorno selezionato',async()=>{
 const a=await site();try{
  a.d.querySelector('[data-page="holidays"]').click();assert.match(a.d.getElementById('holiday-next').textContent,/pausa|giorni/i);assert.ok(a.d.querySelectorAll('.school-off .day-off-label').length>=8);
  const event=payload.events.find(e=>/hackathon.*tasca/i.test(e.title)&&e.date==='2026-11-12');assert.ok(event);a.w.showEvent(event);const text=a.d.querySelector('.practical-explanation').textContent;assert.match(text,/online facoltativo/);assert.match(text,/20 novembre/);assert.match(text,/gratuita/);assert.match(text,/2 a 4/);assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close();}
});

const record=(title,text,number='300')=>({title,published:'2026-11-12',number,url:'https://example.com/'+number,documents:[{text:'Oggetto: '+title+'. '+text}]});
const notice=r=>({id:r.number,...r,scope:'Generale',classes:[],summary:r.title,serale:false});
test('sospensioni: intervallo inclusivo, ripresa esclusa e riferimento a vecchia circolare ignorato',()=>{
 const r=record('Sospensione delle attività didattiche dal 23 dicembre 2026 al 6 gennaio 2027','Le attività didattiche sono sospese dal 23 dicembre 2026 al 6 gennaio 2027. Riprenderanno il 7 gennaio 2027.');
 const result=schoolBreaksFor([r],[notice(r)],datesIn);assert.equal(result.breaks.length,1);assert.equal(result.breaks[0].start,'2026-12-23');assert.equal(result.breaks[0].end,'2027-01-06');assert.equal(closureEvents(result.breaks,[notice(r)]).length,15);
 const single=record('Sospensione attività didattica – 2 Novembre 2026 (integrazione della circ. n.187 del 26.10.2026)','Le attività sono sospese il 2 novembre. Riprenderanno il 3 novembre.');assert.deepEqual(schoolBreaksFor([single],[notice(single)],datesIn).breaks.map(b=>[b.start,b.end]),[['2026-11-02','2026-11-02']]);
 const shared=record('Sospensione delle attività didattiche dal 23 al 31 dicembre 2026','Vacanze dal 23 al 31 dicembre 2026.');assert.equal(schoolBreaksFor([shared],[notice(shared)],datesIn).breaks[0].end,'2026-12-31');
});

test('sospensioni: niente chiusura 5J da avvisi solo Majorana; revoca e aule coerenti',()=>{
 const r=record('Sospensione attività didattica 20 novembre 2026','Le lezioni sono sospese il 20 novembre 2026.');const n=notice(r);const events=closureEvents(schoolBreaksFor([r],[n],datesIn).breaks,[n]);const plan=core.dayPlan(payload.timetable,'2026-11-20',events);assert.equal(plan.lessons.length,0);assert.match(plan.reason,/sospese/);
 const other=record('Sospensione attività didattica Majorana 20 novembre 2026','Le lezioni sono sospese il 20 novembre 2026.');assert.equal(schoolBreaksFor([other],[notice(other)],datesIn).breaks.length,0);
 const rev=record('Revoca sospensione attività didattica 20 novembre 2026','È revocata la sospensione del 20 novembre 2026.','301');assert.equal(schoolBreaksFor([r,rev],[n,notice(rev)],datesIn).breaks.length,0);
});

test('preferenze: cinque immagini, tema chiaro ripristinabile e agenda personale conservata',async()=>{
 const saved=JSON.stringify({version:1,tasks:[{id:'existing',text:'Impegno da conservare',done:false,due:''}]});const a=await site(saved);
 try{a.d.getElementById('appearance-open').click();assert.ok(!a.d.getElementById('info-page').classList.contains('hidden'));assert.equal(a.d.querySelectorAll('[data-scene]').length,5);a.d.querySelector('[data-scene="london"]').click();assert.equal(a.w.localStorage.getItem('quintaj-scene'),'london');assert.match(a.d.documentElement.style.getPropertyValue('--scene'),/london.jpg/);
 const select=a.d.getElementById('appearance-theme');select.value='light';select.dispatchEvent(new a.w.Event('change'));assert.equal(a.d.getElementById('night-theme').disabled,true);assert.equal(a.w.localStorage.getItem('quintaj-theme'),'light');assert.equal(a.w.localStorage.getItem(KEY),saved);
 a.d.querySelector('[data-scene="rain"]').click();assert.equal(a.d.getElementById('night-theme').disabled,false);assert.equal(a.w.localStorage.getItem('quintaj-theme'),'night');a.d.querySelector('[data-page="holidays"]').click();assert.match(a.d.getElementById('holiday-next').textContent,/Immacolata/);assert.match(a.d.getElementById('holiday-list').textContent,/Vacanze di Natale/);assert.match(a.d.getElementById('holiday-list').textContent,/Vacanze di Pasqua/);assert.match(a.d.getElementById('holiday-weekends').textContent,/weekend/);assert.deepEqual(a.errors,[]);
 }finally{a.dom.window.close();}
});

test('agenda: una verifica con data compare nel calendario e si può togliere',async()=>{
 const a=await site();
 try{const d=a.d;d.getElementById('phone-help').click();d.getElementById('task-text').value='Matematica <b>cap. 4</b>';d.getElementById('task-kind').value='verifica';d.getElementById('task-due').value='2026-11-20';d.getElementById('task-form').dispatchEvent(new a.w.Event('submit',{cancelable:true}));
  const t=JSON.parse(a.w.localStorage.getItem(KEY)).tasks[0];assert.equal(t.kind,'verifica');assert.equal(t.calendar,true);
  const pill=()=>d.querySelector('.event-pill.personale');assert.ok(pill(),'evento personale nel calendario');assert.match(pill().textContent,/Verifica: Matematica/);assert.equal(d.querySelectorAll('#calendar b').length,0);
  d.querySelector('[data-task-cal]').click();assert.equal(JSON.parse(a.w.localStorage.getItem(KEY)).tasks[0].calendar,false);assert.equal(pill(),null);
  assert.deepEqual(a.errors,[]);}finally{a.dom.window.close();}
});

test('agenda: copie vecchie senza tipo e calendario restano valide',async()=>{
 const a=await site(JSON.stringify({version:1,tasks:[{id:'x1',text:'Vecchio',done:false,due:'2026-11-20'}]}));
 try{assert.equal(a.d.querySelectorAll('.task-row').length,1);assert.equal(a.d.querySelector('.event-pill.personale'),null);assert.deepEqual(a.errors,[]);}finally{a.dom.window.close();}
});
