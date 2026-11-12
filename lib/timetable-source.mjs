import {load} from 'cheerio/slim';
import {datesIn} from './events.mjs';
export const TIMETABLE_PAGE='https://nuovo.veronatrento.it/orario/';
export const DEFAULT_TIMETABLE_URL='https://veronatrento.it/Orario2627/VT/Classi/5J.html';
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
// PDF extraction can split words ("L unedì dell a p rima settimana").
const compact=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').replace(/\s+/g,'').toLowerCase();
const announcesFirstWeek=s=>/lunedi.{0,60}(?:prima|i)settimana|(?:prima|i)settimana.{0,40}lunedi/.test(compact(s));
export function timetableReference(records=[]){
 const resets=records.filter(r=>!r.serale&&/orario/i.test(r.title)).map(r=>{
  const text=r.documents.map(d=>d.text).join(' ');if(!announcesFirstWeek(text))return null;
  const monday=d=>new Date(d.date+'T12:00:00Z').getUTCDay()===1;
  const titleDates=datesIn(r.title,r.published);const bodyDates=datesIn(text,r.published);
  // A reset starts on Monday. Ignore unrelated dates in headers or references.
  const date=titleDates.find(monday)?.date||bodyDates.find(d=>monday(d)&&announcesFirstWeek(d.context))?.date;
  return date?{anchorDate:date,validFrom:date,anchorSource:r.url,anchorNumber:r.number}:null;
 }).filter(Boolean).sort((a,b)=>b.anchorDate.localeCompare(a.anchorDate));
 return resets[0]||{anchorDate:'2026-10-19',validFrom:'2026-10-19',anchorSource:'https://nuovo.veronatrento.it/circolare/orario-tecnologico-diurno-aggiornamento-dal-19-ottobre-2026/',anchorNumber:'159'};
}
export function parseTimetable(html,{url=DEFAULT_TIMETABLE_URL,reference=timetableReference()}={}){
 const $=load(html);const table=$('table').filter((i,t)=>/LUN1/.test($(t).text())&&/VEN4/.test($(t).text())).first();
 if(!table.length||!/ORARIO CLASSE\s+5J/i.test(clean($.root().text())))throw Error('Tabella ufficiale della 5J non riconosciuta');
 const matrix=[];
 table.find('tr').each((ri,row)=>{matrix[ri]??=[];let ci=0;$(row).children('td,th').each((i,cell)=>{while(matrix[ri][ci])ci++;const c=$(cell);const item={text:clean(c.text()),subject:clean(c.find('p').first().text()),teachers:c.find('a[href*="Docenti/"]').toArray().map(a=>clean($(a).text())),rooms:c.find('a[href*="Aule/"]').toArray().map(a=>({name:clean($(a).text()),url:new URL($(a).attr('href'),url).href}))};for(let rr=0;rr<Number(c.attr('rowspan')||1);rr++){matrix[ri+rr]??=[];for(let cc=0;cc<Number(c.attr('colspan')||1);cc++)matrix[ri+rr][ci+cc]=item;}ci+=Number(c.attr('colspan')||1);});});
 const labels=matrix[0].slice(1).map(c=>c.text);const starts=matrix.slice(1).map(r=>r[0]?.text.match(/\b(\d{1,2})[.:](\d{2})\b/)).map(m=>m?m[1].padStart(2,'0')+':'+m[2]:null);
 const weekdays={LUN:1,MAR:2,MER:3,GIO:4,VEN:5};const days=labels.map((label,i)=>{const m=label.match(/^(LUN|MAR|MER|GIO|VEN)([1-4])$/);if(!m)throw Error('Colonna orario inattesa');return {label,week:+m[2],weekday:weekdays[m[1]],lessons:matrix.slice(1).flatMap((r,ri)=>{const c=r[i+1];if(!starts[ri]||!c?.subject)return [];return [{period:ri+1,start:starts[ri],end:starts[ri+1]||'14:15',subject:c.subject,teachers:[...new Set(c.teachers)],rooms:c.rooms}];})};});
 if(days.length!==20||days.some(d=>d.lessons.length<3))throw Error('Orario incompleto: mantenuta la copia precedente');
 return {className:'5J',cycleWeeks:4,timeZone:'Europe/Rome',...reference,sourceUrl:url,sourcePage:TIMETABLE_PAGE,checkedAt:new Date().toISOString(),days,breaks:[{start:'10:25',end:'10:35'},{start:'13:00',end:'13:10'}]};
}
async function fetchSchool(url){const u=new URL(url);if(!['https://nuovo.veronatrento.it','https://veronatrento.it'].includes(u.origin))throw Error('Fonte orario non autorizzata');const r=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Orario: HTTP '+r.status);return r.text();}
export async function readTimetable(records=[]){
 const $=load(await fetchSchool(TIMETABLE_PAGE));const frame=$('iframe[src]').toArray().map(el=>$(el).attr('src')).find(u=>u?.startsWith('https://veronatrento.it/Orario'));
 if(!frame)throw Error('Collegamento all’orario ufficiale non trovato');
 const index=load(await fetchSchool(frame));const href=index('a[href]').toArray().find(el=>clean(index(el).text())==='5J');
 if(!href)throw Error('Classe 5J non trovata nel nuovo orario');
 const url=new URL(index(href).attr('href'),frame).href;
 return parseTimetable(await fetchSchool(url),{url,reference:timetableReference(records)});
}
