import {load} from 'cheerio/slim';
import {getDocumentProxy} from 'unpdf';
export const ORIGIN='https://nuovo.veronatrento.it';
export const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
export async function get(url,kind='text') {
 const u=new URL(url); if(u.origin!==ORIGIN) throw Error('Fonte esterna non consentita');
 const r=await fetch(url,{signal:AbortSignal.timeout(20000),headers:{'User-Agent':'QuintaJ/1.0 (calendario circolari scolastiche)'}});
 if(!r.ok) throw Error(`Fonte: HTTP ${r.status}`);
 if(Number(r.headers.get('content-length'))>12e6) throw Error('Documento oltre 12 MB');
 return kind==='pdf'?new Uint8Array(await r.arrayBuffer()):r.text();
}
// Unisce i pezzi di testo del PDF usando la loro posizione: Word spesso spezza le parole
// in più pezzi ("N"+"azionale"); lo spazio va messo solo dove c'è davvero uno stacco.
export function linesFromItems(items){
 const lines=[];let row='',prev=null;
 for(const t of items){
  if(!('str' in t))continue;
  const x=t.transform?.[4]??0,y=t.transform?.[5]??0,size=Math.hypot(t.transform?.[2]??0,t.transform?.[3]??0)||Math.abs(t.height)||10;
  if(prev){
   const sameLine=Math.abs(y-prev.y)<size*.4;
   if(!sameLine){if(row.trim())lines.push(clean(row));row='';}
   else{const gap=x-prev.end;if(gap>size*.18&&!/\s$/.test(row)&&!/^\s/.test(t.str))row+=' ';}
  }
  row+=t.str;
  prev={y,end:x+(t.width||0)};
  if(t.hasEOL){if(row.trim())lines.push(clean(row));row='';prev=null;}
 }
 if(row.trim())lines.push(clean(row));
 return lines;
}
export const PARSER_VERSION=2;
const months=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];
export function publication(s){const m=s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(20\d{2})/);return m?`${m[3]}-${String(months.indexOf(m[2].toLowerCase().slice(0,3))+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`:null;}
export function listFromHtml(html){const $=load(html);return $('a.text-link').toArray().map(a=>({url:$(a).attr('href'),title:clean($(a).find('h2').text()),number:$(a).find('small').text().match(/n\.\s*(\d+)/)?.[1]||'',published:publication($(a).find('small').text())})).filter(x=>x.url?.startsWith(ORIGIN+'/circolare/')&&x.title&&x.published);}
export async function listPage(page=1){return listFromHtml(await get(`${ORIGIN}/circolare/${page>1?'page/'+page+'/':''}`));}
export async function readCircular(item){
 const $=load(await get(item.url)); $('script,style,nav,footer').remove();
 const main=$('main');
 const pdfs=[...new Set(main.find('a[href]').toArray().map(a=>$(a).attr('href')).filter(u=>u?.startsWith(ORIGIN+'/wp-content/uploads/')&&/\.pdf(?:$|\?)/i.test(u)))];
 const body=clean(main.text().split('Documenti')[0].split('Circolare '+item.number).at(-1));
 const documents=[];
 for(const url of pdfs){
  try {
   const pdf=await getDocumentProxy(await get(url,'pdf')); let lines=[];
   try {for(let n=1;n<=Math.min(pdf.numPages,35);n++){
    const page=await pdf.getPage(n); const content=await page.getTextContent(); lines.push(...linesFromItems(content.items));
   }} finally {await pdf.destroy?.();}
   const text=lines.filter(Boolean).join('\n');documents.push({url,text,error:text.length<80?'PDF scansionato o non leggibile: verifica manuale':null});
  }catch(e){documents.push({url,text:'',error:String(e.message).slice(0,150)});}
 }
 const type=clean(main.text()).match(/Tipologia\s*(Circolari.{0,70})/)?.[1]||'';
 return {...item,body:body.slice(0,1500),documents,serale:/serale/i.test(type)||/corso serale/i.test(item.title),checkedAt:new Date().toISOString(),parser:PARSER_VERSION};
}
