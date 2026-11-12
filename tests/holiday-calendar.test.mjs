import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {breakInfo,upcomingPauses,calendarPeriods} from '../lib/calendar-core.mjs';
import {dayPlan} from '../lib/timetable-core.mjs';
const data=JSON.parse(await fs.readFile('data.json','utf8'));

test('festività principali con nome, durata inclusiva e weekend separati',()=>{
 const result=upcomingPauses('2026-11-12',data.schoolBreaks);
 assert.match(result.major[0].name,/Immacolata/);
 assert.deepEqual([result.major[0].start,result.major[0].end,result.major[0].days,result.major[0].until],['2026-12-05','2026-12-08',4,23]);
 assert.deepEqual([result.weekends[0].start,result.weekends[0].end,result.weekends[0].days],['2026-11-14','2026-11-15',2]);
 const christmas=result.major.find(p=>p.keys.includes('natale'));assert.deepEqual([christmas.start,christmas.end,christmas.days],['2026-12-23','2027-01-07',16]);
 const easter=result.major.find(p=>p.keys.includes('pasqua'));assert.deepEqual([easter.start,easter.end,easter.days],['2027-03-25','2027-03-30',6]);
 assert.ok(result.major.some(p=>/Madonna della Lettera/.test(p.name)));assert.ok(result.major.every(p=>p.sources.length));
});

test('Natale, Pasqua e patrona chiudono le lezioni, senza inventare ponti',()=>{
 for(const date of ['2026-12-07','2026-12-24','2027-01-07','2027-03-25','2027-06-03'])assert.equal(dayPlan(data.timetable,date,[]).lessons.length,0,date);
 for(const date of ['2026-12-09','2027-01-08','2027-03-31','2027-06-04'])assert.ok(dayPlan(data.timetable,date,[]).lessons.length>0,date);
 assert.equal(breakInfo('2027-05-15').kind,'weekend');assert.ok(!calendarPeriods().some(p=>p.key==='autonomia'));
 assert.equal(breakInfo('2026-12-25').label,'Natale');assert.equal(breakInfo('2027-01-06').label,'Epifania');
 assert.equal(dayPlan(data.timetable,'2027-06-10',[]).lessons.length,0);
});

test('una circolare sul periodo natalizio può adattare il calendario regionale',()=>{
 const override={start:'2026-12-23',end:'2027-01-06',title:'Vacanze di Natale: rettifica del calendario',url:'https://example.com/circolare',number:'400'};
 const timetable={...data.timetable,schoolBreaks:[override]};
 assert.equal(breakInfo('2026-12-24',[override]).kind,'circular');assert.equal(breakInfo('2026-12-24',[override]).url,override.url);
 assert.equal(breakInfo('2027-01-07',[override]),null);assert.ok(dayPlan(timetable,'2027-01-07',[]).lessons.length>0);
});
