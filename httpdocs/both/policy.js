// Egyesített adatvédelmi tájékoztató és tudomásulvételi nyilatkozat HTML generálása
const modalHtml = `
<div id="modalOverlay"></div>
<div id="modal">
  <h1>Adatkezelési Tájékoztató a Rendszer Felhasználói Számára</h1>
  <p>
    Az ÉRTÉKEK egy speciális értékelő és kérdőív rendszer, amely jelenleg <strong>szakmai egyeztetés alatt, limitált és ingyenes tesztfázisban</strong> üzemel. A rendszer kereskedelmi tevékenységet nem folytat.
    <br><br>
    A rendszer használata önkéntes alapon történik. Az üzemeltető a technikai hátteret annak fejében biztosítja, hogy a felhasználók tesztadatokat generálnak a rendszerben, illetve részt vesznek a minőségfejlesztéshez szükséges visszajelzésekben. Kereskedelmi célú Általános Szerződési Feltételek helyett a rendszer használatát az Általános Felhasználási Feltételek szabályozzák.
    <br><br>
    Amennyiben Ön nem a tesztprogramban résztvevő intézmény alkalmazottja vagy megbízott felhasználója, kérjük, nézzen vissza később, vagy érdeklődjön az <a href="mailto:ertekek@info.hu">ertekek@info.hu</a> címen.
  </p>

  <h2>1. A szerepkörök tisztázása a GDPR alapján</h2>
  <p>
    Ez a tájékoztató Önnek, mint a rendszer felhasználójának szól. Minden szervezetnek és magánszemélynek, aki a rendszert használja, saját magának kell gondoskodnia a megfelelő adatvédelemről az általa feltöltött adatok tekintetében.
  </p>
  <ul>
    <li><strong>Adatkezelő:</strong> A rendszert használó intézmény, szervezet vagy magánszemély. Az Adatkezelő határozza meg az adatkezelés célját, jogalapját és a kezelt adatok körét. Minden, a feltöltött értékelések tartalmával és jogszerűségével kapcsolatos kérdésben az Adatkezelő az illetékes és felelős.</li>
    <li><strong>Adatfeldolgozó:</strong> Szalai Péter, a szoftver fejlesztője és üzemeltetője. Az Adatfeldolgozó az Adatkezelő megbízásából biztosítja a rendszer technikai működését, az adatok tárolását és a rendszer biztonsági kontrolljait. Az Adatfeldolgozó az adatokkal önállóan nem rendelkezik.</li>
    <li><strong>Felhasználó:</strong> Ön, mint az Adatkezelő munkatársa vagy megbízottja, aki jogosult a rendszer használatára és adatok rögzítésére.</li>
  </ul>

  <h2>2. Az Adatfeldolgozó adatai</h2>
  <ul>
    <li><strong>Név:</strong> Szalai Péter, magánszemély</li>
    <li><strong>E-mail:</strong> szpatis21@gmail.com</li>
    <li><strong>Telefonszám:</strong> +36 30 178 4272</li>
  </ul>

  <h2>3. A rendszerben kezelt adatok</h2>
  <p>A rendszer két fő adatkört kezel:</p>
  <ol>
    <li><strong>Felhasználói fiók adatai:</strong> Az Ön azonosításához szükséges adatok, például név, e-mail cím és jelszó. Ezen adatok kezelésének célja a rendszerhez való biztonságos hozzáférés biztosítása.</li>
    <li><strong>Értékelési adatok:</strong> Az Adatkezelő által meghatározott személyekre vonatkozó értékelések, válaszok, százalékos eredmények, megjegyzések, PDF exportok, auditációs adatok és opcionálisan AI-val létrehozott szövegek. Ezen adatok körét, tartalmát és kezelésének jogszerűségét az Adatkezelő biztosítja.</li>
  </ol>
  <p>
    A rendszer jellege miatt előfordulhat, hogy az Adatkezelő különleges kategóriájú személyes adatot is rögzít, például egészségi állapotra, fejlődési állapotra, fogyatékosságra vagy más érzékeny körülményre utaló adatot. Ilyen adat kizárólag az Adatkezelő jogszerű döntése, megfelelő tájékoztatása és dokumentált jogalapja alapján rögzíthető.
  </p>

  <h2>4. Adatbiztonság</h2>
  <p>
    Az Adatfeldolgozó elkötelezett az adatok védelme mellett. Ennek érdekében a rendszer több szintű technikai és szervezési intézkedést alkalmaz, ideértve a szerveroldali hozzáférésvédelmet, az adatminimalizálási kontrollokat és a sessionhöz kötött CSRF-token alapú állapotmódosító kérésvédelmet.
  </p>
  <ul>
    <li><strong>Titkosított kommunikáció:</strong> A rendszer és a böngésző közötti adatforgalom HTTPS kapcsolaton keresztül történik.</li>
    <li><strong>Adatbázis-védelem:</strong> A rendszerben egyes azonosító személyes adatok titkosított formában kerülnek tárolásra.</li>
    <li><strong>Session-alapú hozzáférés:</strong> A rendszer a bejelentkezett felhasználó munkamenete alapján azonosítja a felhasználót, és a jogosultságokat szerveroldalon, az adatbázisban tárolt intézményi, modul- és szerepköri kapcsolatokkal összevetve ellenőrzi.</li>
    <li><strong>Bejelentkezés utáni session-regenerálás:</strong> Sikeres belépéskor a rendszer új munkamenet-azonosítót generál, így a belépés előtti anonim munkamenet nem válik belépett munkamenetté.</li>
    <li><strong>Állapotmódosító műveletek védelme:</strong> A rendszer az állapotmódosító műveleteknél szerveroldali bejelentkezés-, modul-, szerepkör- és objektumszintű jogosultság-ellenőrzést, valamint sessionhöz kötött CSRF-token ellenőrzést alkalmaz.</li>
    <li><strong>Próbálkozási korlátozás:</strong> A belépési és jelszó-visszaállítási végpontokon rate limit működik az automatizált próbálkozások és visszaélések mérséklésére.</li>
    <li><strong>Jelszó-visszaállítás védelme:</strong> A jelszó-visszaállító tokenek véletlenszerűek, hash-elt formában kerülnek tárolásra, időkorláthoz kötöttek, és sikeres használat után törlésre kerülnek.</li>
    <li><strong>Szerepkör-alapú jogosultság:</strong> A felhasználók eltérő szerepkörökkel rendelkezhetnek, például értékelő, elemző, feltöltő/admin vagy sysadmin szerepkörben.</li>
    <li><strong>Intézményi és modul szerinti elkülönítés:</strong> A rendszer ellenőrzi, hogy a felhasználó mely intézményhez és mely szakmai modulhoz rendelkezik jogosultsággal.</li>
    <li><strong>Objektumszintű hozzáférés-ellenőrzés:</strong> Az értékelések, válaszok, százalékos eredmények, statisztikák, AI-szövegek, megosztások, auditációs adatok, kérdésbank-elemek és adminisztratív műveletek elérésekor a rendszer szerveroldalon ellenőrzi, hogy a felhasználó jogosult-e az adott konkrét adatkör megtekintésére, módosítására vagy törlésére.</li>
    <li><strong>Kliensoldali azonosítók korlátozott szerepe:</strong> A rendszer nem tekinti önmagában elegendőnek a böngészőből érkező felhasználó-, intézmény-, modul-, értékelés- vagy auditazonosítót, hanem azokat a bejelentkezett munkamenetből és az adatbázisban tárolt jogosultságokból képzett szerveroldali jogosultsági kontextussal veti össze.</li>
    <li><strong>Privát frontend állományok védelme:</strong> A publikus és privát frontend állományok kiszolgálása elválasztott; a privát felületek és azok JavaScript/CSS állományai csak bejelentkezett, illetve szükség szerint megfelelő szerepkörű felhasználók számára érhetők el.</li>
    <li><strong>Naplózás:</strong> A rendszer egyes felhasználói és adminisztratív műveletekről biztonsági és működési célú aktivitási naplót vezet.</li>
  </ul>

  <h2>5. Adattovábbítás és további adatfeldolgozók</h2>
  <p>
    A rendszer üzemeltetője a szolgáltatás működtetéséhez további adatfeldolgozókat vesz igénybe. A tárhelyszolgáltató a szerverinfrastruktúrát és az adatok technikai tárolását biztosítja. Az MI-szöveggenerálási funkció használata esetén a generáláshoz szükséges, minimalizált adatok a mesterséges intelligencia szolgáltató API-ja felé is továbbításra kerülhetnek. Az MI-funkció használata opcionális, és kizárólag a felhasználó külön művelete alapján történik.
  </p>

  <p><strong>A.) Tárhelyszolgáltató mint további adatfeldolgozó:</strong></p>
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
  <p>
    A rendszer opcionális szabadszavas szöveggenerálási funkciót tartalmaz. A funkció használatakor a rendszer az értékelési adatokból szakmai szöveges összefoglalót vagy javaslatot készíthet. A funkció használata nem kötelező; a felhasználó döntése alapján indítható.
  </p>
  <p>
    Az MI-szolgáltató felé kizárólag a generáláshoz szükséges, minimalizált adatkör továbbítása a cél. A rendszer törekszik arra, hogy név, e-mail cím, telefonszám, közvetlen azonosító, auditüzenet, szükségtelen szabad szöveges megjegyzés és teljes nyers kérdés-válasz adatsor ne kerüljön átadásra. Csoportos funkció esetén az aggregált, kategória- és százalékszintű adatok, illetve pszeudonimizált résztvevői jelölések használata az irányadó. Szabad szöveges mezők esetén ugyanakkor a felhasználó és az Adatkezelő felelőssége is, hogy ne rögzítsen szükségtelen személyes vagy különleges adatot.
  </p>
  <ul>
    <li><strong>Név:</strong> Google LLC</li>
    <li><strong>Székhely:</strong> 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</li>
    <li><strong>Feladat:</strong> Opcionális MI-alapú szöveggenerálási funkció technikai biztosítása.</li>
    <li><strong>Adatvédelmi tájékoztató:</strong> policies.google.com/privacy</li>
  </ul>
  <p>
    Az üzemeltető minden további adatfeldolgozójával a GDPR előírásainak megfelelő szerződéses viszonyban áll, amely biztosítja a személyes adatok bizalmas és biztonságos kezelését.
  </p>

  <h2>6. Az érintettek jogai</h2>
  <p>
    Az értékelésekben szereplő személyeket megilletik a GDPR által biztosított jogok, például a hozzáférés, helyesbítés, törlés, korlátozás, adathordozhatóság és tiltakozás joga. E jogaik gyakorlására vonatkozó kérelmeiket közvetlenül az <strong>Adatkezelőhöz</strong>, vagyis ahhoz az intézményhez vagy szervezethez kell benyújtaniuk, amely az adatokat rögzítette. Az Adatfeldolgozó az Adatkezelő utasítására technikai segítséget nyújt ezen kérelmek végrehajtásában.
  </p>

  <h2>7. Jogorvoslati lehetőségek</h2>
  <p>Amennyiben úgy véli, hogy az adatkezelés során jogsértés történt, elsősorban az Adatkezelőhöz fordulhat. Továbbá jogosult panaszt tenni a Nemzeti Adatvédelmi és Információszabadság Hatóságnál:</p>
  <ul>
    <li><strong>Cím:</strong> 1055 Budapest, Falk Miksa utca 9-11.</li>
    <li><strong>E-mail:</strong> ugyfelszolgalat@naih.hu</li>
    <li><strong>Honlap:</strong> <a href="http://www.naih.hu" target="_blank">www.naih.hu</a></li>
  </ul>

  <h2>8. Sütik kezelése</h2>
  <p>
    A rendszer a biztonságos működés és a szolgáltatás nyújtása érdekében kizárólag a működéshez elengedhetetlenül szükséges technikai sütiket, elsősorban munkamenet-azonosító sütit alkalmaz. A hozzáférési és jogosultsági döntések szerveroldalon, a bejelentkezett munkamenet és az adatbázisban tárolt jogosultsági kapcsolatok alapján történnek; a böngésző csak a munkamenet azonosításához szükséges technikai sütit tárolja.
  </p>
  <p>
    Ez a technikai süti elengedhetetlen a felhasználók biztonságos bejelentkezéséhez és a rendszeren belüli jogosultságok ellenőrzéséhez. E nélkül a süti nélkül a rendszer nem tudná megjegyezni a munkamenetet, így a szolgáltatás használata technikai okokból lehetetlenné válna.
  </p>
  <ul>
    <li><strong>Típusa:</strong> szigorúan szükséges munkamenet-azonosító süti, HTTP-Only védelemmel, SameSite=Lax beállítással, éles környezetben Secure attribútummal.</li>
    <li><strong>Élettartama:</strong> átmeneti, a munkamenet lejártáig, de legfeljebb a bejelentkezéstől számított 8 óráig.</li>
    <li><strong>Biztonsági működés:</strong> a jogosultsági döntések a szerveroldali munkamenethez és adatbázisban tárolt jogosultságokhoz kötődnek; az állapotmódosító műveleteknél szerveroldali hozzáférés-ellenőrzés és sessionhöz kötött CSRF-token ellenőrzés működik.</li>
    <li><strong>Követés és harmadik fél:</strong> a rendszer nem használ marketing, analitikai vagy látogatókövető sütiket, és nem végez profilalkotást.</li>
  </ul>
  <p>
    Mivel ez a süti a felhasználó által kifejezetten kért szolgáltatás nyújtásához feltétlenül szükséges, elhelyezéséhez nem szükséges külön előzetes hozzájárulás.
  </p>

  <p>A gombra kattintva Ön tudomásul veszi a jelen tájékoztatóban foglaltakat, különös tekintettel az adatvédelmi szerepkörökre, az opcionális MI-funkcióra és az ÁFF elfogadására.</p>
  <button class="accept-btn" id="acceptModal">Elolvastam és tudomásul vettem</button>
</div>
`;

// Modal és overlay elemek létrehozása
document.body.insertAdjacentHTML('beforeend', modalHtml);

const modal = document.getElementById('modal');
const overlay = document.getElementById('modalOverlay');
const acceptBtn = document.getElementById('acceptModal');

const style = document.createElement('style');
style.textContent = `
  #modalOverlay, #modal {
    display: none;
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
  body.modal-open { overflow: hidden; }
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

document.addEventListener('DOMContentLoaded', () => {
  const elfogadva = localStorage.getItem('hozzajarulasElfogadva') === 'true';
  console.log('Elfogadás állapota:', elfogadva);
  if (!elfogadva) {
    openModal();
  }
});

acceptBtn.addEventListener('click', () => {
  localStorage.setItem('hozzajarulasElfogadva', 'true');
  closeModal();
});
