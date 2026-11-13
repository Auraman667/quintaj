/* QuintaJ — menu a tendina, torna su, settimana a fisarmonica, pioggia opzionale (v mobile8) */
(()=>{try{
const $=id=>document.getElementById(id);
const mobile=matchMedia('(max-width:650px)');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const store={get(k){try{return localStorage.getItem(k)}catch{return null}},set(k,v){try{localStorage.setItem(k,v)}catch{}}};
const behavior=reduce?'auto':'smooth';

/* tema: espone .qj-night quando night.css è attivo */
const nightLink=$('night-theme');
const syncTheme=()=>document.documentElement.classList.toggle('qj-night',!!nightLink&&!nightLink.disabled);
syncTheme();if(nightLink)new MutationObserver(syncTheme).observe(nightLink,{attributes:true,attributeFilter:['disabled']});
setInterval(syncTheme,1500);

/* pioggia (canvas leggero, spenta di default) */
let canvas,ctx,drops=[],raf=0,W=0,H=0,last=0;
const newDrop=any=>({x:Math.random()*(W+60),y:any?Math.random()*H:-30,l:10+Math.random()*16,v:420+Math.random()*380,a:.12+Math.random()*.25});
function sizeCanvas(){const d=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);drops=Array.from({length:Math.round(Math.min(90,W*H/9000))},()=>newDrop(true));}
function frame(t){raf=requestAnimationFrame(frame);const dt=Math.min((t-last)/1000,.05);last=t;ctx.clearRect(0,0,W,H);ctx.lineWidth=1;ctx.lineCap='round';for(const d of drops){d.y+=d.v*dt;d.x-=d.v*dt*.18;if(d.y>H+20||d.x<-30)Object.assign(d,newDrop(false));ctx.strokeStyle='rgba(165,208,255,'+d.a+')';ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x+d.l*.18,d.y-d.l);ctx.stroke();}}
function startRain(){if(raf)return;last=performance.now();raf=requestAnimationFrame(frame);}
function stopRain(){cancelAnimationFrame(raf);raf=0;}
function setRain(on){if(on&&!canvas){canvas=document.createElement('canvas');canvas.id='qj-rain';canvas.setAttribute('aria-hidden','true');ctx=canvas.getContext('2d');document.body.append(canvas);sizeCanvas();addEventListener('resize',sizeCanvas);}
 document.body.classList.toggle('rain-on',on);store.set('quintaj-rain',on?'1':'0');if(on&&!document.hidden)startRain();else stopRain();}
document.addEventListener('visibilitychange',()=>{if(!document.body.classList.contains('rain-on'))return;document.hidden?stopRain():startRain();});

/* menu a tendina dal basso */
const PAGES=[['calendar','Calendario','▦'],['orario','Orario e aule','⌖'],['tasks','La mia agenda','☑'],['circolari','Circolari','▤'],['changes','Variazioni','↔'],['representatives','Rappresentanti','★'],['holidays','Prossime pause','◷'],['info','Come funziona','ⓘ']];
const trigger=p=>document.querySelector('[data-page="'+p+'"]');
let sheet,menuBtn;
function fillSheet(){const active=document.querySelector('.nav button.active')?.dataset.page;const list=sheet.querySelector('.qj-sheet-list');list.textContent='';
 for(const [p,label,ic] of PAGES){if(!trigger(p))continue;const b=document.createElement('button');b.type='button';b.className='qj-item'+(p===active?' active':'');b.innerHTML='<span class="ic" aria-hidden="true">'+ic+'</span><span>'+label+'</span>';b.onclick=()=>{toggle(false);trigger(p).click();scrollTo({top:0,behavior:'auto'});};list.append(b);}
 const tools=sheet.querySelector('.qj-tools');tools.textContent='';
 if(!reduce){const r=document.createElement('button');r.type='button';r.className='qj-tool';const on=document.body.classList.contains('rain-on');r.setAttribute('aria-pressed',String(on));r.innerHTML='<span>Pioggia animata</span><span class="qj-switch"></span>';r.onclick=()=>{const n=r.getAttribute('aria-pressed')!=='true';r.setAttribute('aria-pressed',String(n));setRain(n);};tools.append(r);}
 const bg=[...document.querySelectorAll('button')].find(b=>!b.closest('.qj-sheet')&&/Sfondo/.test(b.textContent));
 if(bg){const s=document.createElement('button');s.type='button';s.className='qj-tool';s.innerHTML='<span>Sfondo e tema</span><span aria-hidden="true">›</span>';s.onclick=()=>{toggle(false);bg.click();};tools.append(s);}}
function toggle(open){if(!sheet){sheet=document.createElement('div');sheet.className='qj-sheet';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','Menu');sheet.innerHTML='<button type="button" class="qj-sheet-bg" aria-label="Chiudi menu"></button><div class="qj-sheet-panel"><div class="qj-grip"></div><h2>Vai a</h2><div class="qj-sheet-list"></div><h2 style="margin-top:16px">Aspetto</h2><div class="qj-tools"></div></div>';document.body.append(sheet);sheet.querySelector('.qj-sheet-bg').onclick=()=>toggle(false);}
 if(open)fillSheet();sheet.classList.toggle('open',open);document.documentElement.style.overflow=open?'hidden':'';menuBtn?.setAttribute('aria-expanded',String(open));
 if(open)sheet.querySelector('.qj-item')?.focus({preventScroll:true});else menuBtn?.focus({preventScroll:true});}
addEventListener('keydown',e=>{if(e.key==='Escape'&&sheet?.classList.contains('open'))toggle(false);});

/* dock a 4 voci */
function enhanceDock(){const dock=document.querySelector('.phone-dock');if(!dock||dock.dataset.qj)return false;dock.dataset.qj='1';
 const set=(b,ic,tx)=>{b.innerHTML='<span class="ic" aria-hidden="true">'+ic+'</span><span>'+tx+'</span>';};
 const [a,c,t]=dock.querySelectorAll('button');if(a){set(a,'⌖','Aula');a.setAttribute('aria-label','Aula adesso');}if(c)set(c,'▦','Calendario');if(t){set(t,'☑','Agenda');t.setAttribute('aria-label','La mia agenda');}
 menuBtn=document.createElement('button');menuBtn.type='button';menuBtn.setAttribute('aria-haspopup','dialog');menuBtn.setAttribute('aria-expanded','false');set(menuBtn,'≡','Menu');menuBtn.onclick=()=>toggle(true);dock.append(menuBtn);return true;}

/* torna su */
const fab=document.createElement('button');fab.type='button';fab.className='qj-fab';fab.setAttribute('aria-label','Torna in alto');fab.textContent='↑';fab.onclick=()=>scrollTo({top:0,behavior});document.body.append(fab);
addEventListener('scroll',()=>fab.classList.toggle('show',scrollY>700),{passive:true});

/* toccando un giorno del calendario, porta all'elenco di quel giorno */
document.addEventListener('click',e=>{if(!mobile.matches||!e.target.closest('#calendar [data-day]'))return;setTimeout(()=>document.querySelector('.agenda')?.scrollIntoView({behavior,block:'start'}),80);});

/* settimana: una fisarmonica per giorno (la tabella resta come fonte, i tocchi la attivano) */
function enhanceWeek(){const host=$('plan-week-table');const t=host?.querySelector('table.week-table');if(!t||host.querySelector('.qj-week'))return;
 const heads=[...t.tHead.rows[0].cells].slice(1).map(th=>th.textContent.trim());const rows=[...t.tBodies[0].rows];const wrap=document.createElement('div');wrap.className='qj-week';
 heads.forEach((h,i)=>{const det=document.createElement('details');const sum=document.createElement('summary');const cells=rows.map(r=>r.cells[i+1]);const lessons=cells.filter(c=>c.querySelector('button.week-cell'));const isToday=cells.some(c=>c.querySelector('.week-cell.today'));
  sum.innerHTML='<span></span><small></small>';sum.firstChild.textContent=h;sum.lastChild.textContent=lessons.length?lessons.length+' lezioni':(cells[0].textContent.trim()||'—');det.append(sum);
  rows.forEach((r,k)=>{const td=cells[k];if(!td.querySelector('button.week-cell'))return;const slot=document.createElement('div');slot.className='qj-slot';const [s,e]=r.cells[0].innerHTML.split(/<br\s*\/?>/i);const time=document.createElement('time');time.textContent=s+(e?' – '+e:'');slot.append(time);
   td.querySelectorAll('button.week-cell').forEach(c=>{const copy=c.cloneNode(true);copy.onclick=()=>t.querySelector('[data-plan-date="'+c.dataset.planDate+'"][data-plan-time="'+c.dataset.planTime+'"]')?.click();slot.append(copy);});det.append(slot);});
  if(isToday){det.classList.add('today');det.open=true;}wrap.append(det);});
 if(!wrap.querySelector('details[open]'))wrap.querySelector('details')?.setAttribute('open','');host.append(wrap);}

function init(){if(!enhanceDock()&&!document.querySelector('.phone-dock'))return setTimeout(init,300);
 const wk=$('plan-week-table');if(wk){new MutationObserver(enhanceWeek).observe(wk,{childList:true});enhanceWeek();}
 if(store.get('quintaj-rain')==='1'&&!reduce)setRain(true);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
}catch(err){console.warn('QuintaJ mobile.js',err);}})();
