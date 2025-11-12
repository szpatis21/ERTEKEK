
import {modulId} from './dashMain.js'



async function imgFromDivHiDPI(id, pdfWidth = 529) {
  const div = document.getElementById(id);
  if (!div) return null;

  const canvasEl = div.querySelector('canvas');
  const chart = canvasEl && window.Chart?.getChart(canvasEl);

  if (!chart) {
    const canvas = await html2canvas(div, { scale: 4, backgroundColor: null, useCORS: true });
    return { image: canvas.toDataURL('image/png'), width: pdfWidth };
  }

  const rect = div.getBoundingClientRect();
  const originalBox = { width: rect.width, height: rect.height };

  const originalStyle = {
    width: div.style.width,
    height: div.style.height,
    position: div.style.position,
    left: div.style.left,
    top: div.style.top
  };
  const hadExplicitHeight = originalStyle.height && originalStyle.height !== '';

  const originalOptions = {
    responsive: chart.options.responsive,
    maintainAspectRatio: chart.options.maintainAspectRatio
  };

  const originalCanvasStyle = {
    width: canvasEl.style.width,
    height: canvasEl.style.height
  };
  const originalCanvasAttr = {
    width: canvasEl.getAttribute('width'),
    height: canvasEl.getAttribute('height')
  };

  const originalAspectRatio = (originalBox.height > 0)
    ? (originalBox.width / originalBox.height)
    : 2;

  const tempWidth = 1200;
  div.style.position = 'absolute';
  div.style.left = '-9999px';
  div.style.top = '0px';
  div.style.width = tempWidth + 'px';
  div.style.height = (tempWidth / originalAspectRatio) + 'px';

  chart.options.responsive = false;
  chart.options.maintainAspectRatio = false;

  if (typeof chart.resize === 'function') {
    chart.resize(tempWidth, tempWidth / originalAspectRatio);
  } else {
    chart.resize();
  }

  let uri = null;
  try {
    await new Promise(r => setTimeout(r, 50));

    const canvasShot = await html2canvas(div, {
      scale: 4,
      backgroundColor: null,
      useCORS: true
    });
    uri = canvasShot.toDataURL('image/png');
  } catch (e) {
    console.error('Div-ből kép export hiba:', id, e);
  } finally {
    div.style.width = originalStyle.width;
    if (hadExplicitHeight) {
      div.style.height = originalStyle.height;       
    } else {
      div.style.removeProperty('height');           
    }
    div.style.position = originalStyle.position;
    div.style.left = originalStyle.left;
    div.style.top = originalStyle.top;

    chart.options.responsive = originalOptions.responsive;
    chart.options.maintainAspectRatio = originalOptions.maintainAspectRatio;
    canvasEl.style.width = originalCanvasStyle.width;
    canvasEl.style.height = originalCanvasStyle.height;
    if (originalCanvasAttr.width != null) {
      canvasEl.setAttribute('width', originalCanvasAttr.width);
    } else {
      canvasEl.removeAttribute('width');
    }
    if (originalCanvasAttr.height != null) {
      canvasEl.setAttribute('height', originalCanvasAttr.height);
    } else {
      canvasEl.removeAttribute('height');
    }

    if (typeof chart.resize === 'function') {
      chart.resize(originalBox.width, originalBox.height);
       document.querySelector("#topChartsContainer").style.height ="25vh";

    } else {
      chart.resize();
    }
    void div.offsetHeight;
    chart.update('none');
  }

  return uri ? { image: uri, width: pdfWidth } : null;
  
}

async function ensurePdfMakeAndFonts() {
  if (typeof window.pdfMake === 'undefined') { await import('/both/fonts/pdfmake.min.js'); }
  if (!window.pdfMake?.vfs) { await import('/both/fonts/vfs_fonts.js'); }
  if (!window.pdfMake.fonts) window.pdfMake.fonts = {};
  if (!window.pdfMake.fonts.Times) {
    const timesInVfs = !!pdfMake.vfs['Times-Roman.ttf'] && !!pdfMake.vfs['Times-Bold.ttf'] && !!pdfMake.vfs['Times-Italic.ttf'] && !!pdfMake.vfs['Times-BoldItalic.ttf'];
    window.pdfMake.fonts.Times = timesInVfs ? { normal: 'Times-Roman.ttf', bold: 'Times-Bold.ttf', italics: 'Times-Italic.ttf', bolditalics: 'Times-BoldItalic.ttf' } : { normal: 'Roboto-Regular.ttf', bold: 'Roboto-Medium.ttf', italics: 'Roboto-Italic.ttf', bolditalics: 'Roboto-Italic.ttf' };
  }
}
function rgbToHex(cssColor) {
  if (!cssColor) return '#000000'; if (cssColor.startsWith('#')) return cssColor; const m = cssColor.match(/\d+/g); if (!m) return '#000000'; const hex = m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join(''); return '#' + hex;
}
function buildLegendRows(items, maxW = 460) {
  const rows = []; let row = [], used = 0; const unit = 6; items.forEach(it => { const label = it.label || ''; const w = 14 + Math.min(160, label.length * unit); if (row.length && used + w > maxW) { rows.push(row); row = []; used = 0; } row.push(it); used += w + 12; }); if (row.length) rows.push(row); return rows;
}
export function readBarLegendItems() {
  return Array.from(document.querySelectorAll('#barLegend .legend-item, #barLegend .legend-badge')).map(el => { const sw = el.querySelector('.swatch'); const col = sw ? rgbToHex(getComputedStyle(sw).backgroundColor) : '#000000'; const txt = el.textContent.replace(/\s+/g, ' ').trim(); return { color: col, label: txt }; }).filter(it => it.label);
}
function readRadarLegendItems() {
  return Array.from(document.querySelectorAll('#radarLegend .legend-badge')).map(b => { const sw = b.querySelector('.swatch'); const col = sw ? rgbToHex(getComputedStyle(sw).backgroundColor) : '#000000'; const txt = b.textContent.trim(); return { color: col, label: txt }; }).filter(it => it.label);
}
function pickExtreme(selector) {
  const el = document.querySelector(selector); if (!el) return null; const sw = el.querySelector('.swatch'); const col = sw ? rgbToHex(getComputedStyle(sw).backgroundColor) : '#000000'; const txt = el.textContent.replace(/\s+/g, ' ').trim(); return { color: col, label: txt };
}
function htmlTableToPdfmake(tableEl) {
  if (!tableEl) return [[]]; const body = []; const rowspanTracker = {}; for (let r = 0; r < tableEl.rows.length; r++) { const pdfRow = []; let col = 0; while (rowspanTracker[col] > 0) { pdfRow.push({}); rowspanTracker[col]--; col++; } for (const cell of tableEl.rows[r].cells) { while (rowspanTracker[col] > 0) { pdfRow.push({}); rowspanTracker[col]--; col++; } const rs = +cell.rowSpan || 1; const cs = +cell.colSpan || 1; const c = { text: cell.innerText.trim() }; if (col === 0) { c.bold = true; c.fillColor = '#eeeeee'; c.alignment = 'center'; c.margin = [0, 4, 0, 4]; } if (rs > 1) c.rowSpan = rs; if (cs > 1) c.colSpan = cs; pdfRow.push(c); for (let i = 1; i < cs; i++) pdfRow.push({}); if (rs > 1) { for (let i = 0; i < cs; i++) rowspanTracker[col + i] = rs - 1; } col += cs; } while (rowspanTracker[col] > 0) { pdfRow.push({}); rowspanTracker[col]--; col++; } body.push(pdfRow); } return body;
}
function alcim(txt) { return { text: txt, style: 'alcim', margin: [0, 10, 0, 6], alignment: 'center' }; }
function cim(txt) { return { text: txt, style: 'cim', margin: [0, 6, 0, 8], alignment: 'center' }; }

// A FŐ PDF GENERÁLÓ FÜGGVÉNY 
export async function generate(mode = 'download') {
  await ensurePdfMakeAndFonts();
  const content = [];
  const todayHU = new Date().toLocaleDateString('hu-HU');
  const rawTitle = document.getElementById('szalagcim')?.value?.trim() || '';
  const reportTitle = rawTitle || 'Összesített adatok témakörök, kategóriák szerint';
  const fileSlug = (rawTitle || 'osszesitett').toLowerCase().replace(/[^0-9a-záéíóöőúüű \-]/gi, '').replace(/\s+/g, '_').slice(0, 80);
  
  // 0) Cím + bevonás infó
  content.push(cim(reportTitle))
  const szemelyek = Array.from(document.querySelectorAll('#vizsgaltSzemelyek .vizsgalt-tag')).map(s => s.textContent.trim());
  if (szemelyek.length) {
    content.push(alcim('Vizsgált értékelések'));
    content.push({ text: szemelyek.join('   •   '), margin: [0, 2, 0, 6], alignment: 'center' });
    content.push({ text: `A statisztikai adatok ${szemelyek.length} értékelés/fő bevonásával készültek.`, alignment: 'center', margin: [0, 0, 0, 8], fontSize: 10, bold: true });
  }

  content.push(alcim('Összesített, átlagolt adatok kategóriák, főtémakörök szerint'));
  
  const topChartsImg = await imgFromDivHiDPI('topChartsContainer');
  if (topChartsImg) {
    content.push({
      alignment: 'center',
      image: topChartsImg.image,
      width: topChartsImg.width,
      margin: [0, 12, 0, 16]
    });
  }

  // 1/B) Közös kategória-nevek (BAR+POLAR alá) 
  const barLegendItems = readBarLegendItems();
  if (barLegendItems.length) { buildLegendRows(barLegendItems, 540).forEach(row => { content.push({ alignment: 'center', columns: row.map(it => ({ columnGap: 4, margin: [2, 0, 2, 2], columns: [{ width: 10, canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10, color: it.color }] }, { text: it.label, fontSize: 10, noWrap: false }] })), columnGap: 10, margin: [0, 0, 0, 4] }); }); }

  // 1/C) Legjobb / Legrosszabb és statisztikák
  const best = pickExtreme('#extremeBox .best');
  const worst = pickExtreme('#extremeBox .worst');
  if (best || worst) { const stack = []; if (best) stack.push({ text: best.label, color: 'black', bold: false, fontSize: 11, margin: [2, 0, 0, 2] }); if (worst) stack.push({ text: worst.label, color: 'black', bold: false, fontSize: 11 }); content.push({ alignment: 'center', margin: [0, 14, 0, 6], stack }); }
  (function addRankingsAndQuickStats() { const items = readBarLegendItems(); if (!items.length) return; const parsed = items.map(it => { const m = it.label.match(/^(.*?)\s+(\d{1,3})\s*%/); const name = (m ? m[1] : it.label).trim(); const pct0 = m ? +m[2] : null; const pct = (pct0 != null) ? Math.max(0, Math.min(100, pct0)) : null; return { name, pct, color: it.color }; }).filter(x => x.pct !== null); if (!parsed.length) return; const sortedDesc = [...parsed].sort((a, b) => b.pct - a.pct); const top3 = sortedDesc.slice(0, 3); const low3 = [...sortedDesc].reverse().slice(0, 3); const nums = parsed.map(p => p.pct).sort((a, b) => a - b); const n = nums.length; const avg = Math.round(nums.reduce((s, v) => s + v, 0) / n); const med = n % 2 ? nums[(n - 1) / 2] : Math.round((nums[n / 2 - 1] + nums[n / 2]) / 2); const variance = nums.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n; const std = Math.round(variance > 0 ? Math.sqrt(variance) : 0); content.push({ margin: [0, 8, 0, 4], alignment: 'center', columns: [{ width: '*', text: `Átlag: ${avg}%`, fontSize: 11 }, { width: '*', text: `Medián: ${med}%`, fontSize: 11, alignment: 'center' }, { width: '*', text: `Szórás: ${std} pont`, fontSize: 11, alignment: 'right' }] }); content.push({ text: `Számlált kategóriák: ${n}`, fontSize: 10, alignment: 'left', margin: [0, 10, 0, 6] }); const mkList = (arr) => arr.map(it => ({ margin: [0, 1, 0, 1], columns: [{ width: 10, canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10, color: it.color }] }, { width: '*', text: `${it.name}`, fontSize: 10, noWrap: true }, { width: 28, text: `${it.pct}pont`, alignment: 'right', fontSize: 10 }], columnGap: 6 })); content.push({ margin: [0, 0, 0, 8], columns: [{ width: '*', stack: [{ text: 'A 3 legjobban teljesített kategória ', bold: true, margin: [0, 0, 0, 6], fontSize: 10 }, ...mkList(top3)] }, { width: '*', stack: [{ text: 'A 3 leginkább fejlesztésre szoruló kategória ', bold: true, margin: [0, 0, 0, 6], fontSize: 10 }, ...mkList(low3)] }], columnGap: 16 }); })();

  // ó RADAR DIAGRAM ---
  content.push(alcim('Egyedi jellemzők és megoszlások'));
  
  const radarImg = await imgFromDivHiDPI('szummRadarChart', 360);
  if (radarImg) {
    content.push({
      alignment: 'center',
      image: radarImg.image,
      width: radarImg.width,
      margin: [0, 0, 0, 2]
    });
  }

  // Radar legenda 
  const radarLegendItems = readRadarLegendItems();
  if (radarLegendItems.length) { buildLegendRows(radarLegendItems, 540).forEach(row => { content.push({ alignment: 'center', columns: row.map(it => ({ columnGap: 4, margin: [2, 0, 2, 2], columns: [{ width: 10, canvas: [{ type: 'rect', x: 0, y: 0, w: 10, h: 10, color: it.color }] }, { text: it.label, fontSize: 10, noWrap: true }] })), columnGap: 10, margin: [0, 0, 0, 6] }); }); }

  // 3) Táblázat 
  const tabla = document.querySelector('#szumm-fa table');
  if (tabla) {
    content.push(alcim('Részletes lebontott adatok fő, al témakörök és alkategóriák szerint'));
    content.push({ alignment: 'center', table: { dontBreakRows: true, body: htmlTableToPdfmake(tabla) }, layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#888', vLineColor: () => '#888', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 2, paddingBottom: () => 2 }, margin: [0, 6] });
  }

  // 4) PDF létrehozása és letöltés/nyomtatás 
  const pdf = pdfMake.createPdf({ content, header: (currentPage, pageCount) => ({ margin: [28, 14, 28, 0], stack: [{ text: `${reportTitle} - ${todayHU}`, italics: true, color: '#666', alignment: 'left', fontSize: 10 }, { text: 'A statisztikai adatokban szereplő értékelések, amennyiben természetes személyekről készültek, nem adhatók ki harmadik fél részére.', italics: true, color: '#666', alignment: 'left', fontSize: 9, margin: [0, 2, 0, 0] }] }), footer: (currentPage, pageCount) => ({ text: `Oldal ${currentPage} / ${pageCount}`, alignment: 'right', margin: [0, 0, 28, 12], fontSize: 9, color: '#666' }), fonts: { Times: { normal: 'Times-Roman.ttf', bold: 'Times-Bold.ttf', italics: 'Times-Italic.ttf', bolditalics: 'Times-BoldItalic.ttf' } }, styles: { cim: { fontSize: 18, bold: true }, alcim: { fontSize: 12, bold: true } }, pageMargins: [28, 70, 28, 28], defaultStyle: { font: 'Times', fontSize: 11 }, pageOrientation: 'portrait', pageSize: 'A4' });

  if (mode === 'print') { pdf.print(); } else { pdf.download(`${fileSlug}.pdf`); }
}


// PDF EXPORT GOMB
const pdfBtn = document.getElementById('export-pdf');
if (pdfBtn && !pdfBtn.dataset.listenerAdded) {
  pdfBtn.addEventListener('click', async () => {
    if (window.__pdfBusy) return;
    window.__pdfBusy = true;
    const oldText = pdfBtn.textContent;
    pdfBtn.disabled = true;

    try {
      pdfBtn.textContent = 'PDF készítése...';
      await generate('download');
    } catch (err) {
      console.error('PDF export teljes folyamat hiba:', err);
    } finally {
      pdfBtn.disabled = false;
      pdfBtn.textContent = oldText;
      window.__pdfBusy = false;
    }
  });
  pdfBtn.dataset.listenerAdded = 'true';
}

// NYOMTATÁS GOMB KEZELŐJE
const printBtn = document.getElementById('print-pdf');
if (printBtn && !printBtn.dataset.listenerAdded) {
  printBtn.addEventListener('click', async () => {
    if (window.__pdfBusy) return;
    window.__pdfBusy = true;
    const oldText = "Küldés nyomtatóra";
    printBtn.disabled = true;
    const labelEl = printBtn.querySelector('p');
    const oldLabel = labelEl ? labelEl.textContent : null;

    const release = lockMouseAndScroll({ hideCursor: true });

    try {
      if (labelEl) labelEl.textContent = 'Nyomtatási előkészítés…';
      await generate('print');
    } catch (err) {
      console.error('PDF nyomtatás hiba:', err);
    } finally {
      release();
      printBtn.disabled = false;
      if (labelEl) labelEl.textContent = oldLabel ?? oldText;
      window.__pdfBusy = false;
    }
  });
  printBtn.dataset.listenerAdded = 'true';
}