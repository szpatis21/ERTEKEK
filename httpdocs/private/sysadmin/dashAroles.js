function clearNode(node) {
  if (!node) return;
  node.replaceChildren();
}

function text(value) {
  return String(value ?? '');
}

function appendText(parent, value) {
  parent.appendChild(document.createTextNode(text(value)));
}

function el(tag, options = {}, children = []) {
  const node = document.createElement(tag);

  if (options.className) node.className = options.className;
  if (options.id) node.id = options.id;
  if (options.text !== undefined) node.textContent = text(options.text);
  if (options.title !== undefined) node.title = text(options.title);
  if (options.type) node.type = options.type;
  if (options.value !== undefined) node.value = text(options.value);
  if (options.name) node.name = options.name;
  if (options.for) node.htmlFor = options.for;
  if (options.disabled) node.disabled = true;
  if (options.checked) node.checked = true;
  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      node.dataset[key] = text(value);
    });
  }
  if (options.style) Object.assign(node.style, options.style);

  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null) continue;
    if (typeof child === 'string' || typeof child === 'number') node.appendChild(document.createTextNode(String(child)));
    else node.appendChild(child);
  }

  return node;
}

function icon(name, className = '') {
  return el('span', { className: `material-symbols-outlined${className ? ` ${className}` : ''}`, text: name });
}

function setMessage(container, className, message, style = {}) {
  clearNode(container);
  container.appendChild(el('div', { className, text: message, style }));
}

function resetDiagMessage(message = 'Válasszon intézményt a részletek megtekintéséhez.') {
  const diag = document.querySelector('#maininf .diag');
  if (!diag) return;
  clearNode(diag);
  diag.append(
    el('div', { className: 'gyikcim panel-header', text: 'JOGKÖRÖK' }),
    el('div', { className: 'panel-body', text: message })
  );
}

function createBackButton(label) {
  const button = el('button', { className: 'admin-back-btn', type: 'button' });
  button.append(icon('arrow_back'), document.createTextNode(` ${label}`));
  return button;
}

function createRoleHeader(meta, fallbackLabel = '') {
  const h4 = el('h4');
  h4.append(icon(meta?.icon || 'person_alert', meta?.cls || 'pen'), document.createTextNode(` ${meta?.label || fallbackLabel || 'Ismeretlen'}`));
  return h4;
}

function createRoleSection(roleKey, meta) {
  const section = el('section', { className: 'role-section', dataset: { role: roleKey } });
  section.append(createRoleHeader(meta, roleKey), el('div', { className: 'role-list' }));
  return section;
}

function createModuleChips(modulok) {
  const list = el('div', { className: 'modulok-lista' });
  if (Array.isArray(modulok) && modulok.length > 0) {
    modulok.forEach(moduleName => list.appendChild(el('div', { className: 'chip', text: moduleName })));
  } else {
    list.appendChild(el('div', {
      text: 'Nincs kiosztott modul',
      style: { fontSize: '0.8em', color: '#999', marginTop: '5px', fontStyle: 'italic' }
    }));
  }
  return list;
}

function createUserCard(user, roleMeta) {
  const card = el('div', { className: 'user-card' });
  const item = el('div', { className: 'dob user-card-item' });
  const row = el('div', { className: 'dobal' });
  const nameWrap = el('div', { className: 'nev' });
  const hidden = el('div', { className: 'rejtettinfo' });
  const roleKey = user.role ? String(user.role).toLowerCase() : 'unassigned';
  const meta = roleMeta[roleKey] || roleMeta.unassigned;

  hidden.append(el('div', { className: 'eler', text: user.mail || 'Nincs email-cím' }), createModuleChips(user.modulok));
  nameWrap.append(el('div', { className: 'vez', text: user.vez || 'Ismeretlen' }), hidden);
  row.append(nameWrap, el('div', { className: 'role' }, icon(meta.icon, meta.cls)));
  item.appendChild(row);
  card.appendChild(item);
  return card;
}

export async function renderRoles(userState) {
  const wrapper = document.getElementById('module-users-list');
  const counterText = document.getElementById('user-sectiont');
  if (!wrapper || !counterText) return;

  clearNode(wrapper);
  counterText.textContent = 'Kérem, válasszon kategóriát';

  const mainCatsDiv = el('div', { className: 'admin-category-container' });
  const createCategory = (id, iconName, title, classes = '') => {
    const card = el('div', { id, className: `admin-category-card ${classes}`.trim() });
    const content = el('div', { className: 'card-content' });
    content.append(icon(iconName), el('h4', { text: title }));
    card.appendChild(content);
    return card;
  };

  const catIntezmenyi = createCategory('cat-intezmenyi', 'domain', 'Intézményi', 'activex');
  const catMagan = createCategory('cat-magan', 'person', 'Magán', 'disabled');
  mainCatsDiv.append(catIntezmenyi, catMagan);
  wrapper.appendChild(mainCatsDiv);

  const contentContainer = el('div', { id: 'dynamic-content-container' });
  wrapper.appendChild(contentContainer);

  catIntezmenyi.addEventListener('click', async function() {
    document.querySelectorAll('.admin-category-card').forEach(c => c.classList.remove('activex'));
    this.classList.add('activex');
    await loadInstitutions(userState, contentContainer, counterText);
  });

  catMagan.addEventListener('click', function() {
    document.querySelectorAll('.admin-category-card').forEach(c => c.classList.remove('activex'));
    this.classList.add('activex');
    counterText.textContent = 'Magán felhasználók';
    setMessage(contentContainer, 'info-msg', 'Jelenleg minden felhasználó intézményi. A magán felhasználók modul fejlesztés alatt.');
  });
}

async function loadInstitutions(userState, container, counterText) {
  setMessage(container, 'loader', 'Intézmények betöltése...');
  counterText.textContent = 'Intézmények lekérdezése...';

  try {
    const res = await fetch('/institutions');
    const result = await res.json();
    if (!result.success) throw new Error('Hiba a lekérésben');

    const institutions = result.data || [];
    counterText.textContent = `Összesen ${institutions.length} intézmény regisztrálva`;
    clearNode(container);

    const grid = el('div', { className: 'institution-grid' });

    institutions.forEach(int => {
      const btn = el('button', { className: 'institution-item-btn', dataset: { intid: int.id }, type: 'button' });
      const left = el('div', { className: 'btn-left' });
      left.append(icon('account_balance', 'inti'), el('span', { className: 'inicim', text: int.intnev || 'Ismeretlen intézmény' }));
      btn.appendChild(left);
      btn.addEventListener('click', () => loadUsersForInstitution(userState, int.id, int.intnev, container, counterText));
      grid.appendChild(btn);
    });

    container.appendChild(grid);
  } catch (err) {
    console.error('Intézmények lekérése közben hiba:', err);
    setMessage(container, 'error-msg', 'Nem sikerült betölteni az intézményeket.');
  }
}

async function loadUsersForInstitution(userState, intId, intNev, container, counterText) {
  setMessage(container, 'loader', 'Felhasználók betöltése...');
  loadInstitutionInfoTab(intId);

  try {
    const res = await fetch(`/users-by-module?intId=${encodeURIComponent(intId)}`);
    if (!res.ok) throw new Error(`HTTP hibakód: ${res.status}`);

    const data = await res.json();
    window.systemModules = data.modules || [];
    clearNode(container);

    const backBtn = createBackButton('Vissza az intézményekhez');
    backBtn.addEventListener('click', () => {
      resetDiagMessage();
      const osszesitett = document.getElementById('osszesitett');
      if (osszesitett) osszesitett.style.display = 'none';
      loadInstitutions(userState, container, counterText);
    });
    container.appendChild(backBtn);

    const users = data.users || [];
    counterText.textContent = `${intNev || 'Intézmény'}: ${users.length} Személy`;

    const roleMeta = {
      unassigned: { icon : 'person_alert', label: 'Besorolásra váró felhasználók', cls: 'pen' },
      admin: { icon: 'person_shield', label: 'Adminisztrátor', cls: 'adm' },
      analist: { icon: 'person_search', label: 'Elemző', cls: 'ana' },
      evaluator: { icon: 'person_edit', label: 'Értékelő', cls: 'eva' },
      sysadmin: { icon: 'local_police', label: 'Rendszergazda (Sysadmin)', cls: 'adm' }
    };

    ['unassigned','admin', 'analist', 'evaluator', 'sysadmin'].forEach(roleKey => {
      container.appendChild(createRoleSection(roleKey, roleMeta[roleKey]));
    });

    users.forEach(user => {
      const roleKey = user.role ? String(user.role).toLowerCase() : 'unassigned';
      let target = container.querySelector(`section[data-role="${CSS.escape(roleKey)}"] .role-list`);

      if (!target) {
        console.warn(`Hiányzó HTML oszlop pótlása: ${roleKey}`);
        const safeSection = createRoleSection(roleKey, { icon: 'person_alert', label: user.role || 'Ismeretlen', cls: 'pen' });
        container.appendChild(safeSection);
        target = safeSection.querySelector('.role-list');
      }

      const card = createUserCard(user, roleMeta);
      target.appendChild(card);
      card.addEventListener('click', () => {
        const reloadCallback = () => loadUsersForInstitution(userState, intId, intNev, container, counterText);
        loadUserInfoTab(user, reloadCallback);
      });
    });

    container.querySelectorAll('section').forEach(sec => {
      if (!sec.querySelector('.user-card')) sec.style.display = 'none';
    });
  } catch (err) {
    console.error('Felhasználók lekérése közben hiba:', err);
    setMessage(container, 'error-msg', 'Hiba történt a felhasználók betöltésekor.');
  }
}

async function loadUserInfoTab(user, reloadListCallback) {
  const lapozo = document.getElementById('lapozo');
  if (lapozo) {
    [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
    const staBtn = lapozo.querySelector('.sta');
    if (staBtn) staBtn.classList.add('aktiv');

    const osszesitett = document.getElementById('osszesitett');
    const maininf = document.getElementById('maininf');
    const gyik = document.getElementById('gyik');
    if (osszesitett) osszesitett.style.display = 'flex';
    if (maininf) maininf.style.display = 'none';
    if (gyik) gyik.style.display = 'none';
  }

  const container = document.getElementById('osszesitett');
  if (!container) return;
  const targetDiv = container.querySelector('.diag') || container;

  const rolesHunNames = {
    evaluator: 'Értékelő',
    analist: 'Elemző',
    admin: 'Adminisztrátor',
    sysadmin: 'Rendszer adminisztrátor',
    unassigned: 'Besorolásra váró'
  };

  let isEditMode = false;

  const formatDatum = (datum) => {
    if (!datum) return '-';
    const s = String(datum);
    return s.length > 10 ? s.substring(0, 10) : s;
  };

  const renderEvaluations = () => {
    if (!Array.isArray(user.ertekelesek) || user.ertekelesek.length === 0) {
      return el('div', { className: 'nincs-ertekeles', text: 'A felhasználónak még nincsenek saját értékelései a rendszerben.' });
    }

    const blokk = el('div', { className: 'ertekelesek-blokk' });
    const container = el('div', { className: 'ertekelesek-container' });
    const list = el('div', { className: 'voltul' });
    blokk.append(el('h5', { text: 'Saját Értékelések & Hozzájárulási (Audit) adatok' }), container);
    container.appendChild(list);

    user.ertekelesek.forEach(ert => {
      const item = el('div', { className: 'usert' });
      const headerContainer = el('div', { className: 'ertekeles-header-container' });
      const header = el('div', { className: 'ertekeles-fejlec' });
      header.append(
        el('strong', { text: ert.nev || '-' }),
        document.createTextNode(' '),
        el('span', { className: 'modul-cimke', text: `[${ert.modul_nev || '-'}]` }),
        document.createTextNode(' '),
        el('span', { className: 'datum-info', text: `(${ert.datum || '-'})` })
      );

      if (Array.isArray(ert.megosztva) && ert.megosztva.length > 0) {
        const share = el('span', { className: 'audit-cim' });
        share.append(document.createTextNode('(Megosztva: '), el('b', { text: ert.megosztva.join(', ') }), document.createTextNode(')'));
        header.appendChild(share);
      }

      const delBtn = el('button', { className: 'delete-eval-btn', title: 'Értékelés törlése', dataset: { evalid: ert.id, evalnev: ert.nev || '' }, type: 'button' }, icon('delete', 'icon-small'));
      headerContainer.append(header, delBtn);
      item.appendChild(headerContainer);

      if (ert.audit_datum) {
        const audit = el('div', { className: 'audit-info-box' });
        audit.append(
          createLabelRow('Elfogadva:', ert.audit_datum),
          createLabelRow('IP cím:', ert.audit_ip || '-'),
          createLabelRow('Böngésző:', ert.audit_agent || '-', 'audit-agent')
        );
        item.appendChild(audit);
      } else {
        const audit = el('div', { className: 'audit-info-box audit-hianyzik' });
        audit.append(icon('warning', 'icon-small'), document.createTextNode(' Nincs rögzített hozzájárulás!'));
        item.appendChild(audit);
      }

      list.appendChild(item);
    });

    return blokk;
  };

  const renderLogs = () => {
    const blokk = el('div', { className: 'log-blokk' });
    blokk.appendChild(el('h5', { text: 'Tevékenységnapló' }));

    if (!Array.isArray(user.logs) || user.logs.length === 0) {
      blokk.appendChild(el('div', { className: 'nincs-log', text: 'Nincs rögzített tevékenység a felhasználóhoz.' }));
      return blokk;
    }

    const roleIdMap = { '1': 'Adminisztrátor', '2': 'Elemző', '3': 'Értékelő', '4': 'Besorolásra váró' };
    const logContainer = el('div', { className: 'log-container' });
    const logList = el('div', { className: 'log-lista' });
    logContainer.appendChild(logList);
    blokk.appendChild(logContainer);

    user.logs.forEach(log => {
      const item = el('div', { className: 'log-item' });
      item.append(el('strong', { className: 'log-tev', text: log.tevekenyseg || '-' }), document.createTextNode(' '), el('span', { className: 'log-datum', text: `(${log.datum || '-'})` }));

      const details = normalizeLogDetails(log.reszletek, user.ertekelesek, roleIdMap);
      if (details.length > 0) {
        const detailDiv = el('div', { className: 'log-reszlet' });
        details.forEach((line, index) => {
          if (index > 0) detailDiv.appendChild(document.createElement('br'));
          detailDiv.append(el('b', { text: `${line.key}:` }), document.createTextNode(` ${line.value}`));
        });
        item.appendChild(detailDiv);
      }
      logList.appendChild(item);
    });

    return blokk;
  };

  const renderReadOnlyUserData = (parent) => {
    parent.append(
      createParagraph('Név:', user.vez || '-'),
      createParagraph('E-mail:', user.mail || '-'),
      createParagraph('Telefon:', user.tel || '-'),
      createParagraph('Aktuális jogkör:', rolesHunNames[user.role] || user.role || '-', 'jogkor-kiemelt'),
      createParagraph('Maradék AI kvóta:', user.ai_ossz_max || '0', 'jogkor-kiemelt'),
      createParagraph('Értékelések:', `${user.kitoltes_db ?? 0} darab értékelés`, 'jogkor-kiemelt')
    );
    parent.appendChild(el('h5', { className: 'mt-kis', text: 'Technikai adatok' }));
    parent.append(
      createParagraph('Regisztráció:', formatDatum(user.regisztralt)),
      createParagraph('Utolsó IP cím:', user.ip_cim || '-'),
      createParagraph('Böngésző:', user.user_agent || '-')
    );
  };

  const renderEditUserData = (parent, currentModIds) => {
    const form = el('div', { className: 'szerkeszto-urlap' });
    form.append(
      createInputBlock('Név', 'edit_u_vez', user.vez || ''),
      createInputBlock('E-mail', 'edit_u_mail', user.mail || '', 'email'),
      createInputBlock('Telefon', 'edit_u_tel', user.tel || ''),
      createInputBlock('Maradék AI kvóta', 'edit_u_ai', user.ai_ossz_max || 0, 'number')
    );

    form.append(el('label', { className: 'jogkor-label', text: 'Hozzárendelt Modulok', style: { marginTop: '15px', display: 'block' } }));
    form.appendChild(el('div', { id: 'user-module-chips-container', style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px', minHeight: '40px', padding: '8px', background: '#fff', border: '1px dashed #ffbca8', borderRadius: '6px' } }));

    const addWrap = el('div', { style: { marginTop: '10px', display: 'flex', gap: '10px', flexDirection: 'row', marginBottom: '15px' } });
    addWrap.append(
      el('select', { id: 'user-new-module-select', style: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', flexGrow: '1' } }),
      el('button', { id: 'user-add-module-btn', type: 'button', text: '+ Hozzáad', style: { padding: '6px 16px', background: '#ff6500', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' } })
    );
    form.appendChild(addWrap);

    const roleWrap = el('div', { className: 'role-radio', style: { background: '#ffeede', padding: '10px', borderRadius: '6px', display: 'flex', gap: '15px', border: '1px solid #ffbca8' } });
    ['admin', 'analist', 'evaluator'].forEach(role => {
      const labelText = role === 'admin' ? 'Admin' : role === 'analist' ? 'Elemző' : 'Értékelő';
      const label = el('label');
      label.append(el('input', { type: 'radio', name: 'edit_u_role', value: role, checked: user.role === role }), document.createTextNode(` ${labelText}`));
      roleWrap.appendChild(label);
    });
    form.append(el('label', { className: 'jogkor-label', text: 'Jogkör beállítása' }), roleWrap);
    parent.appendChild(form);
  };

  const renderUserPanel = () => {
    clearNode(targetDiv);

    const header = el('div', { className: 'gyikcim panel-header' });
    appendText(header, `${user.vez || 'Ismeretlen'} Profilja`);
    if (isEditMode) header.appendChild(el('span', { className: 'szerkeszt-jelzo', text: ' - SZERKESZTÉS' }));

    const body = el('div', { className: 'panel-body' });
    const menu = el('div', { className: 'felsomenu' });

    if (!isEditMode) {
      menu.append(el('button', { id: 'btn-edit-user', type: 'button', text: 'Szerkesztés' }), el('button', { id: 'btn-delete-user', className: 'delete-user-btn', type: 'button', text: 'Felhasználó törlése' }));
    } else {
      menu.append(el('button', { id: 'btn-save-user', type: 'button', text: 'Mentés' }), el('button', { id: 'btn-cancel-user', className: 'cancel-btn', type: 'button', text: 'Mégse' }));
    }

    const userBlock = el('div', { className: 'userblokk' });
    const alap = el('div', { className: 'alap-adatok' });
    alap.appendChild(el('h5', { text: 'Alapadatok & Rendszerinfók' }));

    let currentModIds = [];
    if (isEditMode && Array.isArray(user.modulok) && window.systemModules) {
      currentModIds = user.modulok.map(nev => {
        const match = window.systemModules.find(m => m.leiras === nev);
        return match ? String(match.id) : null;
      }).filter(Boolean);
    }

    if (!isEditMode) renderReadOnlyUserData(alap);
    else renderEditUserData(alap, currentModIds);

    userBlock.appendChild(alap);
    body.append(menu, userBlock, renderEvaluations(), el('div', {}, renderLogs()));
    targetDiv.append(header, body);

    bindUserPanelEvents(user, reloadListCallback, renderUserPanel, () => { isEditMode = false; }, () => { isEditMode = true; }, currentModIds);
  };

  renderUserPanel();
}

function createLabelRow(label, value, valueClass = '') {
  const row = el('div', { className: 'audit-row' });
  row.append(el('span', { className: 'audit-cim', text: label }), document.createTextNode(' '), el('span', { className: valueClass, text: value }));
  return row;
}

function createParagraph(label, value, valueClass = '') {
  const p = el('p');
  p.append(el('strong', { text: label }), document.createTextNode(' '), valueClass ? el('span', { className: valueClass, text: value }) : document.createTextNode(text(value)));
  return p;
}

function createInputBlock(labelText, id, value, type = 'text') {
  const wrap = el('div', { className: 'useri' });
  wrap.append(el('label', { text: labelText }), el('input', { id, type, value }));
  return wrap;
}

function normalizeLogDetails(raw, ertekelesek = [], roleIdMap = {}) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof parsed === 'object' && parsed !== null) {
      return Object.entries(parsed).map(([key, value]) => {
        let out = typeof value === 'object' ? JSON.stringify(value) : text(value);

        if ((key === 'kitoltes_id' || key === 'eredeti_idk') && Array.isArray(ertekelesek)) {
          const found = ertekelesek.find(e => e.id == value || e.idk == value);
          if (found) out = `${value} (${found.nev})`;
        } else if (key === 'modul' && window.systemModules) {
          const mod = window.systemModules.find(m => m.id == value);
          if (mod) out = `${value} (${mod.leiras})`;
        } else if (key === 'szerepkor') {
          out = `${value} (${roleIdMap[value] || 'Ismeretlen'})`;
        }

        return { key, value: out };
      });
    }
  } catch {}
  return [{ key: 'Részletek', value: text(raw) }];
}

function bindUserPanelEvents(user, reloadListCallback, renderUserPanel, setReadMode, setEditMode, currentModIds) {
  document.querySelectorAll('.delete-eval-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const evalId = btn.getAttribute('data-evalid');
      const evalNev = btn.getAttribute('data-evalnev');
      if (!confirm(`Biztosan törölni szeretné a(z) "${evalNev}" értékelést és minden hozzá tartozó adatot? Ezt nem lehet visszavonni.`)) return;

      btn.disabled = true;
      btn.replaceChildren(icon('hourglass_empty', 'icon-small'));

      try {
        const resp = await fetch('/delete-kitoltes', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: evalId })
        });
        const result = await resp.json();

        if (result.success) {
          user.ertekelesek = (user.ertekelesek || []).filter(e => e.id != evalId);
          user.kitoltes_db = user.ertekelesek.length;
          renderUserPanel();
          if (reloadListCallback) reloadListCallback();
        } else {
          alert('Hiba történt: ' + (result.message || 'Ismeretlen hiba'));
          btn.disabled = false;
          btn.replaceChildren(icon('delete', 'icon-small'));
        }
      } catch (err) {
        console.error('Törlési hiba:', err);
        alert('Hálózati hiba történt.');
        btn.disabled = false;
        btn.replaceChildren(icon('delete', 'icon-small'));
      }
    });
  });

  const editBtn = document.getElementById('btn-edit-user');
  if (editBtn) editBtn.addEventListener('click', () => { setEditMode(); renderUserPanel(); });

  const deleteBtn = document.getElementById('btn-delete-user');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', async () => {
      if (!confirm(`Biztosan törölni szeretné ${user.vez || 'ezt a'} felhasználót és minden adatát?`)) return;
      deleteBtn.textContent = 'Törlés...';
      deleteBtn.disabled = true;

      try {
        const resp = await fetch('/delete-user', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id })
        });
        const result = await resp.json();

        if (result.success) {
          resetUserDeletedMessage();
          if (reloadListCallback) reloadListCallback();
        } else {
          alert('Hiba történt a törlés során!');
          deleteBtn.textContent = 'Felhasználó törlése';
          deleteBtn.disabled = false;
        }
      } catch (err) {
        console.error('Törlési hiba:', err);
        alert('Hálózati hiba történt.');
        deleteBtn.textContent = 'Felhasználó törlése';
        deleteBtn.disabled = false;
      }
    });
  }

  const cancelBtn = document.getElementById('btn-cancel-user');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { setReadMode(); renderUserPanel(); });

  const saveBtn = document.getElementById('btn-save-user');
  if (saveBtn) {
    initUserModuleChips(currentModIds);
    saveBtn.addEventListener('click', async () => {
      saveBtn.textContent = 'Mentés...';
      saveBtn.disabled = true;

      const updatedVez = document.getElementById('edit_u_vez').value;
      const updatedMail = document.getElementById('edit_u_mail').value;
      const updatedTel = document.getElementById('edit_u_tel').value;
      const updatedAi = document.getElementById('edit_u_ai').value;
      const updatedRole = document.querySelector('input[name="edit_u_role"]:checked').value;

      try {
        const res = await fetch('/update-user', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: user.id, vez: updatedVez, mail: updatedMail, tel: updatedTel, ai_ossz_max: updatedAi, role: updatedRole, modulIds: currentModIds })
        });
        const result = await res.json();

        if (result.success) {
          user.vez = updatedVez;
          user.mail = updatedMail;
          user.tel = updatedTel;
          user.ai_ossz_max = updatedAi;
          user.role = updatedRole;
          user.modulok = currentModIds.map(id => {
            const m = window.systemModules.find(sm => sm.id == id);
            return m ? m.leiras : null;
          }).filter(Boolean);
          setReadMode();
          renderUserPanel();
          if (reloadListCallback) reloadListCallback();
        } else {
          alert('Hiba: ' + result.message);
          saveBtn.textContent = 'Mentés';
          saveBtn.disabled = false;
        }
      } catch (err) {
        console.error('Mentési hiba:', err);
        alert('Hálózati hiba.');
        saveBtn.textContent = 'Mentés';
        saveBtn.disabled = false;
      }
    });
  }
}

function resetUserDeletedMessage() {
  const container = document.getElementById('osszesitett');
  const targetDiv = container?.querySelector('.diag') || container;
  if (!targetDiv) return;
  clearNode(targetDiv);
  targetDiv.append(el('div', { className: 'gyikcim panel-header', text: 'JOGKÖRÖK' }), el('div', { className: 'panel-body', text: 'A felhasználó törlésre került. Kérem, válasszon a listából!' }));
}

function initUserModuleChips(currentModIds) {
  const chipContainer = document.getElementById('user-module-chips-container');
  const modSelect = document.getElementById('user-new-module-select');
  const addModBtn = document.getElementById('user-add-module-btn');
  if (!chipContainer || !modSelect || !addModBtn) return;

  const renderUserChips = () => {
    clearNode(chipContainer);

    if (currentModIds.length === 0) {
      chipContainer.appendChild(el('span', { text: 'Nincs modul kiosztva.', style: { color: '#aaa', fontStyle: 'italic', fontSize: '0.85em', display: 'flex', alignItems: 'center' } }));
    } else {
      currentModIds.forEach(id => {
        const mod = window.systemModules.find(m => m.id == id);
        const name = mod ? mod.leiras : `Ismeretlen (${id})`;
        const chip = el('div', { className: 'chip' });
        chip.append(el('span', { text: name }), el('span', { className: 'remove-user-mod-btn', text: '×', dataset: { id }, style: { marginLeft: '5px', cursor: 'pointer', fontWeight: 'bold' } }));
        chipContainer.appendChild(chip);
      });

      chipContainer.querySelectorAll('.remove-user-mod-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const idToRemove = this.getAttribute('data-id');
          const idx = currentModIds.indexOf(idToRemove);
          if (idx >= 0) currentModIds.splice(idx, 1);
          renderUserChips();
        });
      });
    }

    clearNode(modSelect);
    modSelect.appendChild(el('option', { value: '', text: 'Válasszon új modult...', disabled: true }));
    modSelect.firstElementChild.selected = true;
    (window.systemModules || []).forEach(mod => {
      if (!currentModIds.includes(String(mod.id))) modSelect.appendChild(el('option', { value: mod.id, text: mod.leiras }));
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

async function loadInstitutionInfoTab(intId) {
  const lapozo = document.getElementById('lapozo');
  if (lapozo) {
    [...lapozo.children].forEach(child => child.classList.remove('aktiv'));
    const infoBtn = lapozo.querySelector('.grap');
    if (infoBtn) infoBtn.classList.add('aktiv');
    const maininf = document.getElementById('maininf');
    const osszesitett = document.getElementById('osszesitett');
    const gyik = document.getElementById('gyik');
    if (maininf) maininf.style.display = 'flex';
    if (osszesitett) osszesitett.style.display = 'none';
    if (gyik) gyik.style.display = 'none';
  }

  const diagDiv = document.querySelector('#maininf .diag');
  if (!diagDiv) return;
  setMessage(diagDiv, 'loader', 'Intézmény adatainak betöltése...', { padding: '30px', textAlign: 'center' });

  let allModules = [];
  try {
    const modRes = await fetch('/api/all-modules');
    const modData = await modRes.json();
    if (modData.success) allModules = modData.data || [];
  } catch (e) {
    console.error('Nem sikerült lekérni az összes modult:', e);
  }

  try {
    const res = await fetch(`/institution-details?id=${encodeURIComponent(intId)}`);
    const result = await res.json();
    if (!result.success) throw new Error('Nem sikerült lekérni az adatokat');

    let data = result.data;
    let isEditMode = false;

    const formatDatum = (datum) => {
      if (!datum) return '';
      const s = String(datum);
      return s.length > 10 ? s.substring(0, 10) : s;
    };

    const buildField = (label, key, value, type = 'text') => {
      if (!isEditMode) return createParagraph(label + ':', value || '-');
      const wrap = el('div', { style: { margin: '5px 0', display: 'flex', flexDirection: 'column' } });
      wrap.append(
        el('label', { for: `edit_${key}`, text: label, style: { fontSize: '0.85em', fontWeight: 'bold', color: '#555' } }),
        el('input', { type, id: `edit_${key}`, value: value || '', style: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '2px', fontFamily: 'inherit' } })
      );
      return wrap;
    };

    const boolText = (value) => Number(value) === 1 || value === true || value === '1' ? 'Igen' : 'Nem';

    const buildSelectField = (label, key, value, options = [], help = '') => {
      if (!isEditMode) {
        const found = options.find(opt => String(opt.value) === String(value));
        return createParagraph(label + ':', found ? found.label : (value || '-'));
      }

      const wrap = el('div', { style: { margin: '5px 0', display: 'flex', flexDirection: 'column' } });
      const select = el('select', { id: `edit_${key}`, style: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '2px', fontFamily: 'inherit', background: '#fff' } });
      options.forEach(opt => {
        const option = el('option', { value: opt.value, text: opt.label });
        if (String(opt.value) === String(value ?? '')) option.selected = true;
        select.appendChild(option);
      });
      wrap.append(el('label', { for: `edit_${key}`, text: label, style: { fontSize: '0.85em', fontWeight: 'bold', color: '#555' } }), select);
      if (help) wrap.appendChild(el('small', { text: help, style: { color: '#777', marginTop: '3px', lineHeight: '1.35' } }));
      return wrap;
    };

    const buildBoolSelectField = (label, key, value, help = '') => buildSelectField(label, key, Number(value) === 1 || value === true || value === '1' ? '1' : '0', [
      { value: '0', label: 'Nem' },
      { value: '1', label: 'Igen' }
    ], help);

    const buildTextAreaField = (label, key, value) => {
      if (!isEditMode) return createParagraph(label + ':', value || '-');
      const wrap = el('div', { style: { margin: '5px 0', display: 'flex', flexDirection: 'column' } });
      const ta = el('textarea', { id: `edit_${key}`, style: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', marginTop: '2px', fontFamily: 'inherit', minHeight: '78px', resize: 'vertical' } });
      ta.value = value || '';
      wrap.append(el('label', { for: `edit_${key}`, text: label, style: { fontSize: '0.85em', fontWeight: 'bold', color: '#555' } }), ta);
      return wrap;
    };

    const renderModuleChipsReadOnly = () => {
      const wrap = el('div', { style: { margin: '5px 0' } });
      wrap.appendChild(el('p', { style: { margin: '0 0 8px 0' } }, el('strong', { text: 'Választott anyagok (Modulok):' })));
      const chips = el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } });
      const names = String(data.intmod_nevek || data.intmod || '').split(',').map(m => m.trim()).filter(Boolean);
      if (names.length > 0) names.forEach(m => chips.appendChild(el('div', { className: 'chip', text: m })));
      else chips.appendChild(el('span', { text: '-', style: { color: '#999', fontStyle: 'italic', fontSize: '0.85em' } }));
      wrap.appendChild(chips);
      return wrap;
    };

    const renderModuleChipsEditor = () => {
      const wrap = el('div', { style: { margin: '5px 0', display: 'flex', flexDirection: 'column' } });
      wrap.append(el('label', { text: 'Választott anyagok (Modulok)', style: { fontSize: '0.85em', fontWeight: 'bold', color: '#555' } }), el('div', { id: 'module-chips-container', style: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px', minHeight: '40px', padding: '8px', background: '#fff', border: '1px dashed #ffbca8', borderRadius: '6px' } }));
      const addWrap = el('div', { style: { marginTop: '10px', display: 'flex', gap: '10px', flexDirection: 'column' } });
      addWrap.append(el('select', { id: 'new-module-select', style: { padding: '6px', border: '1px solid #ccc', borderRadius: '4px', flexGrow: '1' } }), el('button', { id: 'add-module-btn', type: 'button', text: '+ Hozzáad', style: { padding: '6px 16px', background: '#ff6500', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' } }));
      wrap.append(addWrap, el('input', { type: 'hidden', id: 'edit_intmod', value: data.intmod || '' }));
      return wrap;
    };

    const renderPanel = () => {
      clearNode(diagDiv);
      const maxUser = parseInt(data.intfo, 10) || 0;
      const regUser = parseInt(data.regisztralt_felhasznalok, 10) || 0;
      const limitSzin = (maxUser > 0 && regUser >= maxUser) ? 'color: #e53e3e; font-weight: bold;' : 'color: #38a169; font-weight: bold;';

      const header = el('div', { className: 'gyikcim panel-header', style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } });
      const title = el('span', { className: 'szerkcim' });
    appendText(title, data.intnev || 'Ismeretlen intézmény');
      if (isEditMode) title.appendChild(el('span', { text: ' SZERKESZTÉS', style: { color: '#ff9900' } }));
      header.appendChild(title);

      const body = el('div', { className: 'panel-body' });
      const menu = el('div', { className: 'felsomenu', style: { display: 'flex', gap: '10px', marginBottom: '15px' } });
      if (!isEditMode) menu.append(el('button', { id: 'btn-edit-inst', type: 'button', text: 'Szerkesztés' }), el('button', { id: 'btn-delete-inst', type: 'button', text: 'Intézmény Törlése' }));
      else menu.append(el('button', { id: 'btn-save-inst', type: 'button', text: 'Mentés' }), el('button', { id: 'btn-cancel-edit', type: 'button', text: 'Mégse', style: { background: 'white', color: '#666', border: '1px solid #ccc', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' } }));
      body.appendChild(menu);

      if (isEditMode) body.appendChild(buildField('Intézmény Neve', 'intnev', data.intnev));

      const itdiv = el('div', { className: 'itdiv' });
      const alap = el('div', { style: { background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' } });
      alap.append(el('h5', { text: 'Alapadatok', style: { margin: '0 0 10px 0', color: '#ff6500', borderBottom: '1px solid #ddd', paddingBottom: '5px' } }), buildField('Adószám', 'intado', data.intado), buildField('Kapcsolattartó', 'intkapvez', data.intkapvez), buildField('Kapcsolattartó Email', 'intkapmail', data.intkapmail, 'email'), buildField('Regisztráció dátuma', 'fizetve', formatDatum(data.fizetve), 'date'), buildField('IP cím', 'ip_cim', data.ip_cim), buildField('Böngésző (User Agent)', 'user_agent', data.user_agent));

      const contact = el('div', { style: { background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' } });
      contact.append(el('h5', { text: 'Elérhetőség & Cím', style: { margin: '0 0 10px 0', color: '#ff6500', borderBottom: '1px solid #ddd', paddingBottom: '5px' } }), buildField('Email', 'intmai', data.intmai, 'email'), buildField('Telefon', 'inttel', data.inttel), buildField('Ország', 'intor', data.intor), buildField('Irányítószám', 'intir', data.intir), buildField('Székhely', 'intszek', data.intszek), buildField('Cím', 'intcim', data.intcim));
      itdiv.append(alap, contact);
      body.appendChild(itdiv);

      const license = el('div', { style: { background: '#fff9f5', padding: '15px', borderRadius: '8px', border: '1px solid #ffedde', marginTop: '20px' } });
      license.appendChild(el('h5', { text: 'Licensz Információk', style: { margin: '0 0 10px 0', color: '#ff6500', borderBottom: '1px solid #ffedde', paddingBottom: '5px' } }));
      const packageOptions = [
        { value: 'demo', label: 'Demo – ingyenes kipróbálás' },
        { value: 'start', label: 'Start – kész szakmai anyag' },
        { value: 'pro', label: 'Pro – intézményi használat' },
        { value: 'sajat', label: 'Saját rendszer – feltöltő szerepkörrel' },
        { value: 'fenntartoi', label: 'Fenntartói / egyedi' }
      ];
      const periodOptions = [
        { value: 'demo', label: 'Demo' },
        { value: 'trial', label: 'Próbaidő' },
        { value: 'active', label: 'Aktív licenc' },
        { value: 'expired', label: 'Lejárt' },
        { value: 'suspended', label: 'Felfüggesztett' }
      ];
      const licenseLengthOptions = [
        { value: '', label: 'Nincs beállítva' },
        { value: '3', label: '3 nap – próba / demo' },
        { value: '30', label: '30 nap – havi' },
        { value: '180', label: '180 nap – féléves' },
        { value: '365', label: '365 nap – éves' },
        { value: '730', label: '730 nap – két év' }
      ];
      const normalizedIntfin = data.intfin ? String(parseInt(data.intfin, 10) || '') : '';
      license.append(
        isEditMode ? renderModuleChipsEditor() : renderModuleChipsReadOnly(),
        buildSelectField('Csomag', 'csomag_kod', data.csomag_kod || data.idoszak || 'start', packageOptions, 'Ez határozza meg, milyen szolgáltatáscsomagot vett / próbál az intézmény.'),
        buildSelectField('Licenc állapot', 'idoszak', data.idoszak || 'trial', periodOptions, 'Demo/próba/aktív/lejárt/felfüggesztett állapot. Aktiváláskor általában Aktív licenc.'),
        buildSelectField('Licenc hossza', 'intfin', normalizedIntfin, licenseLengthOptions, 'Nem kell kézzel számolni. Aktiváláskor ez alapján állítható a licenc vége.'),
        buildBoolSelectField('Szerződés visszaérkezett', 'szerzodes_visszaerkezett', data.szerzodes_visszaerkezett, 'Igenre állításkor a rendszer dátumot naplóz.'),
        buildBoolSelectField('Fizetés beérkezett', 'fizetes_beerkezett', data.fizetes_beerkezett, 'Igenre állításkor a rendszer dátumot naplóz.'),
        buildBoolSelectField('Aktív hozzáférés', 'aktiv', data.aktiv, 'Ha aktív, a csomag szerinti funkciók újra használhatók.'),
        buildField('Licenc kezdete', 'licenc_kezdete', formatDatum(data.licenc_kezdete), 'date'),
        buildField('Licenc vége', 'licenc_vege', formatDatum(data.licenc_vege || data.inftin), 'date'),
        buildTextAreaField('Megjegyzés', 'sysadmin_megjegyzes', data.sysadmin_megjegyzes || '')
      );
      const regInfo = el('div', { style: { marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #ffbca8' } });
      regInfo.appendChild(buildField('Max. regisztrálható fiókok', 'intfo', data.intfo, 'number'));
      if (!isEditMode) {
        const p = el('p', { style: { margin: '5px 0' } });
        p.append(el('strong', { text: 'Ebből regisztrált:' }), document.createTextNode(' '), el('span', { text: `${regUser} / ${data.intfo || '-'}`, style: styleTextToObject(limitSzin) }));
        regInfo.appendChild(p);
      }
      license.appendChild(regInfo);
      body.appendChild(license);

      diagDiv.append(header, body);
      bindInstitutionEvents(intId, data, allModules, () => { isEditMode = false; }, () => { isEditMode = true; }, renderPanel, (fresh) => { data = fresh; });
    };

    renderPanel();
  } catch (err) {
    console.error('Intézmény adatok betöltése hiba:', err);
    setMessage(diagDiv, 'error-msg', 'Hiba történt az intézmény adatainak lekérésekor.', { padding: '20px', color: 'red' });
  }
}

function styleTextToObject(styleText) {
  return String(styleText || '').split(';').reduce((acc, decl) => {
    const [rawKey, rawValue] = decl.split(':');
    if (!rawKey || !rawValue) return acc;
    const key = rawKey.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    acc[key] = rawValue.trim();
    return acc;
  }, {});
}


function bindLicenseFieldHelpers() {
  const aktiv = document.getElementById('edit_aktiv');
  const idoszak = document.getElementById('edit_idoszak');
  const intfin = document.getElementById('edit_intfin');
  const kezd = document.getElementById('edit_licenc_kezdete');
  const veg = document.getElementById('edit_licenc_vege');
  const csomag = document.getElementById('edit_csomag_kod');

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const addDaysStr = (start, days) => {
    const d = start ? new Date(start) : new Date();
    if (Number.isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + Number(days || 0));
    return d.toISOString().slice(0, 10);
  };

  const applyDefaults = () => {
    if (csomag && intfin && !intfin.value) {
      if (csomag.value === 'demo') intfin.value = '3';
      if (['start', 'pro', 'sajat'].includes(csomag.value)) intfin.value = '365';
    }

    if (aktiv && aktiv.value === '1') {
      if (idoszak) idoszak.value = 'active';
      if (kezd && !kezd.value) kezd.value = todayStr();
      if (veg && !veg.value && intfin && intfin.value) veg.value = addDaysStr(kezd ? kezd.value : todayStr(), Number(intfin.value));
    }
  };

  [aktiv, idoszak, intfin, kezd, csomag].forEach(node => {
    if (node) node.addEventListener('change', applyDefaults);
  });
}

function bindInstitutionEvents(intId, data, allModules, setReadMode, setEditMode, renderPanel, setData) {
  const editBtn = document.getElementById('btn-edit-inst');
  if (editBtn) editBtn.addEventListener('click', () => { setEditMode(); renderPanel(); });

  const delBtn = document.getElementById('btn-delete-inst');
  if (delBtn) {
    delBtn.addEventListener('click', async () => {
      const confirmMsg = `VIGYÁZAT! Biztosan törölni szeretné a(z) ${data.intnev || 'kijelölt'} intézményt?\n\nFIGYELEM: Ezzel a lépéssel AZ ÖSSZES HOZZÁRENDELT FELHASZNÁLÓ ÉS AZ Ő ÖSSZES ÉRTÉKELÉSÜK VÉGLEGESEN TÖRLŐDIK!\n\nBiztosan folytatja?`;
      if (!confirm(confirmMsg)) return;

      delBtn.textContent = 'Törlés...';
      delBtn.style.pointerEvents = 'none';
      delBtn.style.opacity = '0.6';

      try {
        const res = await fetch('/delete-institution', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: intId })
        });
        const deleteData = await res.json();

        if (deleteData.success) {
          alert('Az intézmény és adatai törölve.');
          resetDiagMessage();
          const intezmenyiTab = document.getElementById('cat-intezmenyi');
          if (intezmenyiTab) intezmenyiTab.click();
        } else {
          alert('Hiba történt: ' + deleteData.message);
          delBtn.textContent = 'Intézmény Törlése';
          delBtn.style.pointerEvents = 'auto';
          delBtn.style.opacity = '1';
        }
      } catch (err) {
        console.error('Törlési hiba:', err);
        alert('Hálózati hiba.');
        delBtn.textContent = 'Intézmény Törlése';
        delBtn.style.pointerEvents = 'auto';
      }
    });
  }

  const cancelBtn = document.getElementById('btn-cancel-edit');
  if (cancelBtn) cancelBtn.addEventListener('click', () => { setReadMode(); renderPanel(); });

  const saveBtn = document.getElementById('btn-save-inst');
  if (saveBtn) {
    initInstitutionModuleChips(allModules);
    bindLicenseFieldHelpers();
    saveBtn.addEventListener('click', async () => {
      saveBtn.textContent = 'Mentés...';
      saveBtn.style.pointerEvents = 'none';
      saveBtn.style.opacity = '0.6';

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
        intmod: document.getElementById('edit_intmod').value,
        idoszak: document.getElementById('edit_idoszak').value,
        intfin: document.getElementById('edit_intfin') ? document.getElementById('edit_intfin').value : '',
        intfo: document.getElementById('edit_intfo').value,
        csomag_kod: document.getElementById('edit_csomag_kod') ? document.getElementById('edit_csomag_kod').value : '',
        szerzodes_visszaerkezett: document.getElementById('edit_szerzodes_visszaerkezett') ? document.getElementById('edit_szerzodes_visszaerkezett').value : 0,
        fizetes_beerkezett: document.getElementById('edit_fizetes_beerkezett') ? document.getElementById('edit_fizetes_beerkezett').value : 0,
        aktiv: document.getElementById('edit_aktiv') ? document.getElementById('edit_aktiv').value : 0,
        licenc_kezdete: document.getElementById('edit_licenc_kezdete') ? document.getElementById('edit_licenc_kezdete').value : '',
        licenc_vege: document.getElementById('edit_licenc_vege') ? document.getElementById('edit_licenc_vege').value : '',
        sysadmin_megjegyzes: document.getElementById('edit_sysadmin_megjegyzes') ? document.getElementById('edit_sysadmin_megjegyzes').value : ''
      };

      try {
        const res = await fetch('/update-institution', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedData)
        });
        const result = await res.json();

        if (result.success) {
          const freshRes = await fetch(`/institution-details?id=${encodeURIComponent(intId)}`);
          const freshResult = await freshRes.json();
          setData(freshResult.success ? freshResult.data : { ...data, ...updatedData });
          setReadMode();
          renderPanel();

          const listBtn = document.querySelector(`.institution-item-btn[data-intid="${CSS.escape(String(intId))}"] .inicim`);
          if (listBtn) listBtn.textContent = freshResult.success ? freshResult.data.intnev : updatedData.intnev;
        } else {
          alert('Hiba: ' + result.message);
          saveBtn.textContent = 'Mentés';
          saveBtn.style.pointerEvents = 'auto';
        }
      } catch (err) {
        console.error('Mentési hiba:', err);
        alert('Hálózati hiba.');
        saveBtn.textContent = 'Mentés';
        saveBtn.style.pointerEvents = 'auto';
      }
    });
  }
}

function initInstitutionModuleChips(allModules) {
  const chipContainer = document.getElementById('module-chips-container');
  const hiddenModInput = document.getElementById('edit_intmod');
  const modSelect = document.getElementById('new-module-select');
  const addModBtn = document.getElementById('add-module-btn');
  if (!chipContainer || !hiddenModInput || !modSelect || !addModBtn) return;

  const renderChips = () => {
    let currentIds = hiddenModInput.value.split(',').map(id => id.trim()).filter(Boolean);
    clearNode(chipContainer);

    if (currentIds.length === 0) {
      chipContainer.appendChild(el('span', { text: 'Nincs modul hozzárendelve. Válasszon a lenti listából!', style: { color: '#aaa', fontStyle: 'italic', fontSize: '0.85em', display: 'flex', alignItems: 'center' } }));
    } else {
      currentIds.forEach(id => {
        const mod = allModules.find(m => m.id == id);
        const name = mod ? mod.leiras : `Ismeretlen modul (${id})`;
        const chip = el('div', { className: 'chip' });
        chip.append(el('span', { text: name }), el('span', { className: 'remove-mod-btn', text: '×', dataset: { id } }));
        chipContainer.appendChild(chip);
      });

      chipContainer.querySelectorAll('.remove-mod-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const idToRemove = this.getAttribute('data-id');
          currentIds = currentIds.filter(id => id !== idToRemove);
          hiddenModInput.value = currentIds.join(',');
          renderChips();
        });
      });
    }

    clearNode(modSelect);
    modSelect.appendChild(el('option', { value: '', text: 'Válasszon új modult a listából...', disabled: true }));
    modSelect.firstElementChild.selected = true;
    allModules.forEach(mod => {
      if (!currentIds.includes(String(mod.id))) modSelect.appendChild(el('option', { value: mod.id, text: mod.leiras }));
    });
  };

  renderChips();
  addModBtn.addEventListener('click', () => {
    const newId = modSelect.value;
    if (!newId) return;
    let currentIds = hiddenModInput.value.split(',').map(id => id.trim()).filter(Boolean);
    if (!currentIds.includes(newId)) {
      currentIds.push(newId);
      hiddenModInput.value = currentIds.join(',');
      renderChips();
    }
  });
}
