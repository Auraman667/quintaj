// Verified 12 November 2026. Regional dates apply in Messina, subject to school adaptations.
export const CALENDAR_SOURCE='https://www.usr.sicilia.it/calendario-scolastico-2026-27/';
export const MESSINA_SOURCE='https://comune.messina.it/it/news/festa-della-madonna-della-lettera-2026-tutte-le-modifiche-alla-viabilita-per-le-celebrazioni-del-3-giugno?type=2';
export const REGIONAL_CALENDAR={schoolYear:'2026/2027',checkedAt:'2026-11-12',lessonsEnd:'2027-06-09',source:CALENDAR_SOURCE,periods:[
 {start:'2026-11-01',end:'2026-11-02',name:'Ognissanti e Commemorazione dei Defunti',key:'defunti',label:'Ognissanti / Defunti'},
 {start:'2026-12-07',end:'2026-12-08',name:'Ponte dell’Immacolata',key:'immacolata',label:'Immacolata'},
 {start:'2026-12-23',end:'2027-01-07',name:'Vacanze di Natale',key:'natale',label:'Vacanze di Natale'},
 {start:'2027-03-25',end:'2027-03-30',name:'Vacanze di Pasqua',key:'pasqua',label:'Vacanze di Pasqua'},
 {start:'2027-04-25',end:'2027-04-25',name:'Festa della Liberazione',key:'liberazione',label:'Liberazione'},
 {start:'2027-05-01',end:'2027-05-01',name:'Festa del Lavoro',key:'lavoro',label:'1° maggio'},
 {start:'2027-06-02',end:'2027-06-02',name:'Festa della Repubblica',key:'repubblica',label:'Repubblica'},
 {start:'2027-06-03',end:'2027-06-03',name:'Madonna della Lettera · Patrona di Messina',key:'patrona',label:'Patrona di Messina',source:MESSINA_SOURCE,sourceLabel:'Ricorrenza patronale di Messina',note:'Ricorrenza locale del 3 giugno. Eventuali adattamenti organizzativi saranno riportati dalle circolari della scuola.'}
]};
const dayShift=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
export const inclusiveDays=(start,end)=>Math.round((new Date(end+'T12:00:00Z')-new Date(start+'T12:00:00Z'))/86400000)+1;
const category=b=>{const t=b.name||b.title||'';if(/natal|natale/i.test(t))return 'natale';if(/pasqu/i.test(t))return 'pasqua';if(/immacolat/i.test(t))return 'immacolata';if(/defunti|ognissanti/i.test(t))return 'defunti';if(/patron|madonna della lettera/i.test(t))return 'patrona';return null;};
const dayNames={'12-25':'Natale','12-26':'Santo Stefano','01-01':'Capodanno','01-06':'Epifania','03-28':'Pasqua','03-29':'Lunedì dell’Angelo'};

export function calendarPeriods(schoolBreaks=[]){
 const regional=REGIONAL_CALENDAR.periods.map(p=>({...p,url:p.source||CALENDAR_SOURCE,sourceLabel:p.sourceLabel||'Calendario Sicilia 2026/27',kind:p.key==='patrona'?'patronal':'regional'}));
 // A new full Christmas/Easter circular can adapt the regional period, including a shorter end.
 const adapted=new Set(schoolBreaks.filter(b=>inclusiveDays(b.start,b.end)>=3).map(category).filter(Boolean));
 return regional.filter(p=>!adapted.has(p.key)).concat(schoolBreaks.map(b=>{const key=category(b),base=regional.find(p=>p.key===key)||regional.find(p=>p.start<=b.end&&p.end>=b.start);return {...b,name:base?.name||b.title,label:base?.label||'Lezioni sospese',key:key||base?.key||'scuola',kind:'circular',sourceLabel:'Circolare '+b.number};}));
}

export function breakInfo(date,schoolBreaks=[]){
 const all=calendarPeriods(schoolBreaks),matches=all.filter(p=>p.start<=date&&p.end>=date),specific=matches.find(p=>p.kind==='circular')||matches[0];
 if(specific){const label=dayNames[date.slice(5)]||specific.label;return {...specific,title:specific.name,label};}
 const weekday=new Date(date+'T12:00:00Z').getUTCDay();
 return weekday===0||weekday===6?{kind:'weekend',label:'Weekend',name:'Fine settimana',title:'Fine settimana',url:null}:null;
}

export function upcomingPauses(today,schoolBreaks=[]){
 const periods=calendarPeriods(schoolBreaks);const knownStart=periods.reduce((a,b)=>b.start<a?b.start:a,today),knownEnd=periods.reduce((a,b)=>b.end>a?b.end:a,dayShift(today,90));
 const groups=[];for(let date=dayShift(knownStart,-7);date<=dayShift(knownEnd,7);date=dayShift(date,1)){
  const hit=breakInfo(date,schoolBreaks);if(!hit)continue;let group=groups.at(-1);
  if(!group||dayShift(group.end,1)!==date){group={start:date,end:date,names:[],sources:[],officialRanges:[],keys:[]};groups.push(group);}else group.end=date;
  if(hit.kind!=='weekend'){
   if(!group.names.includes(hit.name))group.names.push(hit.name);
   if(!group.keys.includes(hit.key))group.keys.push(hit.key);
   if(!group.sources.some(s=>s.url===hit.url))group.sources.push({url:hit.url,label:hit.sourceLabel,note:hit.note});
   if(!group.officialRanges.some(r=>r.start===hit.start&&r.end===hit.end))group.officialRanges.push({start:hit.start,end:hit.end});
  }
 }
 return {major:groups.filter(p=>p.names.length&&p.end>=today).map(p=>({...p,name:p.names.join(' + '),days:inclusiveDays(p.start,p.end),until:Math.max(0,inclusiveDays(today,p.start)-1)})),weekends:groups.filter(p=>!p.names.length&&p.end>=today).slice(0,3).map(p=>({...p,days:inclusiveDays(p.start,p.end),until:Math.max(0,inclusiveDays(today,p.start)-1)}))};
}
