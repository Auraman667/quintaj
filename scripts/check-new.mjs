// Controllo rapido (ogni 15 minuti): ci sono circolari nuove sul sito della scuola
// che il sito QuintaJ non ha ancora letto? Stampa "new=N" per il timer.
import {listPage} from '../lib/source.mjs';
const site='https://auraman667.github.io/quintaj/data.json?'+Date.now();
let known=new Set();
try{const d=await (await fetch(site)).json();for(const c of [...(d.circolari||[]),...(d.otherCircolari||[])])known.add(c.url);}
catch(e){console.log('Dati del sito non leggibili: '+e.message);console.log('new=1');process.exit(0);}
let items=[];
try{items=await listPage(1);}catch(e){console.log('Sito della scuola non raggiungibile: '+(e.cause?.code||e.message));console.log('new=0');process.exit(0);}
const fresh=items.filter(i=>!known.has(i.url));
for(const i of fresh)console.log('Nuova: '+i.number+' '+i.title);
console.log('new='+fresh.length);
