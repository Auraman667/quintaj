import {audienceFor,audiencesFor,isStudentEvent} from './audience.mjs';
import {locationChangesFor} from './location-changes.mjs';
const monthNames=['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
export const normalize=s=>String(s||'').normalize('NFKC').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
export function classesIn(text){const s=normalize(text).toUpperCase();const found=new Set();for(const m of s.matchAll(/\b(?:5|V)\s*[°^ª]?\s*([A-Z])\b/g))found.add('5'+m[1]);return [...found].sort();}
export function category(text){const s=text.toLowerCase();if(/rettifica|annull|rinvi|posticip/.test(s))return 'Rettifiche';if(/anticipat|orario|ingresso|uscita.{0,30}ore|sospensione.{0,30}lezion/.test(s))return 'Orario';if(/\baul[ae]\b|interdizione.{0,30}(?:local|palestr)/.test(s))return 'Aule';if(/pcto|\bfsl\b|scuola.lavoro|formazione scuola/.test(s))return 'PCTO / FSL';if(/cinema|cinematograf|teatro|teatrale|spettacolo|film/.test(s))return 'Cinema e teatro';if(/visita|uscita didattica|viaggio|escursione/.test(s))return 'Uscite';if(/orientamento|universit|consapevolmente/.test(s))return 'Orientamento';if(/sciopero|assemblea/.test(s))return 'Assemblee e scioperi';return 'Scuola';}
export function datesIn(text,published){
 let s=normalize(text);for(const name of monthNames)s=s.replace(new RegExp('\\b'+name.split('').join('\\s*')+'\\b','gi'),name);s=s.replace(/\b2\s*0\s*(\d)\s*(\d)\b/g,'20$1$2').replace(/(\d)\.(?=[a-z])/gi,'$1 ').replace(new RegExp('('+monthNames.join('|')+')\\.','gi'),'$1 ').replace(new RegExp('\\b([0-3])\\s+([0-9])(?=\\s+(?:'+monthNames.join('|')+'))','gi'),'$1$2');const out=[]; const py=+published.slice(0,4),pm=+published.slice(5,7);const schoolStart=pm>=9?py:py-1;
 function add(m,d,mo,year,inferred){let y=year?+year:(mo>=9?schoolStart:schoolStart+1);if(y<100)y+=2000;const iso=`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;const date=new Date(iso+'T12:00:00Z');if(date.getUTCFullYear()!==y||date.getUTCMonth()+1!==mo||date.getUTCDate()!==+d||y<schoolStart||y>schoolStart+1)return;const context=s.slice(Math.max(0,m.index-95),m.index+m[0].length+150);if(/Messina,?\s*$/i.test(s.slice(Math.max(0,m.index-15),m.index)))return;if(/(?:decreto|legge|D\.Lgs|DPR|prot\.)[^.]{0,45}$/i.test(s.slice(Math.max(0,m.index-55),m.index)))return;out.push({date:iso,context,inferred});}
 for(const m of s.matchAll(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2}|\d{2})\b/g))add(m,+m[1],+m[2],m[3],false);
 const re=new RegExp('\\b(\\d{1,2})\\s+('+monthNames.join('|')+')\\s*(20\\d{2})?\\b','gi');
 for(const m of s.matchAll(re))add(m,+m[1],monthNames.indexOf(m[2].toLowerCase())+1,m[3],!m[3]);
 return [...new Map(out.map(x=>[x.date,x])).values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function excerpt(text,title){let s=text.replace(/\n/g,' ');const at=s.search(/(?:Oggetto|OGGETTO)\s*:/);if(at>=0)s=s.slice(at+8);else {const at2=s.search(/(?:Si comunica|Si informano|Si invitano|Con la presente|Gli studenti|Le classi)/i);if(at2>=0)s=s.slice(at2);else s=title;}return normalize(s).slice(0,460);}
export function analyze(record,role=audienceFor(record)){
 const full=record.documents.map(d=>d.text).join('\n');const text=record.title+'\n'+full;const classes=classesIn(text);const fifth=/\bquint[aei]\b|classi\s+(?:5[°^ª]?|V)\s*(?:[,.;:]|$)/i.test(text);
 const header=full.split(/oggetto/i)[0];const audience=record.title+' '+[...header.matchAll(/\bclass[ei]\b[\s\S]{0,300}/gi)].map(m=>m[0]).join(' ');const explicitOther=/\b[1-4]\s*[°^ª]?\s*[A-Z]\b/.test(audience)||(/class[ei].{0,30}(?:prim[ae]|second[ae]|terz[ae]|quart[ae])/i.test(audience)&&!/quint/i.test(audience));
 const general=/tutt[ei]\s+(?:gli\s+|le\s+|i\s+|dell[ae]\s+)?(?:student|alunn|classi)|inter[oa]\s+(?:istituto|scuola)|comunità scolastica|sciopero generale|sospensione.{0,40}(?:lezion|didattic)/i.test(text);
 const operational=/uscita anticipata|variazione.{0,40}orario|cambio.{0,20}aul|sciopero|assemblea|sospensione|evacuazione/i.test(text);
 const relevant=classes.length>0||fifth||general||operational||record.documents.some(d=>d.error);
 let scope=classes.includes('5J')?'5J':classes.length?'Altre quinte':fifth?'Quinte':general&&!explicitOther?'Generale':'Da verificare';
 const staffOnly=/neoassunt|personale docente|collegio dei docenti|bilancio.{0,30}competenze|nomina.{0,50}docent|commissione di valutazione|formazione.{0,30}docenti/i.test(record.title)&&!classes.length;
 if(staffOnly)scope='Personale';
 if(record.serale)scope='Serale';
 if(!classes.length&&explicitOther)scope='Altre classi';
 if(role.representative&&scope==='Da verificare'&&!classes.length)scope='Generale';
 if(role.studentRelevant&&scope==='Da verificare'&&!classes.length&&!/plesso|majorana|viale giostra/i.test(record.title)&&/agli\s+(?:alunni|studenti)|alle\s+famiglie/i.test(header))scope='Generale';
 const cat=category(record.title);const titleDates=datesIn(record.title,record.published);
 let dates=titleDates.length?titleDates:datesIn(full,record.published).filter(d=>/giorn|luned|marted|mercoled|gioved|venerd|sabato|domenica|ore\b|entro|scadenz|incontr|dal\b|al\b|data|svolger|terr[àa]|previst|calendar|partenza/i.test(d.context));
 const multiple=dates.length>8; if(multiple)dates=[];
 const issues=record.documents.filter(d=>d.error).map(d=>d.error);if(!record.documents.length)issues.push('Nessun allegato PDF trovato');if(multiple)issues.push('Calendario complesso: consulta le tabelle del PDF');
 const summary=excerpt(full,record.title);
 const snippets=full.split('\n').filter((line,i,lines)=>/\b(?:5\s*J|V\s*J)\b/i.test(line)).slice(0,8).map(normalize);
 const id=record.url.split('/').filter(Boolean).at(-1);
 let events=dates.map((d,i)=>({id:id+'-'+d.date,title:record.title,date:d.date,category:cat,scope,classes,number:record.number,url:record.url,summary,context:d.context,confidence:'Da verificare',inferred:d.inferred,time:null}));
 if(cat==='Orario'&&classes.includes('5J')){
  let lastHeading=null;
  for(const line of full.split('\n')){const normalized=line.replace(/(\d)\s+(\d)(?=\s*[:.])/g,'$1$2');const tm=normalized.match(/\b([01]?\d|2[0-3])\s*[:.]\s*([0-5]\d)\b/);if(/(?:uscita|ingresso|entrata).{0,45}ore/i.test(normalized)&&tm)lastHeading={time:tm[1].padStart(2,'0')+':'+tm[2],line:normalized};else if(lastHeading&&classesIn(line).includes('5J')){events=events.map(e=>({...e,time:lastHeading.time,context:lastHeading.line+' · '+line,confidence:'Riga per la 5J',title:/uscita/i.test(lastHeading.line)?'Uscita anticipata · 5J':record.title,summary:'5J: '+lastHeading.line+'. '+summary}));lastHeading=null;}}
 }
 // Tables with date headings must assign each class to its own row, never to every date.
 if(/consigli(?:o)? di classe/i.test(record.title)){
  const tableEvents=[];
  for(const doc of record.documents){if(!/Calendario Consigli/i.test(doc.text)&&!/^\s*\d{1,2}[.:]\d{2}\s+(?:V\s?[A-Z]|5\s?[A-Z])/m.test(doc.text))continue;let current=null;
   for(const line of doc.text.split('\n')){const heading=datesIn(line,record.published);if(heading.length===1)current=heading[0];const rowClasses=classesIn(line);const tm=line.match(/\b([01]?\d|2[0-3])[.:]([0-5]\d)\b/);if(current&&rowClasses.length&&tm)for(const cl of rowClasses)tableEvents.push({id:id+'-'+cl+'-'+current.date,title:'Consiglio di classe · '+cl,date:current.date,category:cat,scope:cl==='5J'?'5J':'Altre quinte',classes:[cl],number:record.number,url:record.url,summary,context:line,confidence:'Riga del calendario',inferred:current.inferred,time:tm[1].padStart(2,'0')+':'+tm[2],series:'consiglio-'+cl});}
  }
  if(tableEvents.length)events=tableEvents;
  else if(classes.length>1){events=[];issues.push('La tabella dei consigli richiede un controllo: data della singola classe non attribuibile automaticamente');}
 }
 if(/calendario/i.test(record.title)&&!/consigli(?:o)? di classe/i.test(record.title)){
  const tableEvents=[];const family=/allineamento/i.test(record.title)?'allineamento':null;
  for(const doc of record.documents){let activeClasses=[];let inCalendar=false;
   for(const line of doc.text.split('\n')){
    if(/^CALENDARIO\b/i.test(line))inCalendar=true;
    if(inCalendar&&/^Classi\b/i.test(line)&&classesIn(line).length)activeClasses=classesIn(line);
    const rowDates=datesIn(line,record.published);const tm=line.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if(inCalendar&&activeClasses.length&&rowDates.length===1&&tm){for(const cl of activeClasses)tableEvents.push({id:id+'-'+cl+'-'+rowDates[0].date,title:(family?'Corso di allineamento E-mobility':record.title)+' · '+cl,date:rowDates[0].date,category:cat,scope:cl==='5J'?'5J':'Altre quinte',classes:[cl],number:record.number,url:record.url,summary,context:line,confidence:'Riga del calendario',inferred:rowDates[0].inferred,time:tm[1].padStart(2,'0')+':'+tm[2],series:family?family+'-'+cl:null});}
   }
  }
  if(tableEvents.length)events=tableEvents;
 }
 events=role.studentRelevant?events.filter(isStudentEvent).map(e=>({...e,studentRelevant:true,representative:role.representative,representativeKind:role.representativeKind,representativeActions:role.representativeActions,...(role.representative&&!e.series?{time:e.time||(record.title.match(/ore\s+([01]?\d|2[0-3])[.:]([0-5]\d)/i)?.slice(1).map((v,i)=>i===0?v.padStart(2,'0'):v).join(':')||null)}:{})})):[];
 if(role.representative&&/comitato studentesco/i.test(record.title)){const line=role.representativeActions.find(s=>/classi\s+III.{0,20}IV.{0,15}V\b/i.test(s));const tm=line?.match(/Dalle\s+(\d{1,2})[.:](\d{2})/i);if(tm)events=events.map(e=>({...e,time:tm[1].padStart(2,'0')+':'+tm[2],context:line,confidence:'Fascia per le classi quinte'}));}
 const roomChanges=locationChangesFor(record,{scope,classes,events},datesIn);
 if(roomChanges.length)events=events.map(e=>({...e,roomChanges:roomChanges.filter(c=>c.date===e.date)}));
 return {id,url:record.url,title:record.title,number:record.number,published:record.published,checkedAt:record.checkedAt,classes,scope,category:cat,summary,snippets,relevant:(relevant||role.studentRelevant)&&!record.serale&&role.studentRelevant,serale:record.serale,issues,documents:record.documents.map(d=>({url:d.url,error:d.error})),events,...role};
}
export function publicData(snapshot){const roles=audiencesFor(snapshot.records);const circolari=snapshot.records.map(r=>analyze(r,roles.get(r.url))).filter(c=>c.studentRelevant&&!c.serale);let events=circolari.filter(c=>c.relevant).flatMap(c=>c.events);const key=e=>e.series+(e.series?.startsWith('consiglio-')?'-'+e.date.slice(0,7):'');const latest=new Map();for(const e of events){if(e.series){const old=latest.get(key(e));if(!old||Number(e.number)>Number(old.number))latest.set(key(e),e);}}events=events.filter(e=>!e.series||latest.get(key(e)).number===e.number);return {updatedAt:snapshot.updatedAt,schoolYear:snapshot.schoolYear,complete:snapshot.complete,archiveCount:snapshot.archiveCount,studentCount:circolari.length,errors:snapshot.errors||[],circolari,events};}
