// Egyesített adatvédelmi tájékoztató és hozzájáruló nyilatkozat HTML generálása
// Egyesített adatvédelmi tájékoztató és hozzájáruló nyilatkozat HTML generálása
const modalHtml = `
<div id="modalOverlay"></div>
<div id="modal">
  <h1>Adatkezelési Tájékoztató a Rendszer Felhasználói Számára</h1>
  <p>
    Az ÉRTÉKEK egy speciális értékelő és kérdőív rendszer, amely jelenleg <strong>szakmai egyeztetés alatt, egy limitált és ingyenes tesztfázisban</strong> üzemel. A rendszer SEMMILYEN kereskedelmi tevékenységet NEM folytat.
    <br><br>
    A rendszer használata önkéntes alapon történik. Az üzemeltető a technikai hátteret annak fejében biztosítja, hogy a felhasználók tesztadatokat generálnak a rendszerben, illetve részt vesznek a minőségfejlesztéshez szükséges, kötelező visszajelző kérdőívek kitöltésében. 
    Kereskedelmi célú Általános Szerződési Feltételek (ÁSZF) helyett a rendszer használatát az Általános Felhasználási Feltételek (ÁFF) szabályozzák.
    <br><br> Amennyiben Ön nem a tesztprogramban résztvevő intézmény alkalmazottja, kérjük nézzen vissza később, vagy érdeklődjön az <a href="mailto:ertekek@info.hu">ertekek@info.hu</a> címen.
  </p>
  
  <h2>1. A Szerepkörök Tisztázása a GDPR Alapján</h2>
  <p>
    Ez a tájékoztató Önnek, mint a rendszer felhasználójának szól. Kérjük, figyelmesen olvassa el, hogy megértse az adatkezeléssel kapcsolatos szerepköröket és felelősségeket. Minden szervezetnek és magánszemélynek, aki a rendszert használja, saját magának kell gondoskodnia a megfelelő adatvédelemről az általa feltöltött adatok tekintetében.
    <br><br>
    A rendszer működése során az adatvédelmi szerepkörök a következők szerint oszlanak meg:
  </p>
  <ul>
    <li>
      <strong>Adatkezelő:</strong> A rendszert használó <strong>Intézmény vagy Szervezet</strong> (illetve magánszemély). Az Adatkezelő határozza meg az adatkezelés célját, jogalapját (pl. hozzájárulás, jogszabályi kötelezettség), és dönt a kezelt adatok köréről. <strong>Minden, a feltöltött értékelések tartalmával és a GDPR-megfeleléssel kapcsolatos adatvédelmi kérdésben kizárólag az Adatkezelő az illetékes és felelős.</strong>
    </li>
    <li>
      <strong>Adatfeldolgozó:</strong> <strong>Szalai Péter</strong>, a szoftver fejlesztője és üzemeltetője. Az Adatfeldolgozó az Adatkezelő megbízásából biztosítja a rendszer biztonságos technikai működését és az adatok tárolását. Az Adatfeldolgozó az adatok tartalmába nem tekint bele, és azokkal önállóan nem rendelkezik.
    </li>
     <li>
      <strong>Felhasználó:</strong> Ön, mint az Adatkezelő munkatársa vagy megbízottja, aki jogosult a rendszer használatára és adatok rögzítésére.
    </li>
  </ul>

  <h2>2. Az Adatfeldolgozó (Üzemeltető) adatai</h2>
  <ul>
      <li><strong>Név:</strong> Szalai Péter, magánszemély</li>
      <li><strong>E-mail:</strong> szpatis21@gmail.com</li>
      <li><strong>Telefonszám:</strong> +36 30 178 4272</li>
  </ul>

  <h2>3. A Rendszerben Kezelt Adatok</h2>
  <p>A rendszer kétféle adatkört kezel:</p>
  <ol>
      <li><strong>Felhasználói fiók adatai:</strong> Az Ön azonosításához szükséges adatok (név, e-mail cím, jelszó). Ezen adatok kezelésének célja a rendszerhez való biztonságos hozzáférés biztosítása.</li>
      <li><strong>Az Ön által feltöltött adatok (Értékelések):</strong> Az Adatkezelő által meghatározott személyekre vonatkozó értékelések és egyéb információk. Ezen adatok körét, tartalmát és kezelésének jogszerűségét az Adatkezelő biztosítja. Az Adatfeldolgozó felelőssége kizárólag ezen adatok biztonságos technikai tárolása.</li>
  </ol>

  <h2>4. Adatbiztonság</h2>
  <p>
    Az Adatfeldolgozó elkötelezett az adatok legmagasabb szintű védelme mellett. Ennek érdekében a következő főbb technikai és szervezési intézkedéseket alkalmazza:
  </p>
  <ul>
    <li><strong>Titkosított kommunikáció:</strong> A rendszer és a böngészője közötti minden adatforgalom titkosított (HTTPS).</li>
    <li><strong>Adatbázis-titkosítás:</strong> Az adatbázisban tárolt adatok titkosításra kerülnek, hogy illetéktelen hozzáférés esetén se legyenek olvashatóak.</li>
    <li><strong>Hozzáférés-korlátozás:</strong> Az adatokhoz csak a megfelelő jogosultsággal rendelkező Felhasználók férhetnek hozzá. Az üzemeltető a feltöltött értékelési adatok tartalmához nem fér hozzá.</li>
    <li><strong>Biztonsági frissítések:</strong> A rendszert alkotó szoftverkomponensek rendszeresen frissítésre kerülnek a biztonsági rések elkerülése érdekében.</li>
  </ul>

 <h2>5. Adattovábbítás és További Adatfeldolgozók</h2>
  <p>
    A rendszer üzemeltetője (Szalai Péter) az adatok biztonságos tárolásához adatfeldolgozót vesz igénybe, aki a szerverinfrastruktúrát (tárhelyszolgáltatás) biztosítja. A feltöltött adatokat más harmadik fél részére nem továbbítjuk.
  </p>
  <p><strong>A.) A tárhelyszolgáltató mint további adatfeldolgozó adatai:</strong></p>
  <ul>
      <li><strong>Név:</strong> Qualityweb Kft.</li>
      <li><strong>Székhely:</strong> Dózsa György utca 4/C 2. 5/A.</li>
      <li><strong>Cégjegyzékszám:</strong> 07-09-023460</li>
      <li><strong>Adószám:</strong> 24256913-2-07</li>
      <li><strong>Képviselő:</strong> Dobruczky Ádám</li>
      <li><strong>Telefonszám:</strong> +36-30-655-7310</li>
      <li><strong>E-mail cím:</strong> info@qualityweb.hu</li>
      <li><strong>Honlap:</strong> qualityweb.hu</li>
  </ul>
  <p><strong>B.) Mesterséges Intelligencia Szolgáltató:</strong></p>
  <p>A felhasználó kérésére, az értékelési adatokból történő szabadszavas esszégenerálási funkció technikai hátterét biztosítja. E művelet során az adatok feldolgozása az Európai Unión kívül is történhet a szolgáltató globális infrastruktúráján.</p>
  <ul>
      <li><strong>Név:</strong> Google LLC (vagy a konkrét API szolgáltató)</li>
      <li><strong>Székhely:</strong> 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</li>
      <li><strong>Adatvédelmi tájékoztató:</strong> policies.google.com/privacy</li>
  </ul>
  
  <p>
    Az üzemeltető minden további adatfeldolgozójával a GDPR előírásainak megfelelő szerződéses viszonyban áll, amely biztosítja a személyes adatok bizalmas és biztonságos kezelését.
  </p>

  <h2>6. Az Érintettek (pl. Értékelt személyek, Szülők) Jogai</h2>
  <p>
    Az értékelésekben szereplő személyeket (érintetteket) megilletik a GDPR által biztosított jogok (pl. hozzáférés, helyesbítés, törlés joga). Ezen jogaik gyakorlására vonatkozó kérelmeiket közvetlenül az <strong>Adatkezelőhöz (ahhoz az Intézményhez/Szervezethez, amely az adatokat rögzítette)</strong> kell benyújtaniuk. Az Adatfeldolgozó az Adatkezelő utasítására segítséget nyújt ezen kérelmek technikai végrehajtásában.
  </p>

  <h2>7. Jogorvoslati Lehetőségek</h2>
  <p>Amennyiben úgy véli, hogy az adatkezelés során jogsértés történt, elsősorban az Adatkezelőhöz fordulhat. Továbbá jogosult panaszt tenni a Nemzeti Adatvédelmi és Információszabadság Hatóságnál (NAIH):</p>
  <ul>
    <li><strong>Cím:</strong> 1055 Budapest, Falk Miksa utca 9-11.</li>
    <li><strong>E-mail:</strong> ugyfelszolgalat@naih.hu</li>
    <li><strong>Honlap:</strong> <a href="http://www.naih.hu" target="_blank">www.naih.hu</a></li>
  </ul>
  ütik (Cookie-k) kezelése
Rendszerünk a biztonságos működés és a szolgáltatás nyújtása érdekében kizárólag a működéshez elengedhetetlenül szükséges technikai sütiket (munkamenet / session cookie) alkalmaz.

Miért használunk sütiket?
Ez a technikai süti elengedhetetlen a felhasználók biztonságos bejelentkezéséhez és a rendszeren belüli jogosultságok ellenőrzéséhez. E nélkül a süti nélkül az értékelő rendszer nem tudná megjegyezni a munkamenetet, így a rendszer használata technikai okokból lehetetlenné válna.

A használt süti jellemzői:

Típusa: Szigorúan kötelező munkamenet azonosító süti (HTTP-Only védelemmel ellátva a maximális biztonság érdekében).

Élettartama: Átmeneti. A munkamenet lejártáig, de legfeljebb a bejelentkezéstől számított 8 óráig érvényes. Ezt követően automatikusan törlődik.

Követés és harmadik fél: Rendszerünk nem használ marketing, analitikai (pl. Google Analytics) vagy látogatókövető (pl. Facebook Pixel) sütiket. Az adatokat harmadik félnek nem továbbítjuk, és nem végzünk profilalkotást.

Mivel ez a süti a felhasználó által kifejezetten kért információs társadalommal összefüggő szolgáltatás (az értékelő rendszer) nyújtásához feltétlenül szükséges, az ePrivacy irányelv és a hazai jogszabályok értelmében elhelyezéséhez nem szükséges a felhasználó előzetes hozzájárulása (felugró ablakos elfogadása).
  <p>A gombra kattintva Ön tudomásul veszi a jelen tájékoztatóban foglaltakat, különös tekintettel az adatvédelmi szerepkörökre és az ÁFF elfogadására.</p>
  <button class="accept-btn" id="acceptModal">Elolvastam és tudomásul vettem</button>
</div>
`;

/// Modal és overlay elemek létrehozása
document.body.insertAdjacentHTML('beforeend', modalHtml);

const modal = document.getElementById('modal');
const overlay = document.getElementById('modalOverlay');
const acceptBtn = document.getElementById('acceptModal');

// JAVÍTÁS: A CSS-be bekerül az alapértelmezett 'display: none;'
const style = document.createElement('style');
style.textContent = `
  #modalOverlay, #modal {
    display: none; /* ALAPBÓL LEGYENEK ELREJTVE */
  }
  #modalOverlay {
    position: fixed; top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(0,0,0,0.6);
    z-index: 9998;
  }
  #modal {
    position: fixed; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: #fff; padding: 2rem;
    z-index: 9999; width: 95%; height: 95%;
    overflow-y: auto;
  }
  body.modal-open { overflow: hidden; } /* tiltja a háttér görgetését */
`;
document.head.appendChild(style);

function openModal() {
  modal.style.display = 'block';
  overlay.style.display = 'block';
  document.body.classList.add('modal-open');
}
function closeModal() {
  modal.style.display = 'none';
  overlay.style.display = 'none';
  document.body.classList.remove('modal-open');
}

// Csak akkor nyitjuk meg automatikusan, ha még nincs elfogadás:
document.addEventListener('DOMContentLoaded', () => {
  const elfogadva = localStorage.getItem('hozzajarulasElfogadva') === 'true';
  console.log('Elfogadás állapota:', elfogadva);
  if (!elfogadva) {
    openModal();
  }
});

// Az "Elfogadom" gomb menti a flag-et és bezárja a modal-t:
acceptBtn.addEventListener('click', () => {
  localStorage.setItem('hozzajarulasElfogadva', 'true');
  closeModal();
});
