import { showAlert } from "/both/alert.js";
import { passwordPanelContent, addPasswordValidationLogic } from "/both/passwordChange.js";

export function playIntroSequence() {
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

export async function fetchAccountDeletionInfo(infoPanel) {
    try {
        const response = await fetch('/api/delete-account-info');
        const data = await response.json();

        if (infoPanel) {
            infoPanel.classList.remove('aktivp');
            setTimeout(() => infoPanel.remove(), 300);
        }

        if (!data.success) {
            showAlert('Hiba történt az adatok lekérésekor.');
            return;
        }

        if (data.roleId === 1 && !data.isOnlyUser && data.soleRolesInModules.length > 0) {
            const modulList = data.soleRolesInModules.map(m => `<li><b>${m.leiras || m.nev}</b></li>`).join('');
            
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

            document.getElementById('btnElzavaroBezaras').addEventListener('click', () => {
                overlay.remove();
            });
            
            return; 
        }

        let warningHTML = "<div style='text-align:center; font-family: sans-serif;'>";
        warningHTML += "<h3 style='color:red; margin-bottom: 10px;'>Biztosan törölni szeretné a profilját?</h3>";
        warningHTML += "<p style='margin-bottom: 15px;'>Ez a művelet <b>nem vonható vissza</b>!</p>";

        if (data.isOnlyUser) {
            warningHTML += "<div style='margin-bottom:15px; padding:10px; background:rgba(255,0,0,0.1); border-left:4px solid red; text-align:left;'><b>FIGYELEM:</b> Ön az egyetlen regisztrált felhasználó az intézményben! A fiók törlésével a teljes intézményi adatbázis hozzáférhetetlenné válik.</div>";
        } else if (data.roleId === 2 && data.soleRolesInModules.length > 0) {
            const modulList = data.soleRolesInModules.map(m => m.leiras || m.nev).join(', ');
            warningHTML += `<div style='margin-bottom:15px; padding:10px; background:rgba(255,165,0,0.2); border-left:4px solid orange; text-align:left;'><b>FIGYELEM:</b> Ön az egyetlen Elemző az alábbi modul(ok)ban: <b>${modulList}</b>. Kérjük a törlés után jelezze ezt az Adminnak.</div>`;
        }

        if (data.sharedUsers && data.sharedUsers.length > 0) {
            warningHTML += "<div style='text-align:left; margin-bottom:15px; padding:10px; background:rgba(255,165,0,0.1); border-left:4px solid orange;'>";
            warningHTML += "<b>Az alábbi megosztott értékelései fognak végleg eltűnni a kollégáitól:</b><ul style='margin-top:5px; padding-left: 20px;'>";
            data.sharedUsers.forEach(u => {
                const modulLeiras = u.modul_leiras ? `[${u.modul_leiras}]` : '[Ismeretlen modul]';
                const teljesNev = u.vizsgalt_nev ? `${u.kitoltes_neve} (${u.vizsgalt_nev})` : u.kitoltes_neve;
                warningHTML += `<li>${modulLeiras} <b>${teljesNev}</b> (Kolléga: ${u.vez})</li>`;
            });
            warningHTML += "</ul></div>";
        }

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

export function setupAccountInfoListeners(mainElement, userName) {
    const elsoDiv = mainElement.querySelector('.elso');
    const infoCards = mainElement.querySelectorAll('.infocard');

    if (!elsoDiv || infoCards.length === 0) return;

    infoCards.forEach(card => {
        card.addEventListener('click', function() {
            const cardId = this.id;
            const tartalom = infoPanelekTartalma[cardId];

            const letezikPanel = elsoDiv.querySelector('.info-panel');
            if (letezikPanel) {
                letezikPanel.remove();
            }

            if (tartalom) {
                const infoPanel = document.createElement('div');
                infoPanel.className = 'info-panel';
                infoPanel.innerHTML = `
                    <span class="bezaras">&times;</span>
                    <h3>${tartalom.title}</h3>
                    <div>${tartalom.content}</div>
                `;

                elsoDiv.appendChild(infoPanel);

                if (cardId === 'changepass') {
                    addPasswordValidationLogic(infoPanel, userName);
                }

                if (cardId === 'deleteacc') {
                    fetchAccountDeletionInfo(infoPanel);
                }

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

window.mutasdPiackutatoAblakot = function(idoszak) {
    if (document.getElementById('teszt-modal')) return;
    
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
    } else {
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

    setTimeout(() => {
        overlay.style.opacity = '1';
        modalBox.style.transform = 'translateY(0)';
    }, 10);

    document.getElementById('btnModalZar').addEventListener('click', () => {
        overlay.style.opacity = '0';
        modalBox.style.transform = 'translateY(50px)';
        setTimeout(() => overlay.remove(), 300);
    });

    const btnKardiov = document.getElementById('btnKardiov');
    if (btnKardiov) {
        btnKardiov.addEventListener('click', () => {
            window.location.href = '/private/kerdoiv.html';        
        });
    }
};

window.isTesztLejart = function(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin) {
    if (idoszak !== 'teszt' && idoszak !== 'teszt_ext') return false;

    const maxErtekeles = (idoszak === 'teszt') ? 2 : 4; 
    let lejart = false;

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

    if (sajatLetrehozasuAdmin >= maxErtekeles) {
        lejart = true;
    }

    return lejart;
};

export function ellenorizTesztStatusz(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin) {
    if (window.isTesztLejart(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin)) {
        window.mutasdPiackutatoAblakot(idoszak);
    }
}
export async function loadAdminLogs() {
    // Megkeressük a DOM elemeket, amiket a sablonunk létrehozott
    const sysContainer = document.getElementById('minden-log-container');
    const actContainer = document.getElementById('aktivitas-log-container');
    
    // Ha nem léteznek (pl. mert a user nem admin), azonnal kilépünk
    if (!sysContainer || !actContainer) return;

    try {
        const response = await fetch('/api/admin-logs');
        const data = await response.json();

        if (data.success) {
            // 1. Rendszer logok renderelése (Formátuma a fájlból eredendően már helyes)
            // 1. Rendszer logok renderelése (Formázással)
            sysContainer.innerHTML = data.systemLogs.length > 0 
                ? data.systemLogs.map(log => {
                    // Megpróbáljuk kinyerni a dátumot és az üzenetet a bejegyzésből
                    // Példa bemenet: [2026-04-18T15:14:51.386Z] [LOG]: Szerver fut...
                    const match = log.match(/^\[(.*?)\]\s*\[.*?\]:\s*(.*)$/);
                    
                    if (match) {
                        const rawDate = match[1]; // A dátum szöveg (pl. 2026-04-18T15:14:51.386Z)
                        const message = match[2]; // Az üzenet (pl. Szerver fut...)
                        
                        // Dátum formázása szép "YYYY-MM-DD HH:mm" formátumra
                        let formattedDate = rawDate;
                        try {
                            const d = new Date(rawDate);
                            // Mivel a Z (UTC) időzónát jelöl, a getHours/getMinutes a helyi időre alakítja
                            formattedDate = d.getFullYear() + '-' + 
                                            String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                                            String(d.getDate()).padStart(2, '0') + ' ' + 
                                            String(d.getHours()).padStart(2, '0') + ':' + 
                                            String(d.getMinutes()).padStart(2, '0');
                        } catch(e) {
                            // Ha valamiért nem sikerül a dátum feldolgozása, hagyjuk az eredetit
                        }
                        
                        // Visszatérünk a kért formátummal
return `<div class="logi"><span style="color: #ff6500; font-weight: bold; font-style: italic;">${formattedDate}</span>: ${message}</div>`;                    } else {
                        // Ha a sor formátuma nem a várt, akkor kiírjuk ahogy van (pl. ha sima szöveg van a logban)
                        return `<div clas="logi">- ${log}</div>`;
                    }
                }).join('') 
                : '<div style="color:gray;">Nincs elérhető rendszer log.</div>';

            // 2. Aktivitás logok renderelése a kért formátumban
            actContainer.innerHTML = data.activityLogs.length > 0
                ? data.activityLogs.map(log => {
                    // Ha a JOIN miatt hiányzik adat, kezeljük
                    const nev = log.vez || 'Ismeretlen felhasználó';
                    const intezmeny = log.intnev || 'Ismeretlen intézmény';
                    const akcio = log.tevekenyseg || 'Ismeretlen akció';
                    
                    // Dátum formázása esztétikusra (YYYY-MM-DD HH:mm)
                    let datumStr = log.datum;
                    if (log.datum && typeof log.datum === 'string' && log.datum.includes('T')) {
                        const d = new Date(log.datum);
                        datumStr = d.getFullYear() + '-' + 
                                   String(d.getMonth() + 1).padStart(2, '0') + '-' + 
                                   String(d.getDate()).padStart(2, '0') + ' ' + 
                                   String(d.getHours()).padStart(2, '0') + ':' + 
                                   String(d.getMinutes()).padStart(2, '0');
                    }

                    // A formátum pontosan: - Teszt János (Példa intézmény) : belépés 2026-04-16 09:00
                   // dashUtils.js - loadAdminLogs függvényen belül
                        return `
                        <div class="log-sor">
                            <span class="log-jel">-</span>
                            <span class="log-nev">${nev}</span>
                            <span class="log-zaro">(</span><span class="log-intezmeny">${intezmeny}</span><span class="log-zaro">)</span>
                            <span class="log-valaszto">:</span>
                            <span class="log-akcio">${akcio}</span>
                            <span class="log-datum">${datumStr}</span>
                        </div>`;
                }).join('')
                : '<div style="color:gray;">Nincs elérhető aktivitás log az adatbázisban.</div>';
        } else {
            sysContainer.innerHTML = '<span style="color:red;">Hiba történt a logok betöltésekor.</span>';
            actContainer.innerHTML = '<span style="color:red;">Hiba történt a logok betöltésekor.</span>';
        }
    } catch (error) {
        console.error('Fetch hiba a logok lekérésekor:', error);
        sysContainer.innerHTML = '<span style="color:red;">Hálózati hiba.</span>';
        actContainer.innerHTML = '<span style="color:red;">Hálózati hiba.</span>';
    }
}