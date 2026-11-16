// Avvisi dalla città: chiusure delle scuole di Messina (maltempo, allerte, ordinanze) lette dai giornali locali.
// Sono notizie di stampa, non comunicazioni della scuola: il sito le mostra come "da verificare".
import {datesIn} from './events.mjs';

const g=q=>'https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=it&gl=IT&ceid=IT:it';
export const NEWS_SOURCES=[
 {name:'Gazzetta del Sud',url:'https://gazzettadelsud.it/feed/'},
 {name:'Gazzetta del Sud',url:'https://gazzettadelsud.it/messina/feed/'},
 {name:'Gazzetta del Sud',url:'https://gazzettadelsud.it/rss/messina.xml'},
 {name:'MessinaToday',url:'https://www.messinatoday.it/rss'},
 {name:'Tempostretto',url:'https://www.tempostretto.it/feed'},
 {name:'Google News · Gazzetta del Sud',url:g('site:gazzettadelsud.it Messina scuole chiuse')},
 {name:'Google News',url:g('Messina scuole chiuse')},
 {name:'Google News',url:g('Messina ordinanza chiusura scuole')},
 {name:'Google News',url:g('Messina allerta meteo scuole')}
];
const TRUSTED=/gazzettadelsud|gazzetta del sud|messinatoday|tempostretto|letteraemme|lasicilia|la sicilia|ansa|comune\.messina|comune di messina|rainews|tgr|livesicilia|qds|orizzontescuola|tecnicadellascuola|meteoweb|normanno|stretto ?web|strettoweb|messina ?oggi/i;

const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#0?39;|&apos;|&#8217;|&rsquo;/g,'’').replace(/&#8211;|&ndash;/g,'–').replace(/&#8220;|&#8221;|&laquo;|&raquo;/g,'"').replace(/&nbsp;/g,' ').replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(+n)).replace(/\s+/g,' ').trim();
const tag=(xml,t)=>{const m=xml.match(new RegExp('<'+t+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+t+'>','i'));return m?decode(m[1]):'';};
export function parseFeed(xml,sourceName){
 const blocks=String(xml).match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi)||[];
 return blocks.map(b=>{const link=tag(b,'link')||(b.match(/<link[^>]*href="([^"]+)"/i)||[])[1]||'';const pub=tag(b,'pubDate')||tag(b,'published')||tag(b,'updated')||tag(b,'dc:date');const src=tag(b,'source')||sourceName;
  return {title:tag(b,'title'),link:link.trim(),description:tag(b,'description')||tag(b,'summary')||tag(b,'content'),published:pub?new Date(pub).toISOString():null,source:src};}).filter(i=>i.title&&i.link);
}

const rome=d=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Rome'}).format(d);
const plusDays=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
const CITY=/\b(?:a|di|del comune di|sindaco di|città di|citt[àa] metropolitana di|scuole di|in città a)\s+Messina\b|\bMessina\s*[,:–-]\s*(?:scuole|chius|stop|allerta|maltempo|ordinanza)|\bBasile\b|Palazzo Zanca|Comune di Messina/i;
const CLOSURE=/(?:scuol[ea]|attivit[àa] didattic|lezioni|istituti scolastici|plessi)[^.]{0,70}?(?:chius|sospes|sospension|stop|ferm)|(?:chius[ue]r?a?|chiusura|stop|sospensione|sospese)[^.]{0,50}?(?:scuol|attivit[àa] didattic|lezioni|istituti)/i;
const NEGATIVE=/\b(?:fake|falsa ordinanza|smentit|bufala|riapr|riaperte|restano aperte|scuole aperte|non chiud|nessuna chiusura)\b/i;
const ALERT=/allerta\s+(?:meteo\s+)?(rossa|arancione)|codice\s+(rosso|arancione)/i;

function targetDates(item){
 const pubDay=item.published?rome(new Date(item.published)):null;const text=item.title+'. '+item.description;
 const explicit=pubDay?datesIn(text,pubDay).map(d=>d.date).filter(d=>d>=pubDay&&d<=plusDays(pubDay,10)):[];
 if(explicit.length)return [...new Set(explicit)];
 if(/\bdomani\b/i.test(text)&&pubDay)return [plusDays(pubDay,1)];
 if(/\boggi\b/i.test(text)&&pubDay)return [pubDay];
 return pubDay?[pubDay]:[];
}

export function newsEvents(items,today){
 const out=new Map();
 for(const it of items){
  const text=it.title+'. '+it.description;
  // la città di Messina deve essere nel titolo: "provincia di Messina" o altri comuni non bastano
  const cityText=text.replace(/provincia di Messina|nel messinese|area messinese/gi,'');
  if(!/\bMessina\b|\bBasile\b/i.test(it.title.replace(/provincia di Messina/gi,''))||!CITY.test(cityText)||NEGATIVE.test(it.title))continue;
  if(!TRUSTED.test(it.source+' '+it.link))continue;
  const closure=CLOSURE.test(text),alert=ALERT.exec(text);
  if(!closure&&!alert)continue;
  const reason=/maltempo|allerta|meteo|pioggia|vento|temporal|nubifragi/i.test(text)?'maltempo':/sisma|terremot/i.test(text)?'terremoto':/elezion|seggi/i.test(text)?'elezioni':/acqua|idric/i.test(text)?'crisi idrica':null;
  for(const date of targetDates(it)){
   if(date<today)continue;
   const kind=closure?'closure':'weather';
   const key=date+'-'+kind;const old=out.get(key);
   const ev={id:'citta-'+kind+'-'+date,title:closure?'Scuole chiuse a Messina'+(reason?' per '+reason:'')+' · da verificare':'Allerta meteo '+(alert[1]||alert[2]).toLowerCase().replace('rosso','rossa')+' a Messina',date,time:null,category:'Avvisi città',scope:'Generale',classes:[],number:'',url:it.link,summary:it.title,context:it.title+'. '+it.description.slice(0,300),confidence:'Notizia di stampa: verifica ordinanza e sito della scuola',inferred:false,studentRelevant:true,representative:false,news:true,closure:kind==='closure',weatherAlert:kind==='weather',newsSource:it.source,newsTitle:it.title,newsPublished:it.published,sources:[{title:it.title,url:it.link,source:it.source}]};
   if(old){old.sources.push(...ev.sources.filter(s=>!old.sources.some(o=>o.title===s.title)));continue;}
   out.set(key,ev);
  }
 }
 return [...out.values()].map(e=>({...e,sources:e.sources.slice(0,4)}));
}

export async function fetchNews({timeoutMs=15000}={}){
 const items=[],status=[];
 for(const s of NEWS_SOURCES){
  const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),timeoutMs);
  try{const r=await fetch(s.url,{signal:ctrl.signal,headers:{'user-agent':'Mozilla/5.0 (QuintaJ; sito studenti)','accept':'application/rss+xml,application/xml,text/xml,*/*'}});
   if(!r.ok)throw Error('HTTP '+r.status);const got=parseFeed(await r.text(),s.name);items.push(...got);status.push({source:s.name,url:s.url,ok:true,items:got.length});}
  catch(e){status.push({source:s.name,url:s.url,ok:false,error:String(e.message||e).slice(0,120)});}
  finally{clearTimeout(t);}
 }
 return {items,status};
}
