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
