const express = require('express');
const router = express.Router();
const fs = require('fs').promises; 
const path = require('path');      

// --- 1. SEGÉDFÜGGVÉNY: Statisztikai számítások ---
function calculateStatistics(kategoriak) {
  const vals = kategoriak.map(x => x.atlag).sort((a,b) => a-b);
  const n = vals.length;
  const avg = Math.round(vals.reduce((s,v) => s+v, 0) / n);
  const med = n % 2 ? vals[(n-1)/2] : Math.round((vals[n/2-1]+vals[n/2])/2);
  const variance = vals.reduce((s,v) => s + (v-avg)*(v-avg), 0) / n;
  const std = Math.round(Math.sqrt(variance));
  const sorted = [...kategoriak].sort((a,b) => b.atlag - a.atlag);
  const top3 = sorted.slice(0,3).map(x => x.nev);
  const bottom3 = [...sorted].reverse().slice(0,3).map(x => x.nev);

  return {
    osszegzes: { atlag: avg, median: med, szoras: std },
    kategoriak,
    top3,
    bottom3
  };
}

// --- 2. SEGÉDFÜGGVÉNY: Szöveg feldolgozása ---
function parseSimpleText(raw) {
  const lines = String(raw).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const catRegexes = [
    /^(?<nev>.+?)\s*[:\-–]\s*(?<pct>\d{1,3})\s*%$/,
    /^(?<nev>.+?)\s+(?<pct>\d{1,3})\s*%$/,
    /^-?\s*(?<nev>.+?)\s*\(?\s*(?<pct>\d{1,3})\s*%\s*\)?$/
  ];
  const kategoriak = [];
  
  for (const line of lines) {
    for (const rx of catRegexes) {
      const m = line.match(rx);
      if (m?.groups) {
        const nev = m.groups.nev.replace(/\s+/g, ' ').trim();
        const atlag = Math.max(0, Math.min(100, Number(m.groups.pct)));
        if (nev && Number.isFinite(atlag)) kategoriak.push({ nev, atlag });
        break;
      }
    }
  }
  
  if (kategoriak.length < 3) throw new Error('Nem találhatók értelmezhető kategóriák (min. 3).');
  
  const stats = calculateStatistics(kategoriak);
  return { meta: { minta_megnevezes: 'Aggregált szöveg' }, ...stats };
}

// --- 3. SEGÉDFÜGGVÉNY: JSON adat feldolgozása ---
function parseDataFromJSON(jsonData) {
  const kategoriak = [];
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Érvénytelen JSON adat.');
  }

  for (const [foNev, foData] of Object.entries(jsonData)) {
    const atlag = foData['pct'] !== undefined ? foData['pct'] : foData['%'];
    if (typeof atlag === 'number' && !isNaN(atlag)) {
      kategoriak.push({ nev: foNev, atlag: atlag });
    }
  }

  if (kategoriak.length < 3) {
    throw new Error('Nem találhatók értelmezhető kategóriák (min. 3). Vagy a felhasználó túl kevés adatot töltött ki.');
  }

  return calculateStatistics(kategoriak);
}

// --- 4. SEGÉDFÜGGVÉNY: Szakmai kontextus betöltése adatbázisból és/vagy fájlból ---
// --- 4. SEGÉDFÜGGVÉNY: Szakmai kontextus betöltése adatbázisból és/vagy fájlból ---
async function getModuleContext(db, modulId, isEgyeni = false) {
  let holvagyok = '';
  let modulNev = '';
  let szakmaiAnyagSzoveg = '';
  let szerep = '';
  let vizsgaltTargy = ''; 
  let promptJellemzes = '';
  let promptFejlesztes = '';
  let promptErtekeles = '';

  // Lekérjük a 3 új prompt oszlopot is
  const [modulok] = await db.promise().query(
      'SELECT nev, ai_kontextus, szerep, vizsgalt_targy, prompt_jellemzes, prompt_fejlesztes, prompt_ertekeles FROM modulok WHERE id = ?', 
      [modulId]
  );
  
  if (modulok && modulok.length > 0) {
    holvagyok = String(modulok[0].ai_kontextus || '').trim();
    modulNev = String(modulok[0].nev || '').trim();
    szerep = String(modulok[0].szerep || '').trim();
    vizsgaltTargy = String(modulok[0].vizsgalt_targy || '').trim();
    promptJellemzes = String(modulok[0].prompt_jellemzes || '').trim();
    promptFejlesztes = String(modulok[0].prompt_fejlesztes || '').trim();
    promptErtekeles = String(modulok[0].prompt_ertekeles || '').trim();
  }

  // ALAPÉRTELMEZETT SZEREP
  if (!szerep) {
      szerep = 'Szakértő értékelő vagy. Tárgyilagos, szakszerű és hivatalos szakmai nyelvezetet használj.';
  }

  // ALAPÉRTELMEZETT VIZSGÁLT TÁRGY (Univerzális fallback)
  if (!vizsgaltTargy) {
      vizsgaltTargy = isEgyeni 
        ? 'az elemzett adathalmazról' 
        : 'az elemzett adathalmazok összességéről';
  }

if (!holvagyok && modulNev) {
    try {
      // Visszaállítva a te működő útvonaladra:
      const filePath = path.join(__dirname, 'szakmai anyag', `${modulNev}.txt`);
      szakmaiAnyagSzoveg = await fs.readFile(filePath, 'utf-8');
    } catch (fileErr) {
      console.warn(`[AI Modul] Nem található szakmai txt fájl ehhez: ${modulNev}`);
    }
  }
  const txtPromptResz = szakmaiAnyagSzoveg 
    ? `\nAZ ALÁBBI HIVATALOS DOKUMENTUM ALAPJÁN ÉRTÉKELJ, ÉS HASZNÁLD AZ ITT SZEREPLŐ TERMINOLÓGIÁT:\n"""\n${szakmaiAnyagSzoveg}\n"""\n` 
    : '';

  const alapSzoveg = `Általános szakmai értékelést készítesz ${vizsgaltTargy} a kapott adatok alapján.`;
  const baseKontextus = holvagyok ? holvagyok : alapSzoveg;

  return { 
      txtPromptResz, 
      baseKontextus, 
      szerep, 
      vizsgaltTargy, 
      promptJellemzes, 
      promptFejlesztes, 
      promptErtekeles 
  };
}

// --- 5. SEGÉDFÜGGVÉNY: AI Hívás, újrapróbálkozás, modellváltás és Stream ---
async function handleGeminiStream(messages, res, temperature = 1.0) {
  // Első próbálkozás beállításai
  let currentModel = 'gemini-3.1-flash-lite-preview';
  let isFallback = false;
  
  // A teljes folyamat timeoutja (90 másodperc)
  const masterCtl = new AbortController();
  const masterTm = setTimeout(() => masterCtl.abort(), 90_000); 

  let openaiResponse;
  
  try {
    // === 1. PRÓBÁLKOZÁS: gemini-3.1-flash-lite-preview (13 mp timeout) ===
    const attempt1Ctl = new AbortController();
    const attempt1Tm = setTimeout(() => attempt1Ctl.abort(), 15_000); // 15 másodperc

    try {
/*        console.log(`[AI Modul] Indítás: ${currentModel}`);
 */      openaiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: currentModel, 
          messages,
          stream: true,
          temperature 
        }),
        signal: attempt1Ctl.signal 
      });
      clearTimeout(attempt1Tm);
/*        console.log(`[AI Modul] API Válasz kód: ${openaiResponse.status}`); 
 */      // Ha az első hívás oké, de szerver hibát dob (503, 429), azt úgy kezeljük, mintha timeout lett volna
      if (!openaiResponse.ok && (openaiResponse.status === 503 || openaiResponse.status === 429)) {
          throw new Error('API Overloaded'); 
      }

    } catch (err) {
      clearTimeout(attempt1Tm);
      // Ha AbortError (13mp timeout) vagy szerverhiba, akkor váltunk a 2.5-re
      if (err.name === 'AbortError' || err.message === 'API Overloaded') {
/*                  console.warn(`[AI Modul] ${currentModel} nem válaszolt időben vagy túlterhelt. Váltás gemini-2.5-flash-lite-ra...`);
 */     isFallback = true;
      } else {
        throw err; // Más jellegű hiba esetén kidobjuk (pl. network error)
      }
    }

    // === 2. PRÓBÁLKOZÁS (FALLBACK): gemini-2.5-flash-lite ===
    if (isFallback) {
      currentModel = 'gemini-2.5-flash-lite';
      
      // Fejléc és stream indítása a kliens felé, hogy ki tudjuk küldeni a "Modellváltás" jelzést
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
      // Küldünk egy speciális kommentet a streamen, amit a frontend fel tud dolgozni
      res.write(': MODEL_CHANGE\n\n'); 

      const maxRetries = 3; 
      let delay = 1500; 

      for (let attempt = 0; attempt < maxRetries; attempt++) {
/*         console.log(`[AI Modul] Indítás (Fallback): ${currentModel}, Próbálkozás: ${attempt + 1}`);
 */        openaiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: currentModel, 
            messages,
            stream: true,
            temperature 
          }),
          signal: masterCtl.signal 
        });

        if (openaiResponse.ok) break;

        if (openaiResponse.status === 503 || openaiResponse.status === 429) {
/*           console.warn(`[AI Modul] Gemini API túlterhelt (${openaiResponse.status}). Újrapróbálkozás ${attempt + 1}/${maxRetries}...`);
 */          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; 
          }
        } else {
          break; 
        }
      }
    }

    // HA A STREAM MÉG NINCS MEGNYITVA (Mert az első modell sikeres volt)
    if (!res.headersSent) {
        if (!openaiResponse || !openaiResponse.ok) {
            const errStatus = openaiResponse ? openaiResponse.status : 500;
            console.error('[AI Modul] Gemini API hiba.');
            return res.status(errStatus).json({ success: false, message: 'API Hiba, a rendszer jelenleg túlterhelt.' });
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' });
    }

    // STREAM OLVASÁSA ÉS KÜLDÉSE A KLIENSNEK
    if (openaiResponse && openaiResponse.ok && openaiResponse.body) {
        const reader = openaiResponse.body.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        } catch (streamErr) {
          console.error('[AI Modul] Stream hiba:', streamErr);
        } finally { 
          res.end(); 
        }
    } else {
       res.end();
    }

  } catch (e) {
    if (e?.name === 'AbortError') {
        if (!res.headersSent) return res.status(504).json({ success: false, message: 'Időtullépés.' });
        else res.end();
    } else {
        throw e;
    }
  } finally {
    clearTimeout(masterTm);
  }
}
// --- 6. SEGÉDFÜGGVÉNY: Rendszer prompt generátor ---
function buildSystemPrompt(szerep, baseKontextus, txtPromptResz, extraSzabalyok) {
  return `${szerep}
          
KÖTELEZŐ SZAKMAI KONTEXTUS ÉS CÉLCSOPORT:
${baseKontextus}
${txtPromptResz}
          
SZIGORÚ FORMAI ÉS TARTALMI SZABÁLYOK:
1. TILOS bármilyen felvezető mondat, CÍM, dokumentum megnevezés vagy megszólítás a szöveg legelején! SZIGORÚAN azonnal a tartalom első bekezdésével kell indítanod!
2. SZIGORÚAN TILOS számokat, százalékjeleket (%), pontszámokat a szövegbe írni! A számokat minőségi jelzőkkel helyettesítsd.
3. Szigorúan E/3. személyben fogalmazz.
4. A dokumentumnak részletesnek és kifejtősnek kell lennie (legalább 1 A4-es oldal).
${extraSzabalyok}`;
}
module.exports = (db) => {

  // --- CSOPORTOS JELLEMZÉS ---
  router.post('/generate/jellemzes-from-text', async (req, res) => {
    try {
      const raw = String(req.body?.raw ?? '');
      const egyeniAdatok = String(req.body?.egyeniAdatok ?? '');
      const modulId = req.body?.modulId;

      if (raw.length < 10 || !modulId) {
        return res.status(400).json({ success:false, message:'Hiányzik az elemzendő adat vagy a modulId.' });
      }

      // Itt nincs true paraméter, mert ez a csoportos végpont
 const { txtPromptResz, baseKontextus, szerep } = await getModuleContext(db, modulId);
      const payload = parseSimpleText(raw);

      const messages = [
        { 
          role: 'system', 
          content: buildSystemPrompt(
            szerep, 
            baseKontextus, 
            txtPromptResz, 
            '4. Készíts egy csoportszintű értékelést, amelyben kitérsz az általános tendenciákra, majd az átadott "EGYÉNI KIEMELÉSEK" alapján név szerint említsd meg a kiugró teljesítményeket és a fejlesztendő területeket.'
          )
        },
        { 
          role: 'user', content:
          `ADATOK AZ ELEMZÉSHEZ:
          - Statisztikai összefoglaló: Átlag: ${payload.osszegzes.atlag}%, Medián: ${payload.osszegzes.median}%
          - Kiemelt területek: Legjobbak: ${payload.top3.join(', ')} | Fejlesztendők: ${payload.bottom3.join(', ')}
          
          - EGYÉNI KIEMELÉSEK:
          ${egyeniAdatok}

          FELADAT ÉS FORMAI KÖVETELMÉNYEK:
          1. Írj egy összefüggő esszét a fentiek alapján.
          2. Az esszé után hagyj ki egy sort, majd írd be ezt a címsort: ### Fejlesztési javaslatok
          3. A címsor alá írj 4 db konkrét, a vizsgált elem egészére és a kritikus pontokra fókuszáló javaslatot, csillaggal (-) listázva.` 
        }
      ];
      await handleGeminiStream(messages, res);

    } catch (err) {
      if (!res.headersSent) {
        res.status(400).json({ success:false, message: String(err?.message ?? err) });
      }
    }
  });

// --- EGYÉNI JELLEMZÉS (Fejlesztési terv generáló) ---
  router.post('/generate/jellemzes-from-json', async (req, res) => {
    try {
      const jsonData = req.body?.jsonData ?? null;
      const modulId = req.body?.modulId;

      if (!jsonData || !modulId) {
        return res.status(400).json({ success:false, message:'Hiányzó elemzési adat (JSON) vagy modulId.' });
      }
      
      const { txtPromptResz, baseKontextus, szerep, promptFejlesztes } = await getModuleContext(db, modulId, true);
      const payload = parseDataFromJSON(jsonData.statisztika);

      let veglegesFeladat = promptFejlesztes;

      const messages = [
        { 
          role: 'system', 
          content: buildSystemPrompt(
            szerep, 
            baseKontextus, 
            txtPromptResz, 
            ` 4. SZIGORÚAN TILOS csoportra vagy többes számra utaló szavakat használni.`
          )
        },
        { 
          role: 'user', content:
          `ADATOK AZ ELEMZÉSHEZ:
          - Erős területek (szintentartáshoz): ${payload.top3.join(', ')}
          - Fejlesztendő területek (javításhoz): ${payload.bottom3.join(', ')}
          
          - NYERS RÉSZLETES ADATOK:
          ${JSON.stringify(jsonData.nyersValaszok)}
          
          - SZÖVEGES MEGFIGYELÉSEK:
          ${JSON.stringify(jsonData.megjegyzesek)}

          FELADAT:
          ${veglegesFeladat}
          
          FORMÁZÁSI UTASÍTÁSOK:
          1. A helyzetértékelés 2-3 bekezdés hosszú legyen.
          2. A helyzetértékelés után hagyj ki egy sort, és használd ezt a címsort: ### Célzott fejlesztési területek és módszerek
          3. A fejlesztési ötleteket Markdown felsorolásként (- jellel) formázd.` 
        }
      ];

      await handleGeminiStream(messages, res, 0.7); 

    } catch (err) {
      if (!res.headersSent) {
        res.status(400).json({ success:false, message: String(err?.message ?? err) });
      }
    }
  });

  // --- EGYÉNI: JELLEMZÉS (Minden kategória, javaslatok nélkül) ---
  router.post('/generate/jellemzes-detailed', async (req, res) => {
    try {
      const jsonData = req.body?.jsonData ?? null;
      const modulId = req.body?.modulId;

      if (!jsonData || !modulId) {
        return res.status(400).json({ success:false, message:'Hiányzó elemzési adat (JSON) vagy modulId.' });
      }
      
      const { txtPromptResz, baseKontextus, szerep, promptJellemzes } = await getModuleContext(db, modulId, true);
      const payload = parseDataFromJSON(jsonData.statisztika);
      
      const mindenKategoria = payload.kategoriak.map(k => k.nev).join(', ');
      let veglegesFeladat = promptJellemzes; 

      const messages = [
        { 
          role: 'system', 
          content: buildSystemPrompt(
            szerep, 
            baseKontextus, 
            txtPromptResz, 
            `4. TILOS konkrét fejlesztési feladatokat vagy javaslatokat írni a szöveg végére.`
          )
        },
        { 
          role: 'user', content:
          `ADATOK AZ ELEMZÉSHEZ:
          - Összes vizsgált terület: ${mindenKategoria}
          - Kiemelt területek (Erősségek): ${payload.top3.join(', ')}
          - Fejlesztendő területek (Gyengeségek): ${payload.bottom3.join(', ')}
          
          - NYERS RÉSZLETES ADATOK:
          ${JSON.stringify(jsonData.nyersValaszok)}
          
          - SZÖVEGES MEGFIGYELÉSEK:
          ${JSON.stringify(jsonData.megjegyzesek)}

          FELADAT:
          ${veglegesFeladat}` 
        }
      ];
      await handleGeminiStream(messages, res, 0.7); 

    } catch (err) {
      if (!res.headersSent) {
        res.status(400).json({ success:false, message: String(err?.message ?? err) });
      }
    }
  });

  // --- EGYÉNI: ÉRTÉKELÉS (Eredményfókuszú, kiemelő megállapítások) ---
  router.post('/generate/ertekeles-evaluation', async (req, res) => {
    try {
      const jsonData = req.body?.jsonData ?? null;
      const modulId = req.body?.modulId;

      if (!jsonData || !modulId) {
        return res.status(400).json({ success:false, message:'Hiányzó elemzési adat (JSON) vagy modulId.' });
      }
      
      const { txtPromptResz, baseKontextus, szerep, promptErtekeles } = await getModuleContext(db, modulId, true);
      parseDataFromJSON(jsonData.statisztika); 

      let veglegesFeladat = promptErtekeles; 

      const messages = [
        { 
          role: 'system', 
          content: buildSystemPrompt(
            szerep, 
            baseKontextus, 
            txtPromptResz, 
            `4. A feladatod a kapott nyers adatok összefüggő, folyékony szöveggé formálása kategóriánként.
             5. SZIGORÚAN TILOS listákat vagy felsorolásokat (pl. kötőjeleket, csillagokat) használni! Minden kategóriát egybefüggő bekezdésként írj meg.
             6. Csak és kizárólag a megadott tényeket használd fel, fűzd őket logikus mondatokká, de ne találj ki extra információkat vagy fejlesztési javaslatokat.`
          )
        },
        { 
          role: 'user', content:
          `ADATOK AZ ELEMZÉSHEZ (A felhasználó által bejelölt állítások hierarchikus szövege):
          ${jsonData.strukturatSzoveg || JSON.stringify(jsonData.nyersValaszok)}

          FELADAT:
          ${veglegesFeladat}
          
          FORMÁZÁSI UTASÍTÁSOK:
          1. Minden főkategóriát írj ki narancssárga alcímként (### [Főkategória neve] formázással).
          2. Az alcímek alatt egybefüggő, folyamatos szöveget használj, tilos a lista és a felsorolás!` 
        }
      ];

      await handleGeminiStream(messages, res, 0.7); 

    } catch (err) {
      if (!res.headersSent) {
        res.status(400).json({ success:false, message: String(err?.message ?? err) });
      }
    }
  });



  return router;
};