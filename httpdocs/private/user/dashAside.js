import { showAlert } from "/both/alert.js";
import { playIntroSequence, setupAccountInfoListeners, ellenorizTesztStatusz, loadAdminLogs, openPackageUpgradeModal } from "./dashUtils.js";
import { templates } from "./dashTemplates.js";
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
let azonosIntezmenyElemzok = 0;
let azonosIntezmenyErtekelok = 0;
let legtobbetErtekeltNev = 'Nincs adat';
let legtobbetErtekeltDarab = 0;
let globalHataridoUserCount = 0;
let globalWarmCount = 0;
let globalHataridoCount = 0;
let globalAdminCount = 0;
let globalWarmEvalCount = 0;
let globalAudit2Count = 0;
let globalWarmUserCount = 0;
let globalHataridoEvalCount = 0;
let legtobbetMegosztottNev = 'Nincs adat';
let legtobbetMegosztottDarab = 0;
let aktualisSzerep = ''; 
let legjobbErtekelesNev = 'Nincs kitöltött értékelés';
let legjobbErtekelesSzazalek = 0;
let kedvencKategoriaNev = 'Nincs adat';
let kedvencKategoriaDarab = 0;
let kedvencKategoriaAtlag = 0;
let aiOsszMax = 0;
let adatokBetoltve = false;
let foKategoriaCount = 0, alKategoriaCount = 0, altTemaCount = 0, osszKerdesCount = 0;
let modulOsszHozzaferes = 0, modulAdminHozzaferes = 0;
let legnepszerubbKategoriaNev = 'Nincs adat';
let legnepszerubbKategoriaDarab = 0;
let modulSablonCount = 0;
let cimJellemzes = '';
let cimFejlesztes = '';
let cimErtekeles = '';
let utolsoFokusz = null;


function tisztitDashboardSzoveg(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function roviditDashboardSzoveg(value, max = 96) {
    const clean = tisztitDashboardSzoveg(value);
    return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function safeJsonArray(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function valaszFelirat(valasz) {
    const clean = tisztitDashboardSzoveg(valasz);
    if (!clean) return '';
    if (clean.toLowerCase() === 'ures') return 'válasz törölve';
    return clean.toUpperCase();
}

function aktualisErtekeloUtvonal() {
    const path = window.location.pathname || '/user/dashboard.html';
    if (path.endsWith('/')) return `${path}ertekelo.html`;
    return path.replace(/\/[^/]*$/, '/ertekelo.html');
}

function normalizalUtolsoFokusz(row) {
    if (!row || typeof row !== 'object') return null;

    const kitoltesId = row.kitoltes_id || row.kitoltesId || row.kitoltesID;
    const elemKulcs = tisztitDashboardSzoveg(row.elemKulcs || row.elem_kulcs);

    if (!kitoltesId || !elemKulcs) return null;

    const utvonal = safeJsonArray(row.utvonal || row.utvonal_json)
        .map(tisztitDashboardSzoveg)
        .filter(Boolean);

    const urlParams = new URLSearchParams();
    urlParams.set('kitoltes_id', String(kitoltesId));
    urlParams.set('fokusz', elemKulcs);

    const kitoltesLetrehozva = row.kitoltes_letrehozva || row.kitoltesLetrehozva || row.letrehozva_kitoltes;
    if (kitoltesLetrehozva) {
        urlParams.set('letrehozva', String(kitoltesLetrehozva).slice(0, 10));
    }

    const feliratValasz = valaszFelirat(row.valasz);
    const szoveg = roviditDashboardSzoveg(row.szoveg || row.kerdes_szoveg || 'Utolsó értékelési pont');

    return {
        kitoltesId,
        elemKulcs,
        tipus: tisztitDashboardSzoveg(row.tipus) || 'Elem',
        akcio: tisztitDashboardSzoveg(row.akcio) || 'megnyitva',
        szoveg,
        utvonal,
        utvonalFelirat: utvonal.length ? utvonal.join(' › ') : 'Értékelő modul',
        valaszFelirat: feliratValasz || tisztitDashboardSzoveg(row.akcio) || 'folytatás',
        iso: row.iso || row.letrehozva || '',
        url: row.url || row.href || `${aktualisErtekeloUtvonal()}?${urlParams.toString()}`
    };
}

async function betoltUtolsoFokusz() {
    try {
        const response = await fetch('/api/fokusz-elmenyek?limit=1', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const sor = Array.isArray(data?.data) ? data.data[0] : data?.data;
        return normalizalUtolsoFokusz(sor);
    } catch (error) {
        console.warn('Utolsó fókusz betöltési hiba:', error);
        return null;
    }
}

function bekotFolytatasKartya(container = document) {
    const kartya = container.querySelector?.('[data-folytatas-url]');
    if (!kartya || kartya.dataset.folytatasBekotve === '1') return;

    kartya.dataset.folytatasBekotve = '1';

    const megnyit = () => {
        const url = kartya.dataset.folytatasUrl;
        if (url) window.location.href = url;
    };

    kartya.addEventListener('click', megnyit);
    kartya.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            megnyit();
        }
    });
}

async function loadAsideData() {
  if (adatokBetoltve) return; 

  try {
    const response = await fetch('/api/user-brief');
    const data = await response.json();

    if (data.success) {
        leiras = data.leiras;
        aktualisSzerep = data.stats ? data.stats.aktualisSzerep : '';
        userName = data.username;
        fullname = data.fullname;
        intezmeny = data.intezmeny;
        leiras = data.leiras;
        modul_leiras = data.modul_leiras
        hozzaferhetoModulok = data.hozzaferhetoModulok;
        mailname = data.mailname;
        intkapmail = data.intkapmail;
        tel = data.tel;
        int_fin = data.intfin;
        fizetve = data.fizetve;
        idoszak = data.idoszak;

        if (data.stats) {
            foKategoriaCount = data.stats.foKategoriaCount || 0;
    alKategoriaCount = data.stats.alKategoriaCount || 0;
    altTemaCount = data.stats.altTemaCount || 0;
    osszKerdesCount = data.stats.osszKerdesCount || 0;
  modulOsszHozzaferes = data.stats.modulHozzaferesekSzama || 0;
modulAdminHozzaferes = data.stats.modulAdminHozzaferesekSzama || 0;
            legnepszerubbKategoriaNev = data.stats.legnepszerubbKategoriaNev || 'Nincs adat';
            legnepszerubbKategoriaDarab = data.stats.legnepszerubbKategoriaDarab || 0;
            modulSablonCount = data.stats.modulSablonCount || 0;
            cimJellemzes = data.stats.cimJellemzes || 'Nincs adat';
            cimFejlesztes = data.stats.cimFejlesztes || 'Nincs adat';
            cimErtekeles = data.stats.cimErtekeles || 'Nincs adat';
            globalEditorCount = data.stats.globalEditorCount || 0; 
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
            
            if (data.stats.legjobbErtekeles) {
                legjobbErtekelesNev = data.stats.legjobbErtekeles.nev;
                legjobbErtekelesSzazalek = Number(data.stats.legjobbErtekeles.atlag);
            }

            if (data.stats.kedvencKategoria) {
                kedvencKategoriaNev = data.stats.kedvencKategoria.nev;
                kedvencKategoriaDarab = data.stats.kedvencKategoria.darab;
                kedvencKategoriaAtlag = Number(data.stats.kedvencKategoria.atlag); 
            }
          
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
        utolsoFokusz = await betoltUtolsoFokusz();

        adatokBetoltve = true; 
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
    
const isSysadmin = window.location.pathname.includes('/sysadmin/');
const isAdmin = window.location.pathname.includes('/admin/') && !isSysadmin;
 const isElemzo = window.location.pathname.includes('/elemzo/');
    const isUser = window.location.pathname.includes('/user/'); 

    // --- Licensz kalkuláció ---
    let altNapokInfo = 'N/A';
    let napokInfo = 'N/A';
    let licenszLejarat = 'Nincs adat';
    let licenszTipus = 'Aktív licensz'; 
    if (idoszak === 'teszt') licenszTipus = 'Teszt időszak';
    if (idoszak === 'trial') licenszTipus = 'Próbaverzió';
    if (fizetve && int_fin) {
        try {
            const fizetesDatuma = new Date(fizetve);
            const ma = new Date();
            const lejaratDatuma = new Date(fizetesDatuma);
            lejaratDatuma.setDate(lejaratDatuma.getDate() + parseInt(int_fin, 10));
            
            const ev = lejaratDatuma.getFullYear();
            const ho = String(lejaratDatuma.getMonth() + 1).padStart(2, '0');
            const nap = String(lejaratDatuma.getDate()).padStart(2, '0');
            licenszLejarat = `${ev}.${ho}.${nap}.`;

            const maNormalizalt = new Date(ma.getFullYear(), ma.getMonth(), ma.getDate());
            const lejaratNormalizalt = new Date(lejaratDatuma.getFullYear(), lejaratDatuma.getMonth(), lejaratDatuma.getDate());
            const idokulonbseg = lejaratNormalizalt.getTime() - maNormalizalt.getTime();
            const napokSzama = Math.ceil(idokulonbseg / (1000 * 3600 * 24));

            if (napokSzama < 0) {
                altNapokInfo = 'Az előfizetés lejárt';
                napokInfo = 'Lejárt';
            } else if (napokSzama === 0) {
                altNapokInfo = 'Az előfizetés ma jár le';
                napokInfo = 'Ma jár le';
            } else {
                altNapokInfo = `Még ${napokSzama} nap az előfizetésből`;
                napokInfo = `${napokSzama} nap van hátra`;
            }
        } catch (error) {
            console.error("Hiba a licensz dátumának feldolgozása közben:", error);
        }
    }

    const modulNevek = hozzaferhetoModulok && Array.isArray(hozzaferhetoModulok)
        ? `<ul>${hozzaferhetoModulok.map(modul => `<li>${modul.leiras.replace(/^(\S+)/, '<strong>$1</strong>')}</li>`).join('')}</ul>`
        : 'Nincs szakmai modul hozzárendelve';

    // --- VIEW DATA ÖSSZEÁLLÍTÁSA A SABLONOK SZÁMÁRA ---
    const viewData = {
        isAdmin, isElemzo, isUser,isSysAdmin: isSysadmin,
        userName, fullname, intezmeny, leiras, modul_leiras,
        azonosIntezmenyRegisztraltak, legjobbErtekelesNev, legjobbErtekelesSzazalek,
        kedvencKategoriaNev, kedvencKategoriaAtlag, aiOsszMax,
        globalAdminCount, globalEditorCount, globalWarmUserCount, globalHataridoUserCount,
        osszert, mastolKapottEditor, sajatLetrehozasuAdmin, osszoszt, megosztottMasokkal,
        osszhatarido, auditHataridok, auditFigyelmeztetesek, hozzaferhetoModulok,
        idoszak, fizetve, int_fin, intkapmail, aktualisSzerep, tel, mailname,
        azonosIntezmenyElemzok, azonosIntezmenyErtekelok,
        legtobbetErtekeltNev, legtobbetErtekeltDarab, legtobbetMegosztottNev, legtobbetMegosztottDarab,
        globalHataridoEvalCount, globalWarmEvalCount, globalAudit2Count,
        licenszTipus, altNapokInfo, napokInfo, licenszLejarat, modulNevek, foKategoriaCount, alKategoriaCount, altTemaCount, osszKerdesCount,
    modulOsszHozzaferes, modulAdminHozzaferes,legnepszerubbKategoriaNev, 
    legnepszerubbKategoriaDarab, 
    modulSablonCount, 
    cimJellemzes, 
    cimFejlesztes, 
    cimErtekeles,
    utolsoFokusz
    };

    // --- Elemek összegyűjtése ---
    const gombok = document.querySelectorAll('.gomb .cim');
    const layoutContainer = document.querySelector('.layout');
    
    // Az ujTartalmak mostantól meghívja a sablonokat a viewData-val
    const ujTartalmak = {
        'ujert': {
            main: templates.ujert.main(),
            lapok: templates.ujert.lapok()
        },
        'accunt': { 
            main: () => templates.accunt.main(viewData),
            lapok: () => templates.accunt.lapok(viewData)
        },
        'fiokom': {
            main: () => templates.fiokom.main(viewData),
            lapok: () => templates.fiokom.lapok(viewData)
        },
        'hozzaj': {
            main: () => templates.hozzaj.main(viewData),
            lapok: () => templates.hozzaj.lapok(viewData)
        },
        'ujany': {
            main: templates.ujany.main(),
            lapok: templates.ujany.lapok()
        },
        'plussz': {
            main: templates.plussz.main(),
            lapok: templates.plussz.lapok()
        },
        'szam': {
            main: templates.szam.main(),
            lapok: templates.szam.lapok()
        },
         'vez': {
            main: templates.vez.main(),
            lapok: templates.vez.lapok()
        },'sabik': {
        main: () => templates.sabik.main(viewData),
        lapok: () => templates.sabik.lapok(viewData)
    }

    };

    function initAuditSlider(container) {
        const wrapper = container || document;
        const tabButtons = wrapper.querySelectorAll('.audit-tab-btn');
        const panels = wrapper.querySelectorAll('.audit-slider-panel, .audit-slide'); 

        if (panels.length === 0 || tabButtons.length === 0) return;

        panels.forEach((panel, index) => {
            panel.style.display = (index === 0) ? 'block' : 'none';
        });

        tabButtons.forEach(button => {
            button.onclick = function() {
                tabButtons.forEach(btn => btn.classList.remove('activex'));
                this.classList.add('activex');
                
                const targetIndex = parseInt(this.getAttribute('data-slide') || this.getAttribute('data-index'));
                
                panels.forEach((panel, panelIndex) => {
                    if (panelIndex === targetIndex) {
                        panel.style.display = 'block'; 
                    } else {
                        panel.style.display = 'none';  
                    }
                });
                const auditCheckboxes = document.querySelectorAll('.audit-cheking');
                if (auditCheckboxes.length > 0) {
                    auditCheckboxes.forEach(cb => cb.checked = false);
                    auditCheckboxes[0].dispatchEvent(new Event('change'));
                }
            };
        });
    }

    const initialMain = layoutContainer.querySelector('.main');
    const initialLapok = layoutContainer.querySelector('#lapok');
    
    if (initialMain && initialLapok) {
        initialMain.dataset.contentId = 'ertekek';
        initialLapok.dataset.contentId = 'ertekek';

        // v5.2 hotfix:
        // Az eredeti Értékeim panel legyen biztosan látható induláskor.
        // Különben a lista kirenderelődhet egy rejtett article-be, miközben a user üres felületet lát.
        if (!document.querySelector('.layout > article.aktiv-tartalom')) {
            initialMain.classList.add('aktiv-tartalom');
            initialLapok.classList.add('aktiv-tartalom');
        }

        const ertekekButton = document.getElementById('ertekek');
        if (ertekekButton && !document.querySelector('.dobaktiv')) {
            ertekekButton.classList.add('dobaktiv');
        }
    }

    gombok.forEach(gomb => {
        gomb.addEventListener('click', function(e) { 
            const aktivGombId = this.id;

            if (aktivGombId === 'ujert') {
                if (typeof window.isTesztLejart === 'function' && window.isTesztLejart(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin)) {
                    e.preventDefault();
                    window.mutasdPiackutatoAblakot(idoszak);
                    return;
                }
            }
if (aktivGombId === 'sabik') {
    setTimeout(() => {
        // Mivel az isAdmin változód már be van állítva fentebb, ezt simán használhatjuk!
        if (isAdmin) { 
            import('../admin/dashAMain.js').then(adminModul => {
                adminModul.frissitSablonSzerkeszto();
                adminModul.megjelenitMentettSablonok();
                
                document.querySelectorAll('input[name="valasztas"]').forEach(radio => {
                    radio.addEventListener('change', adminModul.frissitSablonSzerkeszto);
                });
            }).catch(console.error);
        }
    }, 50); 
}
            if (this.classList.contains('dobaktiv')) {
                if (aktivGombId === 'accunt') {
                    bekotFolytatasKartya(document.querySelector('.main[data-content-id="accunt"]') || document);
                }
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
    if (aktivGombId === 'accunt' || aktivGombId === 'fiokom') {
        loadAdminLogs();
    }
    if (aktivGombId === 'accunt') {
        bekotFolytatasKartya(newMain || document);
    }
if (aktivGombId === 'plussz') {
    if (isAdmin) {
        import('../admin/dashAMain.js').then(adminModul => {
            adminModul.initAiBeallitasok();
        }).catch(console.error);
    }
}
}, 10);
        });
    });

    const csomagvaltasGombok = document.querySelectorAll('.csomagvaltas-menu, #csomagvaltas');

    csomagvaltasGombok.forEach(gomb => {
        gomb.addEventListener('click', function(e) {
            e.preventDefault();
            openPackageUpgradeModal();
        });
    });

    const fiokomGombok = document.querySelectorAll('#fiokom');

    fiokomGombok.forEach(gomb => {
        gomb.addEventListener('click', function(e) {
            e.preventDefault(); 
            
            if (this.classList.contains('dobaktiv')) {
                return;
            }

            const aktivGombId = 'fiokom'; 

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
                setupAccountInfoListeners(newMain, userName, viewData);
            }

            setTimeout(() => {
                celTartalom.forEach(elem => elem.classList.add('aktiv-tartalom'));
            }, 10);
        });
    });

const accuntGomb = document.getElementById('accunt');
if (accuntGomb) {
    document.querySelectorAll('.layout > article:not(.savos)').forEach(article => {
        article.classList.remove('aktiv-tartalom');
    });

    document.querySelectorAll('.dobaktiv').forEach(gomb => {
        gomb.classList.remove('dobaktiv');
    });

    accuntGomb.click();
        
        setTimeout(() => {
            ellenorizTesztStatusz(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin);
        }, 1500);

        setTimeout(() => {
            if (typeof playIntroSequence === 'function') {
                playIntroSequence();
            }
        }, 800);
    }

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