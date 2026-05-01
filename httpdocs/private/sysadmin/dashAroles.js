export async function renderRoles(userState) {
  const wrapper = document.getElementById('module-users-list');
  const counterText = document.getElementById('user-sectiont');
  
  wrapper.innerHTML = '';
  counterText.textContent = 'Kérem, válasszon kategóriát';

  const mainCatsDiv = document.createElement('div');
  mainCatsDiv.className = 'admin-category-container';

  mainCatsDiv.innerHTML = `
    <div class="admin-category-card activex" id="cat-intezmenyi">
        <div class="card-content">
            <span class="material-symbols-outlined">domain</span>
            <h4>Intézményi</h4>
        </div>
    </div>
    <div class="admin-category-card disabled" id="cat-magan">
        <div class="card-content">
            <span class="material-symbols-outlined">person</span>
            <h4>Magán</h4>
        </div>
    </div>
  `;
  wrapper.appendChild(mainCatsDiv);

  const contentContainer = document.createElement('div');
  contentContainer.id = 'dynamic-content-container';
  wrapper.appendChild(contentContainer);

  document.getElementById('cat-intezmenyi').addEventListener('click', async function() {
    document.querySelectorAll('.admin-category-card').forEach(c => c.classList.remove('activex'));
    this.classList.add('activex');
    await loadInstitutions(userState, contentContainer, counterText);
  });

  document.getElementById('cat-magan').addEventListener('click', function() {
    document.querySelectorAll('.admin-category-card').forEach(c => c.classList.remove('activex'));
    this.classList.add('activex');
    counterText.textContent = 'Magán felhasználók';
    contentContainer.innerHTML = '<div class="info-msg">Jelenleg minden felhasználó intézményi. A magán felhasználók modul fejlesztés alatt.</div>';
  });
}

async function loadInstitutions(userState, container, counterText) {
  container.innerHTML = '<div class="loader">Intézmények betöltése...</div>';
  counterText.textContent = 'Intézmények lekérdezése...';

  try {
    const res = await fetch('/institutions');
    const result = await res.json();
    if (!result.success) throw new Error('Hiba a lekérésben');

    const institutions = result.data;
    counterText.textContent = `Összesen ${institutions.length} intézmény regisztrálva`;
    container.innerHTML = '';

    const grid = document.createElement('div');
    grid.className = 'institution-grid';

    institutions.forEach(int => {
      const btn = document.createElement('button');
      btn.className = 'institution-item-btn';
      btn.dataset.intid = int.id; 
      btn.innerHTML = `
        <div class="btn-left">
            <span class="material-symbols-outlined inti">account_balance</span>
            <span class="inicim">${int.intnev}</span>
        </div>
      `;
      btn.addEventListener('click', () => loadUsersForInstitution(userState, int.id, int.intnev, container, counterText));
      grid.appendChild(btn);
    });

    container.appendChild(grid);
  } catch (err) {
    container.innerHTML = '<div class="error-msg">Nem sikerült betölteni az intézményeket.</div>';
  }
}

async function loadUsersForInstitution(userState, intId, intNev, container, counterText) {
  container.innerHTML = '<div class="loader">Felhasználók betöltése...</div>';
  
  loadInstitutionInfoTab(intId);
try {
    const res = await fetch(`/users-by-module?intId=${encodeURIComponent(intId)}`);
    if (!res.ok) throw new Error(`HTTP hibakód: ${res.status}`);

    const data = await res.json();
    window.systemModules = data.modules; 
    container.innerHTML = '';
    
    const backBtn = document.createElement('button');
    backBtn.className = 'admin-back-btn';
    backBtn.innerHTML = '<span class="material-symbols-outlined">arrow_back</span> Vissza az intézményekhez';
    
    backBtn.addEventListener('click', () => {
        document.querySelector('#maininf .diag').innerHTML = '<div class="gyikcim panel-header">JOGKÖRÖK</div><div class="panel-body">Válasszon intézményt a részletek megtekintéséhez.</div>';
        document.getElementById('osszesitett').style.display = 'none'; // Rejtjük az összesítettet is visszalépésnél
        loadInstitutions(userState, container, counterText);
    });
    container.appendChild(backBtn);

    counterText.textContent = `${intNev}: ${data.users.length} Személy`;

  const roleMeta = {
      unassigned: { icon : 'person_alert', label: 'Besorolásra váró felhasználók', cls: 'pen' },
      admin: { icon: 'person_shield', label: 'Adminisztrátor', cls: 'adm' },
      analist: { icon: 'person_search', label: 'Elemző', cls: 'ana' },
      evaluator: { icon: 'person_edit', label: 'Értékelő', cls: 'eva' },
      sysadmin: { icon: 'local_police', label: 'Rendszergazda (Sysadmin)', cls: 'adm' } // <--- ÚJ
    };

    const rolesHun = {
      evaluator: `<span class="material-symbols-outlined eva">person_edit</span>`,
      analist: `<span class="material-symbols-outlined ana">person_search</span>`,
      admin: `<span class="material-symbols-outlined adm">person_shield</span>`,
      unassigned: '<span class="material-symbols-outlined pen">person_alert</span>',
      sysadmin: `<span class="material-symbols-outlined adm">local_police</span>` // <--- ÚJ
    };

    ['unassigned','admin', 'analist', 'evaluator', 'sysadmin'].forEach(roleKey => { 
      const section = document.createElement('section');
      section.dataset.role = roleKey;
      section.className = 'role-section';
      section.innerHTML = `<h4><span class="material-symbols-outlined ${roleMeta[roleKey].cls}">${roleMeta[roleKey].icon}</span> ${roleMeta[roleKey].label}</h4><div class="role-list"></div>`;
      container.appendChild(section);
    });

  data.users.forEach(user => {
      let roleKey = user.role ? user.role.toLowerCase() : 'unassigned';
      let target = container.querySelector(`section[data-role="${roleKey}"] .role-list`);
      
      // GOLYÓÁLLÓ VÉDELEM: Ha nincs ilyen HTML oszlop, létrehozzuk helyben!
      if (!target) {
          console.warn(`Hiányzó HTML oszlop pótlása: ${roleKey}`);
          const safeSection = document.createElement('section');
          safeSection.dataset.role = roleKey;
          safeSection.className = 'role-section';
          safeSection.innerHTML = `<h4><span class="material-symbols-outlined pen">person_alert</span> ${user.role || 'Ismeretlen'}</h4><div class="role-list"></div>`;
          container.appendChild(safeSection);
          
          target = safeSection.querySelector('.role-list');
      }

      const card = document.createElement('div');
      card.className = 'user-card';

      // ---> Modul chipek generálása <---
      let modulChipsHtml = '';
      if (user.modulok && user.modulok.length > 0) {
          modulChipsHtml = user.modulok.map(m => 
              `<div class="chip">${m}</div>`
          ).join('');
      } else {
          modulChipsHtml = `<div style="font-size: 0.8em; color: #999; margin-top: 5px; font-style: italic;">Nincs kiosztott modul</div>`;
      }

card.innerHTML = `
        <div class="dob user-card-item">
          <div class="dobal">
            <div class="nev">
              <div class="vez">${user.vez}</div>
              <div class="rejtettinfo">
                <div class="eler">${user.mail || 'Nincs email-cím'}</div>
                <div class="modulok-lista">${modulChipsHtml}</div>
              </div>
            </div>
            <div class="role">${rolesHun[user.role]}</div>
          </div>
        </div>
      `;

      target.appendChild(card);

      // Kártya kattintás
      card.addEventListener('click', () => {
        const reloadCallback = () => loadUsersForInstitution(userState, intId, intNev, container, counterText);
        loadUserInfoTab(user, reloadCallback);
      });
      
      // (A Törlés logika változatlanul maradhat ez alatt)
      // Role váltás logika
     

      // Törlés logika
      
    });

    container.querySelectorAll('section').forEach(sec => {
      const hasUsers = !!sec.querySelector('.user-card');
      if (!hasUsers) sec.style.display = 'none';
    });

  } catch (err) {
    console.error('Felhasználók lekérése közben hiba:', err);
    container.innerHTML = '<div class="error-msg">Hiba történt a felhasználók betöltésekor.</div>';
  }
}

async function loadUserInfoTab(user, reloadListCallback) {
    const lapozo = document.getElementById('lapozo');
    if (lapozo) {
        [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
        const staBtn = lapozo.querySelector('.sta');
        if (staBtn) staBtn.classList.add('aktiv');

        document.getElementById('osszesitett').style.display = 'flex';
        document.getElementById('maininf').style.display = 'none';
        document.getElementById('gyik').style.display = 'none';
    }

    const container = document.getElementById('osszesitett');
    if (!container) return;
    let targetDiv = container.querySelector('.diag') || container;

    const rolesHunNames = {
        evaluator: 'Értékelő',
        analist: 'Elemző',
        admin: 'Adminisztrátor',
        sysadmin: 'Rendszer adminisztrátor',
        unassigned: 'Besorolásra váró',
    };

    let isEditMode = false;

  const renderUserPanel = () => {
        // Dátum formázó segédfüggvény
        const formatDatum = (datum) => {
            if (!datum) return '-';
            if (datum.length > 10) return datum.substring(0, 10);
            return datum;
        };



       let ertekelesekHtml = '';
        if (user.ertekelesek && user.ertekelesek.length > 0) {
            ertekelesekHtml = `<div class="ertekelesek-blokk">
                <h5>Saját Értékelések & Hozzájárulási (Audit) adatok</h5>
                <div class="ertekelesek-container">
                    <div class="voltul">`;
            
           user.ertekelesek.forEach(ert => {
                let megosztva = ert.megosztva && ert.megosztva.length > 0 ? `<span class="audit-cim">(Megosztva: <b>${ert.megosztva.join(', ')}</b>)</span>` : '';
                
                // Audit blokk összeállítása
                let auditHtml = '';
                if (ert.audit_datum) {
                    auditHtml = `
                        <div class="audit-info-box">
                            <div class="audit-row"><span class="audit-cim">Elfogadva:</span> ${ert.audit_datum}</div>
                            <div class="audit-row"><span class="audit-cim">IP cím:</span> ${ert.audit_ip || '-'}</div>
                            <div class="audit-row"><span class="audit-cim">Böngésző:</span> <span class="audit-agent">${ert.audit_agent || '-'}</span></div>
                        </div>
                    `;
                } else {
                    auditHtml = `
                        <div class="audit-info-box audit-hianyzik">
                            <span class="material-symbols-outlined icon-small">warning</span> Nincs rögzített hozzájárulás!
                        </div>
                    `;
                }

               ertekelesekHtml += `
                    <div class="usert">
                        <div class="ertekeles-header-container">
                            <div class="ertekeles-fejlec">
                                <strong>${ert.nev}</strong> <span class="modul-cimke">[${ert.modul_nev}]</span> <span class="datum-info">(${ert.datum})</span>${megosztva}
                            </div>
                            <button class="delete-eval-btn" data-evalid="${ert.id}" data-evalnev="${ert.nev}" title="Értékelés törlése">
                                <span class="material-symbols-outlined icon-small">delete</span>
                            </button>
                        </div>
                        ${auditHtml}
                    </div>
                `;
            });
            ertekelesekHtml += `</div></div></div>`;
        } else {
            ertekelesekHtml = `<div class="nincs-ertekeles">A felhasználónak még nincsenek saját értékelései a rendszerben.</div>`;
        }
// Tevékenység log HTML összeállítása
        let logsHtml = '';
        if (user.logs && user.logs.length > 0) {
            logsHtml = `<div class="log-blokk">
                <h5>Tevékenységnapló</h5>
                <div class="log-container">
                    <div class="log-lista">`;
            
       // Egy kis szótár a szerepkörök ID-jaihoz
            const roleIdMap = { '1': 'Adminisztrátor', '2': 'Elemző', '3': 'Értékelő', '4': 'Besorolásra váró' };

            user.logs.forEach(log => {
                let reszletekSzoveg = '';
                if (log.reszletek) {
                    try {
                        const parsed = typeof log.reszletek === 'string' ? JSON.parse(log.reszletek) : log.reszletek;
                        if (typeof parsed === 'object' && parsed !== null) {
                            reszletekSzoveg = Object.entries(parsed).map(([k, v]) => {
                                
                                // 1. Ha a 'v' egy objektum (pl. modositott_kerdesek), akkor JSON formátumba alakítjuk
                                let ertek = typeof v === 'object' ? JSON.stringify(v) : v;

                                // 2. ID-k lefordítása "emberi" nyelvre
                                if ((k === 'kitoltes_id' || k === 'eredeti_idk') && user.ertekelesek) {
                                    // Megkeressük a saját értékelései között a nevet
                                    const foundErt = user.ertekelesek.find(e => e.id == v || e.idk == v);
                                    if (foundErt) ertek = `${v} (<b>${foundErt.nev}</b>)`;
                                }
                                else if (k === 'modul' && window.systemModules) {
                                    // Megkeressük a modul leírását
                                    const mod = window.systemModules.find(m => m.id == v);
                                    if (mod) ertek = `${v} (<b>${mod.leiras}</b>)`;
                                }
                                else if (k === 'szerepkor') {
                                    // Szerepkör szótárból
                                    ertek = `${v} (<b>${roleIdMap[v] || 'Ismeretlen'}</b>)`;
                                }

                                return `<b>${k}:</b> ${ertek}`;
                            }).join('<br>'); // Sortöréssel választjuk el az átláthatóságért
                        } else {
                            reszletekSzoveg = log.reszletek;
                        }
                    } catch(e) {
                        reszletekSzoveg = log.reszletek;
                    }
                }
                
                logsHtml += `<div class="log-item">
                    <strong class="log-tev">${log.tevekenyseg}</strong> 
                    <span class="log-datum">(${log.datum || '-'})</span>
                    ${reszletekSzoveg ? `<div class="log-reszlet">${reszletekSzoveg}</div>` : ''}
                </div>`;
            });
            
            logsHtml += `</div></div></div>`;
        } else {
            logsHtml = `<div class="log-blokk">
                <h5>Tevékenységnapló</h5>
                <div class="nincs-log">Nincs rögzített tevékenység a felhasználóhoz.</div>
            </div>`;
        }
        targetDiv.innerHTML = `
             <div class="gyikcim panel-header">
                ${user.vez} Profilja ${isEditMode ? '<span class="szerkeszt-jelzo">- SZERKESZTÉS</span>' : ''}
            </div>
            <div class="panel-body">
            
               <div class="felsomenu">
                    ${!isEditMode ? `
                        <button id="btn-edit-user">Szerkesztés</button>
                        <button id="btn-delete-user" class="delete-user-btn">Felhasználó törlése</button>
                    ` : `
                        <button id="btn-save-user">Mentés</button>
                        <button id="btn-cancel-user" class="cancel-btn">Mégse</button>
                    `}
                </div>

                <div class="userblokk">
                    <div class="alap-adatok">
                        <h5>Alapadatok & Rendszerinfók</h5>

                        ${!isEditMode ? `
                            <p><strong>Név:</strong> ${user.vez}</p>
                            <p><strong>E-mail:</strong> ${user.mail || '-'}</p>
                            <p><strong>Telefon:</strong> ${user.tel || '-'}</p>
                            <p><strong>Aktuális jogkör:</strong> <span class="jogkor-kiemelt">${rolesHunNames[user.role]}</span></p>
                            <p><strong>Maradék AI kvóta:</strong> <span class="jogkor-kiemelt">${user.ai_ossz_max || '0'}</span></p>
                            <p><strong>Értékelések:</strong> <span class="jogkor-kiemelt">${user.kitoltes_db}</span> darab értékelés</p>
                            
                            <h5 class="mt-kis">Technikai adatok</h5>
                            <p><strong>Regisztráció:</strong> ${formatDatum(user.regisztralt)}</p>
                            <p><strong>Utolsó IP cím:</strong> ${user.ip_cim || '-'}</p>
                            <p><strong>Böngésző:</strong> ${user.user_agent || '-'}</p>
                      ` : `
                            <div class="szerkeszto-urlap">
                              <div class="useri">
                                  <label>Név</label>
                                  <input type="text" id="edit_u_vez" value="${user.vez}">
                              </div>
                              <div class="useri">
                                  <label>E-mail</label>
                                  <input type="email" id="edit_u_mail" value="${user.mail || ''}">
                              </div>
                              <div class="useri">
                                  <label>Telefon</label>
                                  <input type="text" id="edit_u_tel" value="${user.tel || ''}">
                              </div>
                              <div class="useri">
                                  <label>Maradék AI kvóta</label>
                                  <input type="number" id="edit_u_ai" value="${user.ai_ossz_max || 0}">
                              </div>

                              <label class="jogkor-label" style="margin-top: 15px; display: block;">Hozzárendelt Modulok</label>
                              <div id="user-module-chips-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; min-height: 40px; padding: 8px; background: #fff; border: 1px dashed #ffbca8; border-radius: 6px;">
                              </div>
                              
                              <div style="margin-top: 10px; display: flex; gap: 10px; flex-direction: row; margin-bottom: 15px;">
                                  <select id="user-new-module-select" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; flex-grow: 1;">
                                  </select>
                                  <button id="user-add-module-btn" type="button" style="padding: 6px 16px; background: #ff6500; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Hozzáad</button>
                              </div>

                              <label class="jogkor-label">Jogkör beállítása</label>
                              <div class="role-radio" style="background: #ffeede; padding: 10px; border-radius: 6px; display: flex; gap: 15px; border: 1px solid #ffbca8;">
                                  <label><input type="radio" name="edit_u_role" value="admin" ${user.role === 'admin' ? 'checked' : ''}> Admin</label>
                                  <label><input type="radio" name="edit_u_role" value="analist" ${user.role === 'analist' ? 'checked' : ''}> Elemző</label>
                                  <label><input type="radio" name="edit_u_role" value="evaluator" ${user.role === 'evaluator' ? 'checked' : ''}> Értékelő</label>
                              </div>
                            </div>
                        `}
                    </div>
                </div>
                ${ertekelesekHtml}
                <div>
                                                        ${logsHtml}

                </div>
            </div>
        `;

        // === ESEMÉNYKEZELŐK ===
       // --- Értékelés törlés eseménykezelők ---
        const evalDeleteBtns = targetDiv.querySelectorAll('.delete-eval-btn');
        evalDeleteBtns.forEach(btn => {
            btn.addEventListener('click', async () => {
                const evalId = btn.getAttribute('data-evalid');
                const evalNev = btn.getAttribute('data-evalnev');
                
                if (confirm(`Biztosan törölni szeretné a(z) "${evalNev}" értékelést és minden hozzá tartozó adatot? Ezt nem lehet visszavonni.`)) {
                    
                    // Gomb inaktiválása amíg tölt
                    btn.disabled = true;
                    btn.innerHTML = '<span class="material-symbols-outlined icon-small">hourglass_empty</span>';

                    try {
                        // A felhasznalomodul.js /delete-kitoltes végpontját használjuk
                        const resp = await fetch('/delete-kitoltes', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ id: evalId })
                        });
                        const result = await resp.json();
                        
                        if (result.success) {
                            // Eltávolítjuk a memóriából a törölt elemet
                            user.ertekelesek = user.ertekelesek.filter(e => e.id != evalId);
                            // Statisztika frissítése
                            user.kitoltes_db = user.ertekelesek.length;
                            
                            // Panel azonnali újrarajzolása
                            renderUserPanel();
                            
                            // Bal oldali felhasználó lista csendes újratöltése
                            if (reloadListCallback) reloadListCallback();
                        } else {
                            alert('Hiba történt: ' + (result.message || 'Ismeretlen hiba'));
                            btn.disabled = false;
                            btn.innerHTML = '<span class="material-symbols-outlined icon-small">delete</span>';
                        }
                    } catch (err) { 
                        console.error('Törlési hiba:', err);
                        alert('Hálózati hiba történt.');
                        btn.disabled = false;
                        btn.innerHTML = '<span class="material-symbols-outlined icon-small">delete</span>';
                    }
                }
            });
        });
        if (!isEditMode) {
            document.getElementById('btn-edit-user').addEventListener('click', () => {
                isEditMode = true;
                renderUserPanel();
            });

            document.getElementById('btn-delete-user').addEventListener('click', async () => {
                // Törlés kódja változatlan... (az előző verzióból)
                if (confirm(`Biztosan törölni szeretné ${user.vez} felhasználót és minden adatát?`)) {
                    const btn = document.getElementById('btn-delete-user');
                    btn.textContent = 'Törlés...';
                    btn.disabled = true;

                    try {
                        const resp = await fetch('/delete-user', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id })
                        });
                        const result = await resp.json();
                        
                        if (result.success) {
                            targetDiv.innerHTML = '<div class="gyikcim panel-header">JOGKÖRÖK</div><div class="panel-body">A felhasználó törlésre került. Kérem, válasszon a listából!</div>';
                            if(reloadListCallback) reloadListCallback();
                        } else {
                            alert('Hiba történt a törlés során!');
                            btn.textContent = 'Felhasználó törlése';
                            btn.disabled = false;
                        }
                    } catch (err) { 
                        console.error('Törlési hiba:', err);
                        alert('Hálózati hiba történt.');
                        btn.textContent = 'Felhasználó törlése';
                        btn.disabled = false;
                    }
                }
            });

        } else {
            
            // --- MODUL CHIP LOGIKA KEZDŐDIK ---
            // Megkeressük a jelenlegi modulok ID-ját a nevük alapján
            let currentModIds = [];
            if (user.modulok && window.systemModules) {
                currentModIds = user.modulok.map(nev => {
                    const match = window.systemModules.find(m => m.leiras === nev);
                    return match ? match.id : null;
                }).filter(id => id !== null).map(String); 
            }

            const chipContainer = document.getElementById('user-module-chips-container');
            const modSelect = document.getElementById('user-new-module-select');
            const addModBtn = document.getElementById('user-add-module-btn');

            if (chipContainer && modSelect && addModBtn) {
                const renderUserChips = () => {
                    chipContainer.innerHTML = '';
                    
                    if (currentModIds.length === 0) {
                        chipContainer.innerHTML = '<span style="color: #aaa; font-style: italic; font-size: 0.85em; display:flex; align-items:center;">Nincs modul kiosztva.</span>';
                    } else {
                        currentModIds.forEach(id => {
                            const mod = window.systemModules.find(m => m.id == id);
                            const name = mod ? mod.leiras : `Ismeretlen (${id})`;
                            
                            const chip = document.createElement('div');
                            chip.classList.add("chip");
                            chip.innerHTML = `
                                <span>${name}</span>
                                <span class="remove-user-mod-btn" data-id="${id}" style="margin-left:5px; cursor:pointer; font-weight:bold;">&times;</span>
                            `;
                            chipContainer.appendChild(chip);
                        });

                        chipContainer.querySelectorAll('.remove-user-mod-btn').forEach(btn => {
                            btn.addEventListener('click', function() {
                                const idToRemove = this.getAttribute('data-id');
                                currentModIds = currentModIds.filter(id => id !== idToRemove);
                                renderUserChips();
                            });
                        });
                    }

                    modSelect.innerHTML = '<option value="" disabled selected>Válasszon új modult...</option>';
                    window.systemModules.forEach(mod => {
                        if (!currentModIds.includes(mod.id.toString())) {
                            const opt = document.createElement('option');
                            opt.value = mod.id;
                            opt.textContent = mod.leiras;
                            modSelect.appendChild(opt);
                        }
                    });
                };

                renderUserChips();

                addModBtn.addEventListener('click', () => {
                    const newId = modSelect.value;
                    if (newId && !currentModIds.includes(newId)) {
                        currentModIds.push(newId);
                        renderUserChips();
                    }
                });
            }
            // --- MODUL CHIP LOGIKA VÉGE ---

            document.getElementById('btn-cancel-user').addEventListener('click', () => {
                isEditMode = false;
                renderUserPanel();
            });

            document.getElementById('btn-save-user').addEventListener('click', async () => {
                const btn = document.getElementById('btn-save-user');
                btn.textContent = 'Mentés...';
                btn.disabled = true;

                const updatedVez = document.getElementById('edit_u_vez').value;
                const updatedMail = document.getElementById('edit_u_mail').value;
                const updatedTel = document.getElementById('edit_u_tel').value;
                const updatedAi = document.getElementById('edit_u_ai').value;
                const updatedRole = document.querySelector('input[name="edit_u_role"]:checked').value;

               try {
                    const res = await fetch('/update-user', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            id: user.id,
                            vez: updatedVez,
                            mail: updatedMail,
                            tel: updatedTel,
                            ai_ossz_max: updatedAi, 
                            role: updatedRole,
                            modulIds: currentModIds // <-- EZ AZ ÚJDONSÁG!
                        })
                    });
                    
                    const result = await res.json();
                    
                    if (result.success) {
                        user.vez = updatedVez;
                        user.mail = updatedMail;
                        user.tel = updatedTel;
                        user.ai_ossz_max = updatedAi; 
                        user.role = updatedRole;
                        
                        // Helyben frissítjük a modul neveket is az ID-k alapján
                        user.modulok = currentModIds.map(id => {
                            const m = window.systemModules.find(sm => sm.id == id);
                            return m ? m.leiras : null;
                        }).filter(n => n !== null);
                        
                        isEditMode = false;
                        renderUserPanel();
                        
                        if(reloadListCallback) reloadListCallback();
                    } else {
                        alert('Hiba: ' + result.message);
                        btn.textContent = 'Mentés';
                        btn.disabled = false;
                    }
                } catch (err) {
                    console.error('Mentési hiba:', err);
                    alert('Hálózati hiba.');
                    btn.textContent = 'Mentés';
                    btn.disabled = false;
                }
            });
        }
    };

    renderUserPanel();
}

async function loadInstitutionInfoTab(intId) {
    const lapozo = document.getElementById('lapozo');
    if (lapozo) {
        [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
        const infoBtn = lapozo.querySelector('.grap');
        if (infoBtn) infoBtn.classList.add('aktiv');
        document.getElementById('maininf').style.display = 'flex';
        document.getElementById('osszesitett').style.display = 'none';
        document.getElementById('gyik').style.display = 'none';
    }

    const diagDiv = document.querySelector('#maininf .diag');
    if (!diagDiv) return;

    diagDiv.innerHTML = '<div class="loader" style="padding: 30px; text-align: center;">Intézmény adatainak betöltése...</div>';

    // Összes modul előtöltése a chipekhez és a választóhoz
    let allModules = [];
    try {
        const modRes = await fetch('/api/all-modules');
        const modData = await modRes.json();
        if(modData.success) allModules = modData.data;
    } catch(e) { 
        console.error("Nem sikerült lekérni az összes modult:", e); 
    }

    try {
        const res = await fetch(`/institution-details?id=${encodeURIComponent(intId)}`);
        const result = await res.json();
        
        if (!result.success) throw new Error('Nem sikerült lekérni az adatokat');
        
        let data = result.data;
        let isEditMode = false;

        const formatDatum = (datum) => {
            if (!datum) return '';
            if (datum.length > 10) return datum.substring(0, 10);
            return datum;
        };

        const buildRow = (label, key, value, type = 'text', displayValue = null) => {
            const readValue = displayValue !== null ? displayValue : value;
            
            if (!isEditMode) {
                return `<p style="margin: 5px 0;"><strong>${label}:</strong> ${readValue || '-'}</p>`;
            } else {
                return `
                <div style="margin: 5px 0; display: flex; flex-direction: column;">
                    <label for="edit_${key}" style="font-size: 0.85em; font-weight: bold; color: #555;">${label}</label>
                    <input type="${type}" id="edit_${key}" value="${value || ''}" 
                           style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; margin-top: 2px; font-family: inherit;">
                </div>`;
            }
        };

        const renderPanel = () => {
            const maxUser = parseInt(data.intfo) || 0;
            const regUser = parseInt(data.regisztralt_felhasznalok) || 0;
            const limitSzin = (maxUser > 0 && regUser >= maxUser) ? 'color: #e53e3e; font-weight: bold;' : 'color: #38a169; font-weight: bold;';

            diagDiv.innerHTML = `
                <div class="gyikcim panel-header" style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="szerkcim">${data.intnev || 'Ismeretlen intézmény'} ${isEditMode ? ' <span style="color: #ff9900;">SZERKESZTÉS</span>' : ''}</span>
                </div>
                <div class="panel-body">
                     <div class="felsomenu" style="display: flex; gap: 10px; margin-bottom: 15px;">
                        ${!isEditMode ? `
                          <button id="btn-edit-inst">Szerkesztés</button>
                          <button id="btn-delete-inst">Intézmény Törlése</button>
                        ` : `
                          <button id="btn-save-inst">Mentés</button>
                          <button id="btn-cancel-edit" style="background: white; color: #666; border: 1px solid #ccc; padding: 6px 12px; border-radius: 6px; cursor: pointer;">Mégse</button>
                        `}
                    </div>    
                    
                    ${isEditMode ? buildRow('Intézmény Neve', 'intnev', data.intnev) : ''}

                    <div class="itdiv">
                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <h5 style="margin: 0 0 10px 0; color: #ff6500; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Alapadatok</h5>
                            ${buildRow('Adószám', 'intado', data.intado)}
                            ${buildRow('Kapcsolattartó', 'intkapvez', data.intkapvez)}
                            ${buildRow('Kapcsolattartó Email', 'intkapmail', data.intkapmail, 'email')}
                            ${buildRow('Regisztráció dátuma', 'fizetve', formatDatum(data.fizetve), 'date')}
                            ${buildRow('IP cím', 'ip_cim', data.ip_cim)}
                            ${buildRow('Böngésző (User Agent)', 'user_agent', data.user_agent)}
                        </div>

                        <div style="background: #f9fafb; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <h5 style="margin: 0 0 10px 0; color: #ff6500; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Elérhetőség & Cím</h5>
                            ${buildRow('Email', 'intmai', data.intmai, 'email')}
                            ${buildRow('Telefon', 'inttel', data.inttel)}
                            ${buildRow('Ország', 'intor', data.intor)}
                            ${buildRow('Irányítószám', 'intir', data.intir)}
                            ${buildRow('Székhely', 'intszek', data.intszek)}
                            ${buildRow('Cím', 'intcim', data.intcim)}
                        </div>
                    </div>

               <div style="background: #fff9f5; padding: 15px; border-radius: 8px; border: 1px solid #ffedde; margin-top: 20px;">
                        <h5 style="margin: 0 0 10px 0; color: #ff6500; border-bottom: 1px solid #ffedde; padding-bottom: 5px;">Licensz Információk</h5>
                        
                        ${!isEditMode 
                            ? `
                            <div style="margin: 5px 0;">
                                <p style="margin: 0 0 8px 0;"><strong>Választott anyagok (Modulok):</strong></p>
                                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                                    ${(data.intmod_nevek || data.intmod || '').split(',').map(m => m.trim()).filter(m => m !== '').length > 0 
                                        ? (data.intmod_nevek || data.intmod).split(',').map(m => 
                                            `<div class="chip">${m.trim()}</div>`
                                          ).join('')
                                        : '<span style="color: #999; font-style: italic; font-size: 0.85em;">-</span>'
                                    }
                                </div>
                            </div>
                            `
                            : `
                            <div style="margin: 5px 0; display: flex; flex-direction: column;">
                                <label style="font-size: 0.85em; font-weight: bold; color: #555;">Választott anyagok (Modulok)</label>
                                
                                <div id="module-chips-container" style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 5px; min-height: 40px; padding: 8px; background: #fff; border: 1px dashed #ffbca8; border-radius: 6px;">
                                    </div>
                                
                                <div style="margin-top: 10px; display: flex; gap: 10px;    flex-direction: column;">
                                    <select id="new-module-select" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; flex-grow: 1;">
                                    </select>
                                    <button id="add-module-btn" type="button" style="padding: 6px 16px; background: #ff6500; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">+ Hozzáad</button>
                                </div>
                                
                                <input type="hidden" id="edit_intmod" value="${data.intmod || ''}">
                            </div>
                            `
                        }

                        ${buildRow('Licensz fajta (Időszak)', 'idoszak', data.idoszak)}
                        ${buildRow('Licensz lejárata', 'inftin', formatDatum(data.inftin), 'date')}
                        
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ffbca8;">
                            ${buildRow('Max. regisztrálható fiókok', 'intfo', data.intfo, 'number')}
                            ${!isEditMode ? `<p style="margin: 5px 0;"><strong>Ebből regisztrált:</strong> <span style="${limitSzin}">${regUser} / ${data.intfo || '-'}</span></p>` : ''}
                        </div>
                    </div>
            `;

            if (!isEditMode) {
                document.getElementById('btn-edit-inst').addEventListener('click', () => {
                    isEditMode = true;
                    renderPanel();
                });

                document.getElementById('btn-delete-inst').addEventListener('click', async () => {
                    const confirmMsg = `VIGYÁZAT! Biztosan törölni szeretné a(z) ${data.intnev} intézményt?\n\nFIGYELEM: Ezzel a lépéssel AZ ÖSSZES HOZZÁRENDELT FELHASZNÁLÓ ÉS AZ Ő ÖSSZES ÉRTÉKELÉSÜK VÉGLEGESEN TÖRLŐDIK!\n\nBiztosan folytatja?`;
                    
                    if (confirm(confirmMsg)) {
                        const btn = document.getElementById('btn-delete-inst');
                        btn.textContent = 'Törlés...';
                        btn.style.pointerEvents = 'none';
                        btn.style.opacity = '0.6';

                        try {
                            const res = await fetch('/delete-institution', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: intId })
                            });
                            
                            const deleteData = await res.json();
                            
                            if (deleteData.success) {
                                alert('Az intézmény és adatai törölve.');
                                diagDiv.innerHTML = '<div class="gyikcim panel-header">JOGKÖRÖK</div><div class="panel-body">Válasszon intézményt a részletek megtekintéséhez.</div>';
                                const intezmenyiTab = document.getElementById('cat-intezmenyi');
                                if (intezmenyiTab) intezmenyiTab.click();
                            } else {
                                alert('Hiba történt: ' + deleteData.message);
                                btn.textContent = 'Intézmény Törlése';
                                btn.style.pointerEvents = 'auto';
                                btn.style.opacity = '1';
                            }
                        } catch (err) {
                            console.error('Törlési hiba:', err);
                            alert('Hálózati hiba.');
                            btn.textContent = 'Intézmény Törlése';
                            btn.style.pointerEvents = 'auto';
                        }
                    }
                });
            } else {
                
                // === ÚJ LOGIKA: MODUL CHIPEK KEZELÉSE (Szerkesztés módban) ===
                const chipContainer = document.getElementById('module-chips-container');
                const hiddenModInput = document.getElementById('edit_intmod');
                const modSelect = document.getElementById('new-module-select');
                const addModBtn = document.getElementById('add-module-btn');

                if (chipContainer && hiddenModInput && modSelect && addModBtn) {
                    
                    const renderChips = () => {
                        let currentIds = hiddenModInput.value.split(',').map(id => id.trim()).filter(id => id !== '');
                        chipContainer.innerHTML = '';
                        
                        if (currentIds.length === 0) {
                            chipContainer.innerHTML = '<span style="color: #aaa; font-style: italic; font-size: 0.85em; display:flex; align-items:center;">Nincs modul hozzárendelve. Válasszon a lenti listából!</span>';
                        } else {
                            currentIds.forEach(id => {
                                const mod = allModules.find(m => m.id == id);
                                const name = mod ? mod.leiras : `Ismeretlen modul (${id})`;
                                
                                const chip = document.createElement('div');
                                chip.classList.add("chip")
        
                                chip.innerHTML = `
                                    <span>${name}</span>
                                    <span class="remove-mod-btn" data-id="${id}">&times;</span>
                                `;
                                chipContainer.appendChild(chip);
                            });

                            // X (Törlés) gombok eseménykezelői
                            chipContainer.querySelectorAll('.remove-mod-btn').forEach(btn => {
                                btn.addEventListener('click', function() {
                                    const idToRemove = this.getAttribute('data-id');
                                    currentIds = currentIds.filter(id => id !== idToRemove);
                                    hiddenModInput.value = currentIds.join(',');
                                    renderChips(); // Újrarajzolás
                                });
                            });
                        }

                        // Legördülő menü (Select) frissítése: csak azokat mutatjuk, amik nincsenek már a listában
                        modSelect.innerHTML = '<option value="" disabled selected>Válasszon új modult a listából...</option>';
                        allModules.forEach(mod => {
                            if (!currentIds.includes(mod.id.toString())) {
                                const opt = document.createElement('option');
                                opt.value = mod.id;
                                opt.textContent = mod.leiras;
                                modSelect.appendChild(opt);
                            }
                        });
                    };

                    // Kezdeti kirajzolás, mikor átlépünk szerkesztésbe
                    renderChips();

                    // Hozzáadás (+) gomb eseménye
                    addModBtn.addEventListener('click', () => {
                        const newId = modSelect.value;
                        if (newId) {
                            let currentIds = hiddenModInput.value.split(',').map(id => id.trim()).filter(id => id !== '');
                            if (!currentIds.includes(newId)) {
                                currentIds.push(newId);
                                hiddenModInput.value = currentIds.join(','); // Frissítjük a láthatatlan inputot
                                renderChips(); // Újrarajzolás
                            }
                        }
                    });
                }
                // === MODUL CHIP LOGIKA VÉGE ===

                document.getElementById('btn-cancel-edit').addEventListener('click', () => {
                    isEditMode = false;
                    renderPanel();
                });

                document.getElementById('btn-save-inst').addEventListener('click', async () => {
                    const btn = document.getElementById('btn-save-inst');
                    btn.textContent = 'Mentés...';
                    btn.style.pointerEvents = 'none';
                    btn.style.opacity = '0.6';

                    const updatedData = {
                        id: intId,
                        intnev: document.getElementById('edit_intnev').value,
                        intado: document.getElementById('edit_intado').value,
                        intkapvez: document.getElementById('edit_intkapvez').value,
                        intkapmail: document.getElementById('edit_intkapmail').value,
                        fizetve: document.getElementById('edit_fizetve').value,
                        ip_cim: document.getElementById('edit_ip_cim').value,
                        user_agent: document.getElementById('edit_user_agent').value,
                        intmai: document.getElementById('edit_intmai').value,
                        inttel: document.getElementById('edit_inttel').value,
                        intor: document.getElementById('edit_intor').value,
                        intir: document.getElementById('edit_intir').value,
                        intszek: document.getElementById('edit_intszek').value,
                        intcim: document.getElementById('edit_intcim').value,
                        
                        // Itt történik a varázslat: A mentés simán csak kiolvassa a rejtett input "3,1,2" értékét
                        intmod: document.getElementById('edit_intmod').value, 
                        
                        idoszak: document.getElementById('edit_idoszak').value,
                        inftin: document.getElementById('edit_inftin').value,
                        intfo: document.getElementById('edit_intfo').value
                    };

                    try {
                        const res = await fetch('/update-institution', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedData)
                        });
                        
                        const result = await res.json();
                        
                        if (result.success) {
                            
                            // Ha sikeres a mentés, azonnal újra lekérjük az intézmény friss adatait a backendtől
                            // (Hogy a backend lefordítsa az új "3,1,2,4" sorozatot az új szép nevekre az olvasó nézethez)
                            const freshRes = await fetch(`/institution-details?id=${encodeURIComponent(intId)}`);
                            const freshResult = await freshRes.json();
                            
                            if (freshResult.success) {
                                data = freshResult.data;
                            } else {
                                data = { ...data, ...updatedData };
                            }

                            isEditMode = false;
                            renderPanel();
                            
                            const listBtn = document.querySelector(`.institution-item-btn[data-intid="${intId}"] .inicim`);
                            if (listBtn) listBtn.textContent = data.intnev;
                        } else {
                            alert('Hiba: ' + result.message);
                            btn.textContent = 'Mentés';
                            btn.style.pointerEvents = 'auto';
                        }
                    } catch (err) {
                        console.error('Mentési hiba:', err);
                        alert('Hálózati hiba.');
                        btn.textContent = 'Mentés';
                        btn.style.pointerEvents = 'auto';
                    }
                });
            }
        };

        renderPanel();

    } catch (err) {
        console.error('Intézmény adatok betöltése hiba:', err);
        diagDiv.innerHTML = '<div class="error-msg" style="padding: 20px; color: red;">Hiba történt az intézmény adatainak lekérésekor.</div>';
    }
}