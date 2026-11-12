import fs from 'node:fs/promises';import {build} from 'esbuild';
const result=await build({entryPoints:['lib/timetable-core.mjs'],bundle:true,format:'iife',globalName:'QuintaJSchedule',write:false,minify:true,target:'es2022'});
await fs.writeFile('schedule.js',result.outputFiles[0].text);await fs.mkdir('_site',{recursive:true});
for(const file of ['index.html','readability.css','night.css','appearance.js','personal-agenda.js','data.json','schedule.js','sw.js','manifest.webmanifest','.nojekyll'])await fs.copyFile(file,'_site/'+file);
for(const size of [192,512])await fs.copyFile('assets/icon-'+size+'.png','_site/icon-'+size+'.png');
await fs.cp('assets/scenes','_site/assets/scenes',{recursive:true});
console.log('Static Pages bundle ready');
