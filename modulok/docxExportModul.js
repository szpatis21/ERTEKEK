const express = require('express');
const fs = require('fs');
const path = require('path');

module.exports = (db) => {
  const router = express.Router();

  const {
    requireLogin,
    attachUserContext,
    requireModuleAccess
  } = require('./security')(db);

  router.use(requireLogin);
  router.use(attachUserContext);
  router.use(requireModuleAccess);

  function q(sql, params = []) {
    return db.promise().query(sql, params).then(([rows]) => rows);
  }

  function safeFileName(value) {
    return String(value || 'ertekeles')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120) || 'ertekeles';
  }

  function formatDate(value) {
    if (!value) return '';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleDateString('hu-HU');
  }

  function cleanText(value) {
    return String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function stripDataUri(value) {
    const str = String(value || '');
    const commaIndex = str.indexOf(',');
    return commaIndex >= 0 ? str.slice(commaIndex + 1) : str;
  }

  function findTemplatePath() {
    const candidates = [
      path.join(__dirname, '..', 'httpdocs', 'private', 'templates', 'ertekeles_sablon.docx'),
      path.join(__dirname, '..', 'private', 'templates', 'ertekeles_sablon.docx')
    ];

    return candidates.find(candidate => fs.existsSync(candidate)) || candidates[0];
  }

  function loadDocxPackages() {
    try {
      const PizZip = require('pizzip');
      const Docxtemplater = require('docxtemplater');
      const ImageModule = require('docxtemplater-image-module-free');
      return { PizZip, Docxtemplater, ImageModule };
    } catch (error) {
      const err = new Error(
        'DOCX export függőségek hiányoznak. Futtasd a szerveren: npm install docxtemplater pizzip docxtemplater-image-module-free'
      );
      err.original = error;
      throw err;
    }
  }

  function valaszLabel(_row, _answer) {
    // DOCX exportban nem jelenítjük meg az IGEN/NEM ágat.
    // A megfelelő kérdésszöveget a questionText() választja ki.
    return '';
  }

  function normalizeQuestionText(value) {
    return cleanText(value)
      // Gyakori elírás javítása: „íz-és” → „íz és”.
      .replace(/([A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű])-és\b/g, '$1 és');
  }

  function hasAnswer(answer) {
    if (!answer) return false;
    const value = cleanText(answer.kerdes_valasz).toLowerCase();
    const text = cleanText(answer.valasz_szoveg);
    return Boolean(text) || (value && value !== 'ures');
  }

  function questionText(row, answer) {
    const value = cleanText(answer?.kerdes_valasz).toLowerCase();
    if (value === 'nem' && cleanText(row.negalt_kerdes_szoveg)) {
      return normalizeQuestionText(row.negalt_kerdes_szoveg);
    }
    return normalizeQuestionText(row.szoveg || row.kerdes_szoveg || row.negalt_kerdes_szoveg || `Kérdés #${row.id}`);
  }

  function getGroup(map, key, factory) {
    const safeKey = key || 'Nincs megadva';
    if (!map.has(safeKey)) map.set(safeKey, factory(safeKey));
    return map.get(safeKey);
  }

  function buildHierarchy(questionRows, answerRows) {
    const answerMap = new Map();
    answerRows.forEach(answer => answerMap.set(Number(answer.kerdes_id), answer));

    const childrenByParent = new Map();
    questionRows.forEach(row => {
      const parentId = Number(row.parent_id) || null;
      if (!parentId) return;
      if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
      childrenByParent.get(parentId).push(row);
    });

    const root = new Map();
    let answeredCount = 0;

    questionRows
      .filter(row => !(Number(row.parent_id) > 0))
      .sort((a, b) => Number(a.kindex || 0) - Number(b.kindex || 0) || Number(a.id) - Number(b.id))
      .forEach(row => {
        const answer = answerMap.get(Number(row.id));
        const childRows = (childrenByParent.get(Number(row.id)) || [])
          .sort((a, b) => Number(a.kindex || 0) - Number(b.kindex || 0) || Number(a.id) - Number(b.id));

        const childItems = childRows
          .map(child => {
            const childAnswer = answerMap.get(Number(child.id));
            if (!hasAnswer(childAnswer)) return null;
            answeredCount += 1;
            const szovegesValasz = cleanText(childAnswer?.valasz_szoveg);
            return {
              szoveg: questionText(child, childAnswer),
              valaszLabel: valaszLabel(child, childAnswer),
              szovegesValasz,
              szovegesValaszVan: Boolean(szovegesValasz)
            };
          })
          .filter(Boolean);

        const parentHasAnswer = hasAnswer(answer);
        if (!parentHasAnswer && childItems.length === 0) return;
        if (parentHasAnswer) answeredCount += 1;

        const foNev = cleanText(row.fo_kategoria) || 'Főkategória nélkül';
        const alNev = cleanText(row.al_kategoria) || 'Alkategória nélkül';
        const altNev = cleanText(row.alt_tema) || 'Altéma nélkül';

        const fo = getGroup(root, foNev, nev => ({ foNev: nev, alkategoriakMap: new Map() }));
        const al = getGroup(fo.alkategoriakMap, alNev, nev => ({ alNev: nev, altemakMap: new Map() }));
        const alt = getGroup(al.altemakMap, altNev, nev => ({ altNev: nev, kerdesek: [] }));

        const szovegesValasz = cleanText(answer?.valasz_szoveg);
        alt.kerdesek.push({
          kerdesSzoveg: questionText(row, answer),
          valaszLabel: valaszLabel(row, answer),
          szovegesValasz,
          szovegesValaszVan: Boolean(szovegesValasz),
          alkerdesek: childItems
        });
      });

    const foKategoriak = Array.from(root.values()).map(fo => ({
      foNev: fo.foNev,
      alkategoriak: Array.from(fo.alkategoriakMap.values()).map(al => ({
        alNev: al.alNev,
        altemak: Array.from(al.altemakMap.values()).map(alt => ({
          altNev: alt.altNev,
          kerdesek: alt.kerdesek
        }))
      }))
    }));

    return { foKategoriak, answeredCount };
  }

  function summarize(meta, answeredCount, foKategoriak) {
    const foCount = foKategoriak.length;
    let parsedPercent = null;
    try {
      parsedPercent = typeof meta.szazalek === 'string' ? JSON.parse(meta.szazalek) : meta.szazalek;
    } catch (_) {}

    const parts = [
      `A dokumentum ${answeredCount} rögzített válasz alapján készült.`,
      `Érintett főkategóriák száma: ${foCount}.`
    ];

    if (parsedPercent && typeof parsedPercent === 'object') {
      parts.push('A százalékos eredmények az Értékek felületen mentett értékelési adatok alapján kerülnek megjelenítésre.');
    }

    return parts.join(' ');
  }

  async function loadExportData(req, kitoltesId, chartImage) {
    const userId = Number(req.auth.userId);
    const modulId = Number(req.auth.modulId);
    const roleId = Number(req.auth.roleId);
    const intId = Number(req.auth.intId);

    const metaRows = await q(`
      SELECT
        k.idk,
        k.kitoltes_neve,
        k.letrehozva,
        k.szazalek,
        k.modul_id,
        CAST(AES_DECRYPT(v.nev_enc, @aes_key) AS CHAR(255)) AS vizsgalt_nev,
        tulaj.vez AS tulajdonos_nev,
        akt.vez AS exportalo_nev,
        i.intnev AS intezmeny_nev,
        m.nev AS modul_nev,
        leiras
      FROM kitoltesek k
      JOIN felhasznalok tulaj
        ON tulaj.id = k.felhasznalo_id
      LEFT JOIN felhasznalok akt
        ON akt.id = ?
      LEFT JOIN intezmeny i
        ON i.id = tulaj.int_id
      LEFT JOIN vizsgaltak v
        ON v.vizsgalt_id = k.vizsgalt_id
      LEFT JOIN modulok m
        ON m.id = k.modul_id
      WHERE k.idk = ?
        AND k.modul_id = ?
        AND (
          k.felhasznalo_id = ?
          OR EXISTS (
            SELECT 1
            FROM kitoltesek sajat
            WHERE sajat.idk = k.idk
              AND sajat.modul_id = k.modul_id
              AND sajat.felhasznalo_id = ?
              AND sajat.role IN ('admin', 'sysadmin', 'editor')
            LIMIT 1
          )
          OR (
            ? IN (1, 2)
            AND tulaj.int_id = ?
          )
        )
      ORDER BY
        CASE
          WHEN k.felhasznalo_id = ? THEN 0
          WHEN k.role IN ('admin', 'sysadmin') THEN 1
          ELSE 2
        END
      LIMIT 1
    `, [userId, kitoltesId, modulId, userId, userId, roleId, intId, userId]);

    if (!metaRows.length) {
      const err = new Error('Nincs jogosultságod ehhez az értékeléshez.');
      err.status = 403;
      throw err;
    }

    const meta = metaRows[0];

    const answerRows = await q(`
      SELECT kerdes_id, kerdes_valasz, valasz_szoveg
      FROM valaszok
      WHERE kitoltes_id = ?
    `, [kitoltesId]);

    const questionRows = await q(`
      SELECT
        k.id,
        k.parent_id,
        k.kerdes_szoveg AS szoveg,
        k.negalt_kerdes_szoveg,
        k.valasz_ag,
        k.szoveges,
        k.ertek,
        k.negalt_ertek,
        k.ossz_ertek,
        k.maximalis_szint,
        k.kindex,
        COALESCE(raw_k.opcios, 0) AS opcios,
        k.fo_kategoria,
        k.al_kategoria,
        k.alt_tema
      FROM kerdesek_kategoriaval k
      LEFT JOIN kerdesek raw_k
        ON raw_k.id = k.id
      WHERE k.modul_id = ?
      ORDER BY k.kindex ASC, k.id ASC
    `, [modulId]);

    const { foKategoriak, answeredCount } = buildHierarchy(questionRows, answerRows);
    const today = formatDate(new Date());
    const kitoltesNev = cleanText(meta.kitoltes_neve) || `Értékelés #${kitoltesId}`;
    const vizsgaltNev = cleanText(meta.vizsgalt_nev) || 'Nincs megadva';
    const title = `${vizsgaltNev} - ${kitoltesNev}`;
    const hasDiagram = Boolean(chartImage && String(chartImage).startsWith('data:image/'));

    return {
      fileName: safeFileName(`${title}.docx`),
      data: {
        kitoltesCim: title,
        kitoltesNev,
        vizsgaltNev,
        datum: today,
        letrehozva: formatDate(meta.letrehozva),
        intezmenyNev: cleanText(meta.intezmeny_nev) || 'Nincs megadva',
modulNev: cleanText(meta.leiras) || cleanText(meta.modul_nev) || `Modul #${modulId}`,
        tulajdonosNev: cleanText(meta.tulajdonos_nev) || 'Nincs megadva',
        exportaloNev: cleanText(meta.exportalo_nev) || 'Nincs megadva',
        osszefoglalo: summarize(meta, answeredCount, foKategoriak),
        vanDiagram: hasDiagram,
        diagram: hasDiagram ? stripDataUri(chartImage) : '',
        foKategoriak: foKategoriak.length ? foKategoriak : [{
          foNev: 'Nincs rögzített válasz',
          alkategoriak: [{
            alNev: 'Nincs adat',
            altemak: [{
              altNev: 'Nincs adat',
              kerdesek: [{
                kerdesSzoveg: 'Ehhez az értékeléshez még nem található rögzített válasz.',
                valaszLabel: '',
                szovegesValasz: '',
                szovegesValaszVan: false,
                alkerdesek: []
              }]
            }]
          }]
        }]
      }
    };
  }

  function renderDocx(data) {
    const { PizZip, Docxtemplater, ImageModule } = loadDocxPackages();
    const templatePath = findTemplatePath();
    if (!fs.existsSync(templatePath)) {
      const err = new Error(`DOCX sablon nem található: ${templatePath}`);
      err.status = 500;
      throw err;
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    const imageModule = new ImageModule({
      centered: true,
      fileType: 'docx',
      getImage(tagValue) {
        if (!tagValue) return Buffer.alloc(0);
        return Buffer.from(String(tagValue), 'base64');
      },
      getSize(_img, _tagValue, tagName) {
        if (tagName === 'diagram') return [480, 270];
        return [180, 90];
      }
    });

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [imageModule]
    });

    doc.render(data);
    return doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    });
  }

  router.post('/export-docx-template', async (req, res) => {
    const kitoltesId = Number(req.body?.kitoltesId || req.body?.kitoltes_id);
    const chartImage = req.body?.chartImage || req.body?.diagram || '';

    if (!Number.isInteger(kitoltesId) || kitoltesId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Hiányzó vagy hibás kitöltésazonosító.'
      });
    }

    try {
      const exportData = await loadExportData(req, kitoltesId, chartImage);
      const buffer = renderDocx(exportData.data);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(exportData.fileName)}`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    } catch (error) {
      console.error('[docxExportModul] DOCX export hiba:', {
        message: error.message,
        code: error.code || error.name
      });

      return res.status(error.status || 500).json({
        success: false,
        message: error.message || 'DOCX export hiba történt.'
      });
    }
  });

  return router;
};
