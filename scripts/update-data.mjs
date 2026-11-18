import fs from 'node:fs/promises';import {listPage,readCircular,PARSER_VERSION} from '../lib/source.mjs';import {publicData} from '../lib/events.mjs';import {readTimetable} from '../lib/timetable-source.mjs';import {fetchNews,newsEvents} from '../lib/news.mjs';
const UNTIL='2027-08-31';const now=new Date();const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(now);
if(today>UNTIL){console.log('Aggiornamenti conclusi il '+UNTIL+'. Il sito conserva gli ultimi dati.');process.exit(0);}
await fs.mkdir('.cache',{recursive:true});let previous={records:[],nextPage:2,complete:false};try{previous=JSON.parse(await fs.readFile('.cache/state.json','utf8'));}catch{}
const publicPrevious=JSON.parse(await fs.readFile('data.json','utf8'));const map=new Map(previous.records.map(r=>[r.url,r]));const known=new Set(map.keys());const start='2026-09-01';let all=[],pages=0,complete=previous.complete,errors=[];
// Se il sito della scuola non risponde, si pubblica comunque con le circolari già lette
// (così avvisi manuali, notizie della città e orario restano aggiornati).
let sourceDown=null;
try{for(let p=1;p<=100;p++){
 const items=await listPage(p);pages=p;if(!items.length){complete=true;break;}all.push(...items.filter(i=>i.published>=start));
 if(items.some(i=>i.published<start)){complete=true;break;}
 if(known.size&&items.some(i=>known.has(i.url)))break;
}}catch(e){if(!map.size)throw e;sourceDown='Sito della scuola non raggiungibile: '+(e.cause?.code||e.message);errors.push({page:'elenco',error:sourceDown});console.log(sourceDown+' — uso le circolari già lette');}
if(!all.length&&!sourceDown)throw Error('Nessuna circolare dell’anno corrente: mantenuta l’ultima pubblicazione');
let rotating=previous.nextPage||2;
if(known.size&&rotating>pages){try{const items=await listPage(rotating);all.push(...items.filter(i=>i.published>=start));rotating=items.some(i=>i.published<start)||!items.length?2:rotating+1;}catch(e){errors.push({page:rotating,error:e.message});}}
else rotating=2;
// Assemblee, scioperi e uscite anticipate hanno la precedenza: si leggono per prime e si ricontrollano
// a ogni giro (rettifiche comprese), perché significano che la classe esce prima.
const PRIORITY=/assemblea|sciopero|uscit[ae] anticipat|sciolt[ei]|riduzione (?:dell[’']\s?)?orario|orario ridotto|rettifica/i;
const fresh=[...new Map(all.map(i=>[i.url,i])).values()].filter(item=>!map.has(item.url)||now-new Date(map.get(item.url).checkedAt)>(PRIORITY.test(item.title)?25*60000:6*3600000));
// Rilegge una volta le circolari estratte con la versione precedente del lettore PDF (max 60 per giro).
const stale=[...map.values()].filter(r=>r.parser!==PARSER_VERSION&&!fresh.some(i=>i.url===r.url)).slice(0,60).map(({url,title,number,published})=>({url,title,number,published}));
const queue=[...fresh,...stale].sort((a,b)=>(PRIORITY.test(b.title)?1:0)-(PRIORITY.test(a.title)?1:0));
let index=0,read=0;async function worker(){while(index<queue.length){const item=queue[index++];try{const record=await readCircular(item);const old=map.get(item.url);if(old&&record.documents.length&&record.documents.every(d=>!d.text)&&old.documents.some(d=>d.text)){errors.push({url:item.url,error:'PDF non leggibile: mantenuta versione precedente'});continue;}map.set(item.url,record);read++;}catch(e){errors.push({url:item.url,error:e.message});}}}
await Promise.all([worker(),worker(),worker()]);
const records=[...map.values()].sort((a,b)=>b.published.localeCompare(a.published)||Number(b.number)-Number(a.number));if(!records.length)throw Error('Importazione fallita: mantenuto il sito precedente');
// Avvisi della città (chiusure scuole per maltempo, allerte): notizie degli ultimi 7 giorni, tenute anche se una fonte non risponde.
let news={items:[],status:[]};try{news=await fetchNews();}catch(e){news.status.push({ok:false,error:e.message});}
const weekAgo=new Date(now-7*86400000).toISOString();const newsItems=[...new Map([...(previous.newsItems||[]),...news.items].filter(i=>i.published&&i.published>=weekAgo).map(i=>[i.link,i])).values()];
const raw={updatedAt:new Date().toISOString(),schoolYear:'2026/2027',start,complete,archiveCount:records.length,records,nextPage:rotating,errors,newsItems};
let timetable=publicPrevious.timetable,timetableError=null;try{timetable=await readTimetable(records);}catch(e){timetableError='Orario non aggiornato: '+e.message;}
const payload={...publicData(raw),timetable,timetableError,mode:'github-pages',syncUntil:UNTIL,refreshing:false,lastError:null};
payload.timetable={...payload.timetable,schoolBreaks:payload.schoolBreaks};
let manualEvents=[];try{const m=JSON.parse(await fs.readFile('manual-events.json','utf8'));const yesterday=new Date(now-86400000).toISOString().slice(0,10);manualEvents=(m.events||[]).filter(e=>e.date>=yesterday).map(e=>({number:'',url:'',inferred:false,studentRelevant:true,representative:false,manual:true,summary:e.title,...e}));}catch{}
const cityEvents=newsEvents(newsItems,today);payload.events=[...payload.events,...cityEvents,...manualEvents].sort((a,b)=>a.date.localeCompare(b.date)||(a.time||'').localeCompare(b.time||''));payload.newsStatus=news.status;
console.log('Fonti città: '+news.status.map(s=>(s.ok?'OK ':'NO ')+s.source+(s.ok?' ('+s.items+')':' – '+s.error)+' '+s.url).join(' | '));console.log('Avvisi città: '+JSON.stringify(cityEvents.map(e=>[e.date,e.title,e.newsSource])));
await fs.writeFile('.cache/state.json',JSON.stringify(raw));await fs.writeFile('data.json.tmp',JSON.stringify(payload));await fs.rename('data.json.tmp','data.json');
console.log(JSON.stringify({read,archiveCount:records.length,studentCount:payload.studentCount,events:payload.events.length,updatedAt:payload.updatedAt,errors:errors.length,timetableError}));
