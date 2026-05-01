// Admin teendők js fájl. - Alap UI logika, felhasználó betöltése és jogosultságok delegálása.
import { loadInfoAndInit } from '../info/infoLoader.js'; 
import { renderRoles } from './dashAroles.js';
import { initAside } from '../user/dashAside.js';


initAside();
// Joglecsukó doboz animációja
document.addEventListener('DOMContentLoaded', () => {
  const box = document.getElementById('joglecsuk');
  if (box) {
    const fullHeight = box.scrollHeight + 'px';
    box.style.minHeight = '40px';
    box.style.maxHeight = fullHeight;

    box.addEventListener('click', () => {
      box.classList.toggle('closed');
      box.style.maxHeight = box.classList.contains('closed') ? '40px' : fullHeight;
    });
  } else {
    console.warn('#joglecsuk nem található');
  }
});

// Felhasználói állapot tárolása
const userState = {
  modulId:       null,
  modulNev:      null,
  modulLeiras:   null,
  userId:        null,
  userName:      null,
  fullname:      null,
  intezmeny_id:  null,
  intezmeny_nev: null
};

// Fő lapozó logika (Nézetek váltása)
const lapozo = document.querySelector("#lapozo");
const maininf = document.querySelector("#maininf");
const osszesitett = document.querySelector("#osszesitett");
const gyik = document.querySelector("#gyik");

if (lapozo) {
  lapozo.addEventListener('click', (e) => {
    if (e.target.classList.contains('grap') || e.target.classList.contains('sta') || e.target.classList.contains('gyik'))  {
      // Aktiv osztály váltása.
      [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
      e.target.classList.add('aktiv');

      // Megjelenítés logika
      if (e.target.classList.contains('grap')) {
        if(maininf) maininf.style.display = 'flex';
        if(osszesitett) osszesitett.style.display = 'none';
        if(gyik) gyik.style.display = "none";
      } else if (e.target.classList.contains('gyik')) {
        if(maininf) maininf.style.display = 'none';
        if(osszesitett) osszesitett.style.display = 'none';
        if(gyik) gyik.style.display = "flex";
      } else if (e.target.classList.contains('sta')) {
        if(maininf) maininf.style.display = 'none';
        if(osszesitett) osszesitett.style.display = 'flex';
        if(gyik) gyik.style.display = "none";
      }
    }
  });
}

// Session adat lekérése
const userLoaded = (async () => {
  try {
    const res  = await fetch('/get-username');
    const data = await res.json();
    if (!data.success) {
      window.location.href = '/login.html';
      return;
    }

    // Feltöltjük a state-et
    Object.assign(userState, {
      userId:        data.id,
      fullname:      data.vez,
      userName:      data.username,
      modulId:       data.modulId,
      modulNev:      data.modulNev,
      modulLeiras:   data.modulLeiras,
      intezmeny_id:  data.int_id,
      intezmeny_nev: data.intnev
    });

    // Opcionális DOM-frissítés
    const sajtnevElem = document.querySelector('#sajatnev');
    if (sajtnevElem) sajtnevElem.innerHTML = "&nbsp;" + data.username;

    const holvagyElem = document.querySelector('.holvagyok');
    if (holvagyElem) holvagyElem.innerHTML = data.modulLeiras;

    return userState;
  } catch (err) {
    console.error('Felhasználó betöltése sikertelen:', err);
    throw err;
  }
})();

loadInfoAndInit();


userLoaded.then(() => {
  if (!userState.intezmeny_id || !userState.modulId) {
        console.warn("Várakozás a felhasználói adatokra...");
        return;
  }

  console.log('modulId:', userState.modulId);
  console.log('intezmeny_id:', userState.intezmeny_id);
  
  if (userState.modulNev === 'sysadmin') {
    const gomb = document.getElementById('generateSzazalekBtn');
    if (gomb) gomb.style.display = 'block';
  }

  // Szerepkörök betöltése az admin panelhez
  renderRoles(userState);

}).catch((err) => {
  console.error("Hiba az inicializálás során:", err);
});
