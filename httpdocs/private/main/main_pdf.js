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
    .forEach(elem => elem.parentNode.removeChild(elem));

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
    const diagramm = document.querySelector("#chart-container");
    const maininf = document.querySelector("#maininf");
  
    let fullView = false;
  
    const generalt = document.createElement('button');
    generalt.innerHTML = `download`;
    generalt.classList.add("material-symbols-rounded", "pdfb", "navment", "no-print");
    generalt.setAttribute('title', 'Mentés');
    generalt.style.display = "none";
  
    // Gombkonténerek
  /*   const ikontarto = document.createElement("div");
    ikontarto.classList.add("ikontarto");
    ertekelesekContainer2.appendChild(ikontarto);
    ikontarto.appendChild(generalt);
  
    const ikontarto2 = ikontarto.cloneNode(false); // ugyanaz a stílus, másik tartalom
    diagramm.appendChild(ikontarto2);
   */
    // Nézetváltó logika (újrahasznosítható)
   /*  function toggleView(target) {
      fullView = !fullView;
      if (fullView) {
        target.innerHTML = `<div class="material-symbols-rounded">close_fullscreen</div>`;
        maininf.style.height = "100%";
        maininf.style.width = "100%";
        container.style.display = 'none';
        generalt.style.display = "flex";
      } else {
        target.innerHTML = `<div class="material-symbols-rounded">open_in_full</div>`;
        maininf.style.height = "100vh";
        maininf.style.width = "50%";
        container.style.display = 'block';
        generalt.style.display = "none";
      }
    }
   */
    // Diagramhoz gombok
/*     createButton({
      parent: ikontarto2,
      html: `<div class="material-symbols-rounded">open_in_full</div>`,
      classes: ["iksz"],
      title: "Teljes képernyő",
      onClick: function () { toggleView(this); }
    });
  
    const iksz2 = createButton({
      parent: ikontarto2,
      html: `close`,
      classes: ["iksz", "material-symbols-rounded", "pdfiksz"],
      title: "Diagram bezárása",
      onClick: () => {
        diagramm.style.display = "none";
        container.style.display = "block";
        fullView = false;
        generalt.style.display = "none";
        checkContainerFullWidth();
      }
    }); */
    
    // Értékeléshez gombok
   /*  const nezet = createButton({
      parent: ikontarto,
      html: `<div class="material-symbols-rounded">open_in_full</div>`,
      classes: ["iksz"],
      title: "Képernyő nézet váltás",
      onClick: function () { toggleView(this); }
    });
    
    const iksz = createButton({
      parent: ikontarto,
      html: `close`,
      classes: ["iksz", "material-symbols-rounded","pdfiksz"],
      title: "Értékelő nézet bezárása",
      onClick: () => {
        ertekelesekContainer2.style.display = "none";
        container.style.display = "block";
        fullView = false;
        generalt.style.display = "none";
        checkContainerFullWidth();
      }
    }); */
    
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

  document.querySelectorAll('.diagrammok').forEach(elem => {
    elem.addEventListener('click', () => {
      if (diagramm.style.display === 'none') {
        diagramm.style.display = 'block';
        maininf.style.display="block"
      } else {
        diagramm.style.display = 'none';
      }
    });
  });

});