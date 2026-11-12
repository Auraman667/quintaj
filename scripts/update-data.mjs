import fs from 'node:fs/promises';import {listPage,readCircular} from '../lib/source.mjs';import {publicData} from '../lib/events.mjs';import {readTimetable} from '../lib/timetable-source.mjs';
const UNTIL='2027-08-31';const now=new Date();const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(now);
if(today>UNTIL){console.log('Aggiornamenti conclusi il '+UNTIL+'. Il sito conserva gli ultimi dati.');process.exit(0);}
await fs.mkdir('.cache',{recursive:true});let previous={records:[],nextPage:2,complete:false};try{previous=JSON.parse(await fs.readFile('.cache/state.json','utf8'));}catch{}
const publicPrevious=JSON.parse(await fs.readFile('data.json','utf8'));const map=new Map(previous.records.map(r=>[r.url,r]));const known=new Set(map.keys());const start='2026-09-01';let all=[],pages=0,complete=previous.complete,errors=[];
for(let p=1;p<=100;p++){
 const items=await listPage(p);pages=p;if(!items.length){complete=true;break;}all.push(...items.filter(i=>i.published>=start));
 if(items.some(i=>i.published<start)){complete=true;break;}
 if(known.size&&items.some(i=>known.has(i.url)))break;
}
if(!all.length)throw Error('Nessuna circolare dell’anno corrente: mantenuta l’ultima pubblicazione');
let rotating=previous.nextPage||2;
if(known.size&&rotating>pages){try{const items=await listPage(rotating);all.push(...items.filter(i=>i.published>=start));rotating=items.some(i=>i.published<start)||!items.length?2:rotating+1;}catch(e){errors.push({page:rotating,error:e.message});}}
else rotating=2;
const queue=[...new Map(all.map(i=>[i.url,i])).values()].filter(item=>!map.has(item.url)||now-new Date(map.get(item.url).checkedAt)>6*3600000);
let index=0,read=0;async function worker(){while(index<queue.length){const item=queue[index++];try{const record=await readCircular(item);const old=map.get(item.url);if(old&&record.documents.length&&record.documents.every(d=>!d.text)&&old.documents.some(d=>d.text)){errors.push({url:item.url,error:'PDF non leggibile: mantenuta versione precedente'});continue;}map.set(item.url,record);read++;}catch(e){errors.push({url:item.url,error:e.message});}}}
await Promise.all([worker(),worker(),worker()]);
const records=[...map.values()].sort((a,b)=>b.published.localeCompare(a.published)||Number(b.number)-Number(a.number));if(!records.length)throw Error('Importazione fallita: mantenuto il sito precedente');
const raw={updatedAt:new Date().toISOString(),schoolYear:'2026/2027',start,complete,archiveCount:records.length,records,nextPage:rotating,errors};
let timetable=publicPrevious.timetable,timetableError=null;try{timetable=await readTimetable(records);}catch(e){timetableError='Orario non aggiornato: '+e.message;}
const payload={...publicData(raw),timetable,timetableError,mode:'github-pages',syncUntil:UNTIL,refreshing:false,lastError:null};
await fs.writeFile('.cache/state.json',JSON.stringify(raw));await fs.writeFile('data.json.tmp',JSON.stringify(payload));await fs.rename('data.json.tmp','data.json');
console.log(JSON.stringify({read,archiveCount:records.length,studentCount:payload.studentCount,events:payload.events.length,updatedAt:payload.updatedAt,errors:errors.length,timetableError}));
