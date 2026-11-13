import {repairText,buildVocabulary} from './text-repair.mjs';
const clean=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const missing='Non specificato nella circolare.';
const segmenter=new Intl.Segmenter('it',{granularity:'sentence'});
const day=date=>new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Rome'}).format(new Date(date+'T12:00:00Z'));
const weekday=date=>new Intl.DateTimeFormat('it-IT',{weekday:'long',timeZone:'Europe/Rome'}).format(new Date(date+'T12:00:00Z'));

// Intestazione e piè di pagina della scuola: non sono contenuto della circolare.
const LETTERHEAD=/PEO\s*:|PEC\s*:|Codice univoco|P\.\s?IVA|Codice mecc|Sito\s*web|Tel\.\s*:?\s*\d|Fax\s*:?\s*\d|Viale Giostra|Via Ugo Bassi|Firma autografa|sostituita a mezzo stampa|ai sensi dell.art\.?\s*3/i;
// Abbreviazioni dopo le quali il punto NON chiude la frase.
const ABBR=/(?:\b(?:[Pp]rof|proff|prof\.ssa|dott|dott\.ssa|sig|sigg|sig\.ra|ing|avv|arch|geom|rag|n|nn|art|artt|co|comma|prot|all|ecc|p\.v|a\.s|c\.a|ss|pag|pagg|tel|cfr|es|rif|vd|ca|ore|ist|mons|on|gen|feb|mar|apr|mag|giu|lug|ago|set|ott|nov|dic|d\.lgs|d\.p\.r|D\.M|O\.M|c\.d|s\.m\.i|n°)\.|\b[A-Z]\.)\s*$/i;

function sentencesOf(text){
 const raw=[...segmenter.segment(text)].map(x=>x.segment);
 const out=[];
 for(const seg of raw){
  const prev=out[out.length-1]||'';const openQuote=(prev.match(/[“«]/g)||[]).length>(prev.match(/[”»]/g)||[]).length;
  if(out.length&&(ABBR.test(prev)||openQuote||/^\s*[a-zà-ù0-9(]/.test(seg)))out[out.length-1]+=seg;
  else out.push(seg);
 }
 const FW=/^(?:Al|Alla|Alle|Gli|Le|Il|La|Lo|I|Si|Per|In|Dal|Dalle|Nel|Nella|Durante|Entro|Tutti|Tutte|Tutto)[.:]?\s+$/;
 return out.map(clean).map(s=>s.replace(/^(?:[A-ZÀ-Ú][a-zà-ù’]+|[A-ZÀ-Ú ]{4,40})[.:]?\s+(?=(?:Al|Alla|Alle|Gli|Le|Il|La|Lo|I|Si|Per|In|Dal|Dalle|Nel|Nella|Durante|Entro|Tutti|Tutte|Tutto)\s)/,m=>FW.test(m)?m:''))
  .filter(s=>!(s.split(' ').length<6&&!/[a-zà-ù]{3}/.test(s)&&!/\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|\d{1,2}\s+(?:gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/i.test(s)))  .filter(s=>s.length>20&&!LETTERHEAD.test(s)&&(s.match(/\b(?:Prof|Dott|Sig)(?:\.ssa|\.ra)?\./g)||[]).length<2);
}

// Taglia un testo lungo a un confine naturale (frase o virgola), mai a metà parola.
export function tidy(s,max=340){
 s=clean(s).replace(/^[a-z]\)\s*/i,'');

 if(!s)return s;
 s=s[0].toUpperCase()+s.slice(1);
 if(s.length<=max)return s;
 const cut=s.slice(0,max);
 let end=-1;for(const m of cut.matchAll(/[.;!?](?=\s)/g)){if(!ABBR.test(cut.slice(0,m.index+1)))end=m.index;}
 if(end>max*.5)return cut.slice(0,end+1);
 const comma=Math.max(cut.lastIndexOf(', '),cut.lastIndexOf(' – '));
 if(comma>max*.5)return cut.slice(0,comma)+'…';
 return cut.slice(0,cut.lastIndexOf(' '))+'…';
}
// Toglie le formule burocratiche di apertura: "Si comunica che, ..." → contenuto.
function unshout(s){const letters=s.replace(/[^A-Za-zÀ-ÿ]/g,'');if(letters.length>25&&letters.replace(/[^A-ZÀ-Þ]/g,'').length/letters.length>.7){s=s.toLowerCase().replace(/\b(pcto|fsl|ata|ue|aci|pon|pnrr|iis|its)\b/g,m=>m.toUpperCase());s=s[0].toUpperCase()+s.slice(1);}return s;}
function plain(s){
 return unshout(clean(s)).replace(/:\s*(?:[A-ZÀ-Ú]{3,}\s+){2,}[A-ZÀ-Ú0-9 ]*\.?$/,'.')
  .replace(/^(?:Si\s+(?:comunica|informa|informano|avvisa|rende noto)(?:\s+(?:a|alle|agli|ai)\s+[^,]{0,60}?)?\s+che\s*,?\s*)/i,'')
  .replace(/^(?:Con la presente\s+si\s+(?:comunica|informa)\s+che\s*,?\s*)/i,'')
  .replace(/^(?:in occasione d[ie]l?l?[a-z’']*\s+[^,]{3,80},\s*)(?=il|lo|la|giorno|luned|marted|mercoled|gioved|venerd|sabato|domenica|\d)/i,m=>m);
}

const PLACE_HEAD='(?:Aula Magna|Auditorium|Palestra|Teatro|Cinema|Multisala|ex\\s+Chiesa|Chiesa|Basilica|Duomo|Cattedrale|Sala|Salone|Aula|Laboratorio|Biblioteca|Piazza|Piazzale|Villa|Palazzo|Palacultura|PalaRescifina|Università|Rettorato|Dipartimento|Museo|Parco|Stadio|Campo|Centro|Sede|Plesso|Porto|Stazione|Molo|Caserma|Questura|Prefettura|Comune|Municipio|Ospedale|Policlinico|Istituto|Liceo|Gazzetta|Fiera|Cortile|Atrio|Ingresso|via|viale|corso|piazza|location|struttura|locali)';
const PLACE_RE=new RegExp('\\b(?:presso|nei locali d(?:el|ella|ell’|ei)|nell[’\']\\s?|nella|nel|in|al|alla|all[’\']\\s?|sito in|siti in|ubicat[oa] in)\\s+(?:l[’\']\\s?|il |la |lo |i |gli |le )?('+PLACE_HEAD+'\\b[^.;:()\\n]{0,90}?)(?=\\s*(?:[,.;:)]|$|\\s(?:si terr|si svolger|alle ore|dalle ore|ore \\d|a partire|dove|per |con |e a seguire|che |prevede|il giorno|luned|marted|mercoled|gioved|venerd|sabato|domenica|\\d{1,2}\\s)))','gi');
const ONLINE_RE=/\b(?:in\s+modalit[àa]\s+(?:online|on-line|a distanza|telematica)|online|on-line|on line|Google Meet|piattaforma\s+(?:Meet|Teams|Zoom)|Microsoft Teams|Zoom)\b/i;

function placesIn(sentences){
 const found=[];
 for(let s of sentences){
  if(/sciopero|prestazioni indispensabili|istituzione scolastica saranno/i.test(s))continue;
  s=s.replace(/\bn\.\s?(\d)/g,'n° $1');
  for(const m of s.matchAll(PLACE_RE)){
   // "corso", "via" ecc. sono un indirizzo solo se seguiti da un nome proprio ("Corso Garibaldi", "via dei Mille")
   if(/^(?:[Vv]ia|[Vv]iale|[Cc]orso|[Pp]iazza|[Pp]iazzale)\s+(?!(?:di|dei|del|della|delle|degli|dello)\s+[A-ZÀ-Ú])[a-zà-ù]/.test(m[1]))continue;
   let p=clean(m[1]).replace(/\s+(?:e|ed|o)$/i,'').replace(/[,–-]+$/,'');
   if(p.length<4||/^(?:aula|sede|plesso|istituto|centro|struttura|locali|location)$/i.test(p)||/^via\s+(?:telematica|e-?mail|mail|web|pec|whatsapp|internet)/i.test(p)||/^sede\s+(?:della|dell’|del)\s+(?:manifestazione|evento|attività|iniziativa)/i.test(p))continue;
   if(/^(?:Istituto|Plesso)\b/i.test(p)&&/iscri|segreteria/i.test(s))continue;
   // aggiunge l'indirizzo se segue ("..., sito in via ...")
   const after=s.slice(m.index+m[0].length).match(/^\s*,\s*(?:sit[oa]\s+in\s+)?((?:via|viale|corso|piazza)\s+[^,.;]{2,50})/i);
   if(after&&!/\b(?:via|viale|corso|piazza)\b/i.test(p))p+=', '+clean(after[1]);
   p=p[0].toUpperCase()+p.slice(1);
   if(!found.some(f=>f.toLowerCase().includes(p.toLowerCase())||p.toLowerCase().includes(f.toLowerCase())))found.push(p);
   else{const i=found.findIndex(f=>p.toLowerCase().includes(f.toLowerCase()));if(i>=0&&p.length<=110)found[i]=p;}
  }
  if(ONLINE_RE.test(s)&&!found.includes('Online'))found.push(/Meet/i.test(s)?'Online (Google Meet)':/Teams/i.test(s)?'Online (Microsoft Teams)':/Zoom/i.test(s)?'Online (Zoom)':'Online');
 }
 return found.slice(0,3);
}

const TIME='(\\d{1,2})[.:](\\d{2})';
function timesIn(s){
 const t=s.replace(/\bore\s+/gi,'ore ');
 let m=t.match(new RegExp('(?:dalle|dall’|dalle\\s+ore|dall[’\']\\s?ore)\\s*(?:ore\\s*)?'+TIME+'\\s*(?:alle|fino alle|e fino alle|-|–)\\s*(?:ore\\s*)?'+TIME,'i'));
 if(m)return 'dalle '+m[1]+':'+m[2]+' alle '+m[3]+':'+m[4];
 m=t.match(new RegExp('\\bentro\\s+(?:e\\s+non\\s+oltre\\s+)?(?:le\\s+)?(?:ore\\s*)?'+TIME,'i'));
 if(m)return 'entro le '+m[1]+':'+m[2];
 m=t.match(new RegExp('\\b(?:alle|a partire dalle|dalle)\\s+(?:ore\\s*)?'+TIME,'i'))||t.match(new RegExp('\\bore\\s*'+TIME,'i'));
 if(m)return (/a partire/i.test(m[0])?'dalle ':'alle ')+m[m.length-2]+':'+m[m.length-1];
 return '';
}

function pickAll(sentences,re,n=2){return sentences.filter(s=>re.test(s)).slice(0,n);}

export function practicalFor(record,notice,datesIn){
 const docs=record.documents.map(d=>d.text||'').join('\n');
 const vocab=buildVocabulary([record.title,record.body,docs]);
 const TITLES=/\b(?:Prof(?:\.ssa|\.)?|Dott(?:\.ssa|\.)?|Sig(?:\.ra|\.)?|Ing\.)\s/g;
 const lines=repairText(docs,vocab).split('\n').map(l=>l.trim()).filter(l=>l&&!LETTERHEAD.test(l)&&(l.match(TITLES)||[]).length<2);
 // Una riga corta senza punto finale seguita da una maiuscola è un titoletto ("DISPONE", "Liberatoria"):
 // la chiudiamo, così non si incolla alla frase successiva.
 const full=lines.map((l,i)=>l+(i<lines.length-1&&l.length<70&&!/[.;:,!?]$/.test(l)&&/^(?:[A-ZÀ-Ú“"«]|[a-z]\)\s)/.test(lines[i+1])&&!/\b(?:il|la|lo|le|i|gli|di|del|della|dei|presso|in|a|al|alla|e|con|per|da|dal|dalle|ore|n\.|n°)$/i.test(l)?'.':'')).join('\n');
 const title=repairText(record.title,vocab);
 // Salta intestazione e oggetto: l'indirizzo della scuola non è il luogo dell'evento
 // e l'oggetto è già il titolo della circolare.
 const start=full.search(/oggetto\s*:/i);
 const afterSubject=start>=0?full.slice(start):full;
 const instr=afterSubject.search(/\b(?:Si\s+(?:comunica|informa|informano|invitano|invita|avvisa|rende noto|ricorda|trasmette)|Con la presente|IL DIRIGENTE SCOLASTICO|DISPONE|Gentili|Cari|Gli studenti|Le classi|I genitori)/);
 let body=instr>=0?afterSubject.slice(instr):start>=0?afterSubject.replace(/^oggetto\s*:/i,''):repairText(record.body||record.title,vocab);
 {const end=body.slice(150).search(/Si ringrazia per la (?:cortese )?collaborazione|Si porgono cordiali saluti|Cordiali saluti|Distinti saluti|Firma autografa|IL DIRIGENTE SCOLASTICO\.?\s*(?:Prof|Dott|\n|$)/i);if(end>=0)body=body.slice(0,150+end);}
 const text=clean(body);
 const sentences=sentencesOf(text);

 const overviewRe=/si comunica|si informa|si avvisa|si rende noto|si terr[àa]|si svolger|parteciperanno|è previst|è indett|è convocat|finalizzat|rivolt[oaie] a|obiettivo|ha lo scopo/i;
 const overviewSrc=pickAll(sentences,overviewRe,1)[0]||title;
 const overview=tidy(plain(overviewSrc),360);

 const actionRe=/(?:iscriz|iscriver|aderir|adesion|consegn|compilar|versament|pagament|prenotar|autorizzaz|portare|raggiunger|si recheranno|si recher|dovranno|dovrà|devono|deve |sono tenut|sono invitat|è necessari|è obbligatori|occorre|munit|presentarsi|ritrovo|appuntamento|uscita anticipata|ingresso posticipat|entreranno|usciranno|saranno sciolt|rientreranno|parteciperanno|accompagnat)/i;
 const staff=/^(?:Tutto il personale|Il personale|I docenti|I sigg\.? docenti|Il personale docente|Il personale ATA|I collaboratori)/i;
 const forStudents=s=>/alunn|student|classi|class[ei]\s+\d|famigli|genitor|ragazz/i.test(s)&&!staff.test(s);
 const candidates=sentences.filter(s=>s!==overviewSrc&&actionRe.test(s));
 const actionSrc=(candidates.some(forStudents)?candidates.filter(forStudents):candidates.filter(s=>!staff.test(s))).slice(0,3);
 const action=actionSrc.length?tidy(actionSrc.map(plain).join(' '),420):'Non è indicata una cosa precisa da fare per gli studenti. Leggi la circolare completa e gli allegati se pensi che ti riguardi.';

 const gratis=pickAll(sentences,/gratuit|senza (?:alcun )?(?:costo|oneri)|nessun (?:costo|onere)|a titolo gratuito/i,1);
 const money=pickAll(sentences,/€|\beuro\b|\b(?:costo|quota|importo|contributo)\b.{0,40}\d/i,2);
 let cost='Non indicati: la circolare non dice se ci sono costi.';
 if(gratis.length)cost=tidy(plain(gratis[0]),240);
 else if(money.length){const amounts=[...new Set((money.join(' ').match(/€\.?\s?\d+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?\s?(?:€|euro)\b/gi)||[]).map(a=>'€ '+a.replace(/[^\d.,]/g,'').replace(/^[.,]+/,'')))].filter(a=>!/^€ 0(?:[.,]0+)?$/.test(a));cost=(amounts.length?'Importo indicato: '+amounts.join(', ')+'. ':'')+tidy(plain(money[0]),260);}

 const part=pickAll(sentences,/\bfacoltativ[oaie]\b|\bobbligatori[oaie]\b|partecipazione.{0,60}(?:volontari|non obblig|libera)|adesione.{0,40}volontari|su base volontaria|gli studenti interessati|chi (?:è|fosse) interessat/i,1);
 const participation=part.length?tidy(plain(part[0]),260):'Non indicato: la circolare non dice se è obbligatorio o facoltativo.';

 const places=placesIn(sentences);
 const where=places.length?places.join(' · '):missing;

 // Quando: date dell'evento con orario, senza le date di riferimento (note, protocolli, circolari precedenti).
 const eventDates=[...new Set(notice.events.map(e=>e.date))].sort();
 const future=eventDates.filter(d=>!record.published||d>=record.published);
 const shown=future.length?future:eventDates;
 const byDate={};const whenParts=[];
 for(const date of shown){
  const rows=sentences.filter(s=>datesIn(s,record.published).some(d=>d.date===date));
  const exact=rows.filter(s=>datesIn(s,record.published).length===1);
  const best=exact.length?exact:rows;
  // se la data è in un titoletto ("GIORNO 19/11 – PLESSO …") l'orario è nella frase subito dopo
  const time=best.map(timesIn).find(Boolean)||best.filter(r=>r.length<90).map(r=>sentences[sentences.indexOf(r)+1]||'').filter(n=>!datesIn(n,record.published).length).map(timesIn).find(Boolean)||'';
  const deadline=best.some(s=>/(?:\bentro|\bscade|scadenza|non oltre|termine (?:ultimo|per|di presentazione|di consegna))\s+(?:(?:il|le ore [\d.:]+ del|del|giorno|la data del)\s+)?(?:(?:luned|marted|mercoled|gioved|venerd)ì\s+|sabato\s+|domenica\s+)?\d{1,2}\b/i.test(s));
  const label=weekday(date).replace(/^./,c=>c.toUpperCase())+' '+day(date);
  whenParts.push(label+(time?', '+time:'')+(deadline&&!/entro/.test(time)?' (scadenza)':''));
  if(best.length)byDate[date]=tidy(best.slice(0,2).map(plain).join(' '),420);
 }
 const practical={overview,action,when:whenParts.join(' · ')||missing,where,cost,participation,byDate};

 // Spiegazione verificata a mano sulla circolare 237. Richiede i fatti della fonte,
 // così una revisione successiva non riusa una spiegazione superata.
 if(/hackathon.*messina in tasca/i.test(record.title)&&/da 2 a 4 studenti/i.test(text)&&/due sensori/i.test(text)&&/partecipazione è gratuita/i.test(text)&&/20 novembre 2026/.test(text)&&/18 dicembre 2026/.test(text)){
  Object.assign(practical,{
   overview:'È una gara a squadre: insieme ad altri studenti devi creare il prototipo di un’app per smartphone che aiuti a scoprire il turismo nella provincia di Messina, usando almeno due sensori del telefono. Non serve avere già esperienza di programmazione.',
   action:'Se vuoi partecipare, forma una squadra da 2 a 4 studenti e trova un docente tutor. Il tutor deve inviare il modulo di iscrizione (Allegato A) a gaetano.delorenzo@veronatrento.it entro il 20 novembre 2026. Consegnate il progetto entro le 23:59 dell’8 dicembre; presentazione e premiazione sono il 18 dicembre durante l’open day. È previsto un attestato valido per FSL.',
   when:'12 novembre: incontro di orientamento. 20 novembre: scadenza iscrizione. 8 dicembre, ore 23:59: consegna del progetto. 18 dicembre: presentazione e premiazione.',
   where:'L’incontro del 12 novembre è online. La presentazione del 18 dicembre si svolge durante l’open day dell’Istituto. Link dell’incontro, aula e orari dell’open day non sono specificati nel PDF.',
   cost:'La partecipazione all’hackathon è gratuita.',
   participation:'L’incontro online del 12 novembre è facoltativo. La circolare non indica un obbligo di partecipare alla gara.',
   byDate:{
    '2026-11-12':'Il 12 novembre c’è un incontro online facoltativo per capire come funziona l’hackathon: non è la scadenza per iscriversi e non devi consegnare oggi il progetto. Il PDF non indica l’ora né il link; per questi dettagli puoi chiedere al prof. Gaetano De Lorenzo (gaetano.delorenzo@veronatrento.it).',
    '2026-11-20':'Entro il 20 novembre il docente tutor deve inviare l’iscrizione della tua squadra: mettiti d’accordo con 1–3 compagni, trovate un tutor e compilate l’Allegato A.',
    '2026-12-08':'Entro le 23:59 dell’8 dicembre dovete consegnare il progetto. Questa è la scadenza di consegna, non il giorno della premiazione. Controllate nel regolamento allegato come inviarlo.',
    '2026-12-18':'Il 18 dicembre i progetti saranno presentati e premiati durante l’open day dell’Istituto. Il PDF della circolare non specifica l’aula né l’ora.'
   }
  });
 }
 // Le righe dedicate identificano già la fascia corretta per i rappresentanti delle quinte.
 if(notice.representative&&notice.representativeKind==='Classe'){
  const own=notice.events.find(e=>e.confidence==='Fascia per le classi quinte');
  if(own){practical.action='Come rappresentante di classe della 5J, segui questa fascia: '+own.context;practical.byDate[own.date]=practical.action;}
 }
 return practical;
}
