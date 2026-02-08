import { modulId, animateMessage } from './dashMain.js';
import { readBarLegendItems } from './dashPDF.js';
import { showAlert } from '/both/alert.js';

async function triggerAiAnalysis() {
  const outputContainer = document.getElementById('Kimenet');
  const esszeDiv = document.getElementById('kimenetEssze');
  const tabla = document.querySelector('#szumm-fa table');
  const loadingOverlay = document.getElementById('loading-overlay'); 

  if (!esszeDiv || !tabla || !outputContainer || !loadingOverlay) {
    console.warn('AI elemzéshez szükséges HTML elemek hiányoznak.');
    return false;
  }

  // --- 1. Stopper indítása ---
  const startTime = Date.now();

  outputContainer.style.display = 'none';
  outputContainer.style.opacity = '0';
  outputContainer.style.transition = 'opacity 0.5s ease-in-out';
  esszeDiv.textContent = ''; 
  
  loadingOverlay.style.display = 'flex';
  animateMessage('Elemzés folyamatban...', '2rem', 'orange');

  let buffer = '';
  let textBuffer = ''; 

  try {
    const smartText = buildAiPromptText(); 
    if (smartText.length < 50) {
      throw new Error('A sűrített adatok generálása sikertelen.');
    }

    // --- 2. Adatok lekérése ---
    const response = await fetch('/api/generate/jellemzes-from-text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          raw: smartText,
          modulId: modulId 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Ismeretlen szerverhiba' }));
      throw new Error(`Szerverhiba (${response.status}): ${errorData.message}`);
    }

    // --- 3. Időellenőrzés (Egyszerű matek) ---
    const elapsed = Date.now() - startTime;
    if (elapsed < 8000) {
        // Ha gyorsabb volt mint 8mp, kivárjuk a maradékot
        await new Promise(resolve => setTimeout(resolve, 8000 - elapsed));
    }

    // --- 4. Töltő levétele és megjelenítés ---
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    loadingOverlay.style.display = 'none';
    outputContainer.style.display = 'block';
    setTimeout(() => { outputContainer.style.opacity = '1'; }, 20);

   while (true) {
      const { done, value } = await reader.read();
      if (done) {
        esszeDiv.textContent += textBuffer;
        break; 
      }

      buffer += decoder.decode(value, { stream: true }); 
      let lines = buffer.split('\n');
      buffer = lines.pop(); 

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataChunk = line.substring(6).trim();
          
          if (dataChunk === '[DONE]') {
            esszeDiv.textContent += textBuffer;
            return true; 
          }
          
          let payload;
          try {
            payload = JSON.parse(dataChunk); 
          } catch (e) { 
            console.warn('Invalid JSON chunk from stream:', dataChunk); 
            continue; 
          }
          const textDelta = payload.choices?.[0]?.delta?.content || '';
          if (textDelta) {
              textBuffer += textDelta;
              let lastSpace = textBuffer.lastIndexOf(' ');
              
              if (lastSpace > -1) {
                esszeDiv.textContent += textBuffer.substring(0, lastSpace + 1);
                textBuffer = textBuffer.substring(lastSpace + 1);
              }
          }
        } 
      } 
    } 
    
    return true;

  } catch (err) {
    console.error('AI elemzés hiba (stream):', err);
    showAlert(`Hiba történt az AI elemzés során: ${err.message}`);
    
    loadingOverlay.style.display = 'none';
    outputContainer.style.display = 'block';
    setTimeout(() => { outputContainer.style.opacity = '1'; }, 20);
    return false;
  }
  
}

// AI JELLEMZÉS GOMB KEZELŐJE
const aiBtn = document.getElementById('ai-generate-btn');
if (aiBtn && !aiBtn.dataset.listenerAdded) {
  aiBtn.addEventListener('click', async () => {
    if (window.__pdfBusy) return;
    window.__pdfBusy = true;
    const oldText = aiBtn.textContent;
    aiBtn.disabled = true;
    aiBtn.textContent = 'Egy pillanat...';

    try {
      await triggerAiAnalysis();
    } catch (err) {
      console.error('AI elemzés hiba:', err);
    } finally {
      aiBtn.disabled = false;
      aiBtn.textContent = oldText;
      window.__pdfBusy = false;
    }
  });
  aiBtn.dataset.listenerAdded = 'true';
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
    // 2. ALKATEGÓRIA Cella
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

    // 3. ALTÉMA Cella
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

function buildAiPromptText() {
  let prompt = "";
  const reszletesAdatok = parseSummaryTableToObject();
  
  // 1. Kontextus: Hány fő?
  const szemelyekSzama = document.querySelectorAll('#vizsgaltSzemelyek .vizsgalt-tag').length || 8; 
  prompt += `Elemzés ${szemelyekSzama} fő bevonásával készült.\n\n`;

  // 2. Fő kategóriák és aggregált statisztika
  const barLegendItems = readBarLegendItems(); 
  const parsed = barLegendItems.map(it => {
      const m = it.label.match(/^(.*?)\s+(\d{1,3})\s*%/);
      const name = (m ? m[1] : it.label).trim();
      const pct = m ? +m[2] : null;
      return { name, pct };
  }).filter(x => x.pct !== null);

  if (parsed.length === 0) {
    console.error("buildAiPromptText: Nincsenek kategória adatok (barLegendItems üres).");
    return "Hiba: A fő kategóriák adatai hiányoznak az elemzéshez.";
  }

  const nums = parsed.map(p => p.pct).sort((a, b) => a - b);
  const n = nums.length;
  const avg = Math.round(nums.reduce((s, v) => s + v, 0) / n);
  const med = n % 2 ? nums[(n - 1) / 2] : Math.round((nums[n / 2 - 1] + nums[n / 2]) / 2);
  
  prompt += `ÖSSZESÍTETT EREDMÉNYEK (${n} fő kategória):\nÁtlag: ${avg}%, Medián: ${med}%\n\n`;
  
  // 3. fő kategória listája
  prompt += "FŐ KATEGÓRIÁK ÁTLAGAI:\n";
  const sortedDesc = [...parsed].sort((a, b) => b.pct - a.pct);
  sortedDesc.forEach(kat => {
    prompt += `- ${kat.name}: ${kat.pct}%\n`;
  });

  // 4. RÉSZLETES LEBONTÁS (Top 2 és Low 2)
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
  
  console.log("AI számára generált prompt szöveg:", prompt);
  return prompt;
}

// --- EGYÉNI JELLEMZÉS (Ugyanaz a logika) ---
export async function triggerIndividualAiAnalysis(callerBtn = null) {
  const outputContainer = document.getElementById('egyeni-ai-kimenet');
  const loadingOverlay = document.getElementById('loading-overlay'); 

  if (!outputContainer || !loadingOverlay) {
    console.warn('Egyéni AI elemzéshez szükséges HTML elemek hiányoznak.');
    return false;
  }
  
  if (!window.ertekelesJSON || Object.keys(window.ertekelesJSON).length < 3) {
    showAlert('Nincs elegendő adat az elemzéshez. Legalább 3 témakört értékelnie kell a generáláshoz.');
    return false;
  }

  // --- 1. Stopper indítása ---
  const startTime = Date.now();

  outputContainer.textContent = ''; 
  
  loadingOverlay.style.display = 'flex';
    loadingOverlay.style.opacity = '1';

  animateMessage('Elemzés folyamatban...', '2rem', 'orange');
  
  if (callerBtn) {
    callerBtn.style.pointerEvents = 'none';
  }

  let buffer = '';
  let textBuffer = ''; 

  try {
    // --- 2. Adatok lekérése ---
    const response = await fetch('/api/generate/jellemzes-from-json', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          jsonData: window.ertekelesJSON, 
          modulId: modulId 
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Ismeretlen szerverhiba' }));
      throw new Error(`Szerverhiba (${response.status}): ${errorData.message}`);
    }

    // --- 3. Időellenőrzés (Egyszerű matek) ---
    const elapsed = Date.now() - startTime;
    if (elapsed < 8000) {
        // Ha gyorsabb volt mint 8mp, kivárjuk a maradékot
        await new Promise(resolve => setTimeout(resolve, 8000 - elapsed));
    }

    // --- 4. Töltő levétele és adatfeldolgozás ---
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    loadingOverlay.style.display = 'none';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        outputContainer.textContent += textBuffer;
        break; 
      }

      buffer += decoder.decode(value, { stream: true }); 
      let lines = buffer.split('\n');
      buffer = lines.pop(); 

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataChunk = line.substring(6).trim();
          
          if (dataChunk === '[DONE]') {
            outputContainer.textContent += textBuffer;
            return true; 
          }
          
          let payload;
          try { payload = JSON.parse(dataChunk); } catch (e) { continue; }
          
          const textDelta = payload.choices?.[0]?.delta?.content || '';
          if (textDelta) {
              textBuffer += textDelta;
              let lastSpace = textBuffer.lastIndexOf(' ');
              
              if (lastSpace > -1) {
                outputContainer.textContent += textBuffer.substring(0, lastSpace + 1);
                textBuffer = textBuffer.substring(lastSpace + 1);
              }
          }
        } 
      } 
    } 
    
    return true;

  } catch (err) {
    console.error('Egyéni AI elemzés hiba (stream):', err);
    showAlert(`Hiba történt az AI elemzés során: ${err.message}`);
    loadingOverlay.style.display = 'none';
    return false;
  } finally {
     if (callerBtn) {
       callerBtn.style.pointerEvents = 'auto';
     }
  }
}