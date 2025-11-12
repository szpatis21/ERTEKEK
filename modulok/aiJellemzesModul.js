const express = require('express');
const router = express.Router();

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
  const vals = kategoriak.map(x => x.atlag).sort((a,b)=>a-b);
  const n = vals.length;
  const avg = Math.round(vals.reduce((s,v)=>s+v,0)/n);
  const med = n % 2 ? vals[(n-1)/2] : Math.round((vals[n/2-1]+vals[n/2])/2);
  const variance = vals.reduce((s,v)=>s + (v-avg)*(v-avg), 0) / n;
  const std = Math.round(Math.sqrt(variance));
  const sorted = [...kategoriak].sort((a,b)=>b.atlag - a.atlag);
  const top3 = sorted.slice(0,3).map(x=>x.nev);
  const bottom3 = [...sorted].reverse().slice(0,3).map(x=>x.nev);
  return {
    meta: { minta_megnevezes: 'Aggregált szöveg' },
    osszegzes: { atlag: avg, median: med, szoras: std },
    kategoriak,
    top3,
    bottom3
  };
}
function parseDataFromJSON(jsonData) {
  const kategoriak = [];
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Érvénytelen JSON adat.');
  }

  for (const [foNev, foData] of Object.entries(jsonData)) {
    const atlag = foData['%'];
    if (typeof atlag === 'number' && !isNaN(atlag)) {
      kategoriak.push({ nev: foNev, atlag: atlag });
    }
  }

  if (kategoriak.length < 3) {
    throw new Error('Nem találhatók értelmezhető kategóriák (min. 3).');
  }

  // Statisztikák számítása (a parseSimpleText-ből átemelve)
  const vals = kategoriak.map(x => x.atlag).sort((a,b)=>a-b);
  const n = vals.length;
  const avg = Math.round(vals.reduce((s,v)=>s+v,0)/n);
  const med = n % 2 ? vals[(n-1)/2] : Math.round((vals[n/2-1]+vals[n/2])/2);
  const variance = vals.reduce((s,v)=>s + (v-avg)*(v-avg), 0) / n;
  const std = Math.round(Math.sqrt(variance));
  const sorted = [...kategoriak].sort((a,b)=>b.atlag - a.atlag);
  const top3 = sorted.slice(0,3).map(x=>x.nev);
  const bottom3 = [...sorted].reverse().slice(0,3).map(x=>x.nev);

  return {
    osszegzes: { atlag: avg, median: med, szoras: std },
    kategoriak, // pl. [{nev: "Kategória 1", atlag: 80}, ...]
    top3,      // pl. ["Kategória 1", "Kategória 2"]
    bottom3    // pl. ["Kategória 5", "Kategória 4"]
  };
}
module.exports = (db) => {

  router.post('/generate/jellemzes-from-text', async (req, res) => {
    try {
      const raw = String(req.body?.raw ?? '');
      const modulId = req.body?.modulId;

      if (raw.length < 10) {
        return res.status(400).json({ success:false, message:'Hiányzik egy vagy több elemezendő adat.' });
      }
      if (!modulId) {
        return res.status(400).json({ success:false, message:'Hiányzik a szakmai útmutató).' });
      }
      
      let holvagyok = '';
      try {
        const [modulok] = await db.promise().query('SELECT ai_kontextus FROM modulok WHERE id = ?', [modulId]);
        if (modulok && modulok.length > 0) {
          holvagyok = String(modulok[0].ai_kontextus || '').trim();
        }
      } catch (dbErr) {
        console.error('Adatbázis hiba (kontextus lekérdezés):', dbErr);
        return res.status(500).json({ success: false, message: 'Adatbázis hiba a modul szabályainak betöltése közben.' });
      }

      const payload = parseSimpleText(raw);


      const messages = [
        { 
          role: 'system', content: 
            `Magyar nyelvű jellemzést, értékelést készítesz ügyelve a helyesírási szabályok betartására.
            ${holvagyok ? `adott irányelvek: ${holvagyok}` : ''}`
        },
        { 
          role: 'user', content:
          `Készíts max 450 szavas, csoportszintű, összegző értékelést (esszét), majd 4 db cselekvésorientált fejlesztési javaslatot a kapott adatok alapján.
            
            Adatok:
            Átlag: ${payload.osszegzes.atlag}%, Medián: ${payload.osszegzes.median}%, Szórás: ${payload.osszegzes.szoras}
            TOP3: ${payload.top3.join(', ')}
            BOTTOM3: ${payload.bottom3.join(', ')}
            Kategóriák: ${payload.kategoriak.map(k=>`${k.nev} ${k.atlag}%`).join(' | ')}
            - Formátum: Kezdés az esszével. Az esszé után új sor "Javaslatok". Ezután a 4 db javaslat "* " jellel.
            - Hangvétel: pedagógiai, E/3.
            - Bemenet: több értékelés, statisztikai adatai.
            - Kimenet: max 450 szavas csoportos értékelés, beszámoló adott időszakra.
            - Kerülendő: száraz adatok, számadatok kíírása, szleng használata.
            - Kiemelendő: a legjobb és a fejlesztendő kategóriák és alkatagóriák.
            - Elvárás: Magyar helyesírási szabályok betartása.
        ` 
        }
      ];

      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), 60_000);
      let openaiResponse;
      try {
        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-5-mini', 
            messages,
            stream: true, 
          }),
          signal: ctl.signal
        });
      } catch (e) {
        clearTimeout(tm);
        if (e?.name === 'AbortError') {
          return res.status(504).json({ success: false, message: 'Időtullépés (OpenAI).' });
        }
        throw e;
      } finally {
        clearTimeout(tm);
      }
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}));
        return res.status(openaiResponse.status).json({
          success: false,
          message: errorData?.error?.message || 'OpenAI API hiba (stream indításakor)'
        });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

const reader = openaiResponse.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break; // Stream vége
          }
 
          res.write(value);
        }
      } catch (streamErr) {
        console.error('Hiba az OpenAI stream olvasása/továbbítása közben:', streamErr);
      } finally {
        res.end(); 
      }

    } catch (err) {

      res.status(400).json({ success:false, message: String(err?.message ?? err) });
    }
  });

router.post('/generate/jellemzes-from-json', async (req, res) => {
    try {
      const jsonData = req.body?.jsonData ?? null;
      const modulId = req.body?.modulId;

      if (!jsonData) {
        return res.status(400).json({ success:false, message:'Hiányzó elemzési adat (JSON).' });
      }
      if (!modulId) {
        return res.status(400).json({ success:false, message:'Hiányzó szakmai útmutató (modulId).' });
      }
      
      let holvagyok = '';
      try {
        const [modulok] = await db.promise().query('SELECT ai_kontextus FROM modulok WHERE id = ?', [modulId]);
        if (modulok && modulok.length > 0) {
          holvagyok = String(modulok[0].ai_kontextus || '').trim();
        }
      } catch (dbErr) {
         return res.status(500).json({ success: false, message: 'Adatbázis hiba a modul szabályainak betöltése közben.' });
      }

      const payload = parseDataFromJSON(jsonData);

      const messages = [
        { 
          role: 'system', content: 
            `Magyar nyelvű enyéni jellemzést, értékelést készítesz ügyelve a helyesírási szabályok betartására.
            ${holvagyok ? `adott irányelvek: ${holvagyok}` : ''}`
        },
        { 
          role: 'user', content:
          `Készíts max 450 szavas, egyéni, összegző értékelést (esszét), majd 4 db cselekvésorientált fejlesztési javaslatot a kapott adatok alapján.
            
            Adatok:
            Átlag: ${payload.osszegzes.atlag}%, Medián: ${payload.osszegzes.median}%, Szórás: ${payload.osszegzes.szoras}
            TOP3: ${payload.top3.join(', ')}
            BOTTOM3: ${payload.bottom3.join(', ')}
            Kategóriák: ${payload.kategoriak.map(k=>`${k.nev} ${k.atlag}%`).join(' | ')}
            - Formátum: Kezdés az esszével. Az esszé után új sor "Javaslatok". Ezután a 3 db javaslat "* " jellel.
            - Hangvétel: pedagógia, támogató, E/3.
            - Bemenet: egyetlen értékelés statisztikai adatai.
            - Kimenet: max 450 szavas egyéni értékelés.
            - Kerülendő: száraz adatok, számadatok kíírása, szleng használata.
            - Kiemelendő: a legjobb és a fejlesztendő kategóriák.
            - Elvárás: Magyar helyesírási szabályok betartása.
        ` 
        }
      ];

      const ctl = new AbortController();
      const tm = setTimeout(() => ctl.abort(), 60_000);
      let openaiResponse;
      try {
        openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-5-mini', 
            messages,
            stream: true, 
          }),
          signal: ctl.signal
        });
      } catch (e) {
        clearTimeout(tm);
        if (e?.name === 'AbortError') {
          return res.status(504).json({ success: false, message: 'Időtullépés (OpenAI).' });
        }
        throw e;
      } finally {
        clearTimeout(tm);
      }
      
      if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}));
        return res.status(openaiResponse.status).json({
          success: false,
          message: errorData?.error?.message || 'OpenAI API hiba (stream indításakor)'
        });
      }

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });

const reader = openaiResponse.body.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break; // Stream vége
          }
 
          res.write(value);
        }
      } catch (streamErr) {
        console.error('Hiba az OpenAI stream olvasása/továbbítása közben:', streamErr);
      } finally {
        res.end(); 
      }
    } catch (err) {
      res.status(400).json({ success:false, message: String(err?.message ?? err) });
    }
  });

  return router;
};