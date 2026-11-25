import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSDOM,VirtualConsole} from 'jsdom';
import * as core from '../lib/timetable-core.mjs';
import {practicalFor} from '../lib/practical.mjs';
import {schoolBreaksFor,closureEvents} from '../lib/school-breaks.mjs';
import {datesIn} from '../lib/events.mjs';
const payload=JSON.parse(await fs.readFile('data.json','utf8'));
const html=(await fs.readFile('index.html','utf8')).replace('<script src="./personal-agenda.js?v=exit1"></script>','<script>'+await fs.readFile('personal-agenda.js','utf8')+'</script>').replace('<script src="./appearance.js?v=night6"></script>','<script>'+await fs.readFile('appearance.js','utf8')+'</script>');
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
 const record={title:'Laboratorio per alunni',published:'2026-11-12',documents:[{text:'Sede Centrale Verona Trento Via Ugo Bassi. Oggetto: Laboratorio per alunni. Il 20 novembre è previsto un laboratorio per gli alunni.'}]};const p=practicalFor(record,{title:record.title,events:[]},datesIn);assert.match(p.cost,/non (?:specificati|dice se ci sono costi)/i);assert.match(p.participation,/non (?:specifica|dice se)/i);assert.equal(p.where,'Non specificato nella circolare.');
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
 try{const d=a.d;d.getElementById('phone-help').click();d.getElementById('task-text').value='Matematica <b>cap. 4</b>';d.getElementById('task-kind').value='verifica';d.getElementById('task-due').value=new Date().toISOString().slice(0,8)+'20';d.getElementById('task-form').dispatchEvent(new a.w.Event('submit',{cancelable:true}));
  const t=JSON.parse(a.w.localStorage.getItem(KEY)).tasks[0];assert.equal(t.kind,'verifica');assert.equal(t.calendar,true);
  const pill=()=>d.querySelector('.event-pill.personale');assert.ok(pill(),'evento personale nel calendario');assert.match(pill().textContent,/Verifica: Matematica/);assert.equal(d.querySelectorAll('#calendar b').length,0);
  d.querySelector('[data-task-cal]').click();assert.equal(JSON.parse(a.w.localStorage.getItem(KEY)).tasks[0].calendar,false);assert.equal(pill(),null);
  assert.deepEqual(a.errors,[]);}finally{a.dom.window.close();}
});

test('agenda: copie vecchie senza tipo e calendario restano valide',async()=>{
 const a=await site(JSON.stringify({version:1,tasks:[{id:'x1',text:'Vecchio',done:false,due:'2026-11-20'}]}));
 try{assert.equal(a.d.querySelectorAll('.task-row').length,1);assert.equal(a.d.querySelector('.event-pill.personale'),null);assert.deepEqual(a.errors,[]);}finally{a.dom.window.close();}
});

test('riassunti: parole spezzate del PDF ricucite, luogo e orario estratti, niente intestazione',async()=>{
 const {analyze}=await import('../lib/events.mjs');const {useVocabulary,buildVocabulary}=await import('../lib/text-repair.mjs');
 const recs=JSON.parse(await fs.readFile('tests/fixtures/circolari-spezzate.json','utf8'));useVocabulary(buildVocabulary(recs.flatMap(r=>[r.title,...r.documents.map(d=>d.text)])));
 const [ai,polizia,sciopero,assemblea,aci]=recs.map(r=>analyze(r).practical);
 assert.equal(assemblea.when,'Mercoledì 18 novembre 2026, alle 9:15 (plesso Majorana) · Giovedì 19 novembre 2026, alle 9:15 (anche la 5J)');assert.equal(assemblea.where,'Aula Magna · Palestra');assert.match(assemblea.overview,/^Convocazione/);
 assert.match(aci.action,/^Gli alunni dovranno consegnare l’autorizzazione/);assert.doesNotMatch(aci.action,/Prof\.ssa|SI EVIDENZIA|Liberatoria/);assert.equal(aci.where,'Teatro Cristo Re, Viale Principe Umberto n° 12');assert.equal(aci.cost,'La partecipazione è gratuita.');
 assert.match(ai.overview,/Giornata Nazionale dello Studente, il 17 novembre 2026/);assert.doesNotMatch(ai.overview,/N azionale|202 6|Si comunica/);
 assert.match(ai.overview,/futuro”\.$/,'la frase tra virgolette non viene spezzata');
 assert.equal(ai.where,'Palestra del nostro Istituto');assert.equal(ai.when,'Martedì 17 novembre 2026, dalle 9:30 alle 12:00');
 assert.match(polizia.where,/^Auditorium della Gazzetta del Sud, via /);assert.match(polizia.when,/alle 11:00/);assert.doesNotMatch(polizia.action,/PEO|PEC|Codice/);
 assert.equal(sciopero.where,'Non specificato nella circolare.');assert.match(sciopero.action,/^Le famiglie/);
 for(const p of [ai,polizia,sciopero])for(const v of [p.overview,p.action,p.where])assert.doesNotMatch(v,/\s[,.;:]|PEO:|P\.IVA/);
});

test('lettore PDF: unisce i pezzi della stessa parola usando la posizione',async()=>{
 const {linesFromItems}=await import('../lib/source.mjs');
 const it=(str,x,y,w,eol)=>({str,transform:[12,0,0,12,x,y],width:w,hasEOL:eol});
 assert.deepEqual(linesFromItems([it('Giornata ',10,100,50),it('N',60,100,8),it('azionale',68.2,100,45),it('dello',117,100,25,true),it('202',10,80,20),it('6',30.1,80,6)]),['Giornata Nazionale dello','2026']);
});

test('assemblea divisa per plesso: il 19 vale per la 5J (streaming e uscita al termine), il 18 solo per il Majorana',async()=>{
 const {analyze}=await import('../lib/events.mjs');
 const r=JSON.parse(await fs.readFile('tests/fixtures/circolari-spezzate.json','utf8')).find(x=>x.number==='243');const c=analyze(r);
 const e18=c.events.find(e=>e.date==='2026-11-18'),e19=c.events.find(e=>e.date==='2026-11-19');
 assert.equal(e19.scope,'5J');assert.equal(e19.time,'09:15');assert.match(e19.title,/uscita al termine/);assert.match(c.practical.byDate['2026-11-19'],/streaming.*sciolte: si esce prima/);
 assert.equal(e18.scope,'Altre classi');assert.match(c.practical.byDate['2026-11-18'],/non riguarda la 5J/);
});

test('solo diurno: nelle circolari miste le parti del serale non entrano in calendario né nel riassunto',async()=>{
 const {analyze}=await import('../lib/events.mjs');
 const r={url:'https://nuovo.veronatrento.it/circolare/elezioni-test/',number:'900',published:'2026-09-30',title:'Elezioni per il rinnovo degli Organi Collegiali',body:'',documents:[{url:'x.pdf',text:'Codice mecc: meis027008 diurno metf0275050 serale\nOggetto: Elezioni per il rinnovo degli Organi Collegiali\nSi comunica che le votazioni si terranno lunedì 12 ottobre 2026: MATTINA (studenti del corso diurno) elezione dei rappresentanti di classe degli studenti.\nMartedì 13 ottobre 2026 alle ore 18:00 voteranno gli studenti del corso serale.'}]};
 const c=analyze(r);const dates=c.events.map(e=>e.date);
 assert.ok(!dates.includes('2026-10-13'),'data del serale esclusa');
 for(const v of Object.values(c.practical))if(typeof v==='string')assert.doesNotMatch(v,/serale/);
});

test('di sera non vuol dire serale: i consigli di classe con i rappresentanti restano',async()=>{
 const {analyze}=await import('../lib/events.mjs');
 const r={url:'https://nuovo.veronatrento.it/circolare/consigli-test/',number:'901',published:'2026-11-02',title:'Convocazione dei Consigli di Classe – classi quinte',body:'',documents:[{url:'x.pdf',text:'Oggetto: Convocazione dei Consigli di Classe – classi quinte\nSi comunica che i Consigli di Classe si terranno in orario serale con la partecipazione dei rappresentanti degli studenti e dei genitori: giovedì 26 novembre 2026 alle ore 18:00 la classe 5J.\nMercoledì 25 novembre 2026 alle ore 19:00 si riuniranno i consigli delle classi del serale.'}]};
 const c=analyze(r);const dates=c.events.map(e=>e.date);
 assert.ok(dates.includes('2026-11-26'),'consiglio della 5J di sera presente');
 assert.ok(!dates.includes('2026-11-25'),'consigli del corso serale esclusi');
});

test('assemblea e sciopero visibili alla 5J anche se la circolare cita i rappresentanti',async()=>{
 const {analyze}=await import('../lib/events.mjs');
 const recs=JSON.parse(await fs.readFile('tests/fixtures/circolari-spezzate.json','utf8'));
 const a=analyze(recs.find(r=>r.number==='243')).events.find(e=>e.date==='2026-11-19');
 assert.equal(a.representative,false,'non è una riunione solo per rappresentanti');
 const s=analyze({...recs.find(r=>r.number==='229'),title:'Adesione alla proclamazione dello SCIOPERO.GENERALE.VENERDÌ.20.NOVEMBRE. 2026 CIB.UNICOBAS'}).events.find(e=>e.date==='2026-11-20');
 assert.equal(s.title,'Sciopero generale (CIB UNICOBAS) · lezioni non garantite');assert.equal(s.scope,'Generale');
});

test('uscite anticipate: segnate con massima importanza, solo per le date che riguardano la 5J',async()=>{
 const {analyze}=await import('../lib/events.mjs');
 const recs=JSON.parse(await fs.readFile('tests/fixtures/circolari-spezzate.json','utf8'));
 const ev=analyze(recs.find(r=>r.number==='243')).events;
 assert.equal(ev.find(e=>e.date==='2026-11-19').earlyExit,true);assert.ok(!ev.find(e=>e.date==='2026-11-18').earlyExit,'il 18 è solo Majorana');
 const r={url:'https://nuovo.veronatrento.it/circolare/uscita-test/',number:'902',published:'2026-11-20',title:'Uscita anticipata classi quinte',body:'',documents:[{url:'x.pdf',text:'Oggetto: Uscita anticipata classi quinte\nSi comunica che giovedì 26 novembre 2026 le classi quinte usciranno alle ore 11:20 per lavori di manutenzione.'}]};
 const e=analyze(r).events.find(x=>x.date==='2026-11-26');assert.equal(e.earlyExit,true);assert.equal(e.exitTime,'11:20');
});

test('uscite anticipate etichettate col motivo: assemblea (certa) e sciopero (possibile)',async()=>{
 const {analyze}=await import('../lib/events.mjs');
 const recs=JSON.parse(await fs.readFile('tests/fixtures/circolari-spezzate.json','utf8'));
 const a=analyze(recs.find(r=>r.number==='243')).events.find(e=>e.date==='2026-11-19');
 assert.equal(a.exitReason,'Assemblea');assert.equal(a.exitCertain,true);
 const s=analyze({...recs.find(r=>r.number==='229'),title:'Adesione alla proclamazione dello SCIOPERO GENERALE VENERDÌ 20 NOVEMBRE 2026'}).events.find(e=>e.date==='2026-11-20');
 assert.equal(s.earlyExit,true);assert.equal(s.exitReason,'Sciopero');assert.equal(s.exitCertain,false);
});

test('uscita anticipata per assemblea sindacale dei docenti: segnata col motivo',async()=>{
 const {analyze}=await import('../lib/events.mjs');
 const r={url:'https://nuovo.veronatrento.it/circolare/uscita-sindacale-test/',number:'903',published:'2026-10-20',title:'uscita anticipata alunni per adesione docenti Assemblea Sindacale del 26 ottobre',body:'',documents:[{url:'x.pdf',text:'Oggetto: uscita anticipata alunni per adesione docenti Assemblea Sindacale del 26 ottobre\nSi comunica che lunedì 26 ottobre 2026, a causa dell’adesione dei docenti all’assemblea sindacale, le classi del plesso Majorana e della sede Verona Trento usciranno alle ore 11:20.'}]};
 const e=analyze(r).events.find(x=>x.date==='2026-10-26');assert.equal(e.earlyExit,true);assert.equal(e.exitReason,'Assemblea sindacale');
});

test('avvisi città: chiusura delle scuole a Messina dai giornali, solo città e solo fonti affidabili',async()=>{
 const {parseFeed,newsEvents}=await import('../lib/news.mjs');
 const xml=`<rss><channel>
 <item><title><![CDATA[Maltempo a Messina, domani scuole chiuse: firmata l'ordinanza del sindaco Basile]]></title><link>https://gazzettadelsud.it/articoli/cronaca/2026/11/16/maltempo-messina-scuole-chiuse/</link><pubDate>Mon, 16 Nov 2026 17:10:00 +0100</pubDate><description>Allerta arancione, chiuse le scuole di ogni ordine e grado.</description></item>
 <item><title>Savoca e Letojanni, scuole chiuse per allerta meteo</title><link>https://gazzettadelsud.it/x</link><pubDate>Mon, 16 Nov 2026 16:00:00 +0100</pubDate><description>Provincia di Messina: chiusure nella zona ionica.</description></item>
 <item><title>Messina, falsa ordinanza sulle scuole chiuse: il Comune smentisce</title><link>https://gazzettadelsud.it/y</link><pubDate>Mon, 16 Nov 2026 15:00:00 +0100</pubDate><description>Scuole chiuse a Messina? È un fake.</description></item>
 <item><title>Messina, scuole chiuse per maltempo</title><source url="https://blog-sconosciuto.example">Blog sconosciuto</source><link>https://blog-sconosciuto.example/z</link><pubDate>Mon, 16 Nov 2026 15:00:00 +0100</pubDate><description>a Messina</description></item>
 </channel></rss>`;
 const items=parseFeed(xml,'Gazzetta del Sud');assert.equal(items.length,4);
 const ev=newsEvents(items,'2026-11-16');
 assert.equal(ev.length,1,'solo la notizia sulla città, non la provincia, non il fake, non fonti sconosciute');
 assert.equal(ev[0].date,'2026-11-17');assert.equal(ev[0].closure,true);assert.match(ev[0].title,/Scuole chiuse a Messina per maltempo · da verificare/);
});

test('agenda: un’uscita anticipata segnata a mano (es. MyProf) compare in calendario e accorcia l’orario',async()=>{
 const a=await site();
 try{const d=a.d;d.getElementById('phone-help').click();d.getElementById('task-kind').value='uscita';d.getElementById('task-kind').dispatchEvent(new a.w.Event('change'));
  assert.equal(d.getElementById('task-time-wrap').classList.contains('hidden'),false,'compare il campo ora');
  d.getElementById('task-text').value='Assenza docente TPSI';d.getElementById('task-due').value='2026-11-18';d.getElementById('task-time').value='13:00';
  d.getElementById('task-form').dispatchEvent(new a.w.Event('submit',{cancelable:true}));
  const t=JSON.parse(a.w.localStorage.getItem(KEY)).tasks[0];assert.equal(t.kind,'uscita');assert.equal(t.time,'13:00');assert.equal(t.calendar,true);
  const ev=a.w.QuintaJAgenda.calendarEvents()[0];assert.equal(ev.earlyExit,true);assert.equal(ev.time,'13:00');assert.equal(ev.scope,'5J');assert.match(ev.title,/Uscita anticipata alle 13:00/);
  assert.deepEqual(a.errors,[]);}finally{a.dom.window.close();}
});

test('circolari per gli studenti non scartate: incontri, visite, proiezioni, classi quinte',async()=>{
 const {audienceFor}=await import('../lib/audience.mjs');
 const mk=(title,text)=>({title,documents:[{text:'Agli alunni\nAi docenti\nOggetto: '+title+'\n'+text}]});
 assert.equal(audienceFor(mk('Incontro formativo “CONTRO OGNI FORMA DI ABUSO, DISCRIMINAZIONE E VIOLENZA” – Giornata Internazionale contro la violenza sulle donne – 25 NOVEMBRE 2026','In occasione della Giornata, le classi parteciperanno all’incontro in palestra.')).studentRelevant,true);
 assert.equal(audienceFor(mk('Visita ai “Luoghi Verghiani” di Catania – CLASSI QUINTE','Si comunica che le classi quinte effettueranno una visita.')).studentRelevant,true);
 assert.equal(audienceFor(mk('Oggetto: Proiezione dei film: “Se domani non torno” di P. Randi.','Gli studenti delle classi indicate assisteranno alla proiezione.')).studentRelevant,true);
 assert.equal(audienceFor({title:'Reclutamento del personale docente per il progetto',documents:[{text:'Ai docenti\nOggetto: Reclutamento\nSi invitano i docenti…'}]}).studentRelevant,false,'resta escluso ciò che è solo per docenti');
});

test('dove va la 5J: turni, tabelle CLASSE AULA, spostamenti per modulo, scansioni orarie, testo e aule sostitutive',async()=>{
 const {placementsFor5J}=await import('../lib/location-changes.mjs');const {datesIn}=await import('../lib/events.mjs');
 const T={
'256':['2026-11-25','Incontro formativo “CONTRO OGNI FORMA DI ABUSO, DISCRIMINAZIONE E VIOLENZA” – Giornata Internazionale contro la violenza sulle donne – 25 NOVEMBRE 2026',`Oggetto: Incontro formativo
1° TURNO – Dalle ore 9:15 alle ore 10:30
(Partecipano le classi del primo biennio)
 In Palestra - Tutte le classi SECONDE e le seguenti classi PRIME: 1A, 1B, 1E, 1F, 1G, 1H, 1I, 1J, 1P
 In Aula Smiroldo da remoto - Le seguenti classi PRIME: 1C, 1Q, 1R, 1D.
 Da remoto le classi PRIME e SECONDE del Plesso MAJORANA
2° TURNO – Dalle ore 10:45 alle ore 12:15
(Partecipano le classi del secondo biennio e le classi quinte)
 In Palestra - Tutte le classi QUARTE e le seguenti classi QUINTE: 5A, 5B, 5C, 5D, 5H, 5I, 5M, 5N,
5Q, 5R.
 In Aula Smiroldo da remoto - Le seguenti classi quinte: 5E, 5F, 5G, 5J.
 Da remoto - Le classi del TRIENNIO del Plesso MAJORANA`],
'273':['2026-11-30','Incontro congiunto Ispettorato del Lavoro e INPS – Aula Magna “G. Smiroldo” Via Ugo Bassi lunedì 30 Novembre 2026',`Oggetto: Incontro congiunto
Si comunica che lunedì 30 novembre 2026, dalle ore 9:30 alle ore 13:00, presso l'Aula Magna “G. Smiroldo” si terrà l'incontro. Le classi in elenco seguiranno da remoto dalle aule indicate.
Firma autografa omessa ai sensi
CLASSE AULA
VA B12
VD BT7
VJ B15
VK AULA MAGNA MAJORANA`],
'253':['2026-11-24','Partecipazione GREEN GAME DIGITAL A SCUOLA DI RICICLO 2026/2027 – Disposizioni organizzative',`Oggetto: Green game
1I B15 1J B34 1M B19 1P B38
Prospetto variazione aula per le altre classi
Classe in spostamento Aula Temporanea Docente in orario
5J 1° MOD – AR2 NATOLI ROSARIO
5M BIO 1° MOD – A26 LIOTTA CLAUDIA`],
'182':['2026-10-26','Convegno EdYouFest On Tour “Beyond the Text” – 26 ottobre 2026',`Oggetto: Convegno EdYouFest On Tour “Beyond the Text” 26 ottobre 2026
Si comunica che lunedì 26 ottobre 2026, dalle ore 9.00 alle ore 13.00, presso l'aula Smiroldo dell'IIS
“Verona Trento” si terrà il convegno EdYouFest On Tour “Beyond the Text”. All'evento
parteciperanno gli studenti della classe VJ, dalle ore 09.00 alle 11.45, e gli studenti della classe VG,
dalle ore 11.15 alle ore 13.00. Al termine della giornata sarà rilasciato attestato di partecipazione.`],
'153':['2026-10-29','Incontro di Formazione su AI e Vibe Coding – Giovedì 29 ottobre 2026',`Oggetto: Incontro AI
Gli alunni partecipanti si recheranno in aula Magna accompagnati dal docente del modulo secondo la
scansione oraria di seguito indicata.
ORARIO Classi interessate
9:15 - 10:25 3E, 3F, 3G, 3 J, 3N, 3O
11:45 – 13:00 5E, 5F, 5G, 5J, 5N`],
'150':['2026-10-19|2026-10-26','Interdizione locali palestra Via Ugo Bassi lunedì 19 e lunedì 26 ottobre 2026',`Oggetto: Interdizione locali palestra
Si comunica che lunedì 19 ottobre e lunedì 26 ottobre 2026 i locali della palestra saranno interdetti.
LUNEDI'19
I MODULO IA a28 IIC a18 IVJ at15a IVR b29 VE bt6
II MODULO IIIO a19 VA a21 VJ a29 VM b13
III MODULO IE a19 IG a29 IIB b17`],
'111':['2026-10-06','prolungamento interdizione locali palestra Via Ugo Bassi nei giorni 5 e 6 ottobre 2026.',`Oggetto: prolungamento interdizione
MARTEDI' 6 OTTOBRE 2026 – TERZA SETTIMANA
MODULO CLASSI AULE
I 3 A BIBLIO
3 Q A11
5 J A26
II 2 Q B17`],
'127':['2026-10-10','Delega ai docenti Coordinatori a presiedere le Assemblee',`Oggetto: Delega
NATOLI R. 5 J A R 3`]
};
 const got={};for(const [n,[ds,title,text]] of Object.entries(T)){const r=placementsFor5J({title,url:'u'+n,published:'2026-10-01',documents:[{text}]},ds.split('|').map(date=>({date})),datesIn);got[n]=r.map(c=>c.date+' '+c.start+'-'+c.end+' '+c.newRoom).join(' | ');}
 assert.deepEqual(got,{'256':'2026-11-25 10:45-12:15 Aula Smiroldo (da remoto)','273':'2026-11-30 09:30-13:00 B15','253':'2026-11-24 08:00-09:15 AR2','182':'2026-10-26 09:00-11:45 Aula Smiroldo','153':'2026-10-29 11:45-13:00 Aula Magna','150':'2026-10-19 09:15-10:30 A29','111':'2026-10-06 08:00-09:15 A26','127':''});
});
