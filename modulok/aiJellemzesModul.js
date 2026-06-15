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
function pickNumericPercent(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value === 'string') {
    const normalized = value.replace(',', '.').replace('%', '').trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : null;
  }

  if (!value || typeof value !== 'object') return null;

  const candidateKeys = [
    'pct', '%', 'atlag', 'átlag', 'szazalek', 'százalék',
    'ertek', 'érték', 'value', 'score', 'ossz_ertek'
  ];

  for (const key of candidateKeys) {
    if (value[key] !== undefined && value[key] !== null) {
      const found = pickNumericPercent(value[key]);
      if (found !== null) return found;
    }
  }

  return null;
}

function pickCategoryName(value, fallbackName = '') {
  if (!value || typeof value !== 'object') return String(fallbackName || '').trim();

  const candidateKeys = [
    'nev', 'név', 'name', 'category', 'kategoria', 'kategória',
    'fo_kategoria', 'foKategoria', 'label', 'title'
  ];

  for (const key of candidateKeys) {
    if (value[key] !== undefined && value[key] !== null && String(value[key]).trim()) {
      return String(value[key]).trim();
    }
  }

  return String(fallbackName || '').trim();
}

function normalizeCategoryRows(input) {
  const kategoriak = [];

  if (!input || typeof input !== 'object') return kategoriak;

  if (Array.isArray(input)) {
    for (const item of input) {
      const atlag = pickNumericPercent(item);
      const nev = pickCategoryName(item);

      if (nev && atlag !== null) {
        kategoriak.push({
          nev,
          atlag: Math.max(0, Math.min(100, Number(atlag)))
        });
      }
    }

    return kategoriak;
  }

  for (const [foNev, foData] of Object.entries(input)) {
    if (foData && typeof foData === 'object' && Array.isArray(foData.kategoriak)) {
      kategoriak.push(...normalizeCategoryRows(foData.kategoriak));
      continue;
    }

    const atlag = pickNumericPercent(foData);
    const nev = pickCategoryName(foData, foNev);

    if (nev && atlag !== null) {
      kategoriak.push({
        nev,
        atlag: Math.max(0, Math.min(100, Number(atlag)))
      });
    }
  }

  return kategoriak;
}

function getStatsInputForAi(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') return null;

  return jsonData.statisztika
    || jsonData.szazalek
    || jsonData.százalék
    || jsonData.kategoriak
    || jsonData.categories
    || jsonData;
}

// --- 3. SEGÉDFÜGGVÉNY: JSON adat feldolgozása ---
function parseDataFromJSON(jsonData) {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('Érvénytelen JSON adat.');
  }

  const kategoriak = normalizeCategoryRows(jsonData);

  if (kategoriak.length < 3) {
    throw new Error('Nem találhatók értelmezhető kategóriák (min. 3). Vagy a felhasználó túl kevés adatot töltött ki.');
  }

  return calculateStatistics(kategoriak);
}


function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function sanitizeModuleFilename(value) {
  return String(value || 'modul')
    .replace(/[\\/]/g, '_')
    .replace(/\.\.+/g, '.')
    .replace(/[<>:"|?*]/g, '_')
    .trim() || 'modul';
}

function redactAiString(value) {
  return String(value ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email törölve]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[telefonszám törölve]')
    .replace(/\b(?:név|nev|vizsgált személy neve|vizsgalt szemely neve|alany neve)\s*[:：-]\s*[^\n;,.]+/gi, match => {
      const sep = match.includes(':') ? ':' : (match.includes('：') ? '：' : '-');
      return match.split(sep)[0] + sep + ' [anonimizálva]';
    });
}

function sanitizeAiPayload(value, depth = 0) {
  if (depth > 6) return '[túl mély adatstruktúra]';
  if (typeof value === 'string') return redactAiString(value);
  if (Array.isArray(value)) return value.map(item => sanitizeAiPayload(item, depth + 1));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      if (/^(nev|név|name|fullname|full_name|vizsgalt_nev|vizsgált_nev|mail|email|tel|telefon)$/i.test(key)) {
        out[key] = '[anonimizálva]';
      } else {
        out[key] = sanitizeAiPayload(item, depth + 1);
      }
    }
    return out;
  }
  return value;
}

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
      const filePath = path.join(__dirname, 'szakmai anyag', `${sanitizeModuleFilename(modulNev)}.txt`);
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

  function getCurrentModulId(req) {
    const modulId = Number(req.auth?.modulId || req.session?.modulId);
    return Number.isInteger(modulId) && modulId > 0 ? modulId : null;
  }

  function getCurrentUserId(req) {
    const userId = Number(req.auth?.userId || req.session?.userId);
    return Number.isInteger(userId) && userId > 0 ? userId : null;
  }

  function getCurrentIntId(req) {
    const intId = Number(req.auth?.intId || req.session?.intId);
    return Number.isInteger(intId) && intId > 0 ? intId : null;
  }

  async function requireAiEnabled(req, res) {
    const intId = getCurrentIntId(req);

    if (!intId) {
      res.status(403).json({
        success: false,
        code: 'AI_INSTITUTION_UNKNOWN',
        message: 'Érvénytelen intézményi jogosultság.'
      });
      return false;
    }

    const [rows] = await db.promise().query(
      'SELECT ai_enabled FROM intezmeny WHERE id = ? LIMIT 1',
      [intId]
    );

    if (!rows.length) {
      res.status(404).json({
        success: false,
        code: 'INSTITUTION_NOT_FOUND',
        message: 'Intézmény nem található.'
      });
      return false;
    }

    if (Number(rows[0].ai_enabled) !== 1) {
      res.status(403).json({
        success: false,
        code: 'AI_NOT_ENABLED',
        message: 'Az MI-funkció nincs engedélyezve ehhez az intézményhez. Kérje a feltöltő/admin jogosultságú felhasználót, hogy a feltöltő modul A.I. fülén engedélyezze.'
      });
      return false;
    }

    return true;
  }

  async function requireAiQuota(req, res) {
    const userId = getCurrentUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Érvénytelen felhasználó.' });
      return false;
    }

    const [rows] = await db.promise().query(
      'SELECT ai_ossz_max FROM felhasznalok WHERE id = ? LIMIT 1',
      [userId]
    );

    if (!rows.length) {
      res.status(401).json({ success: false, message: 'Felhasználó nem található.' });
      return false;
    }

    const remaining = Number(rows[0].ai_ossz_max);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      res.status(403).json({ success: false, message: 'Nincs elérhető AI kereted.' });
      return false;
    }

    return true;
  }

  function getRequestKitoltesIdentifier(req) {
    return req.body?.kitoltesId
      ?? req.body?.kitoltes_id
      ?? req.body?.id
      ?? req.body?.idk
      ?? req.body?.jsonData?.kitoltesId
      ?? req.body?.jsonData?.kitoltes_id
      ?? req.body?.jsonData?.id
      ?? req.body?.jsonData?.idk
      ?? null;
  }

  async function requireOptionalKitoltesAccess(req, res) {
    const rawKitoltesId = getRequestKitoltesIdentifier(req);
    if (rawKitoltesId == null || rawKitoltesId === '') return true;

    const cleanKitoltesId = toPositiveInt(rawKitoltesId);
    const userId = getCurrentUserId(req);
    const modulId = getCurrentModulId(req);
    const roleId = Number(req.auth?.roleId || req.session?.roleId);
    const intId = Number(req.auth?.intId);
    const isSysadmin = req.auth?.isSysadmin === true || Number(req.auth?.realRoleId) === 4;

    if (!cleanKitoltesId || !userId || !modulId) {
      res.status(400).json({ success: false, message: 'Hibás értékelésazonosító.' });
      return false;
    }

    /*
      Fontos kompatibilitás:
      A frontend egyes helyeken kitoltesek.id-t, máshol idk-t küld.
      Ezért mindkettőt elfogadjuk, de csak az aktuális modulban.

      Elemző/feltöltő intézményi olvasási jog:
      Ha az értékelés eredeti tulajdonosa ugyanabban az intézményben van,
      akkor role 1/2 AI-generálást indíthat, akkor is, ha nincs editor sora.
    */
    const [rows] = await db.promise().query(
      `
      SELECT
        target.id,
        target.idk,
        target.felhasznalo_id,
        target.role,
        target.ai_kit_max,
        owner.felhasznalo_id AS owner_user_id,
        owner.ai_kit_max AS owner_ai_kit_max,
        ownerUser.int_id AS owner_int_id
      FROM kitoltesek target
      JOIN kitoltesek owner
        ON owner.idk = target.idk
       AND owner.modul_id = target.modul_id
       AND owner.role IN ('admin', 'sysadmin')
      JOIN felhasznalok ownerUser
        ON ownerUser.id = owner.felhasznalo_id
      WHERE (target.id = ? OR target.idk = ?)
        AND target.modul_id = ?
      ORDER BY
        CASE WHEN target.felhasznalo_id = ? THEN 0 ELSE 1 END,
        CASE WHEN target.role IN ('admin', 'sysadmin') THEN 0 ELSE 1 END
      LIMIT 5
      `,
      [cleanKitoltesId, cleanKitoltesId, modulId, userId]
    );

    if (!rows.length) {
      res.status(403).json({ success: false, message: 'Nincs jogosultságod ehhez az értékeléshez.' });
      return false;
    }

    const hasOwnOrEditorRow = rows.some(row =>
      Number(row.felhasznalo_id) === Number(userId)
      && ['admin', 'sysadmin', 'editor'].includes(String(row.role))
    );

    const sameInstitution = rows.some(row => Number(row.owner_int_id) === Number(intId));
    const institutionAnalystAllowed = (roleId === 1 || roleId === 2) && sameInstitution;

    if (!hasOwnOrEditorRow && !institutionAnalystAllowed && !isSysadmin) {
      res.status(403).json({ success: false, message: 'Nincs jogosultságod ehhez az értékeléshez.' });
      return false;
    }

    const quotaRow = rows.find(row => Number(row.owner_ai_kit_max) >= 0) || rows[0];
    const kitQuota = Number(quotaRow.owner_ai_kit_max ?? quotaRow.ai_kit_max);
    if (Number.isFinite(kitQuota) && kitQuota <= 0) {
      res.status(403).json({ success: false, message: 'Ehhez az értékeléshez nincs elérhető AI keret.' });
      return false;
    }

    return true;
  }

  async function prepareAiRequest(req, res) {
    const modulId = getCurrentModulId(req);
    if (!modulId) {
      res.status(403).json({ success: false, message: 'Nincs kiválasztott vagy érvényes modul.' });
      return null;
    }

    if (!(await requireAiEnabled(req, res))) return null;
    if (!(await requireAiQuota(req, res))) return null;
    if (!(await requireOptionalKitoltesAccess(req, res))) return null;

    return { modulId };
  }


  function parseJsonField(value, fallback = {}) {
    if (!value) return fallback;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(String(value));
    } catch (_) {
      return fallback;
    }
  }

  function cleanAiText(value, maxLen = 500) {
    return String(value ?? '')
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '')
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '')
      .replace(/\b(?:név|nev|vizsgált személy neve|vizsgalt szemely neve|alany neve)\s*[:：-]\s*[^\n;,.]+/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLen);
  }

  function resolveStatementFromAnswer(row) {
    const answer = String(row.kerdes_valasz ?? '').trim().toLowerCase();
    if (!answer) return null;

    const isNegative = answer === 'nem' || answer === 'no' || answer === 'false' || answer === '0';
    const sourceText = isNegative && row.negalt_kerdes_szoveg
      ? row.negalt_kerdes_szoveg
      : row.kerdes_szoveg;

    const clean = cleanAiText(sourceText, 700);
    return clean || null;
  }

  function sanitizeGroupHighlights(value) {
    const lines = String(value ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    let idx = 0;

    return lines.map(line => {
      if (/erősség|erosseg|fejlesztendő|fejlesztendo/i.test(line)) {
        idx += 1;
        const inside = line.match(/\((.*)\)/)?.[1] || line.replace(/^[-•]\s*/, '');
        return `- Résztvevő #${idx} (${cleanAiText(inside, 260)})`;
      }
      return cleanAiText(line, 260);
    }).filter(Boolean).join('\n');
  }

  function normalizeSectionPercent(rawStats, foKategoria, alKategoria, altTema) {
    if (!rawStats || typeof rawStats !== 'object') return null;
    const fo = rawStats[foKategoria];
    if (!fo || typeof fo !== 'object') return null;

    if (altTema && alKategoria) {
      const alt = fo.alkategoriak?.[alKategoria]?.altTemak?.[altTema];
      const n = pickNumericPercent(alt);
      if (n !== null) return Math.max(0, Math.min(100, Math.round(Number(n))));
    }

    if (alKategoria) {
      const al = fo.alkategoriak?.[alKategoria];
      const n = pickNumericPercent(al);
      if (n !== null) return Math.max(0, Math.min(100, Math.round(Number(n))));
    }

    const n = pickNumericPercent(fo);
    return n !== null ? Math.max(0, Math.min(100, Math.round(Number(n)))) : null;
  }

  async function resolveKitoltesForAi(kitoltesId, modulId) {
    const cleanKitoltesId = toPositiveInt(kitoltesId);
    if (!cleanKitoltesId) throw new Error('Hibás értékelésazonosító.');

    const [rows] = await db.promise().query(
      `
      SELECT id, idk, role, felhasznalo_id, szazalek
      FROM kitoltesek
      WHERE (id = ? OR idk = ?)
        AND modul_id = ?
      ORDER BY
        CASE WHEN role IN ('admin', 'sysadmin') THEN 0 ELSE 1 END,
        id ASC
      LIMIT 10
      `,
      [cleanKitoltesId, cleanKitoltesId, modulId]
    );

    if (!rows.length) throw new Error('Az értékelés nem található.');

    const withStats = rows.find(r => r.szazalek && String(r.szazalek).trim() !== '');
    return withStats || rows[0];
  }

  async function buildSafeAiFactsFromDb(kitoltesId, modulId) {
    const kitoltes = await resolveKitoltesForAi(kitoltesId, modulId);
    const rawStats = parseJsonField(kitoltes.szazalek, {});

    const [rows] = await db.promise().query(
      `
      SELECT
        COALESCE(f.nev, '') AS fo_kategoria,
        COALESCE(a.nev, '') AS al_kategoria,
        COALESCE(t.nev, '') AS alt_tema,
        k.id,
        k.parent_id,
        k.kerdes_szoveg,
        k.negalt_kerdes_szoveg,
        k.szoveges,
        k.valasz_ag,
        k.kindex,
        v.kerdes_valasz
      FROM valaszok v
      JOIN kerdesek k
        ON k.id = v.kerdes_id
      LEFT JOIN kategoria_kapcsolo kk
        ON kk.id = k.kategoria_kapcsolo_id
      LEFT JOIN fokategoriak f
        ON f.id = kk.fokategoria_id
      LEFT JOIN alkategoriak a
        ON a.id = kk.alkategoria_id
      LEFT JOIN altemak t
        ON t.id = kk.altema_id
      WHERE v.kitoltes_id IN (?, ?)
        AND k.modul_id = ?
        AND COALESCE(k.szoveges, 0) = 0
      ORDER BY
        f.nev ASC,
        a.nev ASC,
        t.nev ASC,
        COALESCE(k.parent_id, k.id) ASC,
        COALESCE(k.kindex, 0) ASC,
        k.id ASC
      `,
      [kitoltes.id, kitoltes.idk, modulId]
    );

    const sectionsMap = new Map();

    for (const row of rows) {
      const foKategoria = cleanAiText(row.fo_kategoria || 'Egyéb', 180);
      const alKategoria = cleanAiText(row.al_kategoria || '', 180);
      const altTema = cleanAiText(row.alt_tema || '', 200);
      const statement = resolveStatementFromAnswer(row);
      if (!statement) continue;

      const key = `${foKategoria}||${alKategoria}||${altTema}`;
      if (!sectionsMap.has(key)) {
        sectionsMap.set(key, {
          foKategoria,
          alKategoria,
          altTema,
          percent: normalizeSectionPercent(rawStats, foKategoria, alKategoria, altTema),
          statements: []
        });
      }

      const section = sectionsMap.get(key);
      if (!section.statements.includes(statement)) {
        section.statements.push(statement);
      }
    }

    const sections = Array.from(sectionsMap.values())
      .map(section => ({
        ...section,
        statements: section.statements.slice(0, 160)
      }))
      .filter(section => section.statements.length > 0);

    if (!sections.length) {
      throw new Error('Nem található név nélküli, kontrollált kérdőívállítás az AI generáláshoz.');
    }

    return {
      subjectLabel: 'a gyermek',
      statisztika: rawStats,
      sections
    };
  }

  function buildFactsPromptBlock(safeFacts) {
    return JSON.stringify(safeFacts.sections, null, 2);
  }

  // --- MI FUNKCIÓ INTÉZMÉNYI ÁLLAPOTA ---
  router.get('/ai-enabled-status', async (req, res) => {
    try {
      const intId = getCurrentIntId(req);

      if (!intId) {
        return res.status(403).json({
          success: false,
          code: 'AI_INSTITUTION_UNKNOWN',
          message: 'Érvénytelen intézményi jogosultság.'
        });
      }

      const [rows] = await db.promise().query(
        'SELECT ai_enabled FROM intezmeny WHERE id = ? LIMIT 1',
        [intId]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          code: 'INSTITUTION_NOT_FOUND',
          message: 'Intézmény nem található.'
        });
      }

      return res.json({
        success: true,
        aiEnabled: Number(rows[0].ai_enabled) === 1
      });
    } catch (err) {
      console.error('[AI Modul] MI státusz lekérdezési hiba:', err);
      return res.status(500).json({
        success: false,
        message: 'Az MI státusz lekérdezése sikertelen.'
      });
    }
  });

  // --- CSOPORTOS JELLEMZÉS ---
  router.post('/generate/jellemzes-from-text', async (req, res) => {
    try {
      const raw = redactAiString(req.body?.raw ?? '');
      const egyeniAdatok = sanitizeGroupHighlights(req.body?.egyeniAdatok ?? '');
      const ctx = await prepareAiRequest(req, res);
      if (!ctx) return;
      const { modulId } = ctx;

      if (raw.length < 10) {
        return res.status(400).json({ success:false, message:'Hiányzik az elemzendő adat.' });
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
            '4. Készíts egy csoportszintű értékelést, amelyben kitérsz az általános tendenciákra. Az átadott "EGYÉNI KIEMELÉSEK" alapján csak név nélküli, anonimizált megfogalmazást használj.'
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
      const kitoltesId = req.body?.kitoltesId ?? null;
      const ctx = await prepareAiRequest(req, res);
      if (!ctx) return;
      const { modulId } = ctx;

      if (!kitoltesId) {
        return res.status(400).json({ success:false, message:'Hiányzó értékelésazonosító.' });
      }

      const safeFacts = await buildSafeAiFactsFromDb(kitoltesId, modulId);
      const payload = parseDataFromJSON(getStatsInputForAi(safeFacts.statisztika));

      const { txtPromptResz, baseKontextus, szerep, promptFejlesztes } = await getModuleContext(db, modulId, true);
      let veglegesFeladat = promptFejlesztes;

      const messages = [
        {
          role: 'system',
          content: buildSystemPrompt(
            szerep,
            baseKontextus,
            txtPromptResz,
            `4. SZIGORÚAN TILOS csoportra vagy többes számra utaló szavakat használni.
             5. Csak a kapott kontrollált kérdőívállításokat használd. Ne találj ki új tényt, diagnózist vagy háttérinformációt.
             6. Az értékelt személyre név nélkül, következetesen így hivatkozz: ${safeFacts.subjectLabel}.`
          )
        },
        {
          role: 'user', content:
          `ADATOK AZ ELEMZÉSHEZ:
          - Hivatkozás az értékelt személyre: ${safeFacts.subjectLabel}
          - Erős területek (szintentartáshoz): ${payload.top3.join(', ')}
          - Fejlesztendő területek (javításhoz): ${payload.bottom3.join(', ')}

          KONTROLLÁLT KÉRDŐÍVÁLLÍTÁSOK, NÉV ÉS SZABAD SZÖVEGES MEGJEGYZÉS NÉLKÜL:
          ${buildFactsPromptBlock(safeFacts)}

          FELADAT:
          ${veglegesFeladat}

          FORMÁZÁSI UTASÍTÁSOK:
          1. A helyzetértékelés 2-3 bekezdés hosszú legyen.
          2. A helyzetértékelés után hagyj ki egy sort, és használd ezt a címsort: ### Célzott fejlesztési területek és módszerek
          3. A fejlesztési ötleteket Markdown felsorolásként (- jellel) formázd.
          4. Ne írj százalékokat a kész szövegbe, és ne használj nevet.`
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
      const kitoltesId = req.body?.kitoltesId ?? null;
      const ctx = await prepareAiRequest(req, res);
      if (!ctx) return;
      const { modulId } = ctx;

      if (!kitoltesId) {
        return res.status(400).json({ success:false, message:'Hiányzó értékelésazonosító.' });
      }

      const safeFacts = await buildSafeAiFactsFromDb(kitoltesId, modulId);
      const payload = parseDataFromJSON(getStatsInputForAi(safeFacts.statisztika));

      const { txtPromptResz, baseKontextus, szerep, promptJellemzes } = await getModuleContext(db, modulId, true);
      const mindenKategoria = payload.kategoriak.map(k => k.nev).join(', ');
      let veglegesFeladat = promptJellemzes;

      const messages = [
        {
          role: 'system',
          content: buildSystemPrompt(
            szerep,
            baseKontextus,
            txtPromptResz,
            `4. TILOS konkrét fejlesztési feladatokat vagy javaslatokat írni a szöveg végére.
             5. Csak a kapott kontrollált kérdőívállításokat használd. Ne találj ki új tényt, diagnózist vagy háttérinformációt.
             6. Az értékelt személyre név nélkül, következetesen így hivatkozz: ${safeFacts.subjectLabel}.`
          )
        },
        {
          role: 'user', content:
          `ADATOK AZ ELEMZÉSHEZ:
          - Hivatkozás az értékelt személyre: ${safeFacts.subjectLabel}
          - Összes vizsgált terület: ${mindenKategoria}
          - Kiemelt területek (Erősségek): ${payload.top3.join(', ')}
          - Fejlesztendő területek (Gyengeségek): ${payload.bottom3.join(', ')}

          KONTROLLÁLT KÉRDŐÍVÁLLÍTÁSOK, NÉV ÉS SZABAD SZÖVEGES MEGJEGYZÉS NÉLKÜL:
          ${buildFactsPromptBlock(safeFacts)}

          FELADAT:
          ${veglegesFeladat}

          FONTOS:
          A kapott állításokat fogalmazd összefüggő szakmai szöveggé. Ne használj nevet, ne írj százalékokat, és ne egészítsd ki a tényanyagot saját következtetéssel.`
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
      const kitoltesId = req.body?.kitoltesId ?? null;
      const ctx = await prepareAiRequest(req, res);
      if (!ctx) return;
      const { modulId } = ctx;

      if (!kitoltesId) {
        return res.status(400).json({ success:false, message:'Hiányzó értékelésazonosító.' });
      }

      const safeFacts = await buildSafeAiFactsFromDb(kitoltesId, modulId);
      parseDataFromJSON(getStatsInputForAi(safeFacts.statisztika));

      const { txtPromptResz, baseKontextus, szerep, promptErtekeles } = await getModuleContext(db, modulId, true);
      let veglegesFeladat = promptErtekeles;

      const messages = [
        {
          role: 'system',
          content: buildSystemPrompt(
            szerep,
            baseKontextus,
            txtPromptResz,
            `4. A feladatod a kapott kontrollált kérdőívállítások összefüggő, folyékony szöveggé formálása kategóriánként.
             5. SZIGORÚAN TILOS listákat vagy felsorolásokat használni a kész szövegben. Minden kategóriát egybefüggő bekezdésként írj meg.
             6. Csak és kizárólag a megadott tényeket használd fel, fűzd őket logikus mondatokká, de ne találj ki extra információkat vagy fejlesztési javaslatokat.
             7. Az értékelt személyre név nélkül, következetesen így hivatkozz: ${safeFacts.subjectLabel}.`
          )
        },
        {
          role: 'user', content:
          `ADATOK AZ ELEMZÉSHEZ:
          - Hivatkozás az értékelt személyre: ${safeFacts.subjectLabel}

          KONTROLLÁLT KÉRDŐÍVÁLLÍTÁSOK, NÉV ÉS SZABAD SZÖVEGES MEGJEGYZÉS NÉLKÜL:
          ${buildFactsPromptBlock(safeFacts)}

          FELADAT:
          ${veglegesFeladat}

          FORMÁZÁSI UTASÍTÁSOK:
          1. Minden főkategóriát írj ki narancssárga alcímként (### [Főkategória neve] formázással).
          2. Az alcímek alatt egybefüggő, folyamatos szöveget használj, tilos a lista és a felsorolás.
          3. Ne használj nevet, és ne írj olyan tényt, amely nem szerepel a kontrollált kérdőívállítások között.`
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