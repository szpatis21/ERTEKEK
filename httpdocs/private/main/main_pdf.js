//PDF Generálási beállítások - Ez exportátva van a dashboard felületre
import { KategoriaKezelo } from './main_quest.js';

export async function generatePdfMakePDF(nyomtataskent = false, meglevok = null) {


 try {
    // 1. Dinamikusan betöltjük a pdfmake könyvtárat és a betűtípusokat
    // FONTOS: A './libs/...' útvonalakat cseréld le a te valós útvonalaidra!
// main_pdf.js fájlban:


    // 2. Összekapcsoljuk a betűtípusokat a pdfmake-kel
   await import('/both/fonts/pdfmake.min.js'); 
    const pdfFontsModule = await import('/both/fonts/vfs_fonts.js');

 document.querySelectorAll('.pontA, .pontB, .pontC, .pontD, .pontE, .pontF')
    .forEach(elem => {
         // Törlés helyett inkább csak rejtsük el vizuálisan, ha zavaró lenne
         elem.style.display = 'none'; 
    });

  const keszulo = document.getElementById('keszulo');
  if (!keszulo) return;


  // ⬇️ csak a megnyitott értékelőből olvasunk
 const p1 = meglevok?.dataset?.nev?.toUpperCase()
        || keszulo.querySelector('.vizsgalt-nev strong')?.textContent.trim().toUpperCase()
        || '';

  const p2 = keszulo.querySelector('#kitneve')?.textContent.trim().toUpperCase()
          || keszulo.querySelector('.meglevok')?.dataset?.megnev?.toUpperCase()
          || 'ÉRTÉKELÉS';

  const kitoltesNevFile = `${p1} ${p2}`.trim();
  const kitoltesNevCim  = `${p1}\n${p2}`.trim();
  const content = [{ text: kitoltesNevCim, style: 'kitoltesCim' }];
  let docImages = {};
  // ⬇️ ez is lokális
  const fej2 = keszulo.querySelector('.fej2');
  if (fej2) {
    const fej2Szovegek = Array.from(fej2.querySelectorAll('p')).map(p => p.textContent.trim());
    if (fej2Szovegek.length > 0) {
      content.push({
        columns: fej2Szovegek.map(szoveg => ({ text: szoveg, style: 'fej2Elem', alignment: 'center' })),
        columnGap: 30
      });
    }
  }

const chartCanvas = document.getElementById('fokategoriaChart');
  if (chartCanvas) {
    try {
      const chartImage = chartCanvas.toDataURL('image/png');
      
      // 2. Mentsd el a base64 kódot a szótárba egy egyedi azonosítóval
      docImages['foChartImg'] = chartImage; 
      
      content.push({
        image: 'foChartImg', // 3. Itt már csak az azonosítóra hivatkozz
        fit: [250, 250],    // A width: 500 helyett használd a fit-et (500px széles, max 1000px magas doboz)
        alignment: 'center',
        margin: [0, 20, 0, 30]
      });
    } catch (error) {
      console.warn("Nem sikerült a diagramot képként a PDF-hez adni:", error);
    }
  }

  
    const foKategoriak = keszulo.querySelectorAll('.fo-kategoria');
    foKategoriak.forEach(foDiv => {
      const blokkTartalom = [];
  
      // Főkategória cím
      const h3 = foDiv.querySelector('h3');
      if (h3) {
        blokkTartalom.push({ text: h3.childNodes[0].textContent.trim(), style: 'foKategoria' });
      }
  
      // Sorok a táblázatban
      const sorok = foDiv.querySelectorAll('tbody > tr');
      sorok.forEach(sor => {
        if (sor.classList.contains('al-kategoria')) {
          const td = sor.querySelector('td');
          if (td) blokkTartalom.push({ text: td.textContent.trim(), style: 'alKategoria' });
  
        } else if (sor.classList.contains('alt-tema')) {
          const altNev = sor.querySelector('td.alt-tema')?.childNodes[0]?.textContent.trim() || '';
          blokkTartalom.push({
            text: [
              { text: altNev, decoration: 'underline' },
              { text: '' }
            ],
            style: 'altTema'
          });
  
          const kerdesek = sor.querySelectorAll('.kerdes-container');
          kerdesek.forEach(kont => {
            kont.querySelectorAll('p.fokerd').forEach(p => {
              const fokerdesSzoveg = Array.from(p.childNodes)
                .filter(n => n.nodeType === Node.TEXT_NODE)
                .map(n => n.textContent.trim())
                .join(' ');
            
              const alkerdesek = Array.from(kont.querySelectorAll('p.alkerd'))
                .map(p => Array.from(p.childNodes)
                  .filter(n => n.nodeType === Node.TEXT_NODE)
                  .map(n => n.textContent.trim())
                  .join(' ')
                )
                .filter(szoveg => szoveg.length > 0);
            
              if (alkerdesek.length > 0) {
                const alkMondat = alkerdesek
                  .map((s, i) => i === alkerdesek.length - 1 ? s + '.' : s + ',')
                  .join(' ');
            
                  blokkTartalom.push({
                    text: [
                      { text: fokerdesSzoveg + ': ', style: 'fokerdes' },
                      { text: alkMondat, style: 'alkerdes' }
                    ],
                    margin: [15, 2, 0, 2]
                  });
              } else {
                blokkTartalom.push({
                  text: fokerdesSzoveg,
                  style: 'fokerdes',
                  margin: [15, 2, 0, 2]
                });
              }
            });

          });
        }
      });
  
      // Főkategória blokk keretbe
      content.push({
        table: {
          widths: ['*'],
          body: [[{ stack: blokkTartalom }]]
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: (i) => (i === 0 ? 1 : 0),
          vLineColor: () => '#444444',
          paddingLeft: () => 10,
          paddingRight: () => 5,
          paddingTop: () => 5,
          paddingBottom: () => 5
        },
        margin: [0, 10, 0, 10]
      });
    });
  
    const docDefinition = {
      content,
      images: docImages, 
      fonts: {
    Times: {
      normal: 'Times-Roman.ttf',
      bold: 'Times-Bold.ttf',
      italics: 'Times-Italic.ttf',
      bolditalics: 'Times-BoldItalic.ttf'
    }},
      styles: {
        kitoltesCim: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        fej2Elem: {
          italics: true,
          fontSize: 11,
          color: '#444',
          margin: [0, 0, 0, 5]
        },
        foKategoria: {
          fontSize: 15,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 8]
        },
        alKategoria: {
          fontSize: 13,
          bold: true,
          margin: [0, 5, 0, 3]
        },
        altTema: {
          fontSize: 12,
          decoration: 'underline',
          margin: [10, 4, 0, 4]
        },
        fokerdes: {
          fontSize: 12,
          bold: true,
          margin: [15, 2, 0, 0]
        }
        ,
        alkerdes: {
          fontSize: 11
        },
        megjegyzes: {
          italics: true,
          fontSize: 11,
          color: '#555555',
          margin: [15, 0, 0, 4]
        }
      },
      defaultStyle: {
        font: 'Times',
        fontSize: 11
      },
      footer: function (currentPage, pageCount) {
        return {
          text: `${currentPage} / ${pageCount}`,
          alignment: 'center',
          margin: [0, 0, 20, 10],
          fontSize: 10,
          color: '#888',
          bold: true
        };
      }
    };
  
     if (nyomtataskent) {
      pdfMake.createPdf(docDefinition).print();
    } else {
      pdfMake.createPdf(docDefinition).download(`${kitoltesNevFile}.pdf`);
    }
    
  } catch (error) {
    console.error("Hiba a PDF generálás közben:", error);
    alert("Hiba történt a PDF generálása során. Kérjük, próbálja újra!");
  } finally {
    // Töltésjelző eltüntetése (akkor is lefut, ha hiba volt)
    document.body.style.cursor = 'default';
  }
}
document.addEventListener('DOMContentLoaded', () => {
//PDF Generálás (PDFMake)
// --- ÚJ RÉSZ: Melléklet gombok eseménykezelői ---
  const mellekletLetoltBtn = document.getElementById('melletolt');
  if (mellekletLetoltBtn) {
    mellekletLetoltBtn.addEventListener('click', () => {
      generateMellekletPDF(false); // Letöltés
    });
  }

  const mellekletPrintBtn = document.getElementById('melprint');
  if (mellekletPrintBtn) {
    mellekletPrintBtn.addEventListener('click', () => {
      generateMellekletPDF(true); // Nyomtatás
    });
  }
//Gombok a készülő PDF re (nagyítás, bezárás)
  function createButton({ parent, html, classes = [], title = '', onClick }) {
    const btn = document.createElement("div");
    btn.innerHTML = html;
    classes.forEach(cls => btn.classList.add(cls));
    btn.setAttribute('title', title);
    btn.classList.add("no-print");
    if (onClick) btn.addEventListener('click', onClick);
    parent.appendChild(btn);
    return btn;
  }
  //Teljes abalkos ellenőrzés
  function checkContainerFullWidth() {
    const keszuloHidden = window.getComputedStyle(ertekelesekContainer2).display === "none";
    const diagrammHidden = window.getComputedStyle(diagramm).display === "none";
  
    if (keszuloHidden && diagrammHidden) {
      maininf.style.display = "none";
      container.style.width = "100%";
    }
  }
   
    const ertekelesek = document.querySelectorAll(".ertekelesek");
    const ertekelesekContainer2 = document.querySelector('#keszulo');
    const container = document.querySelector('#mainart');
    const diagramm = document.querySelector(".charts");
    const maininf = document.querySelector("#maininf");
  
    let fullView = false;
  
    const generalt = document.createElement('button');
    generalt.innerHTML = `download`;
    generalt.classList.add("material-symbols-rounded", "pdfb", "navment", "no-print");
    generalt.setAttribute('title', 'Mentés');
    generalt.style.display = "none";
  
    // Mentés
  const navment = document.querySelectorAll(".navment");
  navment.forEach(elem => {
    elem.addEventListener('click', () => {
      generatePdfMakePDF(); // új, szöveges PDF generálás
      KategoriaKezelo.frissitErtekelesekContainer();

    });
  });
  
  // Nyomtatás
  const navnyomGombok = document.querySelectorAll(".navnyom");
  navnyomGombok.forEach(navnyom => {
    navnyom.addEventListener('click', () => {
      generatePdfMakePDF(true); // közvetlen nyomtatás
    });
  });
  
    //CÍM
          let fejlec = document.createElement("div");
          ertekelesekContainer2.prepend(fejlec);
          fejlec.classList.add("fejlec");
          fejlec.innerHTML =`
            <div class="fej1">
              <p id="kitneve"></p>
            </div>
            <div class="fej2">
              <p id="nev"></p> 
              <p id="ido"></p>
            </div>
            `;
           const urlParams = new URLSearchParams(window.location.search);
      let idos = urlParams.get('letrehozva');

      if (!idos || idos === "null") {
        const most = new Date();
        idos = most.toLocaleDateString('hu-HU', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      }

const ido = document.querySelector("#ido");
if (ido) {
  ido.textContent = " ";
}

const layoutElem = document.querySelector('.layout');
const itemB = document.querySelector('#lapok')
const itemA = document.querySelector('#main');

// Kattintásszámláló inicializálása
let kattintasSzamlalo = 0;
//FULL vagy HALF (Továbbra is a PDF div-ben ikontartó, lehet át kéne tenni---)          
  ertekelesek.forEach(elem => {
   elem.addEventListener('click', () => {
  // Növeljük a számlálót minden kattintással
  kattintasSzamlalo++;

  // A modulo (%) operátorral biztosítjuk, hogy a ciklus 0, 1, 2 értékek között maradjon
  const nezetIndex = kattintasSzamlalo % 3;

  switch (nezetIndex) {
    // 1. kattintás: Fókuszban az "A" tartalom
    case 1:
      // Láthatóság beállítása
      itemA.style.display = 'block';
      itemB.style.display = 'none';

      // Grid szerkezet módosítása
      layoutElem.style.gridTemplateAreas = '"c a"';
      layoutElem.style.width = "96%";
      layoutElem.style.margin= "1vh 3vh 1vh 3vh";
      layoutElem.style.gridTemplateColumns = '0.1fr 2fr';
      break;

    // 2. kattintás: Fókuszban a "B" tartalom
    case 2:
      // Láthatóság beállítása
      itemA.style.display = 'none';
      itemB.style.display = 'block';
      
      // Grid szerkezet módosítása
      layoutElem.style.gridTemplateAreas = '"c b"';
      layoutElem.style.gridTemplateColumns = '0.1fr 2fr';
      layoutElem.style.width = "96%";
      layoutElem.style.margin= "1vh 3vh 1vh 3vh;";
      break;

    // 3. kattintás (vagy alaphelyzet): Mindkettő látszik
    // A modulo miatt ez a 0-s eset lesz
    default: 
      // Láthatóság beállítása
      itemA.style.display = 'block';
      itemB.style.display = 'block';

      // Grid szerkezet visszaállítása az alapra
      layoutElem.style.gridTemplateAreas = '"c a b"';
      layoutElem.style.gridTemplateColumns = '0.1fr 1fr 1fr';
      layoutElem.style.width = "auto";
      layoutElem.style.margin= "1vh 3vh 1vh 3vh";
      break;
  }
});
 
  });


// Feltételezve, hogy a 'diagramm' és 'maininf' változók már definiálva vannak
  const chartSelector = document.getElementById('chartTypeOff');

  chartSelector.addEventListener('change', (event) => {
    if (event.target.value === 'on') {
      diagramm.style.display = 'flex';
      maininf.style.display = 'flex';
    } else {
      diagramm.style.display = 'none';
    }
  });
});

//  MELLÉKLET PDF (FEKTETETT DIAGRAMMOK) ---
export async function generateMellekletPDF(nyomtataskent = false) {
    try {
        document.body.style.cursor = 'wait';

        // 1. PdfMake betöltése
        await import('/both/fonts/pdfmake.min.js'); 
        const pdfFontsModule = await import('/both/fonts/vfs_fonts.js');

        const keszulo = document.getElementById('keszulo');
        if (!keszulo) return;

        // Szövegtisztító segédfüggvény (sortörések és extra szóközök ellen)
        function getCleanText(el) {
            if (!el) return '';
            return el.textContent.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        }

        // 2. Cím generálása
        const p1 = getCleanText(keszulo.querySelector('.vizsgalt-nev strong')).toUpperCase();
        const p2 = getCleanText(keszulo.querySelector('#kitneve')).toUpperCase() || 'ÉRTÉKELÉS';
        
        let cimSzoveg = `${p1} ${p2}`.trim();
        
        // Segédfüggvény a diagram adatok kinyeréséhez
        function getChartData(canvasId, containerId) {
            const container = document.getElementById(containerId);
            if (!container || window.getComputedStyle(container).display === 'none') return null;
            const canvas = document.getElementById(canvasId);
            const chart = Chart.getChart(canvasId);
            if (!canvas || !chart) return null;
            
            return {
                image: canvas.toDataURL('image/png', 1.0),
                labels: chart.data.labels || [],
                data: chart.data.datasets[0].data || []
            };
        }

        // 3. Diagrammok beolvasása
        const foChart = getChartData('fokategoriaChart', 'chart-container');
        const alkChart = getChartData('alkategoriaChart', 'alkategoriaChartContainer');
        const altChart = getChartData('altTemaChart', 'altTemaChartContainer');
        
// --- INTELLIGENS KATEGÓRIA KERESŐ ---
        let aktivFoKategoria = window.aktivFoKategoriaNev || '';
        let aktivAlkategoria = window.aktivAlkategoriaNev || '';

        // Fejlesztett normSzoveg: Minden írásjelet, számot és százalékot kiszűr, csak a betűk maradnak.
        const normSzoveg = s => s ? s.toLowerCase().replace(/[^\p{L}]/gu, '') : '';

        // A) Aktív Alkategória megkeresése
        if (altChart && altChart.labels.length > 0 && !aktivAlkategoria) {
            const altSet = altChart.labels.map(l => normSzoveg(l));
            const rows = keszulo.querySelectorAll('tr.al-kategoria, tr.alt-tema');
            let utolsoAlk = '';
            
            for (const row of rows) {
                if (row.classList.contains('al-kategoria')) {
                    // Cím kinyerése kérdések és extrák nélkül
                    const alkNode = row.querySelector('td')?.childNodes[0];
                    if (alkNode) utolsoAlk = alkNode.textContent.trim();
                } else if (row.classList.contains('alt-tema')) {
                    // Csak a legelső szöveges nodet kérjük le (kérdések kizárva)
                    const altNevNode = row.querySelector('td.alt-tema')?.childNodes[0];
                    const altNev = altNevNode ? altNevNode.textContent.trim() : '';
                    
                    if (altNev && altSet.includes(normSzoveg(altNev))) {
                        aktivAlkategoria = utolsoAlk;
                        break;
                    }
                }
            }
        }

        // B) Aktív Főkategória megkeresése
        if (alkChart && alkChart.labels.length > 0 && !aktivFoKategoria) {
            const alkSet = alkChart.labels.map(l => normSzoveg(l));
            const foKategoriak = keszulo.querySelectorAll('.fo-kategoria');
            
            for (const foDiv of foKategoriak) {
                const h3 = foDiv.querySelector('h3');
                if (!h3) continue;
                const foNevNode = h3.childNodes[0];
                const foNev = foNevNode ? foNevNode.textContent.trim() : '';
                
                const alkRows = foDiv.querySelectorAll('tr.al-kategoria td');
                let found = false;
                for (const td of alkRows) {
                    const alkNevNode = td.childNodes[0];
                    const alkNev = alkNevNode ? alkNevNode.textContent.trim() : '';
                    
                    if (alkNev && alkSet.includes(normSzoveg(alkNev))) {
                        aktivFoKategoria = foNev;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }

        // Cím kiegészítése a főkategóriával
        if (alkChart && aktivFoKategoria) {
            cimSzoveg += ` - ${aktivFoKategoria.replace(/[:0-9%\s]+$/, '').toUpperCase()}`;
        }
        cimSzoveg += " - MELLÉKLET";


        // Segédfüggvény rugalmasabb név egyezéshez (vastagításhoz)
        function isLabelMatch(label, activeName) {
            if (!activeName || !label) return false;
            const l1 = normSzoveg(label);
            const l2 = normSzoveg(activeName);
            return l1 === l2 || l2.includes(l1) || l1.includes(l2);
        }

        // 4. Oszlopok összeállítása a PDF-hez
      // 4. Oszlopok összeállítása a PDF-hez
    // 4. Oszlopok összeállítása a PDF-hez
        const lathatoDiagramokSzama = [foChart, alkChart, altChart].filter(Boolean).length;
        
        // Itt az 500 lesz a szélesség, ha csak 1 diagram van:
        const imgWidth = lathatoDiagramokSzama === 1 ? 500 : (lathatoDiagramokSzama === 2 ? 210 : 160);
let docImages = {};
        if (foChart) docImages['foChartImgMel'] = foChart.image;
        if (alkChart) docImages['alkChartImgMel'] = alkChart.image;
        if (altChart) docImages['altChartImgMel'] = altChart.image;

       
        let docTartalom = [
            { text: cimSzoveg, style: 'cimSor' }
        ];

        if (lathatoDiagramokSzama === 1 && foChart) {
            // --- EGYEDI NÉZET: Csak főkategória (1 sor, 2 oszlop) ---
            const foText = foChart.labels.map((label, idx) => {
                const val = Math.round(foChart.data[idx] || 0);
                return { text: `${label}: ${val}%`, style: 'listaElem', fontSize: 11, margin: [0, 8, 0, 8] };
            });
        const imgWidth2 = lathatoDiagramokSzama === 1 ? 600 : (lathatoDiagramokSzama === 2 ? 250 : 200);

            docTartalom.push({
                // Az oszlopok arányának fixálása: 60% a képnek, 40% a listának
                widths: ['80%', '20%'], 
                columns: [
                    // Bal oszlop: Diagram
{ image: 'foChartImgMel', fit: [imgWidth2, 1000], alignment: 'center' },                    // Jobb oszlop: Kategóriák és százalékok
                    { stack: foText, margin: [20, 30, 0, 0] }
                ],
                columnGap: 20,
                margin: [0, 40, 0, 0] 
            });

        } else {
            // --- NORMÁL NÉZET: Több diagram esetén (egymás mellett, alatta a szövegek) ---
            const chartColumns = [];
            const textColumns = [];

            // FŐKATEGÓRIA OSZLOP
            if (foChart) {
                chartColumns.push({ 
                    stack: [
                        { text: 'FŐKATEGÓRIÁK', style: 'diagramCim' },
{ image: 'foChartImgMel', fit: [imgWidth, 1000], alignment: 'center' }                    ],
                    alignment: 'center'
                });
                
                const foText = foChart.labels.map((label, idx) => {
                    const val = Math.round(foChart.data[idx] || 0);
                    const isBold = alkChart && isLabelMatch(label, aktivFoKategoria);
                    return { text: `${label}: ${val}%`, bold: isBold, style: 'listaElem' };
                });
                textColumns.push({ stack: foText, margin: [10, 20, 10, 0] });
            }

            // ALKATEGÓRIA OSZLOP
            if (alkChart) {
                const alkCim = aktivFoKategoria ? aktivFoKategoria.toUpperCase() : 'ALKATEGÓRIÁK';
                chartColumns.push({ 
                    stack: [
                        { text: alkCim, style: 'diagramCim' },
{ image: 'alkChartImgMel', fit: [imgWidth, 1000], alignment: 'center' }                    ],
                    alignment: 'center'
                });
                
                const alkText = alkChart.labels.map((label, idx) => {
                    const val = Math.round(alkChart.data[idx] || 0);
                    const isBold = altChart && isLabelMatch(label, aktivAlkategoria);
                    return { text: `${label}: ${val}%`, bold: isBold, style: 'listaElem' };
                });
                textColumns.push({ stack: alkText, margin: [10, 20, 10, 0] });
            }

            // ALTÉMA OSZLOP
            if (altChart) {
                const altCim = aktivAlkategoria ? aktivAlkategoria.toUpperCase() : 'ALTÉMÁK';
                chartColumns.push({ 
                    stack: [
                        { text: altCim, style: 'diagramCim' },
{ image: 'altChartImgMel', fit: [imgWidth, 1000], alignment: 'center' }                    ],
                    alignment: 'center'
                });
                
                const altText = altChart.labels.map((label, idx) => {
                    const val = Math.round(altChart.data[idx] || 0);
                    return { text: `${label}: ${val}%`, style: 'listaElem' }; 
                });
                textColumns.push({ stack: altText, margin: [10, 20, 10, 0] });
            }

            // Oszlopok hozzáadása a dokumentum tartalmához
            docTartalom.push(
                { columns: chartColumns, columnGap: 20, alignment: 'center', margin: [0, 20, 0, 0] },
                { columns: textColumns, columnGap: 20 }
            );
        }

        // 5. PDF Dokumentum Definíció (Fektetett tájolás)
        const docDefinition = {
            pageOrientation: 'landscape',
            pageSize: 'A4',
            pageMargins: [40, 40, 40, 40],
            content: docTartalom,
            images: docImages,
            fonts: {
                Times: {
                    normal: 'Times-Roman.ttf',
                    bold: 'Times-Bold.ttf',
                    italics: 'Times-Italic.ttf',
                    bolditalics: 'Times-BoldItalic.ttf'
                }
            },
            styles: {
                cimSor: {
                    fontSize: 18,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 20]
                },
                diagramCim: {
                    fontSize: 14,
                    bold: true,
                    alignment: 'center',
                    margin: [0, 0, 0, 10]
                },
                listaElem: {
                    fontSize: 10,
                    margin: [0, 4, 0, 4]
                }
            },
            defaultStyle: {
                font: 'Times',
                fontSize: 11
            }
        };

        // 6. Generálás
        if (nyomtataskent) {
            pdfMake.createPdf(docDefinition).print();
        } else {
            pdfMake.createPdf(docDefinition).download(`${cimSzoveg.replace(/ /g, '_')}.pdf`);
        }

    } catch (error) {
        console.error("Hiba a Melléklet PDF generálás közben:", error);
        alert("Hiba történt a Melléklet PDF generálása során!");
    } finally {
        document.body.style.cursor = 'default';
    }
}

