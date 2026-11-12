# QuintaJ · 5J Verona Trento

Agenda pubblica degli alunni e dei rappresentanti della 5J. Include circolari, calendario, orario delle lezioni e variazioni aula per modulo, con fonti ufficiali. È indipendente da ChatGPT e dalle API OpenAI.

## Hosting gratuito

Questa versione usa GitHub Pages da un repository pubblico e GitHub Actions su runner standard. Gli aggiornamenti sono previsti circa ogni 30 minuti tra le 07:17 e le 21:47, ora di Roma, fino al **31 agosto 2027**. GitHub può ritardare un’esecuzione. Dal 1 settembre i controlli si fermano; l’ultima versione rimane consultabile finché il repository e Pages restano attivi.

Le verifiche effettive sono registrate in `data.json` e commesse nel repository: l’orario dell’ultimo controllo è visibile nel sito. I testi integrali dei PDF non sono pubblicati nel sito o nel repository: l’archivio di estrazione viene conservato solo nella cache delle esecuzioni. Nessuna password della scuola o chiave OpenAI.

## Telefono e offline

Aprire l’indirizzo GitHub Pages dal telefono. Safari: Condividi → Aggiungi alla schermata Home. Chrome Android: menu → Installa app/Aggiungi alla schermata Home. Il primo caricamento salva una copia per l’uso offline. Per ricevere i nuovi dati serve la connessione. Se avevi installato la vecchia versione ChatGPT Sites, aggiungi il nuovo indirizzo alla Home: l’origine dell’app cambia.

## Aggiornamenti e limiti

L’aggiornatore legge l’archivio pubblico della scuola e i PDF, ricontrolla i documenti a rotazione e aggiorna l’orario ufficiale della 5J. Conserva l’ultima versione se una lettura fallisce. La prima importazione può richiedere alcuni minuti. Errori di importazione e documenti non leggibili restano segnalati. I riepiloghi sono automatici: controllare la fonte, soprattutto per destinatari, aule e rettifiche. Non è collegato al registro elettronico.

Il calendario esclude gli adempimenti riservati al personale e distingue classe, istituto e Consulta. «Dove devo andare» conserva aula ordinaria e destinazione della variazione con modulo, fascia e circolare. Se una variazione non è riconosciuta con certezza, mostra un avviso senza inventare un’aula.

Ogni circolare contiene «In pratica, cosa devi fare», con attività, consegne, date, luogo, costi e obbligatorietà. Le informazioni non presenti nel documento sono indicate come non specificate; la facoltatività di un singolo incontro non viene estesa all’intero progetto. La spiegazione dell’hackathon distingue orientamento, iscrizione, consegna e presentazione. L’estrazione automatica funziona senza servizi AI a pagamento.

## Agenda personale e pause

«La mia agenda» conserva compiti e promemoria nel localStorage del browser, con scadenze, completamento ed eliminazione. Questi dati non vengono inviati al repository, pubblicati né sincronizzati tra dispositivi. La lista resta dopo la chiusura del sito, ma può andare persa cancellando i dati del browser o usando la navigazione privata. Esportazione e importazione JSON permettono di conservare una copia o trasferirla su un altro dispositivo.

«Prossime pause» mette in primo piano le festività con nome, conto alla rovescia, date e durata inclusiva; i weekend sono raccolti in un riquadro più piccolo. La base è il calendario ufficiale della Sicilia 2026/27, verificato il 12 novembre 2026: Immacolata (7–8 dicembre), Natale (23 dicembre–7 gennaio), Pasqua (25–30 marzo), festività nazionali e Madonna della Lettera (3 giugno, patrona di Messina). I weekend consecutivi sono inclusi nella pausa totale e le date proprie della festività restano esplicite. Il 15 maggio non è una sospensione prevista dal calendario regionale. Le lezioni ordinarie terminano il 9 giugno 2027; gli esami seguono un calendario separato.

Le circolari rivolte alla 5J integrano o adattano questa base; quelle riservate al Majorana o al serale non vengono applicate. Le date di ripresa e i riferimenti a vecchie circolari non vengono trattati come festività. Le sospensioni riconosciute sono escluse anche da «Dove devo andare». I giorni corrispondenti sono evidenziati in blu elettrico nel calendario, con nomi specifici come Natale, Epifania e Pasqua. Le comunicazioni con date non attribuibili restano da verificare; non vengono inventati ponti sulla base degli anni precedenti.

## Aspetto e ripristino

Il tema predefinito è «Notte blu», con le cinque immagini fornite dall’utente e pannelli scuri ad alto contrasto. «Sfondo» apre la scelta dell’immagine e permette di tornare al tema azzurro chiaro. Queste preferenze sono locali al browser e non modificano l’agenda personale. Immagini e controlli dell’aspetto sono inclusi nella copia offline. Gli screenshot Discord e Spotify sono stati usati solo come riferimento e non vengono pubblicati.

Prima del restyling è stato conservato il ramo `backup/2026-11-12-prima-tema-notturno`, commit `1688cf68ade94d1e3f5cd655bc34ca5acc49fa6b`. Esiste anche uno ZIP di tutti i file della versione precedente. Il backup riguarda codice, immagini e dati pubblici; l’agenda personale continua a risiedere nel browser con la stessa chiave di salvataggio.

L’icona della Home è azzurra con «5J» in bianco. Se il telefono conserva l’icona verde, rimuovere il vecchio collegamento dalla Home e aggiungerlo di nuovo dal sito GitHub Pages.

## Sviluppo

Node.js 24: `npm ci`, `npm test`, `npm run build`. I file da pubblicare sono in `_site`. `npm run update` esegue un controllo reale; `.cache` non deve essere commessa. In Settings → Pages la sorgente deve essere **GitHub Actions**.

Fonti:

- https://nuovo.veronatrento.it/circolare/
- https://nuovo.veronatrento.it/orario/
- https://veronatrento.it/Orario2627/VT/Classi/5J.html
- https://www.usr.sicilia.it/calendario-scolastico-2026-27/
- https://comune.messina.it/it/news/festa-della-madonna-della-lettera-2026-tutte-le-modifiche-alla-viabilita-per-le-celebrazioni-del-3-giugno?type=2
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
