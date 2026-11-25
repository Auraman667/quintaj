import {rangeFromText} from './timetable-core.mjs';
const periods=[['08:00','09:15'],['09:15','10:30'],['10:30','11:45'],['11:45','13:00'],['13:00','14:15']];
const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
const roomPattern='(?:aula\\s+(?:magna|[A-Z]{1,4}\\s*\\d{1,3}[A-Z]?)|laboratorio\\s+(?:CISCO|[A-Z]{1,4}\\s*\\d{1,3}[A-Z]?)|palestra(?:[- ]\\d{1,2})?)';
function roomName(s){return compact(s).replace(/^aula\s+(?=[A-Z]{1,4}\s*\d)/i,'').replace(/^aula magna$/i,'Aula Magna');}
export function moduleRange(text){
 const numbers={I:1,II:2,III:3,IV:4,V:5,PRIMO:1,SECONDO:2,TERZO:3,QUARTO:4,QUINTO:5,'1':1,'2':2,'3':3,'4':4,'5':5};
 const m=text.match(/\b(I{1,3}|IV|V|[1-5]|primo|secondo|terzo|quarto|quinto)\s*[°º^]?\s+modulo\b/i)||text.match(/\bmodulo\s+(I{1,3}|IV|V|[1-5])\b/i);
 if(!m)return null;const period=numbers[m[1].toUpperCase()];return period?{start:periods[period-1][0],end:periods[period-1][1],period}:null;
}
export function locationChangesFor(record,{scope,classes,events},extractDates){
 // Prima le righe che collocano esplicitamente la 5J (turni, tabelle, moduli); poi le regole generiche.
 const placed=events.length?placementsFor5J(record,events,extractDates):[];
 const general=locationChangesGeneral(record,{scope,classes,events},extractDates);
 const key=c=>[c.date,c.start,c.end].join('|');const seen=new Set(placed.map(key));
 return [...placed,...general.filter(c=>!seen.has(key(c)))];
}
function locationChangesGeneral(record,{scope,classes,events},extractDates){
 if(!events.length||!['5J','Quinte','Generale'].includes(scope))return [];
 const main=record.documents.find(d=>d.text?.length>80)?.text||'';const body=main.split(/oggetto\s*:/i).slice(1).join(' ')||main;
 const lines=body.split('\n');const changes=[];
 for(let i=0;i<lines.length;i++){
  if(!new RegExp(roomPattern,'i').test(lines[i]))continue;
  const context=compact(lines.slice(Math.max(0,i-2),i+4).join(' '));
  const explicit5J=/\b(?:5\s*J|V\s*J)\b/i.test(context);
  const collective=/tutte\s+le\s+classi\s+quinte|tutti\s+gli\s+alunni.{0,30}quinte/i.test(context);
  const singleAudience=classes.includes('5J')&&classes.length===1;
  if(!explicit5J&&!collective&&!singleAudience)continue;
  const range=rangeFromText(context)||moduleRange(context);if(!range)continue;
  const destination=new RegExp('(?:si\\s+(?:recherà|recheranno|sposta|spostano|sposterà|sposteranno)\\s+(?:in|presso|nell[\'’])|(?:vai|andare|andranno)\\s+in|(?:svolgerà|svolgeranno|terrà|terranno|previst[oa])[^.;]{0,60}\\b(?:in|presso)|anziché[^.;]{0,40}\\bin|all[\'’])\\s*('+roomPattern+')','i');
  let target=context.match(destination)?.[1];
  if(!target&&explicit5J){const arrow=context.match(new RegExp('(?:5\\s*J|V\\s*J)\\s*(?:→|->|:)\\s*('+roomPattern+')','i'));target=arrow?.[1];}
  if(!target)continue;
  const previous=context.match(new RegExp('(?:invece\\s+(?:di|che)|anziché|dall[\'’])\\s*(?:in\\s+)?('+roomPattern+')','i'))?.[1]||null;
  const sourceDates=extractDates(context,record.published).filter(d=>events.some(e=>e.date===d.date));
  const dates=sourceDates.length?sourceDates.map(d=>d.date):[...new Set(events.map(e=>e.date))];if(!sourceDates.length&&dates.length!==1)continue;
  for(const date of dates)changes.push({date,start:range.start,end:range.end,period:range.period||null,newRoom:roomName(target),previousRoom:previous?roomName(previous):null,context,sourceUrl:record.url,title:record.title,confidence:'Aula e fascia riconosciute nella circolare'});
 }
 return [...new Map(changes.map(c=>[[c.date,c.start,c.end,c.newRoom].join('|'),c])).values()];
}

// ── Dove va la 5J: righe delle circolari che collocano la classe in un'aula a una certa ora ──
// Formati riconosciuti (presi dalle circolari vere):
//  A) turni con elenco puntato:  "2° TURNO – Dalle ore 10:45 alle ore 12:15" … " In Aula Smiroldo da remoto - … 5E, 5F, 5G, 5J."
//  B) tabella CLASSE AULA:        "CLASSE AULA" … "VJ B15"   (orario nel testo: "dalle 9:30 alle 13:00")
//  C) spostamenti per modulo:     "5J 1° MOD – AR2 NATOLI ROSARIO"
//  D) testo:                      "… la classe VJ, dalle ore 09.00 alle 11.45 …" + "presso l'aula Smiroldo"
//  E) scansione oraria:           "11:45 – 13:00 5E, 5F, 5G, 5J, 5N" + "si recheranno in aula Magna"
//  F) tabelle per modulo (palestra interdetta): "II MODULO IIIO a19 VA a21 VJ a29 VM b13"
const C5J=/(?:^|[^A-Za-z0-9])(?:5\s*J|V\s*J)(?![A-Za-z0-9])/;
const ROMAN={I:1,II:2,III:3,IV:4,V:5};
const prettyPlace=p=>{let s=compact(p).replace(/[.,;:–-]+$/,'').trim();const remote=/da remoto/i.test(s);s=s.replace(/\s*da remoto\s*/i,' ').trim();
 s=s.replace(/^aula\s+magna\s+[“"]?g\.?\s*smiroldo[”"]?/i,'Aula Smiroldo (Aula Magna)').replace(/^aula\s+smiroldo$/i,'Aula Smiroldo').replace(/^l['’]\s*/i,'');
 s=s.replace(/^(palestra|aula|laboratorio|biblioteca)/i,m=>m[0].toUpperCase()+m.slice(1).toLowerCase());
 return s+(remote?' (da remoto)':'');};
const placeInText=t=>{const m=String(t||'').match(/\b(?:presso|in|nell['’]\s?|nella|all['’]\s?)\s*(?:l['’]\s?)?((?:aula\s+magna(?:\s+[“"]?G\.?\s*Smiroldo[”"]?)?|aula\s+smiroldo|aula\s+[A-Z]{1,3}\s?\d{1,3}[A-Z]?|palestra|laboratorio\s+[\wÀ-ú]+|biblioteca|auditorium))/i);return m?prettyPlace(m[1]):null;};
const fmt=(h,m)=>h.padStart(2,'0')+':'+m;
function rangeIn(t){const r=rangeFromText(t);return r?{start:r.start,end:r.end}:null;}

export function placementsFor5J(record,events,extractDates){
 const main=record.documents?.find(d=>d.text?.length>80)?.text||'';if(!main||!C5J.test(main))return [];
 const lines=main.split('\n').map(compact).filter(Boolean);const flat=compact(main);
 const evDates=[...new Set((events||[]).map(e=>e.date))];
 const out=[];
 const dateFor=(i)=>{ // data della riga: titoletto vicino ("LUNEDI'19", "MARTEDI' 6 OTTOBRE 2026") o unica data della circolare
  for(let j=i;j>=Math.max(0,i-25);j--){const ds=extractDates(lines[j],record.published).map(d=>d.date).filter(d=>evDates.includes(d));if(ds.length===1)return ds[0];
   const wd=lines[j].match(/\b(?:LUNED|MARTED|MERCOLED|GIOVED|VENERD)[IÌ]['’]?\s*(\d{1,2})\b|\bSABATO\s*(\d{1,2})\b/i);if(wd){const n=+(wd[1]||wd[2]);const hit=evDates.filter(d=>+d.slice(8)===n);if(hit.length===1)return hit[0];}}
  return evDates.length===1?evDates[0]:null;};
 const push=(i,start,end,place,how)=>{const date=dateFor(i);if(!date||!place||!start||!end||start>=end)return;out.push({date,start,end,newRoom:place,previousRoom:null,remote:/remoto/i.test(place),context:lines.slice(Math.max(0,i-2),i+1).join(' '),sourceUrl:record.url,title:record.title,activity:(()=>{const t=record.title.replace(/^oggetto:\s*/i,'');const day=t.match(/giornata[^–-]{3,70}/i)?.[0];return (day?day.trim():t.split(/\s[–-]\s/)[0]).replace(/^(.{70}\S*).*$/,'$1…');})(),how,confidence:'Aula e orario della 5J letti nella circolare'});};
 const textPlace=placeInText(flat.split(/oggetto\s*:/i).slice(1).join(' ')||flat);
 for(let i=0;i<lines.length;i++){
  const l=lines[i];if(!C5J.test(l))continue;
  // C) "5J 1° MOD – AR2 …"
  let m=l.match(/(?:5\s*J|V\s*J)\s+(?:[A-Z]{2,4}\s+)?([1-5])\s*[°º]?\s*MOD\w*\s*[–-]\s*([A-Z]{1,4}\s?\d{1,3}[A-Z]?|AULA\s+MAGNA|PALESTRA|BIBLIO\w*)/i);
  if(m){const r=moduleRange(m[1]+'° modulo');push(i,r.start,r.end,prettyPlace(m[2]),'modulo');continue;}
  // E) "11:45 – 13:00 5E, 5F, 5G, 5J"
  m=l.match(/^(\d{1,2})[:.](\d{2})\s*[–-]\s*(\d{1,2})[:.](\d{2})\s+/);
  if(m){push(i,fmt(m[1],m[2]),fmt(m[3],m[4]),textPlace,'scansione');continue;}
  // A) elenco puntato " In <luogo> - … 5J" (anche se la lista continua sulla riga dopo)
  let k=-1;for(let j=i;j>=Math.max(0,i-2);j--){if(/^\W*(?:In|Presso|Nell['’]|Nella)\s+\S/.test(lines[j])&&/\s[-–]\s/.test(lines[j])){k=j;break;}if(j<i&&/\.\s*$/.test(lines[j]))break;}
  if(k>=0){const place=prettyPlace(lines[k].replace(/^\W*(?:In|Presso)\s+/i,'').split(/\s[-–]\s/)[0]);let r=null;for(let j=k;j>=Math.max(0,k-15)&&!r;j--)if(/turno|dalle ore|^\d{1,2}[:.]\d{2}/i.test(lines[j]))r=rangeIn(lines[j]);
   if(!r)r=rangeIn(flat);if(r)push(i,r.start,r.end,place,'turni');continue;}
  // B) tabella "CLASSE AULA" … "VJ B15"
  if(lines.slice(Math.max(0,i-20),i).some(x=>/\bCLASSE\s+AULA\b/i.test(x))){m=l.match(/(?:5\s*J|V\s*J)\s+(.+)$/i);const r=rangeIn(flat);if(m&&r){push(i,r.start,r.end,prettyPlace(m[1]),'tabella');continue;}}
  // F) tabelle per modulo (aule sostitutive)
  if(/interdizion|aule sostitutive|prospetto aule/i.test(record.title)){
   let mod=l.match(/^(I{1,3}|IV|V)\s+MODULO\b/i)?.[1];for(let j=i;j>=Math.max(0,i-12)&&!mod;j--){const t=lines[j].match(/^(I{1,3}|IV|V)(?:\s*MODULO)?\s+(?:\d\s?[A-Z]|[IV]{1,3}[A-Z])\b/i);if(t)mod=t[1];}
   const room=l.match(/(?:5\s*J|V\s*J)\s+([A-Za-z]{1,6}\s?\d{0,3}[a-z]?)\b/i)?.[1];
   if(mod&&room&&ROMAN[mod.toUpperCase()]){const r=moduleRange(ROMAN[mod.toUpperCase()]+'° modulo');push(i,r.start,r.end,prettyPlace(room.toUpperCase()),'modulo-tabella');continue;}
  }
  // D) testo: "la classe VJ, dalle ore 09.00 alle 11.45"
  // l'orario giusto è quello scritto subito dopo la 5J (non quello generale dell'evento né l'intestazione "classi VG–VJ")
  let hit=null;for(const sen of flat.split(/(?<=[.;])\s+/)){for(const m of sen.matchAll(new RegExp(C5J.source,'g'))){const r=rangeIn(sen.slice(m.index,m.index+90));if(r){hit={sen,r};break;}}if(hit)break;}
  if(hit)push(i,hit.r.start,hit.r.end,placeInText(hit.sen)||textPlace,'testo');
 }
 return [...new Map(out.map(c=>[[c.date,c.start,c.end].join('|'),c])).values()];
}
