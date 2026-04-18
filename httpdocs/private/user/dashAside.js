import{showAlert} from "/both/alert.js"
import { passwordPanelContent, addPasswordValidationLogic } from "/both/passwordChange.js";
let userName, fullname, intezmeny, leiras, hozzaferhetoModulok, mailname, tel, int_fin, fizetve, intkapmail, modul_leiras, idoszak;
let azonosIntezmenyRegisztraltak = 0;
let osszesKitoltese = 0;
let sajatLetrehozasuAdmin = 0;
let mastolKapottEditor = 0;
let megosztottMasokkal = 0;
let auditKerelemKitolteseknel = 0;
let auditFigyelmeztetesek = 0;
let auditHataridok = 0;
let globalEditorCount = 0;
// Új változók a kibővített statisztikákhoz
// --- ÚJ STATISZTIKA VÁLTOZÓK ---

// Szerepkörök száma az intézményben (adott modulhoz)
let azonosIntezmenyElemzok = 0;
let azonosIntezmenyErtekelok = 0;

// Intézményi összesített statisztikák az adott modulban
let legtobbetErtekeltNev = 'Nincs adat';
let legtobbetErtekeltDarab = 0;
let globalHataridoUserCount =0;
let globalWarmCount = 0;
let globalHataridoCount = 0;
let globalAdminCount = 0;
let globalWarmEvalCount = 0;
let globalAudit2Count = 0;
let globalWarmUserCount = 0;
let globalHataridoEvalCount = 0;
let legtobbetMegosztottNev = 'Nincs adat';
let legtobbetMegosztottDarab = 0;
// Kedvenc kategória al-változói
    let aktualisSzerep = ''; // <-- TEDD BE HELYETTE EZT
                let legjobbErtekelesNev = 'Nincs kitöltött értékelés';
                let legjobbErtekelesSzazalek = 0;
                
let kedvencKategoriaNev = 'Nincs adat';
let kedvencKategoriaDarab = 0;
let kedvencKategoriaAtlag = 0;
let aiOsszMax = 0;
// 2. Egy jelző, hogy ne töltsük le az adatokat feleslegesen többször
let adatokBetoltve = false;

// 3. Az új adatlekérő függvény, ami a friss API végpontot használja
async function loadAsideData() {
  if (adatokBetoltve) return; // Ha már be van töltve, ne csináljunk semmit

  try {
    const response = await fetch('/api/user-brief');
    const data = await response.json();

    if (data.success) {
        leiras = data.leiras;
      // ÚJ: A leírás első szavának kinyerése (pl. "Vezető (Admin)" -> "Vezető")
aktualisSzerep = data.stats ? data.stats.aktualisSzerep : '';      // Feltöltjük a modul helyi változóit a kapott adatokkal
      userName = data.username;
      fullname = data.fullname;
      intezmeny = data.intezmeny;
      leiras = data.leiras;
      modul_leiras = data.modul_leiras
      hozzaferhetoModulok = data.hozzaferhetoModulok;
      mailname = data.mailname;
      intkapmail = data.intkapmail;
      tel = data.tel;
        modul_leiras  = data.modul_leiras;
      
      int_fin = data.intfin;
      fizetve = data.fizetve;
      idoszak = data.idoszak;
if (data.stats) {
    globalEditorCount = data.stats.globalEditorCount || 0; // <--- EZT ADD HOZZÁ
            azonosIntezmenyRegisztraltak = data.stats.azonosIntezmenyRegisztraltak;
            osszesKitoltese = data.stats.osszesKitoltese;
            sajatLetrehozasuAdmin = data.stats.sajatLetrehozasuAdmin;
            mastolKapottEditor = data.stats.mastolKapottEditor;
            megosztottMasokkal = data.stats.megosztottMasokkal;
            auditKerelemKitolteseknel = data.stats.auditKerelemKitolteseknel;
            auditFigyelmeztetesek = data.stats.auditFigyelmeztetesek;
            globalWarmUserCount = data.stats.globalWarmUserCount;
           globalHataridoEvalCount = data.stats.globalHataridoEvalCount;
           globalHataridoUserCount = data.stats.globalHataridoUserCount;
            auditHataridok = data.stats.auditHataridok;
            globalWarmEvalCount = data.stats.globalWarmEvalCount;
azonosIntezmenyElemzok = data.stats.azonosIntezmenyElemzok || 0;
    azonosIntezmenyErtekelok = data.stats.azonosIntezmenyErtekelok || 0;
            // Mivel a kedvenc kategória lehet null (ha még nincs kitöltése), ezt külön ellenőrizzük:
            if (data.stats.legjobbErtekeles) {
            legjobbErtekelesNev = data.stats.legjobbErtekeles.nev;
            legjobbErtekelesSzazalek = Number(data.stats.legjobbErtekeles.atlag);
        }

        if (data.stats.kedvencKategoria) {
            kedvencKategoriaNev = data.stats.kedvencKategoria.nev;
            kedvencKategoriaDarab = data.stats.kedvencKategoria.darab;
            // Biztosítjuk, hogy szám legyen, a "45y" elkerülése végett
            kedvencKategoriaAtlag = Number(data.stats.kedvencKategoria.atlag); 
        }
      
        // ÚJ ÉRTÉKEK BEOLVASÁSA
        if (data.stats.legtobbetErtekelt) {
            legtobbetErtekeltNev = data.stats.legtobbetErtekelt.nev;
            legtobbetErtekeltDarab = data.stats.legtobbetErtekelt.darab;
        }
        
        globalWarmCount = data.stats.globalWarmCount || 0;
        globalHataridoCount = data.stats.globalHataridoCount || 0;
        globalAdminCount = data.stats.globalAdminCount || 0;
        
        if (data.stats.legtobbetMegosztott) {
            legtobbetMegosztottNev = data.stats.legtobbetMegosztott.nev;
            legtobbetMegosztottDarab = data.stats.legtobbetMegosztott.darab;
        }
        
        globalAudit2Count = data.stats.globalAudit2Count || 0;
        aiOsszMax = data.stats.aiOsszMax !== undefined ? data.stats.aiOsszMax : 0;
    }
      adatokBetoltve = true; // Jelezzük, hogy a betöltés sikeres volt
      console.log(hozzaferhetoModulok)
    } else {
      console.error('Hiba az aside adatok lekérésekor:', data.message);
      showAlert('Nem sikerült betölteni a profil adatokat.');
    }
  } catch (error) {
    console.error('Fetch hiba az aside adatoknál:', error);
  }
}
export async function initAside() {
 await loadAsideData();
 let intosszhatarido = parseInt(globalHataridoCount, 10) + parseInt(globalWarmCount, 10);        

let osszhatarido = parseInt(auditFigyelmeztetesek, 10) + parseInt(auditHataridok, 10);        
let osszert = parseInt(mastolKapottEditor, 10) + parseInt(sajatLetrehozasuAdmin, 10);        
let osszoszt = parseInt(mastolKapottEditor, 10) + parseInt(megosztottMasokkal, 10);        
      
// Elemek összegyűjtése
        const gombok = document.querySelectorAll('.gomb .cim');
        const layoutContainer = document.querySelector('.layout');
        const ujTartalmak = {
        'ujert': {
                main: ` <div id="tartalom2">
                            <div id="uj" class="tartdob">
                                <div id="ujinek">
                                    <form action="">
                                    <div class="inek">
                                        <div class="gyikcim">Új értékelés indítása</div>
                                
                                        <div>
                                            <label for="neve">Vizsgálat neve:</label>
                                            <input id="neve" type="text" required placeholder="Adja meg a vizsgálat nevét, címét">
                                        </div>
                                        <div>
                                            <label for="idoszak">Vizsgált időszak:</label>
                                            <input id="idoszak" type="text" required placeholder="Pl tanév, évszám, tárgyhó, stb">
                                        </div>
                                        <div>
                                            <label for="megnevezes">Vizsgálat típusa:</label>
                                    <input id="megnevezes" type="text" required placeholder="Pl: év végi értékelés, jelentés, stb.">
                                        </div>
                                    </div>
                                    <div id="go" style="height:100%; flex-direction:column">
                                        <div class="kijelentem">
                                            <label for="kijelentem">
                                                „Nyilatkozom, hogy rendelkezem a kitöltésben érintett személyek személyes adatainak jogszerű kezeléséhez szükséges
                                                hozzájárulásokkal és tájékoztatással, továbbá tudomásul veszem, hogy ezeket saját intézményemben tárolom és dokumentálom.
                                                Amennyiben a vizsgált személy nem töltötte be 16. életévét úgy én, vagy azon intézmény/munkahely melyenek képviseletében eljárok,
                                                a gyermek törvényes képviselőjének hozzájárulásával is rendelkezem és mind a törvényes képviselő mind a gyermek felé
                                                a megfelelő tájékoztatást nyújtottam ”
                                            </label>
                                            <input type="checkbox" name="kijelentem" id="kijelentem">
                                        </div>
                            <div class="mas">
                                    <div id="masik">
                                            <p>Keressünk...</p>
                                        </div>
                                             
                                        <button id="gobut" type="submit" style="    box-shadow: #ffbd1673 0px 0px 11px 11px;">
                                            <span class="material-symbols-rounded">edit</span>
                                            <p>Indítás</p>
                                        </button>
                                        
                                             <div id="egyik">
                                            <p>...Értékeket</p>
                                        </div>
                                    </div>

                                    </div>
                                </form>
                                </div>
                            </div>
                            
                            </div>`,
                lapok: `
        <div class="info-strip">
            <div class="infocard">
                <h3>Hogy indítok új értékelést?</h3>
                <p>                                    
                    Az alábbi adatok a kinyomtatott/lementett értékelés Főcímét fogják képezni. Később a <span class="material-symbols-rounded">page_header</span> gomb segítségével bármikor változtathat rajta!
                    <br> Töltse ki a vizsgálatra vonatkozó adatokat, majd kattintson az <b>"Indítás"</b>  gombra. Így rögtön az értékelő modulba kerül.
                </p>
            </div>
            
            <div class="infocard">
                <h3>Mire jók a bekért adatok?</h3>
                <p>                                    
                    Azon kívűl hogy a dokumentum címét képzik, a meglévő értékeléseknél, ezek alapján lehet szűrni.
                    Például: Szűrés vizsgálat típusa szerint: Az összes olyan értékelés egy helyre lesz csoportosítva amelynek a neve azonos (havi riport, negyedéves értékelés, stb)                                    </p>            
                </p>
            </div>
            <div class="infocard">
                <h3>Mire való a hozzájárulás?</h3>
                <p>                                    
                    Amennyiben egy személyt értékel, hozzjáruló nyilatkozattal kell rendelkeznie, hogy az értékelés az ő tudtával és beleegyezésével történt. A hozzájárulás tényét (pipálás) rendszerenünkben rögzítjük.
                </p>
            </div>
        </div>                            
            `
        },
        'accunt':{ 
        main: () => {
        // --- 1. URL VIZSGÁLATA (Melyik felületen vagyunk?) ---
        const isAdmin = window.location.pathname.includes('/admin/');
        const isElemzo = window.location.pathname.includes('/elemzo/');
        const isUser = window.location.pathname.includes('/user/'); // vagy alapértelmezett

        // --- 2. KÖZÖS VÁLTOZÓK ÉS LOGIKA ---
    // --- 2. KÖZÖS VÁLTOZÓK ÉS LOGIKA ---
        let altNapokInfo = 'N/A';
let licenszTipus = 'Aktív licensz'; // Alapértelmezett (éles) állapot
        if (idoszak === 'teszt') licenszTipus = 'Teszt időszak';
        if (idoszak === 'trial') licenszTipus = 'Próbaverzió';
        if (fizetve && int_fin) {
            try {
                const fizetesDatuma = new Date(fizetve);
                const ma = new Date();
                const lejaratDatuma = new Date(fizetesDatuma);
                
                // JAVÍTÁS: setMonth helyett setDate (Napokat adunk hozzá!)
                lejaratDatuma.setDate(lejaratDatuma.getDate() + parseInt(int_fin, 10));

                const maNormalizalt = new Date(ma.getFullYear(), ma.getMonth(), ma.getDate());
                const lejaratNormalizalt = new Date(lejaratDatuma.getFullYear(), lejaratDatuma.getMonth(), lejaratDatuma.getDate());
                
                const idokulonbseg = lejaratNormalizalt.getTime() - maNormalizalt.getTime();
                const napokSzama = Math.ceil(idokulonbseg / (1000 * 3600 * 24));

                if (napokSzama < 0) {
                    altNapokInfo = 'Az előfizetés lejárt';
                } else if (napokSzama === 0) {
                    altNapokInfo = 'Az előfizetés ma jár le';
                } else {
                    altNapokInfo = `Még ${napokSzama} nap az előfizetésből`;
                }
            } catch (error) {
                console.error("Hiba a licensz dátumának feldolgozása közben:", error);
            }
        }
if (isUser) {
        return `      
        <div class="kontainer">
                            <div class="grid-layout">
                                <div class="main-title card">
                                    <span>Jó újra látni ${userName}!</span>
                                </div>
                                <div class="description card">
                                   <div class="icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/></svg>
                                    </div>
                                 <span>
                                 <ul>
                                    <li>${aktualisSzerep}</li>
                                    <li>${intezmeny}</li>
                                    <li>${modul_leiras}</li>
                                 </ul>
                                  
                                            </span>
                                </div>
                                
                                <div class="card growth">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m312-751-40-120 56-18 40 119-56 19Zm138-49v-120h60v120h-60Zm198 49-56-19 40-119 56 19-40 119ZM86-40l-12-79 211-32q11-2 19.5-9.5T317-179l34-106q5-14 0-27t-18-20l-33 104-76-24 88-278q2-6 2-13t-2-13L178-304q-16 29-44.5 46.5T72-240H40v-80h32q11 0 20.5-5.5T107-341l177-334 50 28q37 21 52.5 60.5T389-506l-31 98q44 17 63.5 60t5.5 88l-34 106q-11 32-36.5 54.5T297-72L86-40Zm788 0L663-72q-34-5-59.5-27.5T567-154l-34-106q-14-45 5.5-88t63.5-60l-31-98q-13-41 2.5-80.5T626-647l50-28 177 334q5 10 14.5 15.5T888-320h32v80h-32q-33 0-61.5-17.5T782-304L648-556q-2 6-2 13t2 13l88 278-76 24-33-104q-13 7-18 20t0 27l34 106q4 11 12.5 18.5T675-151l211 32-12 79ZM224-252Zm512 0Zm-76 24-58-180 58 180ZM358-408l-58 180 58-180Z"/></svg></div>
                                    <div class="card-text-container">
                                              <span class="default-text">CSAPAT</span>
                                        <span class="alt-text">${azonosIntezmenyRegisztraltak} kolléga</span>
                                        
                                    </div>
                                </div>

                                <div class="card analysis">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">STATISZTIKA</span>
                                            <div class="alt-text" style="text-align:left">
                                                        Legjobban sikerült értékelés:
                                                            <ul style=list-style-type: square;">
                                                                <li>${legjobbErtekelesNev} - ${legjobbErtekelesSzazalek} %</li>
                                                            </ul>
                                                            Legjobb témakör:
                                                            <ul style=list-style-type: square;">
                                                            <li>${kedvencKategoriaNev} (Átlag: ${kedvencKategoriaAtlag}%)</li>                                                            </ul>
                                                        </ul>
                                            </div>                                    
                                    </div>
                                </div>
                                
                                <div class="card goals">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-40q-112 0-206-51T120-227v107H40v-240h240v80h-99q48 72 126.5 116T480-120q75 0 140.5-28.5t114-77q48.5-48.5 77-114T840-480h80q0 91-34.5 171T791-169q-60 60-140 94.5T480-40Zm-36-160v-52q-47-11-76.5-40.5T324-370l66-26q12 41 37.5 61.5T486-314q33 0 56.5-15.5T566-378q0-29-24.5-47T454-466q-59-21-86.5-50T340-592q0-41 28.5-74.5T446-710v-50h70v50q36 3 65.5 29t40.5 61l-64 26q-8-23-26-38.5T482-648q-35 0-53.5 15T410-592q0 26 23 41t83 35q72 26 96 61t24 77q0 29-10 51t-26.5 37.5Q583-274 561-264.5T514-250v50h-70ZM40-480q0-91 34.5-171T169-791q60-60 140-94.5T480-920q112 0 206 51t154 136v-107h80v240H680v-80h99q-48-72-126.5-116T480-840q-75 0-140.5 28.5t-114 77q-48.5 48.5-77 114T120-480H40Z"/></svg></div>
                                    <div class="card-text-container">
<span class="default-text" style="color: #ffffff;">${licenszTipus}</span>                                        <span class="alt-text">${altNapokInfo}</span>
                                    </div>
                                </div>
                                <div class="card dashboards">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z"/></svg></div>
                                   <div class="card-text-container">
                                        <span class="default-text">GENERÁCIÓK</span>
                                        <span class="alt-text">Még ${aiOsszMax} darab ai-generáció</span>
                                    </div>
                                </div>
                            </div>
                        </div>
    `;
    }
    else if (isElemzo) {
        return `
                  <div class="kontainer">
                            <div class="grid-layout">
                                <div class="main-title card">
                                    <span>Jó újra látni ${userName}!</span>
                                </div>
                                <div class="description card">
                                   <div class="icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/></svg>
                                    </div>
                                 <span>
                                 <ul>
                                    <li>${aktualisSzerep}</li>
                                    <li>${intezmeny}</li>
                                    <li>${modul_leiras}</li>
                                 </ul>
                                  
                                            </span>
                                </div>
                                
                                <div class="card growth">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m312-751-40-120 56-18 40 119-56 19Zm138-49v-120h60v120h-60Zm198 49-56-19 40-119 56 19-40 119ZM86-40l-12-79 211-32q11-2 19.5-9.5T317-179l34-106q5-14 0-27t-18-20l-33 104-76-24 88-278q2-6 2-13t-2-13L178-304q-16 29-44.5 46.5T72-240H40v-80h32q11 0 20.5-5.5T107-341l177-334 50 28q37 21 52.5 60.5T389-506l-31 98q44 17 63.5 60t5.5 88l-34 106q-11 32-36.5 54.5T297-72L86-40Zm788 0L663-72q-34-5-59.5-27.5T567-154l-34-106q-14-45 5.5-88t63.5-60l-31-98q-13-41 2.5-80.5T626-647l50-28 177 334q5 10 14.5 15.5T888-320h32v80h-32q-33 0-61.5-17.5T782-304L648-556q-2 6-2 13t2 13l88 278-76 24-33-104q-13 7-18 20t0 27l34 106q4 11 12.5 18.5T675-151l211 32-12 79ZM224-252Zm512 0Zm-76 24-58-180 58 180ZM358-408l-58 180 58-180Z"/></svg></div>
                                    <div class="card-text-container">
                                              <span class="default-text">${azonosIntezmenyRegisztraltak} fős CSAPAT</span>
                                        <span class="alt-text">${azonosIntezmenyElemzok} - elemző, ${azonosIntezmenyErtekelok} - értékelő</span>
                                        
                                    </div>
                                </div>

                                <div class="card analysis">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">STATISZTIKA</span>
                                            <div class="alt-text" style="text-align:left">
                                                        Legtöbb értékelést létrehozó:
                                                            <ul style=list-style-type: square;">
                                                                <li>${legtobbetErtekeltNev} - ${legtobbetErtekeltDarab} db</li>
                                                            </ul>
                                                            Legtöbbet megosztott létrehozó:
                                                            <ul style=list-style-type: square;">
                                                            <li>${legtobbetMegosztottNev} -  ${legtobbetMegosztottDarab} db</li>                                                            </ul>
                                                        </ul>
                                            </div>                                    
                                    </div>
                                </div>
                                
                                <div class="card goals">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-40q-112 0-206-51T120-227v107H40v-240h240v80h-99q48 72 126.5 116T480-120q75 0 140.5-28.5t114-77q48.5-48.5 77-114T840-480h80q0 91-34.5 171T791-169q-60 60-140 94.5T480-40Zm-36-160v-52q-47-11-76.5-40.5T324-370l66-26q12 41 37.5 61.5T486-314q33 0 56.5-15.5T566-378q0-29-24.5-47T454-466q-59-21-86.5-50T340-592q0-41 28.5-74.5T446-710v-50h70v50q36 3 65.5 29t40.5 61l-64 26q-8-23-26-38.5T482-648q-35 0-53.5 15T410-592q0 26 23 41t83 35q72 26 96 61t24 77q0 29-10 51t-26.5 37.5Q583-274 561-264.5T514-250v50h-70ZM40-480q0-91 34.5-171T169-791q60-60 140-94.5T480-920q112 0 206 51t154 136v-107h80v240H680v-80h99q-48-72-126.5-116T480-840q-75 0-140.5 28.5t-114 77q-48.5 48.5-77 114T120-480H40Z"/></svg></div>
                                    <div class="card-text-container">
<span class="default-text" style="color: #ffffff;">${licenszTipus}</span>                                        <span class="alt-text">${altNapokInfo}</span>
                                    </div>
                                </div>
                                <div class="card dashboards">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">GENERÁCIÓK</span>
                                        <span class="alt-text">Még ${aiOsszMax} darab ai-generáció</span>
                                    </div>
                                </div>
                            </div>
                        </div>
            `;
        }
    else if (isAdmin) {
            return `
                <div class="kontainer">
                            <div class="grid-layout">
                                <div class="main-title card">
                                    <span>Jó újra látni ${userName}!</span>
                                </div>
                                <div class="description card">
                                   <div class="icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/></svg>
                                    </div>
                                 <span>
                                 <ul>
                                    <li>${aktualisSzerep}</li>
                                    <li>${intezmeny}</li>
                                    <li>${modul_leiras}</li>
                                 </ul>
                                  
                                            </span>
                                </div>
                                
                                <div class="card growth">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m312-751-40-120 56-18 40 119-56 19Zm138-49v-120h60v120h-60Zm198 49-56-19 40-119 56 19-40 119ZM86-40l-12-79 211-32q11-2 19.5-9.5T317-179l34-106q5-14 0-27t-18-20l-33 104-76-24 88-278q2-6 2-13t-2-13L178-304q-16 29-44.5 46.5T72-240H40v-80h32q11 0 20.5-5.5T107-341l177-334 50 28q37 21 52.5 60.5T389-506l-31 98q44 17 63.5 60t5.5 88l-34 106q-11 32-36.5 54.5T297-72L86-40Zm788 0L663-72q-34-5-59.5-27.5T567-154l-34-106q-14-45 5.5-88t63.5-60l-31-98q-13-41 2.5-80.5T626-647l50-28 177 334q5 10 14.5 15.5T888-320h32v80h-32q-33 0-61.5-17.5T782-304L648-556q-2 6-2 13t2 13l88 278-76 24-33-104q-13 7-18 20t0 27l34 106q4 11 12.5 18.5T675-151l211 32-12 79ZM224-252Zm512 0Zm-76 24-58-180 58 180ZM358-408l-58 180 58-180Z"/></svg></div>
                                    <div class="card-text-container">
                                              <span class="default-text">CSAPAT</span>
                                        <span class="alt-text">${azonosIntezmenyRegisztraltak} kolléga</span>
                                        
                                    </div>
                                </div>

                                <div class="card analysis">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">STATISZTIKA</span>
                                            <div class="alt-text" style="text-align:left">
                                                        Legjobban sikerült értékelés:
                                                            <ul style=list-style-type: square;">
                                                                <li>${legjobbErtekelesNev} - ${legjobbErtekelesSzazalek} %</li>
                                                            </ul>
                                                            Legjobb témakör:
                                                            <ul style=list-style-type: square;">
                                                            <li>${kedvencKategoriaNev} (Átlag: ${kedvencKategoriaAtlag}%)</li>                                                            </ul>
                                                        </ul>
                                            </div>                                    
                                    </div>
                                </div>
                                
                                <div class="card goals">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-40q-112 0-206-51T120-227v107H40v-240h240v80h-99q48 72 126.5 116T480-120q75 0 140.5-28.5t114-77q48.5-48.5 77-114T840-480h80q0 91-34.5 171T791-169q-60 60-140 94.5T480-40Zm-36-160v-52q-47-11-76.5-40.5T324-370l66-26q12 41 37.5 61.5T486-314q33 0 56.5-15.5T566-378q0-29-24.5-47T454-466q-59-21-86.5-50T340-592q0-41 28.5-74.5T446-710v-50h70v50q36 3 65.5 29t40.5 61l-64 26q-8-23-26-38.5T482-648q-35 0-53.5 15T410-592q0 26 23 41t83 35q72 26 96 61t24 77q0 29-10 51t-26.5 37.5Q583-274 561-264.5T514-250v50h-70ZM40-480q0-91 34.5-171T169-791q60-60 140-94.5T480-920q112 0 206 51t154 136v-107h80v240H680v-80h99q-48-72-126.5-116T480-840q-75 0-140.5 28.5t-114 77q-48.5 48.5-77 114T120-480H40Z"/></svg></div>
                                    <div class="card-text-container">
<span class="default-text" style="color: #ffffff;">${licenszTipus}</span>                                        <span class="alt-text">${altNapokInfo}</span>
                                    </div>
                                </div>
                                <div class="card dashboards">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">GENERÁCIÓK</span>
                                        <span class="alt-text">Még ${aiOsszMax} darab ai-generáció</span>
                                    </div>
                                </div>
                            </div>
                        </div>
            `;
        }
        },

          lapok: () => {
                // --- 1. URL VIZSGÁLATA (Ugyanaz a logika, mint a main-nél) ---
                const isAdmin = window.location.pathname.includes('/admin/');
                const isElemzo = window.location.pathname.includes('/elemzo/');

                // --- 2. KÖZÖS VÁLTOZÓK ---
                // Ellenőrizzük, hogy a tömb létezik-e és tényleg tömb-e
                const modulNevek = hozzaferhetoModulok && Array.isArray(hozzaferhetoModulok)
                    ? `<ul>${hozzaferhetoModulok.map(modul => `<li>${modul.leiras.replace(/^(\S+)/, '<strong>$1</strong>')}</li>`).join('')}</ul>`
                    : 'Nincs szakmai modul hozzárendelve';

                // --- 3. LAYOUTOK GENERÁLÁSA AZ URL ALAPJÁN ---

                // A) ADMIN LAYOUT (Jobb oldali / Alsó sáv)
                if (isAdmin) {
                    return `
                           <div class="kontainer2">
                            <div class="grid-layout">
                                <div class="description2 card">
                                    <div class="narancsinfo">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z"/></svg>
                                    </div>
                                    <div class="feherinfo">
                                        <div class="tipp-blokk delay-1">
                                            <span class="mozog-jobbra">... Meglévő Értékeléseit az "ÉRTÉKEIM" menüpont alatt találja! </span>
                                            <span class="mozog-balra">... Új értékeléseket az "ÚJ ÉRTÉKELÉS" menüpont alatt indíthat! </span>
                                        </div>
                                        <div class="tipp-blokk delay-2">
                                            <span class="mozog-jobbra">... Módosításra jelölt értékeléseit keresse a "JAVASLATOK" menü alatt!</span>
                                            <span class="mozog-balra">... Együtt könyebb! Ossza meg munkáit kollegáival!</span>
                                        </div>
                                         <div class="tipp-blokk delay-3">
                                            <span class="mozog-balra">... Figyeljen az értékeléseken a naptár ikonra! Leadási határidőt rejtenek!</span>
                                            <span class="mozog-jobbra">... A diagrammok ki-be kapcsolhatók, a diagramm menüben!</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card growth2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m424-318 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm301.5-598.5Q510-807 510-820t-8.5-21.5Q493-850 480-850t-21.5 8.5Q450-833 450-820t8.5 21.5Q467-790 480-790t21.5-8.5ZM200-200v-560 560Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">${osszert} értékelés</span>
                                        <span class="alt-text">${mastolKapottEditor} megosztott, ${sajatLetrehozasuAdmin} saját értékelés</span>
                                    </div>
                                </div>
                                
                                <div class="card goals2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M580-360q33 0 56.5-23.5T660-440q0-33-23.5-56.5T580-520q-15 0-28.5 5.5T527-500l-107-54v-12l107-54q11 9 24.5 14.5T580-600q33 0 56.5-23.5T660-680q0-33-23.5-56.5T580-760q-33 0-56.5 23.5T500-680v6l-107 54q-11-9-24.5-14.5T340-640q-33 0-56.5 23.5T260-560q0 33 23.5 56.5T340-480q15 0 28.5-5.5T393-500l107 54v6q0 33 23.5 56.5T580-360ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">${osszoszt} megosztás</span>
                                        <span class="alt-text">${mastolKapottEditor} önnel, ${megosztottMasokkal} ön által megosztott értékelés</span>
                                    </div>
                                </div>
                                
                                <div class="card dashboards2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440t28.5-140.5q28.5-65.5 77-114t114-77Q405-800 480-800t140.5 28.5q65.5 28.5 114 77t77 114Q840-515 840-440t-28.5 140.5q-28.5 65.5-77 114t-114 77Q555-80 480-80t-140.5-28.5ZM480-440Zm112 168 56-56-128-128v-184h-80v216l152 152ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text"> ${osszhatarido} határidő</span>
                                        <span class="alt-text">${auditHataridok} határidő, ${auditFigyelmeztetesek} javaslat</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // B) ELEMZŐ LAYOUT (Jobb oldali / Alsó sáv)
                else if (isElemzo) {
                    return `
                           <div class="kontainer2">
                            <div class="grid-layout">
                                <div class="description2 card">
                                    <div class="narancsinfo">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z"/></svg>
                                    </div>
                                    <div class="feherinfo">
                                        <div class="tipp-blokk delay-1">
                                            <span class="mozog-jobbra">... Kollegái Értékeléseit az "INTÉZMÉNY" menüpont alatt találja! </span>
                                            <span class="mozog-balra">... A meglévő moderálásokat az "AUDIT" menüpont alatt, állapot függően találja! </span>
                                        </div>
                                        <div class="tipp-blokk delay-2">
                                            <span class="mozog-jobbra">... Auditációra kijelölhet egyénileg vagy csoportosan!</span>
                                            <span class="mozog-balra">... Jóváhagyásról és auditációról automatikus e-mailt küldünk!</span>
                                        </div>
                                         <div class="tipp-blokk delay-3">
                                            <span class="mozog-balra">... Az értékelő saját értékelésénél látja az ön utoló üzenetét!</span>
                                            <span class="mozog-jobbra">... A diagrammok ki-be kapcsolhatók, a diagramm menüben!</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card growth2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m424-318 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm301.5-598.5Q510-807 510-820t-8.5-21.5Q493-850 480-850t-21.5 8.5Q450-833 450-820t8.5 21.5Q467-790 480-790t21.5-8.5ZM200-200v-560 560Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">Összesen ${globalAdminCount} értékelés</span>
                                        <span class="alt-text">Összesen ${globalEditorCount} megosztás </span>
                                    </div>
                                </div>
                                
                                <div class="card goals2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M580-360q33 0 56.5-23.5T660-440q0-33-23.5-56.5T580-520q-15 0-28.5 5.5T527-500l-107-54v-12l107-54q11 9 24.5 14.5T580-600q33 0 56.5-23.5T660-680q0-33-23.5-56.5T580-760q-33 0-56.5 23.5T500-680v6l-107 54q-11-9-24.5-14.5T340-640q-33 0-56.5 23.5T260-560q0 33 23.5 56.5T340-480q15 0 28.5-5.5T393-500l107 54v6q0 33 23.5 56.5T580-360ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">Értékelők audit</span>
                                        <span class="alt-text">${globalWarmUserCount} Értékelő értékelése vár jóváhagyásra, ${globalHataridoUserCount} Értékelőnek kiosztott határidő</span>
                                    </div>
                                </div>
                                
                                <div class="card dashboards2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440t28.5-140.5q28.5-65.5 77-114t114-77Q405-800 480-800t140.5 28.5q65.5 28.5 114 77t77 114Q840-515 840-440t-28.5 140.5q-28.5 65.5-77 114t-114 77Q555-80 480-80t-140.5-28.5ZM480-440Zm112 168 56-56-128-128v-184h-80v216l152 152ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text"> Értékelések audit</span>
                                        <span class="alt-text">${globalHataridoEvalCount} határidő, ${globalWarmEvalCount} javaslat, ${globalAudit2Count} jóváhagyás</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }

                // C) USER (ÉRTÉKELŐ) LAYOUT - EZ A TE JELENLEGI MEGLÉVŐ KÓDOD!
                else {
                    return `        
                        <div class="kontainer2">
                            <div class="grid-layout">
                                <div class="description2 card">
                                    <div class="narancsinfo">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z"/></svg>
                                    </div>
                                    <div class="feherinfo">
                                        <div class="tipp-blokk delay-1">
                                            <span class="mozog-jobbra">... Meglévő Értékeléseit az "ÉRTÉKEIM" menüpont alatt találja! </span>
                                            <span class="mozog-balra">... Új értékeléseket az "ÚJ ÉRTÉKELÉS" menüpont alatt indíthat! </span>
                                        </div>
                                        <div class="tipp-blokk delay-2">
                                            <span class="mozog-jobbra">... Módosításra jelölt értékeléseit keresse a "JAVASLATOK" menü alatt!</span>
                                            <span class="mozog-balra">... Együtt könyebb! Ossza meg munkáit kollegáival!</span>
                                        </div>
                                         <div class="tipp-blokk delay-3">
                                            <span class="mozog-balra">... Figyeljen az értékeléseken a naptár ikonra! Leadási határidőt rejtenek!</span>
                                            <span class="mozog-jobbra">... A diagrammok ki-be kapcsolhatók, a diagramm menüben!</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="card growth2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m424-318 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm301.5-598.5Q510-807 510-820t-8.5-21.5Q493-850 480-850t-21.5 8.5Q450-833 450-820t8.5 21.5Q467-790 480-790t21.5-8.5ZM200-200v-560 560Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">${osszert} értékelés</span>
                                        <span class="alt-text">${mastolKapottEditor} megosztott, ${sajatLetrehozasuAdmin} saját értékelés</span>
                                    </div>
                                </div>
                                
                                <div class="card goals2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M580-360q33 0 56.5-23.5T660-440q0-33-23.5-56.5T580-520q-15 0-28.5 5.5T527-500l-107-54v-12l107-54q11 9 24.5 14.5T580-600q33 0 56.5-23.5T660-680q0-33-23.5-56.5T580-760q-33 0-56.5 23.5T500-680v6l-107 54q-11-9-24.5-14.5T340-640q-33 0-56.5 23.5T260-560q0 33 23.5 56.5T340-480q15 0 28.5-5.5T393-500l107 54v6q0 33 23.5 56.5T580-360ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text">${osszoszt} megosztás</span>
                                        <span class="alt-text">${mastolKapottEditor} önnel, ${megosztottMasokkal} ön által megosztott értékelés</span>
                                    </div>
                                </div>
                                
                                <div class="card dashboards2">
                                    <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440t28.5-140.5q28.5-65.5 77-114t114-77Q405-800 480-800t140.5 28.5q65.5 28.5 114 77t77 114Q840-515 840-440t-28.5 140.5q-28.5 65.5-77 114t-114 77Q555-80 480-80t-140.5-28.5ZM480-440Zm112 168 56-56-128-128v-184h-80v216l152 152ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z"/></svg></div>
                                    <div class="card-text-container">
                                        <span class="default-text"> ${osszhatarido} határidő</span>
                                        <span class="alt-text">${auditHataridok} határidő, ${auditFigyelmeztetesek} javaslat</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }
            }
        },
  'fiokom': {
     main: () => {
            let licenszLejarat = 'Nincs adat';
            let napokInfo = 'N/A';
            
            // 🌟 ÚJ: Státusz fordítása itt is
            let licenszTipus = 'Aktív licensz';
            if (idoszak === 'teszt') licenszTipus = 'Teszt időszak';
            if (idoszak === 'trial') licenszTipus = 'Próbaverzió';

            if (fizetve && int_fin !== undefined && int_fin !== null) {
                try {
                    const fizetesDatuma = new Date(fizetve);
                    const ma = new Date();
                    const lejaratDatuma = new Date(fizetesDatuma);

                    // Napok hozzáadása
                    const pluszNapok = parseInt(int_fin, 10);
                    lejaratDatuma.setDate(lejaratDatuma.getDate() + pluszNapok);

                    // ÚJ: Kiszámoljuk és megformázzuk a pontos lejárati dátumot (Pl: 2024.05.12)
                    const ev = lejaratDatuma.getFullYear();
                    const ho = String(lejaratDatuma.getMonth() + 1).padStart(2, '0');
                    const nap = String(lejaratDatuma.getDate()).padStart(2, '0');
                    licenszLejarat = `${ev}.${ho}.${nap}.`;

                    const maNormalizalt = new Date(ma.getFullYear(), ma.getMonth(), ma.getDate());
                    const lejaratNormalizalt = new Date(lejaratDatuma.getFullYear(), lejaratDatuma.getMonth(), lejaratDatuma.getDate());
                    
                    const idokulonbseg = lejaratNormalizalt.getTime() - maNormalizalt.getTime();
                    const napokSzama = Math.ceil(idokulonbseg / (1000 * 3600 * 24));

                    // JAVÍTÁS: Itt a napokInfo változót módosítjuk az altNapokInfo helyett!
                    if (napokSzama < 0) {
                        napokInfo = 'Lejárt';
                    } else if (napokSzama === 0) {
                        napokInfo = 'Ma jár le';
                    } else {
                        napokInfo = `${napokSzama} nap van hátra`;
                    }
                } catch (error) {
                    console.error("Hiba a licensz dátumának feldolgozása közben:", error);
                }
            }

       return `      
                <div class="grid">
                    <div class="elso">
                        <h1>${fullname}</h1>
                        <p> <b>Felhasználónév: </b>${userName}</p>
                        <p><b>Fiók státusza: </b><span style="color: #000000; font-weight: bold;">${licenszTipus}</span></p>
                        
                        <p><b>Értékelhető idő (licensz lejárta):</b> <br>${licenszLejarat} - ${napokInfo}</p>
                    </div>
                </div>
                <div class="info-strip">
                    <div class="infocard" id="changepass">Jelszó megváltoztatása</div>
                    <div style ="display:none" class="infocard" id="remove">Adatvédelmi beállítások</div>
                    <div class="infocard" id="plussj">Kérelem jogosultságok bővítésére</div>
                    <div class="infocard" id="deleteacc">Profil Törlése</div>
                </div>`;
        },
        lapok: () => {
            const modulNevek = hozzaferhetoModulok && Array.isArray(hozzaferhetoModulok)
                ? `<ul>${hozzaferhetoModulok.map(modul => `<li>${modul.leiras.replace(/^(\S+)/, '<strong>$1</strong>')}</li>`).join('')}</ul>`
                : 'Nincs szakmai modul hozzárendelve';

            return `        
                <div class="info-strip">
                    <div class="infocard">
                        <h3>Intézmény</h3>
                        <p><b>${intezmeny}</b> - ${intkapmail}</p>
                    </div>
                    <div class="infocard">
                        <h3>Szerepkör</h3>
                        <p> ${leiras.replace(/^(\S+)/, '<strong>$1</strong>')}</p>
                    </div>
                    <div class="infocard">
                        <h3>Szakmai modulok</h3>
                        <p> ${modulNevek}</p>
                    </div>
                    <div class="infocard">
                        <h3>Elérhetőség</h3>
                        <p><b>E-mail: </b>- ${mailname} <br> 
                        <b>Telefonszám: </b>- ${tel} <br></p>
                    </div>
                </div>`;
        }
        },
        'hozzaj': {
    main: () => {
        const isElemzo = window.location.pathname.includes('/elemzo/');

        if (isElemzo) {
            return `
             <div class="audit-tab-container">
                <div class="audit0">
                    <div class="audit-tabs">
                        <div class="audit-tab-slider-bg"></div>
                        <button class="audit-tab-btn activex" data-index="0" data-slide="0">Jóváhagyásra váró</button>
                        <button class="audit-tab-btn" data-index="1" data-slide="1">Határidős értékelések</button>
                        <button class="audit-tab-btn" data-index="2" data-slide="2">Jóváhagyott</button>
                    </div>
                    <div id="tomlo">
                        <div class="search-bar">
                            <span class="material-symbols-rounded search-icon">search</span>
                            <div class="belsosearch">
                                <select id="kereso-tipus" class="search-select">
                                    <option value="nev">Név</option>
                                    <option value="idoszak">Időszak</option>
                                    <option value="megnevezes">Típus</option>
                                    <option value="all">Mind</option>
                                </select>
                                <input type="text" id="kereso" class="search-input" placeholder="Keresés...">
                            </div>
                        </div>
                    </div>
                </div>
                
                <div id="tartalom2" class="audit-content-wrapper">
                    <div class="audit-content-slider" id="auditSlider">
                        
                        <div class="audit-slide audit-slider-panel">
                            <div class="audit-lista">
                                <div class="audit-list-container">
                                    <div class="inner-div-notok"></div>
                                </div>
                            </div>
                        </div>

                        <div class="audit-slide audit-slider-panel">
                            <div class="audit-lista">
                                <div class="audit-list-container">
                                    <div class="inner-div-hatarido"></div>
                                </div>
                            </div>
                        </div>

                        <div class="audit-slide audit-slider-panel">
                            <div class="audit-lista">
                                <div class="audit-list-container">
                                    <div class="inner-div-ok"></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>`;
        } else {
            // NORMÁL FELHASZNÁLÓI NÉZET
            return `
            <div id="tartalom2">
                <div class="audit-slider-controls audit0">
                 <div class="audit-tabs">
                    <button class="audit-tab-btn activex" data-slide="0">Jóváhagyásra váró</button>
                    <button class="audit-tab-btn" data-slide="1">Határidős értékelések</button>
                    <button class="audit-tab-btn" data-slide="2">Jóváhagyott</button>
                 </div>

                    <div id="tomlo">
                    <div class="search-bar">
                        <span class="material-symbols-rounded search-icon">search</span>
                        <div class="belsosearch">
                            <select id="kereso-tipus" class="search-select">
                                <option value="nev">Név</option>
                                <option value="idoszak">Időszak</option>
                                <option value="megnevezes">Típus</option>
                                <option value="all">Mind</option>
                            </select>
                            <input type="text" id="kereso" class="search-input" placeholder="Keresés...">
                        </div>
                    </div>
                 </div>
                </div>

                <div class="audit-slider-viewport">
                    <div class="audit-slider-container" id="auditSlider">
                        
                        <div class="audit-slider-panel">
                            <div class="audit-lista">
                                <div class="audit-list-container outer-div">
                                    <div class="inner-div inner-div-notok"></div>
                                </div>
                            </div>
                        </div>

                        <div class="audit-slider-panel">
                            <div class="audit-lista">
                                <div class="audit-list-container outer-div">
                                    <div class="inner-div inner-div-hatarido"></div>
                                </div>
                            </div>
                        </div>

                        <div class="audit-slider-panel">
                            <div class="audit-lista">
                                <div class="audit-list-container outer-div">
                                    <div class="inner-div inner-div-ok"></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>`;
        }
    },
                lapok: () => {
                    const isElemzo = window.location.pathname.includes('/elemzo/');
                    
                    if (isElemzo) {
                        return `
                        <div class="info-strip">
                            <div class="outer-div messageouter">
                                <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő</h3>

                             <div class="calendardiv" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px;">
                            <div>
                                <span style="color: gray; font-size: 0.9em;">Jelenlegi határidő:</span><br>
                                <span id="akthat" style="font-weight: bold; font-size: 1.1em; color: #ffbd16;">Nincs megadva</span>
                            </div>
                            <div id="calendar-btn" style="cursor: pointer; padding: 8px 12px; background: rgba(255, 101, 0, 0.1); border: 1px solid #ff6500; border-radius: 6px; color: #ff6500; font-weight: bold; transition: all 0.3s; display: flex; align-items: center; gap: 5px;">
                                <span class="material-symbols-rounded" style="font-size: 1.2em;">edit_calendar</span>
                                Határidő módosítása
                            </div>
                        </div>

                                <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek</h3>

                                <div class="inner-div messengerdiv">
                                    <p style="text-align:center; color:gray; padding: 20px;">Válasszon ki egy értékelést a jóváhagyott, vagy jóváhagysára váró értékelések közül a hozzájuktartozó információk megtekintéséhez.</p>
                                </div>
                                
                                <div class="audit-input-area">
                                    <input type="text" id="audit-msg-input" placeholder="Üzenet írása...">
                                    <div>   
                                        <button id="audit-msg-send">Küldés</button>
                                    </div>
                                </div>
                                <div class="audit-input-area">
                                    <button id="audit-approve-btn">Értékelés Jóváhagyása</button>
                                </div>
                            </div>
                        </div>`;
                    } else {
                        return `
                         <div class="info-strip">
                            <div class="outer-div messageouter">
                                <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő</h3>

                                <div class="calendardiv">
                                    <div>
                                        <span>Határidő:</span> 
                                        <span id="akthat">Nincs megadva</span>
                                    </div>
                                </div>

                                <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek</h3>

                                <div class="inner-div messengerdiv">
                                    <p style="text-align:center; color:gray; padding: 20px;">Válasszon ki egy értékelést a jóváhagyott, vagy jóváhagysára váró értékelések közül a hozzájuktartozó információk megtekintéséhez.</p>
                                </div>
                                
                                <div class="audit-input-area">
                                    <input type="text" id="audit-msg-input" placeholder="Üzenet írása...">
                                    <div>   
                                        <button id="audit-msg-send2">Küldés</button>
                                    </div>
                                </div>
                                <div class="audit-input-area">
                                </div>
                            </div>
                        </div>`;
                    }
                }
        },
        'ujany': {
                main: ` <div id="tartalom2">
                                <div id="ujinek">
                                    <div class="info-strip">
                                        <div class="infocard" style='font-size:small;'>
                                            <h3>Új Kérdések felvitele meglévő Főkategóriákhoz</h3>
                            
                                            <p style="font-weight:normal">Az indítás gombra kattintva van lehetősége feltölteni a saját szakmai anyagát,
                                                vagy bővíteni a már meglévő anyagot.
                                                </p> <br>
                                                <p>Jelenleg a <span style="color: red"> "szakmai anyag neve" </span> anyagrészhez készül új kérdéseket feltölteni. Ha ez mégsem az ön álltal kiválasztott anyag, lépjen vissza a bejelentkeztető oldalra és válassza ki a megfelelőt a legördülő sávból
                                            </p>
                                        </div>
                                    </div>
                                    

                                    <div class="mas">
                                        <div style="margin-top:6vh" id="masik">
                                            <p>Teremtsünk...</p>
                                        </div>
                                     
                                        <button class="gobut5" style="box-shadow: #ffbd16 0px 0px 35px 25px;">
                                            <a href="/upload.html" >
                                                <span class="material-symbols-rounded">lab_panel</span>
                                                <p>Indítás</p>
                                            </a>
                                       </button>  

                                        <div id="egyik" style="margin-top:3vh">
                                            <p>...Értékeket</p>
                                        </div>
                                    </div>                            
                            </div>
                            <div class="info-strip">
                                    <div class="infocard">
                                        <p> Ha belépett a feltöltő és tesztelő felületre, hozhat létre:  </p>
                                        <p style="display: flex; flex-direction:column;">  
                                                    <p>- Al-kategóriákat</p>    
                                                    <p>- Hozzá tartozó témákat</p>    
                                                    <p>- Kérdéseket</p>    
                                                    <p>- és hozzá tartozó alkérdéseket</p>    
                                        </p>
                                            <p> továbbá tesztelheti a feltöltött kérdéseket pontszámozás és diagramm megjelenítés szempontjából.</p> 
                                            <br> 
                                            <p><b>Biztonsági okokból Főkategóriákat a bal oldali sávban lévő <span style="color:orange">Kategóriák</span> menün belül tud létrehozni</b></p>
                                    </div>
                            </div>
                        </div>`,
                lapok: `
        <div class="info-strip">
            <div class="infocard">
                <h3>Hogy töltök fel új anyagokat?</h3>
                <p>                                    
                   Az "Indítás" gombra kattintva átugri a feltöltő és tesztelő felületre. 
                   Itt lesz lehetősége új anyagokat rögzíteni alkategóriákon és annak témáin belül.
                   <b>Ennek viszont előfeltétele hogy legyenek létrehozva főtémakörök</b>
                   Ezt a baloldali sávban, a <b>témakörök</b> fülön tudja megtenni, az adatok megadásával majd a <b>Létrehozás</b> gombra kattintva.
                </p>
            </div>
            <div class="infocard">
                <h3>Hol fogom látni a létrehozott kérdésköröket?</h3>
                <p>                                    
                    Létrehozás után az oldal frissít, és mind az értékelő mind az adminisztrációs felületen megjelennek az új kategóriák dobozai.
                </p>
            </div>
            <div class="infocard">
                <h3>Milyen szakmai anyagot tudok feltölteni és mennyit?</h3>
                <p>                                    
                    Korlátlanul és szabadon tölthet fel szakmai anyagot amíg a licensze érvényes. Ezeket az anyagokat ön és kollegái is látni fogják.                              
                </p>
            </div>
            <div class="infocard">
                <h3>Mások szakmai anyagát is láthatom?</h3>
                <p>                                    
                 Csak ha előfizet rá és csak ha adott szakmai anyag készítői ehhez hozzájérulnak. 
                 Az ÉRTÉKEKben létre hozott anyagok alapból az ön szellemi tulajdonát képezik, más nem jogosult rájuk.   
                  </p>     
            </div>
        </div>                            
            `
        },
        'plussz': {
                main: ` <div id="tartalom2">
                            <div id="uj" class="tartdob">
                                <div id="ujak">
                                    <h3 class="param">Katagóriák létrehozása</h3>
                                        <div id="ujakbelso">
                                        <div class="fo-mini" >
                                            <div class="cim">
                                                <textarea name="newcim" id="newcim" class="cim-text">Új Főkategória </textarea>
                                            </div>
                                            <textarea name="newleiras" id="newleiras" class="leiras" rows="4" cols="40">Új Főkategória leírása</textarea>
                                        </div>
                                        <div class="belsobelso">
                                            <div class="szinek">
                                                <div  style="margin-bottom:12px"><b>Új főkategóriák színei</b></div>
                                                
                                                <div>
                                                    <label>Szín <input id="nf_szin1" type="color" value="#ff8000"></label>
                                                </div>  <div id="nf_szin_preview" class="szin-preview" style="display: none;"></div>

                                            </div>
                                            <div class="chart szinek">
                                        <div  style="margin-bottom:12px"><b>Új diagramm színei</b></div>
                                                <div style="    display: flex; margin:0px !important; justify-content: space-between; align-items: center;">
                                                <div>
                                                    <label>Szín <input id="fm_chart_color" type="color" value="#ff8000"></label>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="modal-buttons2">
                                        <button id="confirmNew">Létrehozás</button></div>
                                    </div>

                                </div>
                                   <div class="info-strip">
                                    <div class="infocard">
                                        <p>
                                        A rendszerhez való hozzáadáshoz kattintson a <b style= color:"orange">"Létrehozás"</b> gombra.
                                        Ezután a feltöltő és tesztelő oldalon kiválasztható lesz a listából.
                                        </p>
                                    </div>
                                </div>
                                <div class="info-strip">
                                    <div class="infocard">
                                        <p>A főkategóriák képezik a felvivendő kérdéskörök alapját. 
                                        Minden további kategória és kérdés ebből ágazódik le. 
                                        Létrehozáshoz meg kell adnia a nevét (színes doboz) majd a leírását (sötét doboz). 
                                         </p>
                                    </div>
                                </div>
                                  <div class="info-strip">
                                    <div class="infocard">
                                        <p>
                                        Az új kategória mellet találja a színválasztót. Válasszon egy tetszőleges színt a palettáról a kategóriának és a diagrammnak.
                                    </div>
                                </div>
                             
                                `,
                lapok: `
        <div class="info-strip"> <h3 style="margin-bottom:0px">Már felvitt kategóriák</h3>
        <p> A kategóriák nevére kattintva tudja a már felvitt, meglévő tartalmakat szerkeszteni (szín, név, leírás) illetve törölni őket a rendszerből</p>
              <div id="jelenlegi" class="outer-div">
                                
                                
                                        <div class="inner-div" style=" justify-content: space-around !important;">
                
                                            <h4>Jelenlegi kategóriák</h4>
                                            
                                    
                                    </div>
        </div>                            
            `
        }
        };
function initAuditSlider(container) {
    const wrapper = container || document;
    
    // Gombok és a tartalmi panelek lekérése
    const tabButtons = wrapper.querySelectorAll('.audit-tab-btn');
    const panels = wrapper.querySelectorAll('.audit-slider-panel, .audit-slide'); // Kezeli mindkét nézetet

    if (panels.length === 0 || tabButtons.length === 0) return;

    // Alapállapot beállítása: Csak az első panel (0. index) legyen látható, a többi rejtett
    panels.forEach((panel, index) => {
        panel.style.display = (index === 0) ? 'block' : 'none';
    });

    // Kattintás események beállítása
    tabButtons.forEach(button => {
        button.onclick = function() {
            // 1. Gombok "active" stílusának cseréje
            tabButtons.forEach(btn => btn.classList.remove('activex'));
            this.classList.add('activex');
            
            // 2. Melyik gombra kattintottunk? (Lekérjük a számot: 0 vagy 1)
            const targetIndex = parseInt(this.getAttribute('data-slide') || this.getAttribute('data-index'));
            
            // 3. Panelek megjelenítése/elrejtése a kattintás alapján
            panels.forEach((panel, panelIndex) => {
                if (panelIndex === targetIndex) {
                    panel.style.display = 'block'; // Megjelenítjük a kért divet
                } else {
                    panel.style.display = 'none';  // Elrejtjük a másikat
                }
            });
            const auditCheckboxes = document.querySelectorAll('.audit-cheking');
            if (auditCheckboxes.length > 0) {
                // 1. Minden pipát kiveszünk
                auditCheckboxes.forEach(cb => cb.checked = false);
                
                // 2. Szimulálunk egy "change" eseményt az elsőn, ami alapállapotba vágja a jobb oldali panelt is!
                auditCheckboxes[0].dispatchEvent(new Event('change'));
            }
        };
    });
}

const initialMain = layoutContainer.querySelector('.main');
        const initialLapok = layoutContainer.querySelector('#lapok');
        
        initialMain.dataset.contentId = 'ertekek';
        initialLapok.dataset.contentId = 'ertekek';

gombok.forEach(gomb => {
    gomb.addEventListener('click', function(e) { // <-- Figyeld az 'e' betűt a zárójelben!
        const aktivGombId = this.id;

        // 🌟 ÚJ: TESZTIDŐSZAK KVÓTA ELLENŐRZÉSE (SOFT LOCK)
   // 🌟 FRISSÍTVE: 3-ról 2-re módosítva a limit
   // 🌟 ÚJ: TESZTIDŐSZAK KVÓTA ELLENŐRZÉSE (SOFT LOCK)
// 🌟 ÚJ: TESZTIDŐSZAK KVÓTA ELLENŐRZÉSE (SOFT LOCK)
if (aktivGombId === 'ujert') {
    if (typeof window.isTesztLejart === 'function' && window.isTesztLejart()) {
        e.preventDefault();
        window.mutasdPiackutatoAblakot();
        return;
    }
}

        if (this.classList.contains('dobaktiv')) {
            return;
        }

        const elozoAktivGomb = document.querySelector('.dobaktiv');
        if (elozoAktivGomb) {
            elozoAktivGomb.classList.remove('dobaktiv');
            const elozoGombId = elozoAktivGomb.id;
            document.querySelectorAll(`[data-content-id="${elozoGombId}"]`).forEach(elem => {
                elem.classList.remove('aktiv-tartalom');
            });
        }
        
        this.classList.add('dobaktiv');

        let celTartalom = document.querySelectorAll(`[data-content-id="${aktivGombId}"]`);
        let newMain;

        if (celTartalom.length === 0) {
            const tartalomForras = ujTartalmak[aktivGombId];
            
            newMain = document.createElement('article');
            newMain.className = 'main';
            newMain.dataset.contentId = aktivGombId;

            newMain.innerHTML = typeof tartalomForras.main === 'function' 
                ? tartalomForras.main() 
                : tartalomForras.main;

            const newLapok = document.createElement('article');
            newLapok.className = 'lapok';
            newLapok.dataset.contentId = aktivGombId;

            newLapok.innerHTML = typeof tartalomForras.lapok === 'function'
                ? tartalomForras.lapok()
                : tartalomForras.lapok;

            layoutContainer.appendChild(newMain);
            layoutContainer.appendChild(newLapok);

            celTartalom = [newMain, newLapok];
        } else {
             newMain = document.querySelector(`.main[data-content-id="${aktivGombId}"]`);
        }
        
        if (aktivGombId === 'hozzaj' && newMain) {
            initAuditSlider(newMain);
            setTimeout(() => {
                if (typeof window.renderAuditListaDOM === 'function') {
                    window.renderAuditListaDOM();
                } else {
                    console.warn("Hiba: window.renderAuditListaDOM nem található!");
                }
            }, 50);
        }

        setTimeout(() => {
            celTartalom.forEach(elem => elem.classList.add('aktiv-tartalom'));
        }, 10);
  
    });
});
const fiokomGombok = document.querySelectorAll('#fiokom');

fiokomGombok.forEach(gomb => {
    gomb.addEventListener('click', function(e) {
        e.preventDefault(); 
        
        // Ha már ez az aktív, ne csináljon semmit
        if (this.classList.contains('dobaktiv')) {
            return;
        }

        const aktivGombId = 'fiokom'; 

        // 1. Előző aktív gomb megkeresése és tartalmának eltüntetése
        const elozoAktivGomb = document.querySelector('.dobaktiv');
        if (elozoAktivGomb) {
            elozoAktivGomb.classList.remove('dobaktiv');
            const elozoGombId = elozoAktivGomb.id;
            document.querySelectorAll(`[data-content-id="${elozoGombId}"]`).forEach(elem => {
                elem.classList.remove('aktiv-tartalom');
            });
        }
        
        // 2. HIÁNYZÓ LÉPÉS: Rátesszük az aktív jelölést a most megnyomott gombra!
        this.classList.add('dobaktiv');

        let celTartalom = document.querySelectorAll(`[data-content-id="${aktivGombId}"]`);
        let newMain;

        if (celTartalom.length === 0) {
            const tartalomForras = ujTartalmak[aktivGombId];
            
            newMain = document.createElement('article');
            newMain.className = 'main';
            newMain.dataset.contentId = aktivGombId;
            newMain.innerHTML = typeof tartalomForras.main === 'function' ? tartalomForras.main() : tartalomForras.main;

            const newLapok = document.createElement('article');
            newLapok.className = 'lapok';
            newLapok.dataset.contentId = aktivGombId;
            newLapok.innerHTML = typeof tartalomForras.lapok === 'function' ? tartalomForras.lapok() : tartalomForras.lapok;

            layoutContainer.appendChild(newMain);
            layoutContainer.appendChild(newLapok);

            celTartalom = [newMain, newLapok];
        } else {
             newMain = document.querySelector(`.main[data-content-id="${aktivGombId}"]`);
        }

        if (newMain) {
            setupAccountInfoListeners(newMain);
        }

        setTimeout(() => {
            celTartalom.forEach(elem => elem.classList.add('aktiv-tartalom'));
        }, 10);
    });
});
const accuntGomb = document.getElementById('accunt');
if (accuntGomb) {
        accuntGomb.click();
        
        // 🌟 ÚJ: Automatikus teszt-státusz ellenőrzés belépéskor
        // Várunk egy kicsit (1.5 mp), hogy a dashboard animációk lefussanak, 
        // és csak utána dobjuk be a kérdőívet, ha kell.
        setTimeout(() => {
            ellenorizTesztStatusz();
        }, 1500);

        setTimeout(() => {
            if (typeof playIntroSequence === 'function') {
                playIntroSequence();
            }
        }, 800);
    }

// 3. A TÖLTŐKÉPERNYŐ ELTÜNTETÉSE
const loadingOverlay = document.getElementById('loading-overlay');
if (loadingOverlay) {
    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 400); 
    }, 1050); 
}

}
// SEGÉDFÜGGVÉNYEK (Az initAside-on kívül!)

function playIntroSequence() {
    const pairs = [
        ['.analysis', '.growth2'],
        ['.growth', '.goals2'],
        ['.goals', '.dashboards2'],
        ['.dashboards'] 
    ];

    let delay = 0;
    const interval = 1500;

    pairs.forEach((pair, index) => {
        setTimeout(() => {
            pair.forEach(selector => {
                const card = document.querySelector(selector);
                if (card) {
                    card.classList.add('simulated-hover');
                }
            });

            if (index === pairs.length - 1) {
                setTimeout(() => {
                    document.querySelectorAll('.simulated-hover').forEach(card => {
                        card.classList.remove('simulated-hover');
                    });
                }, 2000); 
            }

        }, delay);
        delay += interval; 
    });
}

const infoPanelekTartalma = {
    'changepass': {
        title: 'Jelszó Megváltoztatása',
        content: passwordPanelContent
    },
    'remove': {
        title: 'Hozzájárulás Visszavonása',
        content: '<p>Biztosan visszavonja a hozzájárulását? Ez a művelet nem vonható vissza.</p><button>Visszavonás</button>'
    },
    'plussj': {
        title: 'Jogosultságok Bővítése',
        content: '<p>Jellezze az intézményi adminisztrátornak, milen szerepkört szeretne kérni. Jelenlegi szerepköreit jobb oldali sávban láthatja </p><textarea></textarea><button>Küldés</button>'
    },
    'deleteacc': {
        title: 'Profil Törlése',
        content: '<div id="delete-loader"><p>Fiók információk ellenőrzése...</p><div class="spinner"></div></div><div id="delete-content" style="display:none;"></div>'
    }
};
async function fetchAccountDeletionInfo(infoPanel) {
    try {
        const response = await fetch('/api/delete-account-info');
        const data = await response.json();

        // 1. Amint megvannak az adatok, a kis oldalsó panelt azonnal bezárjuk
        if (infoPanel) {
            infoPanel.classList.remove('aktivp');
            setTimeout(() => infoPanel.remove(), 300);
        }

        if (!data.success) {
            showAlert('Hiba történt az adatok lekérésekor.');
            return;
        }

        // SZABÁLY 1: Egyedüli ADMIN bizonyos modulokban (és vannak mások a cégben) -> ELZAVARJUK!
        if (data.roleId === 1 && !data.isOnlyUser && data.soleRolesInModules.length > 0) {
            const modulList = data.soleRolesInModules.map(m => `<li><b>${m.leiras || m.nev}</b></li>`).join('');
            
            // Saját modal felépítése a showAlert HELYETT
            const blockHTML = `
                <div style='text-align:left; padding: 15px; font-family: sans-serif; color: #333;'>
                    <h3 style='color:red; text-align:center; margin-bottom: 15px;'>Jogosutság átadása szükséges!</h3>
                    <p>Ön az <b>egyedüli Adminisztrátor</b> a következő modulokban, ezért jelenleg nem törölheti a fiókját:</p>
                    <ul style='margin-top:10px; margin-bottom:15px; padding-left:20px; color:red;'>${modulList}</ul>
                    <p>A felső menüsávban az "átjelentkezésre" kattintva váltson szerepkört, ha kell szakmai anyagot, és az Adminisztrátori felületen adjon adminisztrátori jogot egy kollégájának a profil törlése előtt!</p>
                    <button id="btnElzavaroBezaras" style="margin-top:20px; width:100%; background-color: #555; color: white; padding: 12px; border: none; cursor: pointer; border-radius: 5px; font-weight: bold; font-size: 1rem;">Bezárás</button>
                </div>
            `;

            const overlay = document.createElement('div');
            Object.assign(overlay.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
                alignItems: 'center', zIndex: '99999'
            });

            const modalBox = document.createElement('div');
            Object.assign(modalBox.style, {
                backgroundColor: '#fff', padding: '25px', borderRadius: '8px', 
                maxWidth: '500px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
            });
            
            modalBox.innerHTML = blockHTML;
            overlay.appendChild(modalBox);
            document.body.appendChild(overlay);

            // Eseménykezelő a Bezárás gombra
            document.getElementById('btnElzavaroBezaras').addEventListener('click', () => {
                overlay.remove();
            });
            
            return; // Kilépünk a függvényből, nem fut tovább a törlés!
        }

        // --- 2. A HTML TARTALOM FELÉPÍTÉSE (Ha eljutott idáig, törölhet) ---
        let warningHTML = "<div style='text-align:center; font-family: sans-serif;'>";
        warningHTML += "<h3 style='color:red; margin-bottom: 10px;'>Biztosan törölni szeretné a profilját?</h3>";
        warningHTML += "<p style='margin-bottom: 15px;'>Ez a művelet <b>nem vonható vissza</b>!</p>";

        if (data.isOnlyUser) {
            warningHTML += "<div style='margin-bottom:15px; padding:10px; background:rgba(255,0,0,0.1); border-left:4px solid red; text-align:left;'><b>FIGYELEM:</b> Ön az egyetlen regisztrált felhasználó az intézményben! A fiók törlésével a teljes intézményi adatbázis hozzáférhetetlenné válik.</div>";
        } else if (data.roleId === 2 && data.soleRolesInModules.length > 0) {
            // SZABÁLY 2: Egyedüli ELEMZŐ bizonyos modulokban -> FIGYELMEZTETÉS
            const modulList = data.soleRolesInModules.map(m => m.leiras || m.nev).join(', ');
            warningHTML += `<div style='margin-bottom:15px; padding:10px; background:rgba(255,165,0,0.2); border-left:4px solid orange; text-align:left;'><b>FIGYELEM:</b> Ön az egyetlen Elemző az alábbi modul(ok)ban: <b>${modulList}</b>. Kérjük a törlés után jelezze ezt az Adminnak.</div>`;
        }

        if (data.sharedUsers && data.sharedUsers.length > 0) {
            warningHTML += "<div style='text-align:left; margin-bottom:15px; padding:10px; background:rgba(255,165,0,0.1); border-left:4px solid orange;'>";
            warningHTML += "<b>Az alábbi megosztott értékelései fognak végleg eltűnni a kollégáitól:</b><ul style='margin-top:5px; padding-left: 20px;'>";
            data.sharedUsers.forEach(u => {
                const modulLeiras = u.modul_leiras ? `[${u.modul_leiras}]` : '[Ismeretlen modul]';
                // ITT KAPJA MEG A TELJES NEVET (Cím + Személy neve)
                const teljesNev = u.vizsgalt_nev ? `${u.kitoltes_neve} (${u.vizsgalt_nev})` : u.kitoltes_neve;
                
                warningHTML += `<li>${modulLeiras} <b>${teljesNev}</b> (Kolléga: ${u.vez})</li>`;
            });
            warningHTML += "</ul></div>";
        }

        // --- GOMBOK ---
        warningHTML += `
            <div id="alertDeleteButtons" style="margin-top:20px; display:flex; flex-direction:column; gap:10px;">
                <button id="btnMegertettem" style="background-color: red; color: white; padding: 12px; border: none; cursor: pointer; border-radius: 5px; font-weight: bold; font-size: 1rem; transition: 0.3s;">
                    Megértettem, mindenképp törlöm a fiókot
                </button>
                <button id="btnMegsem" style="background-color: #555; color: white; padding: 12px; border: none; cursor: pointer; border-radius: 5px; font-weight: bold; font-size: 1rem; transition: 0.3s;">
                    Mégsem
                </button>
            </div>
        </div>`;

        // --- 3. SAJÁT MODAL (OVERLAY) LÉTREHOZÁSA ---
        const overlay = document.createElement('div');
        overlay.id = "customDeleteModal";
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: '99999'
        });

        const modalBox = document.createElement('div');
        Object.assign(modalBox.style, {
            backgroundColor: '#fff', padding: '25px', borderRadius: '8px', 
            maxWidth: '500px', width: '90%', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            color: '#333'
        });
        
        modalBox.innerHTML = warningHTML;
        overlay.appendChild(modalBox);
        document.body.appendChild(overlay);

        // --- 4. ESEMÉNYKEZELŐK RÁKÖTÉSE A GOMBOKRA ---
        const btnMegertettem = document.getElementById('btnMegertettem');
        const btnMegsem = document.getElementById('btnMegsem');
        const btnContainer = document.getElementById('alertDeleteButtons');

        if (btnMegsem) {
            btnMegsem.addEventListener('click', () => {
                overlay.remove(); 
            });
        }

        if (btnMegertettem) {
            btnMegertettem.addEventListener('click', async () => {
                btnMegertettem.disabled = true;
                btnMegertettem.innerText = "Törlés folyamatban...";
                btnMegertettem.style.backgroundColor = "gray";
                if (btnMegsem) btnMegsem.style.display = "none";

                try {
                    const delRes = await fetch('/api/delete-my-account', { method: 'DELETE' });
                    const delData = await delRes.json();
                    
                    if (delData.success) {
                        btnContainer.innerHTML = "<p style='color:green; font-weight:bold; font-size:1.1rem; padding:10px;'>Fiókja és minden adata sikeresen törölve. Kijelentkezés...</p>";
                        setTimeout(() => {
                            window.location.href = '/index.html'; 
                        }, 3000);
                    } else {
                        alert('Hiba történt a törlés során!');
                        btnMegertettem.disabled = false;
                        btnMegertettem.innerText = "Megértettem, mindenképp törlöm a fiókot";
                        btnMegertettem.style.backgroundColor = "red";
                        if (btnMegsem) btnMegsem.style.display = "block";
                    }
                } catch (error) {
                    console.error(error);
                    alert('Hálózati hiba történt a törléskor.');
                }
            });
        }

    } catch (error) {
        console.error(error);
        showAlert('Hálózati hiba történt a törlés ellenőrzésekor.');
    }
}
function setupAccountInfoListeners(mainElement) {
    const elsoDiv = mainElement.querySelector('.elso');
    const infoCards = mainElement.querySelectorAll('.infocard');

    if (!elsoDiv || infoCards.length === 0) return;

    infoCards.forEach(card => {
        card.addEventListener('click', function() {
            const cardId = this.id;
            const tartalom = infoPanelekTartalma[cardId];

            // 1. Meglévő panel törlése
            const letezikPanel = elsoDiv.querySelector('.info-panel');
            if (letezikPanel) {
                letezikPanel.remove();
            }

            // 2. Új panel létrehozása
            if (tartalom) {
                const infoPanel = document.createElement('div');
                infoPanel.className = 'info-panel';
                infoPanel.innerHTML = `
                    <span class="bezaras">&times;</span>
                    <h3>${tartalom.title}</h3>
                    <div>${tartalom.content}</div>
                `;

                elsoDiv.appendChild(infoPanel);

                // 3. EGYEDI LOGIKÁK HÍVÁSA (Itt már létezik az infoPanel!)
                if (cardId === 'changepass') {
                    addPasswordValidationLogic(infoPanel, userName);
                }

                if (cardId === 'deleteacc') {
                    fetchAccountDeletionInfo(infoPanel); // <-- MOST MÁR JÓ HELYEN VAN!
                }

                // 4. Animáció és bezárás gomb
                setTimeout(() => {
                    infoPanel.classList.add('aktivp');
                }, 10);

                infoPanel.querySelector('.bezaras').addEventListener('click', () => {
                    infoPanel.classList.remove('aktivp');
                    infoPanel.addEventListener('transitionend', () => {
                        infoPanel.remove();
                    }, { once: true });
                });
            }
        });
    });
}

// 🌟 1. A felugró ablakot "globálissá" (window) tesszük, hogy a dashCRUD is elérje
window.mutasdPiackutatoAblakot = function() {
    if (document.getElementById('teszt-modal')) return;
    
    // Megnézzük, hogy a kérdőív utáni extra időszakban vagyunk-e
    const isExt = (idoszak === 'teszt_ext');
    
    let modalHTML = `
       <div class="modal-container">
    <div class="modal-icon-wrapper">
        <span class="material-symbols-rounded icon-orange">${isExt ? 'lock' : 'volunteer_activism'}</span>
    </div>
    
    <h2 class="modal-title">${isExt ? 'A tesztidőszak véget ért!' : 'Elérte a tesztelési limitet!'}</h2>
    
    <p class="modal-text">Már létrehozta a maximálisan engedélyezett értékeléseket, vagy letelt a meghosszabított 15 nap.</p>
    <p class="modal-text">A meglévő értékeléseit továbbra is megnézheti, letöltheti és generálhat belőlük dokumentumokat!</p>
    `;

    // Ha még NINCS kitöltve a kérdőív, felkínáljuk a lehetőséget
    if (!isExt) {
        modalHTML += `
        <p class="modal-subtext">Tetszik a munkánk? Ahhoz, hogy a jövőben még jobbá tehessük az ÉRTÉKEK-et, kérjük, szánjon 1 percet a tapasztalatai megosztására.</p>
        
        <div class="modal-info-box">
            <b>Értékeljük az idejét:</b>
            <p>A kérdőív kitöltése után <b>újabb 2 értékelést hozhat létre még 15 napig!</b></p>
        </div>

        <div class="modal-actions">
            <button id="btnKardiov" class="btn4 btn-primary">
                <span class="material-symbols-rounded">edit_document</span> Kitöltöm a kérdőívet
            </button>
            <button id="btnModalZar" class="btn4 btn-secondary">
                ...Inkább később
            </button>
        </div>`;
    } 
    // Ha MÁR kitöltötte, és ez az extra idő is lejárt, elküldjük előfizetni
    else {
        modalHTML += `
        <div class="modal-info-box">
            <p>A rendszer további használati feltételeiről hamarosan e-mailben tájékoztatjuk.</p>
                        <p>Köszönjük, hogy részt vett a tesztelési időszakban! Tapasztalatai felbecsülhetetlenek számunkra!.</p>

        </div>
        <div class="modal-actions">
            <button id="btnModalZar" class="btn4 btn-secondary" style="    width: fit-content !important;background: orange;">
                Bezárás
            </button>
        </div>`;
    }
    
    modalHTML += `</div>`;
    
    // Háttér és felugró létrehozása... (a logika innentől marad ugyanaz)
    const overlay = document.createElement('div');
    overlay.id = 'teszt-modal';
    Object.assign(overlay.style, {
        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center',
        alignItems: 'center', zIndex: '999999', backdropFilter: 'blur(5px)',
        opacity: '0', transition: 'opacity 0.3s ease'
    });

    const modalBox = document.createElement('div');
    Object.assign(modalBox.style, {
        backgroundColor: '#fff', padding: '40px', borderRadius: '15px', 
        maxWidth: '550px', width: '90%', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        transform: 'translateY(50px)', transition: 'transform 0.3s ease'
    });
    
    modalBox.innerHTML = modalHTML;
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);

    // Animáció
    setTimeout(() => {
        overlay.style.opacity = '1';
        modalBox.style.transform = 'translateY(0)';
    }, 10);

    // Eseménykezelők
    document.getElementById('btnModalZar').addEventListener('click', () => {
        overlay.style.opacity = '0';
        modalBox.style.transform = 'translateY(50px)';
        setTimeout(() => overlay.remove(), 300);
    });

    // Kérdőív gomb eseménykezelője (csak ha létezik a gomb!)
    const btnKardiov = document.getElementById('btnKardiov');
    if (btnKardiov) {
        btnKardiov.addEventListener('click', () => {
            window.location.href = '/private/kerdoiv.html';        
        });
    }
};

window.isTesztLejart = function() {
    // Csak a 'teszt' és a 'teszt_ext' (meghosszabbított teszt) esetén blokkolunk
    if (idoszak !== 'teszt' && idoszak !== 'teszt_ext') return false;

    // Ha 'teszt', akkor 2 a limit. Ha 'teszt_ext' (kérdőív után), akkor már 4 (2 eredeti + 2 jutalom).
    const maxErtekeles = (idoszak === 'teszt') ? 2 : 4; 
    let lejart = false;

    // 1. Időkorlát ellenőrzése
    if (fizetve && int_fin) {
        const fizetesDatuma = new Date(fizetve);
        const ma = new Date();
        const lejaratDatuma = new Date(fizetesDatuma);
        lejaratDatuma.setDate(lejaratDatuma.getDate() + parseInt(int_fin, 10));
        
        const maNormalizalt = new Date(ma.getFullYear(), ma.getMonth(), ma.getDate());
        const lejaratNormalizalt = new Date(lejaratDatuma.getFullYear(), lejaratDatuma.getMonth(), lejaratDatuma.getDate());
        const idokulonbseg = lejaratNormalizalt.getTime() - maNormalizalt.getTime();
        const napokSzama = Math.ceil(idokulonbseg / (1000 * 3600 * 24));
        
        if (napokSzama <= 0) lejart = true;
    }

    // 2. Darabszám ellenőrzése a megfelelő limit alapján
    if (sajatLetrehozasuAdmin >= maxErtekeles) {
        lejart = true;
    }

    return lejart;
};

// 🌟 3. A belépéskori ellenőrző már csak a fenti globális függvényeket hívja meg
function ellenorizTesztStatusz() {
    if (window.isTesztLejart()) {
        window.mutasdPiackutatoAblakot();
    }
}