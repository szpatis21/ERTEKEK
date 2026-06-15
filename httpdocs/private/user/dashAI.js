import { modulId, userId } from './dashMain.js';
import { safeMarkdownLiteToHtml, escapeHTML } from '/both/safeDom.js';
import { showAlert } from '/both/alert.js';
import { readBarLegendItems } from './dashPDF.js';

// ====================== SEGÉDFÜGGVÉNYEK ======================
function formatTextToHtmlList(rawText) {
    // Csak nyomtatási HTML-hez használjuk. A safeMarkdownLiteToHtml előbb escape-el,
    // és csak a saját, szűk markdown-részhalmazt engedi vissza HTML-ként.
    return safeMarkdownLiteToHtml(rawText);
}

function appendInlineMarkdownText(parent, value) {
    const parts = String(value ?? '').split(/(\*\*.*?\*\*)/g);

    parts.forEach(part => {
        if (!part) return;

        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            const strong = document.createElement('strong');
            strong.textContent = part.slice(2, -2);
            parent.appendChild(strong);
            return;
        }

        parent.appendChild(document.createTextNode(part));
    });
}

function renderSafeMarkdownLiteToElement(target, rawText) {
    if (!target) return;

    target.replaceChildren();

    const lines = String(rawText ?? '').split('\n');
    let currentList = null;

    const closeList = () => {
        if (!currentList) return;
        target.appendChild(currentList);
        currentList = null;
    };

    lines.forEach(line => {
        const t = String(line ?? '').trim();

        if (t.startsWith('* ') || t.startsWith('- ')) {
            if (!currentList) {
                currentList = document.createElement('ul');
                currentList.style.cssText = 'padding-left:25px;margin:15px 0;border-left:3px solid #ff9800;';
            }

            const li = document.createElement('li');
            li.style.cssText = 'margin-bottom:8px;padding-left:5px;';
            appendInlineMarkdownText(li, t.substring(2));
            currentList.appendChild(li);
            return;
        }

        closeList();

        if (t.startsWith('# ')) {
            const h1 = document.createElement('h1');
            h1.style.cssText = 'color:#333;border-bottom:2px solid #ff9800;padding-bottom:5px;margin-top:20px;font-size:1.5em;';
            appendInlineMarkdownText(h1, t.substring(2));
            target.appendChild(h1);
            return;
        }

        if (t.startsWith('### ')) {
            const h3 = document.createElement('h3');
            h3.style.cssText = 'color:#ff6500;margin-top:15px;font-size:1.2em;';
            appendInlineMarkdownText(h3, t.substring(4));
            target.appendChild(h3);
            return;
        }

        if (t) {
            const par = document.createElement('p');
            par.style.cssText = 'margin:0 0 10px 0;';
            appendInlineMarkdownText(par, t);
            target.appendChild(par);
            return;
        }

        target.appendChild(document.createElement('br'));
    });

    closeList();
}

function setAiBodyFromRaw(body, rawText) {
    if (!body) return;
    body.style.whiteSpace = 'normal';
    renderSafeMarkdownLiteToElement(body, rawText);
    body.dataset.rawText = String(rawText ?? '');
}

function setAiBodyEmpty(body, message = 'Ehhez a részhez még nincs mentett MI-szöveg.') {
    if (!body) return;
    body.style.whiteSpace = 'normal';
    body.replaceChildren();

    const par = document.createElement('p');
    par.style.cssText = 'color:#777;font-style:italic;margin:0;';
    par.textContent = message;
    body.appendChild(par);

    delete body.dataset.rawText;
}

function renderAiTabs(headerTabs, initialType) {
    if (!headerTabs) return;

    headerTabs.replaceChildren();

    Object.keys(AI_TYPES).forEach(key => {
        const type = AI_TYPES[key];
        const btn = document.createElement('button');

        btn.className = `ai-tab-btn ${key === initialType ? 'active' : ''}`.trim();
        btn.dataset.type = key;
        btn.textContent = type.label;

        btn.addEventListener('click', () => {
            headerTabs.querySelectorAll('.ai-tab-btn').forEach(item => item.classList.remove('active'));
            btn.classList.add('active');
            showAiType(btn.dataset.type);
        });

        headerTabs.appendChild(btn);
    });
}

function setButtonLoadingText(button, text) {
    if (!button) return;
    button.replaceChildren(document.createTextNode(text));
}

// ÚJ FÜGGVÉNY: Markdown szöveg átalakítása pdfMake objektumokká
function markdownToPdfMake(text) {
    if (!text) return [];
    const lines = text.split('\n');
    const content = [];
    let currentList = null;

    const parseInlineFormatting = (str) => {
        const parts = str.split(/(\*\*.*?\*\*)/g);
        return parts.map(part => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return { text: part.slice(2, -2), bold: true };
            }
            return part;
        }).filter(p => p !== '');
    };

    for (let line of lines) {
        let trimmed = line.trim();
        
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            if (!currentList) {
                currentList = { ul: [], margin: [15, 5, 0, 10] };
                content.push(currentList);
            }
            currentList.ul.push({ text: parseInlineFormatting(trimmed.substring(2)) });
        } else {
            if (currentList) currentList = null; 

            if (trimmed.startsWith('# ')) {
                content.push({ text: trimmed.substring(2), style: 'h1' });
            } else if (trimmed.startsWith('### ')) {
                content.push({ text: trimmed.substring(4), style: 'h3' });
            } else if (trimmed === '') {
                // Üres sor
            } else {
                content.push({ text: parseInlineFormatting(trimmed), margin: [0, 0, 0, 6] });
            }
        }
    }
    return content;
}
// ====================== AI TÍPUSOK ======================
// JAVÍTÁS: A datasetKey-eknek egyezniük kell azzal, ahogy a dashCRUD.js beolvassa őket!
// Fejlesztési -> aiText, Jellemzés -> aiJellemzes, Értékelés -> aiErtekeles
const AI_TYPES = {
  fejlesztesi: { id: 'fejlesztesi', label: 'Fejlesztési terv2', endpoint: '/api/generate/jellemzes-from-json', saveType: 'fejlesztesi', datasetKey: 'aiText' },
  jellemzes:   { id: 'jellemzes',   label: 'Jellemzés',       endpoint: '/api/generate/jellemzes-detailed', saveType: 'jellemzes', datasetKey: 'aiJellemzes' },
  ertekeles:   { id: 'ertekeles',   label: 'Értékelés',       endpoint: '/api/generate/ertekeles-evaluation', saveType: 'ertekeles', datasetKey: 'aiErtekeles' }
};

// ====================== MODAL ======================
function ensureAiModalExists() {
  if (document.getElementById('ai-modal-overlay')) return;
  const html = `
  <div id="ai-modal-overlay" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);backdrop-filter:blur(5px);z-index:9999;justify-content:center;align-items:center;">
    <div id="ai-modal-container" style="background:#fff;width:95%;max-width:920px;height:88vh;border-radius:12px;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(0,0,0,0.4);overflow:hidden;">
      
      <div id="ai-modal-header">
      <div class="tit">
        <h2 id="ai-modal-main-title" style="margin:0;font-size:1.4rem;color:#333;flex-grow:1;">Egyéni Elemzés</h2>
            <div style="display: flex; gap: 8px; margin-left: 10px;">
                <button id="ai-btn-pdf" class="modulebutt" style="padding: 6px 12px; font-size: 0.9rem;">PDF</button>
                <button id="ai-btn-print" class="modulebutt" style="padding: 6px 12px; font-size: 0.9rem;">Nyomtatás</button>
                <button id="ai-btn-copy" class="modulebutt" style="padding: 6px 12px; font-size: 0.9rem;">Másolás</button>
                <button id="ai-btn-close">×</button>
            </div>
        </div>
        <div id="ai-type-tabs"></div>
      </div>

      <div id="ai-modal-body-wrapper" style="padding:25px;overflow-y:auto;flex-grow:1;background:#fafafa;position:relative;">
        <div id="ai-modal-loading" style="display:none;flex-direction:column;justify-content:center;align-items:center;height:100%;min-height:300px;">
          <div style="border:5px solid #e0e0e0;border-top:5px solid #ff9800;border-radius:50%;width:60px;height:60px;animation:ai-spin 1s linear infinite;"></div>
          <p style="margin-top:25px;font-weight:bold;font-size:1.3rem;color:#ff9800;">Keressünk Értékeket...</p>
        </div>
        <div id="ai-modal-content" style="display:block;">
          <div id="ai-modal-body" style="line-height:1.7;color:#333;font-size:1.1rem;white-space:pre-wrap;margin-bottom:60px;"></div>
        </div>
      </div>

      <div style="background:#fff3e0;padding:12px 20px;text-align:center;border-top:1px solid #ffcc80;font-size:0.9rem;flex-shrink:0;">
        <i>* A mesterséges intelligencia által generált szöveg nem minősül szakvéleménynek. Az MI-funkció név és közvetlen azonosító nélkül, a kérdőívből származó strukturált szakmai adatokat használ. Szabad szöveges megjegyzések nem kerülnek továbbításra.</i>
      </div>
    </div>
  </div>
  <style>
    @keyframes ai-spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    .ai-tab-btn { transition: all 0.2s ease; }
    .ai-tab-btn:hover:not(.active) { background: #f0f0f0; }
  </style>`;
  document.body.insertAdjacentHTML('beforeend', html);
  
  // --- ESEMÉNYKEZELŐK BEKÖTÉSE (old.js alapján) ---
  document.getElementById('ai-btn-close').onclick = closeAiModal;

  // MÁSOLÁS GOMB
  document.getElementById('ai-btn-copy').onclick = () => {
      const title = document.getElementById('ai-modal-main-title').innerText;
      const text = document.getElementById('ai-modal-body').dataset.rawText;
      if (!text) { showAlert('Nincs mit másolni!'); return; }
      
      navigator.clipboard.writeText(`${title}\n\n${text}`)
          .then(() => showAlert('Szöveg sikeresen másolva a vágólapra!'));
  };

  // NYOMTATÁS GOMB
  document.getElementById('ai-btn-print').onclick = () => {
      const title = document.getElementById('ai-modal-main-title').innerText;
      const rawText = document.getElementById('ai-modal-body').dataset.rawText;
      const safeTitle = escapeHTML(title);
      const content = formatTextToHtmlList(rawText);
      if (!rawText) { 
          showAlert('Nincs mit nyomtatni!'); return; 
      }

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
          <html>
          <head>
              <title>${safeTitle}</title>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #000; padding: 20px; max-width: 800px; margin: auto; }
                  h1 { border-bottom: 2px solid #333; padding-bottom: 10px; font-size: 1.5em; }
                  h3 { color: #555; margin-top: 15px; font-size: 1.2em; }
                  ul { margin-top: 10px; margin-bottom: 15px; padding-left: 20px;}
                  li { margin-bottom: 8px; }
                  p { margin-bottom: 15px; }
              </style>
          </head>
          <body>
          <h2>${safeTitle}</h2>
          ${content}
          </body>
          </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
          printWindow.print();
          printWindow.close();
      }, 300);
  };

  // PDF GOMB
  document.getElementById('ai-btn-pdf').onclick = async () => {
      const rawText = document.getElementById('ai-modal-body').dataset.rawText;
      if (!rawText) { showAlert('Nincs mit PDF-be menteni!'); return; }

      if (typeof window.pdfMake === 'undefined') { await import('/both/fonts/pdfmake.min.js'); }
      if (!window.pdfMake?.vfs) { await import('/both/fonts/vfs_fonts.js'); }

      if (typeof window.pdfMake !== 'undefined') {
          // Kiszedjük a jelenleg aktív tab nevét is a cím mellé (pl. Kis Pista - Fejlesztési Terv)
          const activeTab = document.querySelector('.ai-tab-btn.active');
          const tabName = activeTab ? activeTab.innerText : '';
          const title = `${document.getElementById('ai-modal-main-title').innerText} - ${tabName}`;
          
          const safeFileName = `${title.replace(/[/\\?%*:|"<>]/g, '-')}.pdf`;
          const parsedContent = markdownToPdfMake(rawText);

          if (!window.pdfMake.fonts) window.pdfMake.fonts = {};
          
          const timesInVfs = !!pdfMake.vfs['times.ttf'];
          window.pdfMake.fonts.Times = timesInVfs ? {
              normal: 'times.ttf', bold: 'timesbd.ttf', italics: 'timesi.ttf', bolditalics: 'timesbi.ttf'
          } : {
              normal: Object.keys(pdfMake.vfs)[0], bold: Object.keys(pdfMake.vfs)[0],
              italics: Object.keys(pdfMake.vfs)[0], bolditalics: Object.keys(pdfMake.vfs)[0]
          };

          const docDefinition = {
              header: function(currentPage, pageCount, pageSize) {
                  return { text: title, margin: [40, 20, 40, 0], alignment: 'right', color: '#888888', fontSize: 10 };
              },
              footer: function(currentPage, pageCount) {
                  return { text: `${currentPage} / ${pageCount}`, alignment: 'center', margin: [0, 10, 0, 0], fontSize: 10 };
              },
              pageMargins: [40, 60, 40, 60], 
              defaultStyle: { font: 'Times', fontSize: 12, lineHeight: 1.2 },
              fonts: { Times: window.pdfMake.fonts.Times },
              content: [
                  { text: title, style: 'header' },
                  ...parsedContent 
              ],
              styles: {
                  header: { fontSize: 18, bold: true, margin: [0, 0, 0, 15] },
                  h1: { fontSize: 16, bold: true, margin: [0, 10, 0, 5] },
                  h3: { fontSize: 14, bold: true, margin: [0, 8, 0, 5] }
              }
          };
          window.pdfMake.createPdf(docDefinition).download(safeFileName);
      } else {
          document.getElementById('ai-btn-print').click();
          showAlert('A PDF modul nem érhető el, a nyomtatás ablak nyílt meg.');
      }
  };
}

function closeAiModal() {
  const overlay = document.getElementById('ai-modal-overlay');
  if (overlay) overlay.style.display = 'none';
}

function getCurrentCard() {
  return document.querySelector('.meglevok.kijelolt') || window.currentAiCard;
}

let aiBeallitasokCache = null; // Ideiglenes tár, hogy ne töltsük le minden megnyitáskor feleslegesen

// JAVÍTÁS: A dashCRUD.js ezt a függvényt keresi! (openAiSelector)
export async function openAiSelector(btnElement) {
    const cardElement = btnElement.closest('.meglevok') || getCurrentCard();
    if (cardElement) {
        await openAiModal(cardElement, 'fejlesztesi'); // Indításkor a Fejlesztési tervet nyitjuk meg alapból
    }
}

export async function openAiModal(cardElement, initialType = 'fejlesztesi') {
  ensureAiModalExists();
  window.currentAiCard = cardElement;

  const overlay = document.getElementById('ai-modal-overlay');
  const headerTabs = document.getElementById('ai-type-tabs');
  const titleEl = document.getElementById('ai-modal-main-title');

  // Megjelenítjük azonnal, hogy a felület gyorsan reagáljon
  titleEl.textContent = `${cardElement.dataset.nev || 'Ismeretlen'} – ÉRTÉKEK`;
  overlay.style.display = 'flex';

  // 1. Dinamikus címek lekérése a backendről (csak egyszer kérjük le, utána memóriából dolgozik)
  if (!aiBeallitasokCache && typeof modulId !== 'undefined' && modulId) {
      try {
          const res = await fetch(`/api/ai-beallitasok?modulId=${modulId}`);
          const data = await res.json();
          if (data.success && data.adatok) {
              aiBeallitasokCache = data.adatok;
              // Felülírjuk az AI_TYPES alapértelmezett címkéit az adatbázisból érkezőkkel
              if (data.adatok.cim_fejlesztes) AI_TYPES.fejlesztesi.label = data.adatok.cim_fejlesztes;
              if (data.adatok.cim_jellemzes) AI_TYPES.jellemzes.label = data.adatok.cim_jellemzes;
              if (data.adatok.cim_ertekeles) AI_TYPES.ertekeles.label = data.adatok.cim_ertekeles;
          }
      } catch (e) {
          console.error("Nem sikerült betölteni a dinamikus AI címeket:", e);
      }
  }

  // 2. Gombok generálása a fejlécbe (immár a testreszabott címekkel)
  renderAiTabs(headerTabs, initialType);

  showAiType(initialType);
}
function sanitizeForAi(rawJson) {
    if (!rawJson) return {};

    const clean = {};

    for (const [tema, adat] of Object.entries(rawJson)) {
        if (!adat || adat['%'] == null) continue;

        clean[tema] = {
            pct: adat['%'],
            al: {},
            direkt: false
        };

        const alkategoriak = adat.alkategoriak || {};
        const alEntries = Object.entries(alkategoriak);

        if (alEntries.length === 0) {
            clean[tema].direkt = true;
            continue;
        }

        for (const [alKat, alAdat] of alEntries) {
            if (!alAdat) continue;

            const altTemak = alAdat.altTemak || {};
            const altEntries = Object.entries(altTemak);

            const szurtAltémák = altEntries
                .filter(([_, p]) => p < 70 || p === 100)
                .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});

            clean[tema].al[alKat] = {
                pct: alAdat['%'],
                direkt: altEntries.length === 0,
                reszletek: szurtAltémák
            };
        }
    }

    return clean;
}
// Függvény, ami az adott fül tartalmát megjeleníti
async function showAiType(typeKey) {
  const card = getCurrentCard();
  if (!card) return;
  
  const type = AI_TYPES[typeKey];
  const savedText = card.dataset[type.datasetKey] || ''; // Keresés a dashCRUD.js dataset-jében

  const loading = document.getElementById('ai-modal-loading');
  const content = document.getElementById('ai-modal-content');
  const body = document.getElementById('ai-modal-body');
  const wrapper = document.getElementById('ai-modal-body-wrapper');

  // Töröljük a régi gombot, ha van
  const oldBtn = wrapper.querySelector('#ai-generate-btn-dynamic');
  if (oldBtn) oldBtn.remove();

  loading.style.display = 'none';
  content.style.display = 'block';

if (savedText && savedText.trim() !== '') {
    setAiBodyFromRaw(body, savedText);
    createGenerateButton(type, true);
  } else {
    setAiBodyEmpty(body);
    createGenerateButton(type, false);
  }
}
export async function triggerAiAnalysis() {
  const elsoKartya = document.querySelector('.meglevok'); // <-- EZ LEMARADT!
  if (elsoKartya) {
      const remainingOsszMax = parseInt(elsoKartya.dataset.aiOsszMax || 0);
      if (remainingOsszMax <= 0) {
          showAlert('Elfogytak az AI generálási lehetőségei (Globális limit).');
          return false; // Megszakítjuk a futást, nem indul a stream
      }
  }
  try {
    const smartText = await buildAiPromptTextFromSelectedCards();
    console.log('CSOPORTOS AI RAW:', smartText);
    if (!smartText || smartText.length < 50 || smartText.startsWith('Hiba:')) {
      throw new Error(smartText || 'A csoportos adatok generálása sikertelen.');
    }

    // Kinyitjuk a modált a töltőképernyővel
// Kinyitjuk a modált a töltőképernyővel a csoportos elemzéshez
    ensureAiModalExists();
    document.getElementById('ai-modal-main-title').textContent = 'Csoportos Szakmai Értékelés';
    document.getElementById('ai-type-tabs').replaceChildren(); // Csoportosnál nem kellenek az egyéni tabok
    document.getElementById('ai-modal-overlay').style.display = 'flex';
    document.getElementById('ai-modal-loading').style.display = 'flex';
    document.getElementById('ai-modal-content').style.display = 'none';
    window.currentAiCard = null;
    // --- ÚJ RÉSZ: Golyóálló, API-alapú egyéni adatgyűjtés ---
    let egyeniAdatokSzoveg = "";
    const checkedBoxes = document.querySelectorAll('input[type="checkbox"].cheking:checked');

    if (checkedBoxes.length > 0) {
        // Promise.all-t használunk, hogy a 10-20 gyerek adatát egyszerre, párhuzamosan (villámgyorsan) kérje le, ne egyesével várjon rájuk.
        const adatIgeretek = Array.from(checkedBoxes).map(async (checkbox) => {
            const kitoltesDiv = checkbox.closest('.meglevok');
            const sorszam = Array.from(checkedBoxes).indexOf(checkbox) + 1;
            const nev = `Résztvevő #${sorszam}`;
            const kitoltesId = checkbox.dataset.id;

            try {
                // Használjuk a már létező, jól bevált végpontodat a dashCRUD-ból
                const res = await fetch(`/api/get-kitoltes-szazalek?kitoltes_id=${kitoltesId}`);
                const data = await res.json();

                if (data.szazalek) {
                    const raw = typeof data.szazalek === 'string' ? JSON.parse(data.szazalek) : data.szazalek;
                    let legjobbT = "";
                    let leggyengebbT = "";
                    let maxPct = -1;
                    let minPct = 101;

                    // Végigmegyünk a fő témakörökön
                    for (const [tema, obj] of Object.entries(raw || {})) {
                        if (obj && typeof obj['%'] === 'number') {
                            const pct = obj['%'];
                            if (pct > maxPct) { maxPct = pct; legjobbT = tema; }
                            if (pct < minPct) { minPct = pct; leggyengebbT = tema; }
                        }
                    }

                    if (legjobbT && leggyengebbT) {
                        return `- ${nev} (Erősség: ${legjobbT} [${maxPct}%], Fejlesztendő: ${leggyengebbT} [${minPct}%])`;
                    }
                }
            } catch (err) {
                console.warn(`Nem sikerült betölteni a(z) ${nev} adatait:`, err);
            }
            return null; // Ha valami hiba volt, null-t ad vissza
        });

        // Megvárjuk, amíg az összes adat megérkezik, majd összerakjuk egy szöveggé
        const eredmenyek = await Promise.all(adatIgeretek);
        egyeniAdatokSzoveg = eredmenyek.filter(Boolean).join('\n'); // A filter(Boolean) kiszedi a null értékeket
        
    } else {
        egyeniAdatokSzoveg = "Nem állnak rendelkezésre egyéni adatok.";
    }
    // --- ÚJ RÉSZ VÉGE ---

    // Módosított fetch hívás a backend felé (hozzáfűzve az egyeniAdatok mezőt)
    const response = await fetch('/api/generate/jellemzes-from-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
    raw: smartText, 
    egyeniAdatok: egyeniAdatokSzoveg
})
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Ismeretlen szerverhiba' }));
      throw new Error(`Szerverhiba (${response.status}): ${errorData.message}`);
    }

 const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    // Előre betöltjük a narancssárga címet és a soremelést a szövegbe!
    let fullTextBuffer = `### Csoportos Szakmai Értékelés\n\n`; 
    let printBuffer = `### Csoportos Szakmai Értékelés\n\n`;    
    let isFirstChunk = true;
    const bodyDiv = document.getElementById('ai-modal-body');

   while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        bodyDiv.style.whiteSpace = 'normal';
        setAiBodyFromRaw(bodyDiv, fullTextBuffer);
        break; 
      }

      buffer += decoder.decode(value, { stream: true }); 
      let lines = buffer.split('\n');
      buffer = lines.pop(); 

      for (const line of lines) {
        // --- ÚJ RÉSZ: Szerver üzenetének (Fallback váltás) figyelése ---
        if (line.trim() === ': MODEL_CHANGE') {
            const loadingText = document.querySelector('#ai-modal-loading p');
            if (loadingText) {
                loadingText.innerText = "Modellváltás, rögtön készen vagyunk...";
                loadingText.style.color = "#d32f2f"; // Opcionális: Pirosra vagy más színre váltás
            }
            continue; 
        }

        if (line.startsWith('data: ')) {
          // Ha adat érkezik, eltüntetjük a betöltőt
          if (isFirstChunk) {
            document.getElementById('ai-modal-loading').style.display = 'none';
            document.getElementById('ai-modal-content').style.display = 'block';
            isFirstChunk = false;
          }

          const dataChunk = line.substring(6).trim();
          
          if (dataChunk === '[DONE]') {
            bodyDiv.style.whiteSpace = 'normal';
            setAiBodyFromRaw(bodyDiv, fullTextBuffer);
           fetch('/api/decrease-global-quota', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
})
.then(() => {
                // Végigmegyünk az összes kártyán, és levonunk egyet a memóriában lévő kvótából,
                // így a következő kattintásnál már a frissített limit lesz érvényben.
                document.querySelectorAll('.meglevok').forEach(kartya => {
                    let aktualis = parseInt(kartya.dataset.aiOsszMax || 0);
                    if (aktualis > 0) kartya.dataset.aiOsszMax = aktualis - 1;
                });
            }).catch(err => console.error('Kvóta levonási hiba:', err));
            return true; 
          }
          
          try {
            const payload = JSON.parse(dataChunk); 
            const textDelta = payload.choices?.[0]?.delta?.content || '';
            if (textDelta) {
                fullTextBuffer += textDelta;
                printBuffer += textDelta;
                
                let lastSpace = printBuffer.lastIndexOf(' ');
                if (lastSpace > -1) {
                    bodyDiv.appendChild(document.createTextNode(printBuffer.substring(0, lastSpace + 1)));
                    printBuffer = printBuffer.substring(lastSpace + 1);
                }
            }
          } catch (e) {}
        } 
      } 
    }
    return true;

  } catch (err) {
    console.error('AI elemzés hiba (stream):', err);
    showAlert(`Hiba történt az AI elemzés során: ${err.message}`);
    closeAiModal();
    return false;
  }
}

// AI CSOPORTOS JELLEMZÉS GOMB KEZELŐJE
const aiBtn = document.getElementById('ai-generate-btn');
if (aiBtn && !aiBtn.dataset.listenerAdded) {
  aiBtn.addEventListener('click', async () => {
    if (window.__pdfBusy) return;
    window.__pdfBusy = true;
    
    const oldNodes = Array.from(aiBtn.childNodes).map(node => node.cloneNode(true)); 
    aiBtn.disabled = true;
    setButtonLoadingText(aiBtn, 'Indítás...'); 

    try {
      await triggerAiAnalysis();
    } catch (err) {
      console.error('AI elemzés hiba:', err);
    } finally {
      aiBtn.disabled = false;
      aiBtn.replaceChildren(...oldNodes); 
      window.__pdfBusy = false;
    }
  });
  aiBtn.dataset.listenerAdded = 'true';
}

async function buildAiPromptTextFromSelectedCards() {
  const checkedBoxes = Array.from(
    document.querySelectorAll('input[type="checkbox"].cheking:checked')
  );

  if (checkedBoxes.length === 0) {
    return 'Hiba: Nincs kijelölt értékelés a csoportos elemzéshez.';
  }

  const rows = [];

  await Promise.all(checkedBoxes.map(async (checkbox, index) => {
    const kitoltesId = checkbox.dataset.id;
    if (!kitoltesId) return;

    try {
      const res = await fetch(`/api/get-kitoltes-szazalek?kitoltes_id=${encodeURIComponent(kitoltesId)}`);
      const data = await res.json();

      if (!data || !data.szazalek) return;

      const raw = typeof data.szazalek === 'string'
        ? JSON.parse(data.szazalek)
        : data.szazalek;

      rows.push({
        label: `Résztvevő #${index + 1}`,
        szazalek: raw
      });
    } catch (err) {
      console.warn(`Csoportos AI százalék lekérési hiba (${kitoltesId}):`, err);
    }
  }));

  if (rows.length === 0) {
    return 'Hiba: A kijelölt értékelésekhez nem található százalékos adat.';
  }

  const sums = {};
  const counts = {};
  const részletek = {};

  rows.forEach(row => {
    for (const [tema, obj] of Object.entries(row.szazalek || {})) {
      if (!tema) continue;

      let pct = null;
      if (obj && typeof obj === 'object') {
        pct = Number(obj['%'] ?? obj.percent);
      } else {
        pct = Number(obj);
      }

      if (!Number.isFinite(pct)) continue;

      sums[tema] = (sums[tema] || 0) + pct;
      counts[tema] = (counts[tema] || 0) + 1;

      if (!részletek[tema]) {
        részletek[tema] = {};
      }

      const alkategoriak = obj && typeof obj === 'object' ? (obj.alkategoriak || {}) : {};
      for (const [alKatNev, alKatAdat] of Object.entries(alkategoriak)) {
        if (!alKatAdat || typeof alKatAdat !== 'object') continue;

        const alPct = Number(alKatAdat['%'] ?? alKatAdat.percent);
        if (!Number.isFinite(alPct)) continue;

        if (!részletek[tema][alKatNev]) {
          részletek[tema][alKatNev] = { sum: 0, count: 0, altTemak: {} };
        }

        részletek[tema][alKatNev].sum += alPct;
        részletek[tema][alKatNev].count += 1;

        const altTemak = alKatAdat.altTemak || {};
        for (const [altNev, altAdat] of Object.entries(altTemak)) {
          let altPct = null;
          if (altAdat && typeof altAdat === 'object') {
            altPct = Number(altAdat['%'] ?? altAdat.percent);
          } else {
            altPct = Number(altAdat);
          }

          if (!Number.isFinite(altPct)) continue;

          if (!részletek[tema][alKatNev].altTemak[altNev]) {
            részletek[tema][alKatNev].altTemak[altNev] = { sum: 0, count: 0 };
          }

          részletek[tema][alKatNev].altTemak[altNev].sum += altPct;
          részletek[tema][alKatNev].altTemak[altNev].count += 1;
        }
      }
    }
  });

  const parsed = Object.keys(sums)
    .map(name => ({
      name,
      pct: Math.round(sums[name] / counts[name])
    }))
    .filter(x => x.name && Number.isFinite(x.pct))
    .sort((a, b) => b.pct - a.pct);

  if (parsed.length < 3) {
    return 'Hiba: Legalább 3 értelmezhető fő kategória szükséges a csoportos AI elemzéshez.';
  }

  const nums = parsed.map(p => p.pct).sort((a, b) => a - b);
  const n = nums.length;
  const avg = Math.round(nums.reduce((s, v) => s + v, 0) / n);
  const med = n % 2
    ? nums[(n - 1) / 2]
    : Math.round((nums[n / 2 - 1] + nums[n / 2]) / 2);

  const sortedDesc = [...parsed].sort((a, b) => b.pct - a.pct);
  const top2 = sortedDesc.slice(0, 2);
  const low2 = [...sortedDesc].reverse().slice(0, 2);
  const kiemeltek = [...top2, ...low2];

  let prompt = '';
  prompt += `Elemzés ${rows.length} fő bevonásával készült.\n\n`;
  prompt += `ÖSSZESÍTETT EREDMÉNYEK (${n} fő kategória):\n`;
  prompt += `Átlag: ${avg}%, Medián: ${med}%\n\n`;

  prompt += 'FŐ KATEGÓRIÁK ÁTLAGAI:\n';
  sortedDesc.forEach(kat => {
    prompt += `- ${kat.name}: ${kat.pct}%\n`;
  });

  prompt += '\n--- KIEMELT KATEGÓRIÁK RÉSZLETES LEBONTÁSA ---\n';

  kiemeltek.forEach(kat => {
    prompt += `\nKategória: "${kat.name}" (Összesített: ${kat.pct}%)\n`;

    const alkatok = részletek[kat.name] || {};
    const alkatEntries = Object.entries(alkatok)
      .map(([nev, adat]) => ({
        nev,
        pct: Math.round(adat.sum / adat.count),
        altTemak: adat.altTemak || {}
      }))
      .filter(x => x.nev && Number.isFinite(x.pct))
      .sort((a, b) => b.pct - a.pct);

    if (!alkatEntries.length) {
      prompt += '  - Részletes alkategória bontás nem áll rendelkezésre.\n';
      return;
    }

    alkatEntries.forEach(alkat => {
      prompt += `  - Alkategória: ${alkat.nev} (${alkat.pct}%)\n`;

      const altEntries = Object.entries(alkat.altTemak)
        .map(([nev, adat]) => ({
          nev,
          pct: Math.round(adat.sum / adat.count)
        }))
        .filter(x => x.nev && Number.isFinite(x.pct))
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 8);

      altEntries.forEach(alt => {
        prompt += `    - ${alt.nev}: ${alt.pct}%\n`;
      });
    });
  });

  return prompt;
}

function buildAiPromptText() {
  let prompt = "";
  const reszletesAdatok = parseSummaryTableToObject();
  const szemelyekSzama = document.querySelectorAll('#vizsgaltSzemelyek .vizsgalt-tag').length || 8; 
  prompt += `Elemzés ${szemelyekSzama} fő bevonásával készült.\n\n`;

  const barLegendItems = readBarLegendItems(); 
  const parsed = barLegendItems.map(it => {
const m = it.label.match(/^(.*?)\s*[:\-–]?\s*(\d{1,3})\s*%/);
      const name = (m ? m[1] : it.label).trim();
      const pct = m ? +m[2] : null;
      return { name, pct };
  }).filter(x => x.pct !== null);

  if (parsed.length === 0) return "Hiba: A fő kategóriák adatai hiányoznak az elemzéshez.";

  const nums = parsed.map(p => p.pct).sort((a, b) => a - b);
  const n = nums.length;
  const avg = Math.round(nums.reduce((s, v) => s + v, 0) / n);
  const med = n % 2 ? nums[(n - 1) / 2] : Math.round((nums[n / 2 - 1] + nums[n / 2]) / 2);
  
  prompt += `ÖSSZESÍTETT EREDMÉNYEK (${n} fő kategória):\nÁtlag: ${avg}%, Medián: ${med}%\n\n`;
  prompt += "FŐ KATEGÓRIÁK ÁTLAGAI:\n";
  const sortedDesc = [...parsed].sort((a, b) => b.pct - a.pct);
  sortedDesc.forEach(kat => { prompt += `- ${kat.name}: ${kat.pct}%\n`; });

  const top2 = sortedDesc.slice(0, 2);
  const low2 = [...sortedDesc].reverse().slice(0, 2);
  const kiemeltek = [...top2, ...low2];

  prompt += "\n--- KIEMELT KATEGÓRIÁK RÉSZLETES LEBONTÁSA ---\n";
  
  kiemeltek.forEach(kat => {
    const detailKey = kat.name.toUpperCase();
    const detail = reszletesAdatok[detailKey];
    if (detail) {
      prompt += `\nKategória: "${detail.nev}" (Összesített: ${detail['%']}%)\n`;
      for (const [alkatKey, alkatData] of Object.entries(detail.alkategoriak)) {
        prompt += `  - Alkategória: ${alkatData.nev} (${alkatData['%']}%)\n`;
        for (const [altemaNev, altemaPct] of Object.entries(alkatData.altTemak)) {
          prompt += `    - ${altemaNev}: ${altemaPct}%\n`;
        }
      }
    } else {
       prompt += `\nKategória: "${kat.name}" (${kat.pct}%) - Részletes lebontás nem található.\n`;
    }
  });
  return prompt;
}
function parseSummaryTableToObject() {
  const table = document.querySelector('#szumm-fa table');
  if (!table) return {};

  const data = {};
  let currentFotema = '', currentFotemaKey = '';
  let currentAlkat = '', currentAlkatKey = '';

  for (const row of table.rows) {
    const cells = Array.from(row.cells).map(cell => cell.innerText.trim());
    let cellIndex = 0;

    if (row.cells[cellIndex] && !row.cells[cellIndex].hasAttribute('data-placeholder')) { 
      const fotemaText = cells[cellIndex] || '';
      if (fotemaText) {
        const match = fotemaText.match(/^(.*?)\s*(\d{1,3})%/);
        currentFotemaKey = match ? match[1].trim().toUpperCase() : fotemaText.toUpperCase(); 
        currentFotema = match ? match[1].trim() : fotemaText; 
        
        data[currentFotemaKey] = {
          nev: currentFotema,
          '%': match ? parseInt(match[2], 10) : null,
          alkategoriak: {}
        };
        cellIndex++; 
      }
    }
    const alkatText = cells[cellIndex] || '';
    if (alkatText && currentFotemaKey) {
      const match = alkatText.match(/^(.*?)\s*(\d{1,3})%/);
      currentAlkatKey = match ? match[1].trim() : alkatText;
      
      data[currentFotemaKey].alkategoriak[currentAlkatKey] = {
        nev: currentAlkatKey,
        '%': match ? parseInt(match[2], 10) : null,
        altTemak: {}
      };
      cellIndex++; 
    }
    const altemaText = cells[cellIndex] || '';
    if (altemaText && currentFotemaKey && currentAlkatKey) {
      const match = altemaText.match(/^(.*?)\s*(\d{1,3})%/);
      if (match) {
        const altemaName = match[1].trim();
        const altemaPct = parseInt(match[2], 10);
        if (data[currentFotemaKey].alkategoriak[currentAlkatKey]) {
          data[currentFotemaKey].alkategoriak[currentAlkatKey].altTemak[altemaName] = altemaPct;
        }
      }
    }
  }
  return data;
}

// Dinamikus gomb létrehozó (Hogy mindig a jó végpontot hívja)
function createGenerateButton(type, isRegenerate) {
  const wrapper = document.getElementById('ai-modal-body-wrapper');
  const btn = document.createElement('button');
  btn.id = 'ai-generate-btn-dynamic';
  btn.className = 'modulebutt';
  btn.style.cssText = 'position: sticky; bottom: 90%; left: 90%; background: rgb(255, 132, 81); color: white; padding: 14px; font-family: system-ui;';
  
  const icon = document.createElement('span');
  icon.className = 'material-symbols-rounded';
  icon.textContent = isRegenerate ? 'refresh' : 'auto_awesome';

  const label = document.createTextNode(isRegenerate ? ' Újragenerálás' : ' Generálás');

  btn.append(icon, label);

  btn.onclick = () => triggerIndividualAiAnalysisByType(type);
  wrapper.appendChild(btn);
}

// Maga a generálás és mentés
export async function triggerIndividualAiAnalysisByType(type) {
  const card = getCurrentCard();
  if (!card) return;
  const kitoltesId = card.dataset.kitoltesId;

  if (!kitoltesId) {
    showAlert('Hiányzik az értékelés azonosítója, ezért az AI generálás nem indítható.');
    return;
  }

  // Kvóta ellenőrzés
  if (parseInt(card.dataset.aiKitMax || 10) <= 0) {
    showAlert('Ehhez az értékeléshez már nem indíthatsz új AI elemzést (limit elérve).');
    return;
  }

  // ADATVÉDELMI MÓDOSÍTÁS:
  // Nem küldünk frontendről nyers kérdés-válasz tömböt, szabad szöveges megjegyzést,
  // DOM-ból vett strukturált szöveget vagy nevet. A backend a kitoltesId alapján,
  // saját jogosultságellenőrzés után építi fel a név nélküli, kontrollált kérdőívállítás-csomagot.

  const loading = document.getElementById('ai-modal-loading');
  const content = document.getElementById('ai-modal-content');
  const body = document.getElementById('ai-modal-body');

  loading.style.display = 'flex';
  content.style.display = 'none';

  // Töröljük a gombot generálás közben
  const dynamicBtn = document.getElementById('ai-generate-btn-dynamic');
  if (dynamicBtn) dynamicBtn.style.display = 'none';

  try {
    const response = await fetch(type.endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        kitoltesId,
        aiType: type.id
      })
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || `Szerver hiba (Státusz: ${response.status})`);
    }

const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    // Előre betöltjük a narancssárga címet és a soremelést a szövegbe!
    let fullTextBuffer = `### ${type.label}\n\n`; 
    let printBuffer = `### ${type.label}\n\n`;
    let isFirstChunk = true;

    while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
            // Ha végzett a stream, megformázzuk a teljes kész szöveget
            body.style.whiteSpace = 'normal';
            setAiBodyFromRaw(body, fullTextBuffer);
            break;
        }

        // Hozzáadjuk a töredéket a pufferhez
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        // A legutolsó (lehet, hogy nem teljes) sort visszatesszük a pufferbe a következő körre!
        buffer = lines.pop();

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const chunk = line.substring(6).trim();
                
                if (chunk === '[DONE]') {
                    body.style.whiteSpace = 'normal';
                    setAiBodyFromRaw(body, fullTextBuffer);
                    break; 
                }
                
                // Amint megjön az első valódi adat, eltüntetjük a töltőképernyőt
                if (isFirstChunk) {
                    loading.style.display = 'none';
                    content.style.display = 'block';
                    isFirstChunk = false;
                }

                try {
                    const payload = JSON.parse(chunk);
                    const textDelta = payload.choices?.[0]?.delta?.content || '';
                    if (textDelta) {
                        fullTextBuffer += textDelta;
                        printBuffer += textDelta;
                        
                        // Látványos streamelés (szavankénti megjelenítés a felületen)
                        let lastSpace = printBuffer.lastIndexOf(' ');
                        if (lastSpace > -1) {
                            body.appendChild(document.createTextNode(printBuffer.substring(0, lastSpace + 1)));
                            printBuffer = printBuffer.substring(lastSpace + 1);
                        }
                    }
                } catch(e) {
                    // Ha a JSON mégis hibás lenne, csendben kihagyjuk, a buffer megment minket
                }
            }
        }
    }

    // MENTÉS az adatbázisba
    const saveResponse = await fetch('/api/save-ai-text', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
body: JSON.stringify({
    kitoltesId,
    aiText: fullTextBuffer,
    type: type.saveType
})    });
    
    if (saveResponse.ok) {
        card.dataset.aiKitMax = Math.max(0, parseInt(card.dataset.aiKitMax || 10) - 1);
        card.dataset.aiOsszMax = Math.max(0, parseInt(card.dataset.aiOsszMax || 100) - 1);
    }

    card.dataset[type.datasetKey] = fullTextBuffer;
    setAiBodyFromRaw(body, fullTextBuffer);
     // --------------------------------
    loading.style.display = 'none';
    content.style.display = 'block';
    
    if (dynamicBtn) dynamicBtn.remove();
    createGenerateButton(type, true);

    showAlert(`${type.label} sikeresen elmentve!`);

  } catch (err) {
    console.error(err);
    loading.style.display = 'none';
    content.style.display = 'block';
    if (dynamicBtn) dynamicBtn.style.display = 'block';
    showAlert('Hiba történt az AI generálás során.');
  }
}