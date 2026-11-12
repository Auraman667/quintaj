export const toMinutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
export function romeNow(instant=new Date()){const parts=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return {date:p.year+'-'+p.month+'-'+p.day,time:p.hour+':'+p.minute};}
export function shiftDate(date,days){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
export function cycleFor(timetable,date,manualWeek=null){const d=new Date(date+'T12:00:00Z');const start=new Date(timetable.anchorDate+'T12:00:00Z');const elapsed=Math.floor((d-start)/86400000);return {week:manualWeek?+manualWeek:((Math.floor(elapsed/7)%timetable.cycleWeeks)+timetable.cycleWeeks)%timetable.cycleWeeks+1,weekday:d.getUTCDay(),manual:!!manualWeek};}
function easter(year){const a=year%19,b=Math.floor(year/100),c=year%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),month=Math.floor((h+l-7*m+114)/31),day=(h+l-7*m+114)%31+1;return year+'-'+String(month).padStart(2,'0')+'-'+String(day).padStart(2,'0');}
export function holidayFor(date){const y=+date.slice(0,4);const fixed={'01-01':'Capodanno','01-06':'Epifania','04-25':'Festa della Liberazione','05-01':'Festa del Lavoro','06-02':'Festa della Repubblica','08-15':'Ferragosto','11-01':'Ognissanti','12-08':'Immacolata','12-25':'Natale','12-26':'Santo Stefano'};if(fixed[date.slice(5)])return fixed[date.slice(5)];const e=easter(y);return date===e?'Pasqua':date===shiftDate(e,1)?'Lunedì dell’Angelo':null;}
const scope5J=e=>['5J','Quinte','Generale'].includes(e.scope)&&(!e.representative||e.representativeKind==='Classe');
function applyRoomRange(lessons,change,event){return lessons.flatMap(l=>{if(l.kind==='representative'||l.end<=change.start||l.start>=change.end)return [l];const start=l.start>change.start?l.start:change.start,end=l.end<change.end?l.end:change.end;return [...(l.start<start?[{...l,end:start}]:[]),{...l,start,end,rooms:[{name:change.newRoom,url:event.url}],originalRooms:change.previousRoom?[{name:change.previousRoom,url:l.sourceUrl}]:(l.originalRooms||l.rooms),sourceUrl:event.url,kind:'room-change',event,changeReason:change.title||event.title},...(l.end>end?[{...l,start:end}]:[])];});}
export function roomFromText(text){const m=String(text||'').match(/\b(?:in|nell['’]a|all['’]a|presso\s+l['’])?\s*(Aula\s+Magna|aula\s+[AB]\d{1,3}|laboratorio\s+CISCO|PALESTRA(?:[- ]\d{1,2})?)(?!\w)/i);return m?m[1].replace(/^aula\s+(?=[AB]\d)/i,'').trim():null;}
export function rangeFromText(text){const m=String(text||'').match(/\b(?:dalle\s+(?:ore\s+)?)?(\d{1,2})[.:](\d{2})\s*(?:alle|–|-|—)\s*(?:ore\s+)?(\d{1,2})[.:](\d{2})\b/i);if(!m)return null;return {start:m[1].padStart(2,'0')+':'+m[2],end:m[3].padStart(2,'0')+':'+m[4]};}
export function dayPlan(timetable,date,events=[],options={}){
 const cycle=cycleFor(timetable,date,options.manualWeek);const todayEvents=events.filter(e=>e.date===date&&scope5J(e)).sort((a,b)=>Number(a.number||0)-Number(b.number||0));const holiday=holidayFor(date);
 const unverified=todayEvents.filter(e=>['Aule','Orario','Uscite','Cinema e teatro','Rettifiche','Assemblee e scioperi'].includes(e.category));
 const base=timetable.days.find(d=>d.week===cycle.week&&d.weekday===cycle.weekday);
 const schoolClosure=todayEvents.find(e=>e.schoolClosure);
 let reason=null;if(date<timetable.validFrom)reason='Data precedente all’orario verificato';else if(schoolClosure)reason='Lezioni sospese · circolare '+schoolClosure.number;else if(cycle.weekday===0||cycle.weekday===6)reason='Fine settimana';else if(holiday)reason=holiday;else if(+date.slice(5,7)===7||+date.slice(5,7)===8)reason='Periodo estivo: lezioni ordinarie non previste';
 let lessons=reason?[]:(base?.lessons||[]).map(l=>({...l,rooms:l.rooms.map(r=>({...r})),sourceUrl:timetable.sourceUrl,kind:'lesson'}));
 const applied=[];
 for(const e of reason?[]:todayEvents){
  for(const change of e.roomChanges||[]){if(change.date===date&&change.start<change.end){lessons=applyRoomRange(lessons,change,e);applied.push({type:'room-change',event:e,change});}}
  if(e.category==='Orario'&&e.scope==='5J'&&e.time&&/uscita anticipata/i.test(e.title)&&/Riga per la 5J/.test(e.confidence||'')){lessons=lessons.filter(l=>l.start<e.time).map(l=>({...l,end:l.end>e.time?e.time:l.end}));applied.push({type:'early-exit',time:e.time,event:e});}
  else if(e.category==='Orario'&&e.scope==='5J'&&e.time&&/ingresso|entrata/i.test(e.context||'')&&/Riga per la 5J/.test(e.confidence||'')){lessons=lessons.filter(l=>l.end>e.time).map(l=>({...l,start:l.start<e.time?e.time:l.start}));applied.push({type:'late-entry',time:e.time,event:e});}
  else if(e.representative&&e.representativeKind==='Classe'&&/comitato studentesco/i.test(e.title)){
   const range=rangeFromText(e.context);const room=roomFromText(e.context);if(range&&room){const covered=lessons.filter(l=>l.start<range.end&&l.end>range.start);const originalRooms=[...new Map(covered.flatMap(l=>l.originalRooms||l.rooms).map(r=>[r.name,r])).values()];lessons=lessons.flatMap(l=>l.end<=range.start||l.start>=range.end?[l]:[...(l.start<range.start?[{...l,end:range.start}]:[]),...(l.end>range.end?[{...l,start:range.end}]:[])]);lessons.push({period:covered.length===1?covered[0].period:0,...range,subject:'Comitato Studentesco',teachers:[],rooms:[{name:room,url:e.url}],originalRooms,sourceUrl:e.url,kind:'representative',event:e,changeReason:e.title});applied.push({type:'representative',event:e});}
  }else if(!e.roomChanges?.length&&e.category==='Aule'&&e.scope==='5J'&&/\b(?:5\s*J|V\s*J)\b/i.test(e.context||'')){
   const dest=String(e.context).match(/(?:si\s+(?:recherà|sposta|sposterà)\s+(?:in|nell['’])|(?:anziché|invece\s+di)[^.]{0,35}\bin|all['’])\s*(aula\s+[AB]\d{1,3}|Aula\s+Magna|laboratorio\s+CISCO)/i);
   const range=rangeFromText(e.context);if(dest&&(range||/intera giornata|tutta la giornata/i.test(e.context))){const room=dest[1].replace(/^aula\s+(?=[AB]\d)/i,'');lessons=applyRoomRange(lessons,{start:range?.start||'00:00',end:range?.end||'23:59',newRoom:room},e);applied.push({type:'room-change',event:e});}
  }
 }
 const warnings=unverified.filter(e=>!e.schoolClosure&&!applied.some(a=>a.event.id===e.id));
 return {date,cycle,lessons:lessons.sort((a,b)=>a.start.localeCompare(b.start)||Number(b.kind==='representative')-Number(a.kind==='representative')),events:todayEvents,applied,warnings,reason,breaks:reason?[]:timetable.breaks||[],checkedAt:timetable.checkedAt};
}
export function planAt(timetable,date,time,events=[],options={}){
 const day=dayPlan(timetable,date,events,options);const minute=toMinutes(time);const active=day.lessons.filter(l=>toMinutes(l.start)<=minute&&minute<toMinutes(l.end));const current=active.find(l=>l.kind==='representative')||active[0]||null;
 const next=day.lessons.find(l=>toMinutes(l.start)>minute)||null;const earlyExit=day.applied.find(a=>a.type==='early-exit'&&time>=a.time);const interval=day.breaks.find(b=>toMinutes(b.start)<=minute&&minute<toMinutes(b.end));
 const status=earlyExit?'early-exit':day.reason?'closed':current?'lesson':next?'before':'finished';
 return {...day,time,current:earlyExit?null:current,next:earlyExit?null:next,interval:earlyExit||current?.kind==='representative'?null:interval,status,earlyExit};
}
export function nextLesson(timetable,date,time,events=[],options={}){for(let i=0;i<15;i++){const d=shiftDate(date,i);const plan=dayPlan(timetable,d,events,i===0?options:{});const next=plan.lessons.find(l=>i>0||l.start>time);if(next)return {...next,date:d};}return null;}
