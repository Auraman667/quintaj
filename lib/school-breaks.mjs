const clean=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const shift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const closure=/sospens|sospes|vacanz|festivit|chiusura.{0,50}(?:scuol|istituto|plessi)/i;

export function schoolBreaksFor(records,notices,datesIn){
 const useful=new Map(notices.filter(c=>['5J','Quinte','Generale'].includes(c.scope)&&!c.serale).map(c=>[c.url,c]));
 const days=new Map(),pending=[];
 for(const record of [...records].sort((a,b)=>a.published.localeCompare(b.published)||Number(a.number)-Number(b.number))){
  const c=useful.get(record.url);if(!c||!closure.test(record.title))continue;
  if(/majorana|viale giostra|corso serale/i.test(record.title)&&!/tutt[io].{0,20}plessi/i.test(record.title))continue;
  const full=record.documents.map(d=>d.text||'').join(' '),at=full.search(/oggetto\s*:/i);
  let body=clean(at>=0?full.slice(at):full);
  body=body.split(/Si ringrazia|Firma autografa/i)[0];
  const title=record.title.split(/\(|integrazione della/i)[0];
  // Expand shared-month ranges before asking the common date parser.
  const expand=s=>s.replace(/\b(?:dal|da)\s+(\d{1,2})\s+al\s+(\d{1,2})\s+([a-zà]+)\s*(20\d{2})?/gi,(_,a,b,m,y)=>'dal '+a+' '+m+' '+(y||'')+' al '+b+' '+m+' '+(y||''));
  const rangeTexts=[...expand(title+' '+body).matchAll(/\b(?:dal|dall['’]|da)\s+\d{1,2}\s+[a-zà]+(?:\s+20\d{2})?\s+(?:al|fino\s+al)\s+\d{1,2}\s+[a-zà]+(?:\s+20\d{2})?/gi)].map(m=>m[0]);
  let ranges=[];
  for(const rangeText of rangeTexts){const dates=datesIn(rangeText,record.published);if(dates.length===2)ranges.push({start:dates[0].date,end:dates[1].date});}
  if(!ranges.length){
   const titleDates=datesIn(title,record.published);
   const statements=[...new Intl.Segmenter('it',{granularity:'sentence'}).segment(body)].map(s=>s.segment).filter(s=>/sospes|sospens|vacanz|chiusura/i.test(s)&&!/ferie|personale docente|integrazione della circ/i.test(s));
   const dates=titleDates.length?titleDates:statements.flatMap(s=>datesIn(s.split(/riprender|ripresa/i)[0],record.published));
   ranges=[...new Set(dates.map(d=>d.date))].map(date=>({start:date,end:date}));
  }
  ranges=ranges.filter(r=>r.end>=r.start&&(new Date(r.end)-new Date(r.start))/86400000<90);
  if(!ranges.length){pending.push({title:c.title,url:c.url,number:c.number});continue;}
  if(/rettifica|revoca|annull/i.test(record.title)){
   const ref=body.match(/circ(?:olare|\.)?\s*(?:n[.°º]?\s*)?(\d+)/i)?.[1];
   if(ref&&ref!==record.number)for(const [date,old] of days)if(old.number===ref)days.delete(date);
  }
  for(const range of ranges){for(let date=range.start;date<=range.end;date=shift(date,1)){
   if(/revoca|annull/i.test(record.title))days.delete(date);
   else days.set(date,{...range,title:c.title,url:c.url,number:c.number,published:c.published});
  }}
 }
 const breaks=[];
 for(const [date,source] of [...days].sort(([a],[b])=>a.localeCompare(b))){const last=breaks.at(-1);if(last&&last.url===source.url&&shift(last.end,1)===date)last.end=date;else breaks.push({...source,start:date,end:date});}
 return {breaks,pending};
}

export function closureEvents(breaks,notices){
 const map=new Map(notices.map(c=>[c.url,c]));const events=[];
 for(const b of breaks){const c=map.get(b.url);for(let date=b.start;date<=b.end;date=shift(date,1))events.push({id:c.id+'-pausa-'+date,title:'Sospensione delle lezioni · '+c.title,date,category:'Orario',scope:c.scope,classes:c.classes,number:c.number,url:c.url,summary:c.summary,context:'Lezioni sospese dal '+b.start+' al '+b.end+' (estremi inclusi).',confidence:'Sospensione indicata nella circolare',inferred:false,time:null,studentRelevant:true,representative:false,schoolClosure:true});}
 return events;
}
