const compact=s=>String(s||'').replace(/\s+/g,' ').trim();
const studentWords=/\b(?:alunn[oi]|student[ei]|studentesse|classi|famiglie|genitori)\b/i;
const council=/consigli(?:o)? di classe/i;
export function audienceFor(record){
 const title=compact(record.title);const main=record.documents?.find(d=>d.text?.length>80)?.text||record.documents?.[0]?.text||'';
 const text=compact(main);const body=text.split(/oggetto\s*:/i).slice(1).join(' ')||text;const combined=title+' '+body;
 const parentElection=/elezioni|elettoral|candidati/i.test(title)&&/componente\s+genitori|rappresentante.{0,35}genitori/i.test(title);
 const operational=/variazion.{0,50}orario|uscita anticipata|ingresso posticipato|orario.{0,25}lezioni|sospensione.{0,40}(?:lezioni|didattic)|cambio.{0,25}aul|interdizione.{0,35}(?:locali|palestra)/i.test(title);
 const staffTitle=/neoassunt|personale docente|collegio dei docenti|bilancio.{0,35}competenze|coordinatori di classe|nomina.{0,55}(?:docenti|coordinatori|tutor)|assegnazion.{0,20}docenti|docenti.{0,25}(?:esperti|tutor)|commissione di valutazione|commissione elettorale|formazione.{0,35}docenti|assemblea.sindacale|reclutamento|selezione.{0,40}personale|orario di servizio dei docenti/i.test(title);
 const onlyTeachers=/sola componente.{0,35}(?:personale )?docent|riservat[oaie].{0,35}docent/i.test(body);
 const councilStudents=/presenza.{0,45}componente.{0,25}alunni|component[ei].{0,30}alunni.{0,30}elett|insediamento.{0,55}(?:studenti|alunni)/i.test(body);
 const actionLines=[];const studentRep=/rappresentant[ei].{0,65}(?:student|alunn|class[ei]|istituto|consulta)|(?:studenti|alunni).{0,50}rappresentant[ei]|un rappresentante per classe/i;
 const lines=main.split('\n');
 for(let i=0;i<lines.length;i++){const line=lines[i];
  if(/^\s*(?:Vist[aoie]|Considerat[aoie])\b/i.test(line))continue;
  const chunk=compact(lines.slice(Math.max(0,i-1),i+2).join(' '));
  if(/rappresentant[ei]/i.test(line)&&studentRep.test(chunk)&&/\b(?:convocat|convocazion|invitat|partecip|presentar|present[ei]\b|consegn|compil|devono|dovranno|tenuti|richiest|entro\b|ore\b|incontr|recher|raccogli|trasmett|comunich|comunicar)/i.test(chunk))actionLines.push(chunk);
 }
 if(studentRep.test(title)&&/convocazion|partecipazion|incontr|riunion|consegn|adempiment/i.test(title))actionLines.unshift(title);
 if(council.test(title)&&councilStudents)actionLines.unshift('Partecipazione della componente alunni eletta al consiglio di classe. Consulta il PDF per la parte aperta ai rappresentanti.');
 if(/comitato studentesco/i.test(title)){
  const fifth=actionLines.find(s=>/classi\s+III.{0,20}IV.{0,15}V\b/i.test(s));if(fifth){actionLines.length=0;actionLines.push(fifth);}
 }
 const representative=actionLines.length>0&&!parentElection;
 let representativeKind=null;
 if(representative){const signals=title+' '+actionLines.join(' ');representativeKind=/consulta (?:provinciale|degli studenti)|rappresentant[ei].{0,20}(?:della |di )?consulta/i.test(signals)?'Consulta':/rappresentant[ei].{0,25}(?:di |d.)istituto/i.test(signals)&&!/per classe|di classe/i.test(signals)?'Istituto':'Classe';}
 let studentRelevant=false,reason='Nessun impegno degli alunni riconosciuto';
 if(parentElection)reason='Elezioni riservate alla componente genitori';
 else if(staffTitle&&!operational&&!representative)reason='Adempimento o riunione riservati al personale';
 else if(council.test(title)){
  studentRelevant=representative;
  reason=representative?'È prevista la componente alunni eletta':onlyTeachers?'Consiglio riservato alla componente docente o ai genitori convocati':'Presenza degli alunni non confermata nel documento';
 }else if(representative){studentRelevant=true;reason='Convocazione o attività dei rappresentanti degli studenti';}
 else if(operational){studentRelevant=true;reason='Variazione che incide sulla giornata degli alunni';}
 else {
  const activity=/\bpcto\b|\bfsl\b|uscit[ae]|cinema|teatr|spettacolo|orientamento|olimpiad|hackathon|giochi|gara|gare|concorso|assemblea di istituto|elezion|libri di testo|studente.atleta|evacuazion|divieto di fumo|sicurezza|student|alunn|didattic|volontariat|iscrizion|colletta|trasformazioni|sciopero|sostegno psicologico|ingresso|orario completo/i.test(title);
  const recipient=main.split(/oggetto\s*:/i)[0];
  studentRelevant=activity&&(studentWords.test(recipient+' '+body.slice(0,1500))||/alunni|studenti|sciopero|assemblea di istituto|uscita didattica|cinema|orario completo/i.test(title));
  if(studentRelevant)reason='Attività, scadenza o informazione utile agli alunni';
 }
 return {studentRelevant,representative,representativeKind,representativeActions:[...new Set(actionLines)].slice(0,5).map(s=>s.slice(0,330)),audienceReason:reason,council:council.test(title),councilStudents,onlyTeachers,staffOnly:staffTitle&&!operational&&!representative};
}

export function audiencesFor(records){
 const result=new Map(records.map(r=>[r.url,audienceFor(r)]));
 // A calendar correction inherits participation rules from the original circular.
 // A courtesy copy to pupils is never enough to infer a duty to attend.
 const months=/gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre/i;
 const monthFor=r=>(r.title.match(months)||r.documents?.map(d=>d.text).join(' ').match(months))?.[0]?.toLowerCase();
 for(const r of [...records].sort((a,b)=>Number(a.number)-Number(b.number))){
  const role=result.get(r.url);
  if(!role.council||role.councilStudents||role.onlyTeachers||!/rettifica|recupero|rinviat/i.test(r.title))continue;
  const month=monthFor(r);
  const prior=records.filter(p=>p.serale===r.serale&&Number(p.number)<Number(r.number)&&council.test(p.title)&&monthFor(p)===month).sort((a,b)=>Number(b.number)-Number(a.number))[0];
  if(!prior)continue;
  const base=result.get(prior.url);
  Object.assign(role,{studentRelevant:base.studentRelevant,representative:base.representative,representativeKind:base.representativeKind,representativeActions:base.representativeActions,audienceReason:base.audienceReason,participationSource:prior.url});
 }
 return result;
}

export function isStudentEvent(event){
 const context=compact(event.context);
 // Deadlines for teachers in a circular also addressed to pupils are not pupil tasks.
 const staffAction=/(?:docenti|coordinatori|personale).{0,100}(?:comunicar|inviar|consegn|compilar|aderir|dichiarar|caricar|predispor|presentar).{0,100}(?:entro|scadenza)|(?:entro|scadenza).{0,100}(?:docenti|coordinatori|personale)/i;
 const studentAction=/(?:studenti|alunni|rappresentanti).{0,80}(?:dovranno|devono|invitati|consegn|compilar|partecip|presentar|iscriver)/i;
 return !staffAction.test(context)||studentAction.test(context);
}
