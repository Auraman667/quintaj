// Ripara il testo estratto dai PDF: parole spezzate ("N azionale", "isc ritti"),
// numeri e date con spazi ("202 6", "16 /1 1 /2026"), spazi prima della punteggiatura.
const LETTER = 'A-Za-zÀ-ÖØ-öø-ÿ';
const wordRe = new RegExp(`[${LETTER}]+`, 'g');
// Parole brevi italiane vere: non vanno incollate alla parola vicina se anche l'altra è vera.
const SHORT = new Set('a e è i o ad al ai da di in il lo la le gli un uno una con su per tra fra del dal nel sul col che chi non ne ci si mi ti vi se ma ed od tu io lui lei noi voi ora ore via sub pre post ex vs n p s'.split(' ').filter(w => w.length > 1 || 'aeèio'.includes(w)));

let corpus = new Map();
export function buildVocabulary(texts) {
  const counts = new Map();
  for (const t of texts) for (const w of String(t || '').normalize('NFKC').toLowerCase().match(wordRe) || []) counts.set(w, (counts.get(w) || 0) + 1);
  return counts;
}
export function useVocabulary(counts) { corpus = counts || new Map(); }

function joinFragments(text, vocab) {
  const count = w => (vocab.get(w) || 0) + (corpus.get(w) || 0);
  const real = w => { const l = w.toLowerCase(); return SHORT.has(l) || (l.length >= 3 && count(l) >= 3); };
  // token: parola o separatore
  const parts = text.split(new RegExp(`([${LETTER}]+)`));
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (i % 2 === 0) { out.push(p); continue; }
    // prova a unire fino a 3 pezzi separati da un solo spazio
    let merged = null;
    for (const n of [3, 2]) {
      const pieces = [p];
      let ok = true;
      for (let k = 1; k < n; k++) { if (parts[i + 2 * k - 1] !== ' ' || !parts[i + 2 * k]) { ok = false; break; } pieces.push(parts[i + 2 * k]); }
      if (!ok) continue;
      const joined = pieces.join('');
      const lower = joined.toLowerCase();
      if (joined.length < 4 || count(lower) < 2) continue;
      if (pieces.every(real)) continue;
      // non unire una sigla di classe o un numero romano ("V C", "I K")
      if (pieces.every(x => x.length === 1)) continue;
      merged = { joined, n }; break;
    }
    if (merged) { out.push(merged.joined); i += 2 * (merged.n - 1); }
    else out.push(p);
  }
  return out.join('');
}

function fixNumbers(s) {
  // anni spezzati: "202 6" → "2026"
  s = s.replace(/\b(20\d) (\d)\b/g, '$1$2').replace(/\b(2) (0\d\d)\b/g, '$1$2');
  // date spezzate: "16 /1 1 /2026", "18/ 11 /202 6"
  s = s.replace(/\b\d[\d ]{0,3}[\/.] ?\d[\d ]{0,3}[\/.] ?\d{2,4}\b/g, m => {
    const t = m.replace(/ /g, '');
    return /^\d{1,2}[\/.]\d{1,2}[\/.](?:\d{2}|\d{4})$/.test(t) ? t : m;
  });
  // orari: "9 :30", "9: 30", "9 . 30" dopo "ore"
  s = s.replace(/\b(ore\s+)(\d{1,2}) ?([:.]) ?(\d{2})\b/gi, '$1$2$3$4').replace(/\b(\d{1,2}) ?: ?(\d{2})\b/g, '$1:$2');
  return s;
}

function fixPunctuation(s) {
  return s
    .replace(/\s+([,.;:!?)\]»”])/g, '$1')
    .replace(/([(\[«“])\s+/g, '$1')
    .replace(new RegExp(`([${LETTER}])\\s*['’]\\s*([${LETTER}])`, 'g'), '$1’$2')
    .replace(/\s*@\s*/g, '@')
    .replace(/(@[\w.-]+)\.\s+(it|com|org|net|gov|eu)\b/gi, '$1.$2')
    .replace(/(https?:\/\/\S+)\s+\/(?=\S)/g, '$1/')
    .replace(/,(?=[A-Za-zÀ-ÿ])/g, ', ')
    .replace(/ {2,}/g, ' ');
}

export function repairText(text, vocab = new Map()) {
  let s = String(text || '').normalize('NFKC').replace(/[ \t]+/g, ' ').replace(/ {2,}/g, ' ');
  s = s.replace(/(\w)-\n(\w)/g, '$1$2');
  s = s.split('\n').map(line => fixPunctuation(fixNumbers(joinFragments(line.trim(), vocab)))).join('\n');
  return s;
}
