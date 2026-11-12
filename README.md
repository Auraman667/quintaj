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

## Sviluppo

Node.js 24: `npm ci`, `npm test`, `npm run build`. I file da pubblicare sono in `_site`. `npm run update` esegue un controllo reale; `.cache` non deve essere commessa. In Settings → Pages la sorgente deve essere **GitHub Actions**.

Fonti:

- https://nuovo.veronatrento.it/circolare/
- https://nuovo.veronatrento.it/orario/
- https://veronatrento.it/Orario2627/VT/Classi/5J.html
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
