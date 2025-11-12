import { kerdesValaszok } from './tesztAlap.js';
const mentesGomb = document.createElement('button');
mentesGomb.textContent = 'Mentés';
mentesGomb.classList.add('mentesGomb');
document.body.appendChild(mentesGomb);

let letrehoz = null;
let userId = null;


if (document.getElementById('ertekelesneve')) {

const urlParams = new URLSearchParams(window.location.search);
  const kitoltesId = urlParams.get('kitoltes_id');

console.log(`
  Kapott azonosító:', ${kitoltesId}, Létrehozva:  ${decodeURIComponent(letrehoz)}.  
`);

const sajtnev = document.querySelector("#sajatnev");
const ertekesneve = document.querySelector("#ertekelesneve");

fetch('/get-username', {
  method: 'GET',
  headers: {'Content-Type': 'application/json'},
})
.then(response => response.json())
.then(data => {
  if (data.success) {
    const nev = document.querySelector("#nev");
    sajtnev.innerHTML = "&nbsp;" + data.username;
      userId = data.id; 
      nev.innerHTML = data.vez;
      
  } else {console.error('Hiba:', data.message);}
})
.catch(error => {console.error('Fetch hiba:', error);
});

fetch(`/api/get-kitoltes-neve?id=${kitoltesId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
          const kitneve = document.querySelector("#kitneve");
            ertekesneve.textContent = `Kitöltés neve: ${data.kitoltes_neve}`;
            kitneve.textContent = `Kitöltés neve: ${data.kitoltes_neve}`;
        } else { console.error('Hiba:', data.message);}
    })
    .catch(error => { console.error('Fetch hiba:', error);
    });


}


function generatePDF() {
  const userConfirmed = confirm("Az értékelés PDF formátmú mentésére készül. Biztos le szeretné menteni?");
  if (!userConfirmed) {
    return; 
  }
  document.querySelectorAll(".nezet, .nezet2").forEach(elem => {
    elem.style.display = "none";
});

  const element = document.querySelector('#keszulo');
  const elementsToHide = document.querySelectorAll('.no-print');
  elementsToHide.forEach(el => el.style.display = 'none');
  const options = {
    margin: 0,
    filename: 'ertekeles.pdf',
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: {
      scale: 2,
      useCORS: true
    },
    jsPDF: {
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait'
    }
  };

  html2pdf().set(options).from(element).toPdf().output('blob').then((blob) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'ertekeles.pdf'; // Letöltési név
    link.click(); // Fájl tallózás itt indul
    URL.revokeObjectURL(blobUrl); // Memória tisztítása
    elementsToHide.forEach(el => el.style.display = '');

  });
}

document.addEventListener('DOMContentLoaded', () => {
  //PDF
    const ertekelesekContainer2 = document.querySelector('#keszulo');
    const container = document.querySelector('#container');
    const ertekelesek = document.querySelector("#ertekelesek");
  
    const ikontarto = document.createElement("div");
    ertekelesekContainer2.appendChild(ikontarto);
    ikontarto.classList.add("ikontarto");

    const generalt = document.createElement('button');
        ikontarto.appendChild(generalt);
        generalt.innerHTML = `💾`;
        generalt.classList.add("no-print");
        generalt.classList.add("pdfb");
        generalt.setAttribute('title', 'Mentés');
        generalt.addEventListener('click', generatePDF);
//Nézer váltás gomb
    const nezet = document.createElement("div");
      nezet.innerHTML=
      `<div class="nezetkocka1"></div> 
      <div class="nezetkocka2"></div>
      `
      ikontarto.appendChild(nezet);
      nezet.classList.add("nezet");
      nezet.classList.add("no-print");
      nezet.setAttribute('title', 'Képernyő nézet váltás');
  //Értéklés bezárása
    const iksz = document.createElement("div");
      ikontarto.appendChild(iksz);
      iksz.classList.add("iksz");
      iksz.textContent = "X";
      iksz.classList.add("no-print");
      iksz.setAttribute('title', 'Értékelő nézet bezárása');
        iksz.addEventListener("click", function(){
          container.style.maxWidth ='100%';
          container.style.display ='block';
          ertekelesekContainer2.style.display ="none";
          nezet.classList.add("nezet");
        nezet.classList.remove("nezet2");
        ertekelesekContainer2.style.width = '50%';
         fullView = false;
         generalt.style.display = "none";
   })

//PDF mentés gomb (menüből)
const navment = document.querySelector("#navment");
navment.addEventListener('click', function(){
  ertekelesekContainer2.style.display ="flex";
  ertekelesekContainer2.style.width ="717px";
  nezet.style.display="none";
  container.style.display="none";
  generatePDF();
})          


            let fejlec = document.createElement("div");
            ertekelesekContainer2.appendChild(fejlec);
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
              
              const ido = document.querySelector("#ido");
              ido.innerHTML = `${idos}`;
  //Értékelés menüsáv            
    ertekelesek.addEventListener('click', () => {
      const isHidden = ertekelesekContainer2.style.display === 'none' || ertekelesekContainer2.style.display === '';
      ertekelesekContainer2.style.display = isHidden ? 'flex' : 'none';
      container.style.width = isHidden ? '50%' : '100%';
      nezet.style.display="flex";
    });
  
    //Teljes képernyős nézet
    let fullView = false; 

    nezet.addEventListener('click', () => {
      if (!fullView) {
        nezet.classList.add("nezet2");
        nezet.classList.remove("nezet");
        ertekelesekContainer2.style.width = '717px';
        container.style.display = 'none';
        generalt.style.right = " 75px";
        generalt.style.display = "flex";

      } else {
        generalt.style.display = "none";
        ertekelesekContainer2.style.width = '50%';
        nezet.classList.add("nezet");
        nezet.classList.remove("nezet2");
        container.style.display = 'block';
      }
      fullView = !fullView;
    });
  });
  if (document.querySelector('#user')) {

  mentesGomb.addEventListener('click', () => {
    const urlParams = new URLSearchParams(window.location.search);
const kitoltesId = urlParams.get('kitoltes_id');
    // Ellenőrizd, hogy a kerdesValaszok nem üres
    if (Object.keys(kerdesValaszok).length === 0) {
        alert('Nincsenek mentendő válaszok!');
        return;
    }

    // Fetch POST kérés a mentéshez
    fetch('/api/save-valaszok', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json'
      },
      body: JSON.stringify({
          kitoltesId: kitoltesId,
          kerdesValaszok: kerdesValaszok
      })
  })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Válaszok sikeresen mentve!');
        } else {
            console.error('Hiba történt:', data.message);
        }
    })
    .catch(error => {
        console.error('Fetch hiba:', error);
    });
});

async function loadValaszok() {
  // URL paraméterek kiolvasása
  const urlParams = new URLSearchParams(window.location.search);
  const kitoltesId = urlParams.get('kitoltes_id');

  if (!kitoltesId) {
      console.error('Hiányzó kitoltes_id az URL-ből!');
      return;
  }

  try {
      // Válaszok lekérése az adott kitoltes_id alapján
      const response = await fetch(`/api/get-valaszok?kitoltes_id=${kitoltesId}`);
      const data = await response.json();

      if (data.success) {
          // A válaszok feltöltése a kerdesValaszok objektumba
          data.valaszok.forEach(valasz => {
              kerdesValaszok[valasz.kerdes_id] = valasz.kerdes_valasz;
          });

          console.log('Válaszok betöltve:', kerdesValaszok);

          // Itt végezhetsz további műveleteket a betöltött válaszokkal
      } else {
          console.error('Hiba történt a válaszok lekérése során:', data.message);
      }
  } catch (error) {
      console.error('Fetch hiba:', error);
  }
}

// Az oldal betöltésekor meghívjuk a loadValaszok függvényt
document.addEventListener('DOMContentLoaded', loadValaszok);
}