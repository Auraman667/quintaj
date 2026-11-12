const clean=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const missing='Non specificato nella circolare.';
const segmenter=new Intl.Segmenter('it',{granularity:'sentence'});
const day=date=>new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Rome'}).format(new Date(date+'T12:00:00Z'));

export function practicalFor(record,notice,datesIn){
 const full=record.documents.map(d=>d.text||'').join('\n');
 // Discard the letterhead: its school address is not an event venue.
 const start=full.search(/oggetto\s*:/i);
 const firstInstruction=full.search(/Si comunica|Si informano|Si invitano|DISPONE/i);
 let body=start>=0?full.slice(start).replace(/^oggetto\s*:/i,''):firstInstruction>=0?full.slice(firstInstruction):record.body||record.title;
 body=body.split(/Si ringrazia per la collaborazione|Si porgono cordiali saluti|Firma autografa/i)[0];
 const text=clean(body);
 const sentences=[...segmenter.segment(text)].map(x=>clean(x.segment)).filter(s=>s.length>25&&s.length<800&&!/^(?:Sede Centrale|Via Ugo Bassi|PEO:|PEC:|Tel\.|Codice univoco|Firma autografa)/i.test(s));
 const pick=(re,n=2)=>sentences.filter(s=>re.test(s)).slice(0,n).join(' ');
 const action=pick(/(?:iscriz|aderir|adesion|consegn|compilar|versament|pagament|prenotar|autorizzaz|portare|raggiunger|recar|si recher|dovranno|sono tenuti)/i);
 const overview=pick(/si comunica|si informano|si invitano|si terr[àa]|si svolger|è previst|finalizzat|rivolt[oaie]|obiettivo/i,1)||notice.title;
 const cost=pick(/(?:partecipazione|ingresso|attività|iniziativa|corso|biglietto).{0,70}gratuit|gratuit.{0,70}(?:partecipazione|ingresso|attività|iniziativa|corso)|\beuro\b|€|\b(?:costo|quota|importo|pagamento|versamento)\b/i);
 // Preserve the sentence's scope: an optional meeting does not make the whole project optional.
 const participation=pick(/\bfacoltativ[oaie]\b|\bobbligatori[oaie]\b|partecipazione.{0,60}(?:volontari|non obblig)|adesione.{0,40}volontari/i);
 const where=pick(/\b(?:presso|in aula|nell.aula|aula magna|cinema|teatro|online|on.line|google meet|piattaforma meet)\b/i);
 const byDate={};
 for(const event of notice.events){
  const rows=sentences.filter(s=>datesIn(s,record.published).some(d=>d.date===event.date));
  const exact=rows.filter(s=>datesIn(s,record.published).length===1);
  if(rows.length)byDate[event.date]=(exact.length?exact:rows).slice(0,2).join(' ');
 }
 const practical={overview,action:action||'Non è stata individuata una consegna precisa per gli alunni. Leggi i dettagli e gli allegati prima di decidere cosa fare.',when:[...new Set(notice.events.map(e=>e.date))].map(day).join('; ')||missing,where:where||missing,cost:cost||'Costi non specificati: non è possibile confermare che sia gratuito.',participation:participation||'La circolare non specifica se la partecipazione sia obbligatoria o facoltativa.',byDate};
 // Plain-language explanation verified against circular 237. Require the source facts,
 // so later revisions cannot silently reuse an outdated explanation.
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
 // Event-specific rows already identify the correct fifth-year representative slot.
 if(notice.representative&&notice.representativeKind==='Classe'){
  const own=notice.events.find(e=>e.confidence==='Fascia per le classi quinte');
  if(own){practical.action='Come rappresentante di classe della 5J, segui questa fascia: '+own.context;practical.byDate[own.date]=practical.action;}
 }
 return practical;
}
