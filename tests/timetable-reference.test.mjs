import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {timetableReference} from '../lib/timetable-source.mjs';
import {dayPlan,cycleFor} from '../lib/timetable-core.mjs';

const october={title:'Orario tecnologico diurno – aggiornamento dal 19 ottobre 2026',published:'2026-10-16',number:'159',url:'https://nuovo.veronatrento.it/circolare/orario-tecnologico-diurno-aggiornamento-dal-19-ottobre-2026/',serale:false,documents:[{text:'Si comunica che da lu nedì 19 ottobre p.v. entra in vigore l’orario. Per i corsi diurn i, si riprende lunedì\n19 otto bre con L unedì dell a p rima settimana .'}]};
const september={title:'Entrata in vigore orario completo',published:'2026-09-16',number:'54',url:'https://example.com/54',documents:[{text:'A partire da lunedì 21 settembre 2026 si parte con il lunedì della prima settimana.'}]};

test('il reset di ottobre viene riconosciuto anche con parole spezzate dal PDF',()=>{
 const reference=timetableReference([september,october]);
 assert.equal(reference.anchorDate,'2026-10-19');
 assert.equal(reference.anchorNumber,'159');
 assert.equal(timetableReference([october,september]).anchorDate,reference.anchorDate);
});

test('una data di intestazione non può diventare l’inizio della rotazione',()=>{
 const unrelated={...september,title:'Ottimizzazione orario completo tecnologico diurno',documents:[{text:'Riferimento del 09.09.2026. Si riprende con il lunedì della prima settimana.'}]};
 assert.equal(timetableReference([unrelated,september]).anchorDate,'2026-09-21');
});

test('12 novembre: TPSI finale in B15; 13 novembre: tutti i moduli in B15; 16 novembre: settimana 1',async()=>{
 const payload={timetable:{...JSON.parse(await fs.readFile('tests/fixtures/timetable-november-2026.json','utf8')),...timetableReference([september,october])},events:[]};
 assert.equal(payload.timetable.anchorDate,'2026-10-19');
 assert.equal(cycleFor(payload.timetable,'2026-11-12').week,4);
 const thursday=dayPlan(payload.timetable,'2026-11-12',payload.events);
 assert.equal(thursday.lessons.at(-1).subject,'TPSI');
 assert.deepEqual(thursday.lessons.at(-1).rooms.map(r=>r.name),['B15']);
 const friday=dayPlan(payload.timetable,'2026-11-13',payload.events);
 assert.equal(friday.lessons.length,4);
 assert.ok(friday.lessons.every(l=>l.rooms.length===1&&l.rooms[0].name==='B15'));
 assert.equal(cycleFor(payload.timetable,'2026-11-16').week,1);
});
