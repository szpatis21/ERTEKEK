// Audit lista és audit üzenőfal kezelése XSS-biztos DOM-építéssel.
// Szabály: adatból érkező szöveg nem kerül innerHTML-be.

function clearElement(el) {
    if (el) el.replaceChildren();
}

function setStyles(el, styles) {
    Object.assign(el.style, styles);
    return el;
}

function createMaterialIcon(text, className = '') {
    const span = document.createElement('span');
    span.className = className ? `material-symbols-rounded ${className}` : 'material-symbols-rounded';
    span.textContent = text;
    return span;
}

function createOutlinedIcon(text, className = '') {
    const span = document.createElement('span');
    span.className = className ? `material-symbols-outlined ${className}` : 'material-symbols-outlined';
    span.textContent = text;
    return span;
}

function appendTextWithLineBreaks(parent, value) {
    const normalized = String(value ?? '').replace(/-/g, ' - \n');
    normalized.split('\n').forEach((line, index) => {
        if (index > 0) parent.appendChild(document.createElement('br'));
        parent.appendChild(document.createTextNode(line));
    });
}

function appendInfoMessage(parent, text, { color = 'gray', padding = '20px' } = {}) {
    if (!parent) return;
    const p = document.createElement('p');
    p.style.textAlign = 'center';
    p.style.color = color;
    p.style.padding = padding;
    p.textContent = text;
    parent.replaceChildren(p);
}

function appendSelectedTitle(titleEl, name = 'Kiválasztott', suffix = '') {
    if (!titleEl) return;

    const span = document.createElement('span');
    span.className = 'ertnev';
    span.textContent = name;

    titleEl.replaceChildren(span, document.createTextNode(suffix));
}

function resetAuditTitles(h3Titles) {
    if (!h3Titles || h3Titles.length < 2) return;

    h3Titles[0].style.display = '';
    appendSelectedTitle(h3Titles[0], 'Kiválasztott', ' értékeléséhez tartozó határidő');
    appendSelectedTitle(h3Titles[1], 'Kiválasztott', ' értékeléséhez tartozó üzenetek');
}

function setGroupTitle(titleEl, text, count) {
    if (!titleEl) return;

    const countSpan = document.createElement('span');
    countSpan.style.fontSize = '0.7em';
    countSpan.style.color = '#ffbd16';
    countSpan.textContent = `(${count} db)`;

    titleEl.replaceChildren(
        document.createTextNode(`${text} `),
        countSpan
    );
}

function createLocalSorter() {
    const helyiRendezo = document.createElement('div');
    helyiRendezo.classList.add('helyi-endezo');

    const inner = document.createElement('div');
    inner.className = 'nagyonhelyi';

    const icon = createMaterialIcon('sort', 'sort-icon');

    const select = document.createElement('select');
    select.className = 'helyi-szuro';

    [
        { value: 'alap', label: 'Csoportosítás...', disabled: true, selected: true, hidden: true },
        { value: 'hatarido', label: 'Határidő szerint' },
        { value: 'nev', label: 'Név szerint' },
        { value: 'periodus', label: 'Dátum szerint' },
        { value: 'megnev', label: 'Típus szerint' }
    ].forEach(optData => {
        const option = document.createElement('option');
        option.value = optData.value;
        option.textContent = optData.label;
        if (optData.disabled) option.disabled = true;
        if (optData.selected) option.selected = true;
        if (optData.hidden) option.hidden = true;
        select.appendChild(option);
    });

    inner.append(icon, select);
    helyiRendezo.appendChild(inner);

    select.addEventListener('change', (e) => {
        const szempont = e.target.value;
        const szuloLista = e.target.closest('.creator-list');
        if (!szuloLista) return;

        const tartElemek = Array.from(szuloLista.querySelectorAll('.tart'));
        szuloLista.querySelectorAll('.helyi-csoport').forEach(cs => cs.remove());

        const csoportok = {};
        tartElemek.forEach(tart => {
            const div = tart.querySelector('.meglevok');
            const ertek = (div && div.dataset[szempont]) ? div.dataset[szempont] : 'Ismeretlen';

            if (!csoportok[ertek]) csoportok[ertek] = [];
            csoportok[ertek].push(tart);
        });

        const rendezettKulcsok = Object.keys(csoportok).sort((a, b) => a.localeCompare(b, 'hu'));

        rendezettKulcsok.forEach(kulcs => {
            const csoportDiv = document.createElement('div');
            csoportDiv.classList.add('helyi-csoport');
            csoportDiv.style.marginTop = '15px';
            csoportDiv.style.borderLeft = '3px solid rgba(255, 101, 0, 0.5)';
            csoportDiv.style.paddingLeft = '15px';

            const fejlec = document.createElement('div');
            fejlec.classList.add('helyi-fejlec');
            fejlec.textContent = kulcs;

            const elemekTaroloja = document.createElement('div');
            elemekTaroloja.classList.add('helyi-elemek');

            csoportok[kulcs].forEach(tart => {
                elemekTaroloja.appendChild(tart);
            });

            csoportDiv.append(fejlec, elemekTaroloja);
            szuloLista.appendChild(csoportDiv);
        });
    });

    return helyiRendezo;
}

function createAuditCardText(kitoltesDiv, decryptedName, kitoltesNeve) {
    const nameBox = document.createElement('div');
    nameBox.className = 'vizsgalt-nev';

    const strong = document.createElement('strong');
    strong.textContent = decryptedName;

    nameBox.appendChild(strong);
    kitoltesDiv.appendChild(nameBox);

    appendTextWithLineBreaks(kitoltesDiv, kitoltesNeve || '');
}

function appendDeadlineMarker(kitoltesDiv, hatarido) {
    const hDatum = new Date(hatarido);
    const formatDatum = hDatum.toLocaleDateString('hu-HU', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const auditHataridoDiv = document.createElement('div');
    auditHataridoDiv.className = 'audit-hatarido-jelzo';
    auditHataridoDiv.style.display = 'flex';
    auditHataridoDiv.style.alignItems = 'center';
    auditHataridoDiv.style.color = '#000000';
    auditHataridoDiv.style.fontSize = '0.85em';

    const iconSpan = createOutlinedIcon('calendar_clock');
    iconSpan.style.fontSize = '1.2em';
    iconSpan.style.marginRight = '5px';

    auditHataridoDiv.append(
        iconSpan,
        document.createTextNode(`Határidő: ${formatDatum}`)
    );

    kitoltesDiv.appendChild(auditHataridoDiv);
}

function appendAuditMessage(parent, { sender_type, timestamp, text }, auditorNev, userNev) {
    const isAudit = sender_type === 'audit';
    const wrapper = document.createElement('div');
    wrapper.className = isAudit ? 'uzenet2' : 'uzenet1';

    const idoHover = timestamp ? new Date(timestamp).toLocaleString('hu-HU') : '';
    wrapper.title = idoHover;
    wrapper.dataset.ido = timestamp || '';

    const nameDiv = document.createElement('div');
    nameDiv.className = isAudit ? 'nev1' : 'nev2';
    nameDiv.textContent = isAudit ? auditorNev : userNev;

    const msgDiv = document.createElement('div');
    msgDiv.className = isAudit ? 'audit-messages1' : 'audit-messages2';
    msgDiv.textContent = text || '';

    wrapper.append(nameDiv, msgDiv);
    parent.appendChild(wrapper);
}

function getParsedMessages(rawMessages) {
    if (!rawMessages) return [];

    try {
        const parsed = typeof rawMessages === 'string'
            ? JSON.parse(rawMessages)
            : rawMessages;

        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.warn('Audit üzenetek JSON feldolgozási hiba:', err);
        return [];
    }
}

function createSelectedList(checkedBoxes) {
    const ul = document.createElement('ul');
    ul.style.textAlign = 'left';
    ul.style.fontSize = '0.9em';
    ul.style.background = '#f8f9fa';
    ul.style.padding = '15px 15px 15px 35px';
    ul.style.borderRadius = '8px';
    ul.style.marginTop = '15px';
    ul.style.border = '1px solid #ddd';
    ul.style.maxHeight = '250px';
    ul.style.overflowY = 'auto';

    checkedBoxes.forEach(cb => {
        const kartya = cb.closest('.meglevok');
        const nev = kartya ? (kartya.dataset.nev || 'Ismeretlen') : 'Ismeretlen';
        const periodus = kartya ? (kartya.dataset.periodus || '') : '';
        const tipus = kartya ? (kartya.dataset.megnev || '') : '';

        const li = document.createElement('li');
        li.style.marginBottom = '6px';
        li.style.color = '#333';

        const strong = document.createElement('strong');
        strong.textContent = nev;

        const meta = document.createElement('span');
        meta.style.color = 'gray';
        meta.textContent = `(${periodus} - ${tipus})`;

        li.append(strong, document.createTextNode(' '), meta);
        ul.appendChild(li);
    });

    return ul;
}

function renderBulkSelectionInfo(messengerDiv, checkedBoxes, isApprovedList) {
    if (!messengerDiv) return;

    const db = checkedBoxes.length;

    const box = document.createElement('div');
    box.style.textAlign = 'center';
    box.style.padding = '10px';
    box.style.color = '#555';

    const icon = createMaterialIcon('checklist');
    icon.style.fontSize = '3em';
    icon.style.color = '#ffbd16';

    const h4 = document.createElement('h4');
    h4.style.margin = '10px 0';
    h4.textContent = `${db} értékelés kijelölve`;

    const p = document.createElement('p');
    p.style.fontSize = '0.9em';
    p.style.marginBottom = '10px';

    if (isApprovedList) {
        p.textContent = 'Az alábbi értékelések státuszát csoportosan visszanyithatja:';
    } else {
        p.append(
            document.createTextNode('Az itt beállított határidő, üzenet és jóváhagyási állapot '),
            (() => {
                const b = document.createElement('b');
                b.textContent = 'minden';
                return b;
            })(),
            document.createTextNode(' alábbi értékelésre érvényes lesz:')
        );
    }

    box.append(icon, h4, p, createSelectedList(checkedBoxes));
    messengerDiv.replaceChildren(box);
}

export function initAuditLista(kitoltesek) {
    const okContainer = document.querySelector('.inner-div-ok');
    const notOkContainer = document.querySelector('.inner-div-notok');
    const hataridoContainer = document.querySelector('.inner-div-hatarido');

    if (!okContainer || !notOkContainer || !hataridoContainer) return;

    okContainer.replaceChildren();
    notOkContainer.replaceChildren();
    hataridoContainer.replaceChildren();

    const isUserSide = window.location.pathname.includes('/user/');

    let megjelenitendo = kitoltesek;
    if (isUserSide) {
        megjelenitendo = kitoltesek.filter(k =>
            k.creator_name === window.userName ||
            k.felhasznalo_nev === window.userName ||
            k.fnev === window.userName
        );
    }

    const approvedItems = megjelenitendo.filter(k => k.audit == 2);

    const pendingItems = megjelenitendo.filter(k => {
        if (k.audit != 1) return false;
        const hasMessage = k.warm && String(k.warm).trim() !== '' && String(k.warm) !== 'null';
        const hasNothing = !hasMessage && !k.hatarido;
        return hasMessage || hasNothing;
    });

    const deadlineItems = megjelenitendo.filter(k => k.audit == 1 && k.hatarido);

    function renderGroupedList(items, container) {
        if (items.length === 0) {
            appendInfoMessage(container, 'Nincs megjeleníthető értékelés.', {
                color: 'gray',
                padding: '10px'
            });
            const p = container.querySelector('p');
            if (p) {
                p.style.fontSize = 'small';
                p.style.marginTop = '10px';
            }
            return;
        }

        items.sort((a, b) => (a.creator_name || '').localeCompare(b.creator_name || ''));

        const isUserSide = window.location.pathname.includes('/user/');
        let currentWrapper = null;
        let currentList = null;
        let lastCreatorName = null;

        if (isUserSide) {
            currentList = document.createElement('div');
            currentList.classList.add('creator-list');
            currentList.style.display = 'flex';
            currentList.style.flexDirection = 'column';
            currentList.appendChild(createLocalSorter());
            container.appendChild(currentList);
        }

        items.forEach(kitoltes => {
            if (!isUserSide && kitoltes.creator_name !== lastCreatorName) {
                currentWrapper = document.createElement('div');
                currentWrapper.classList.add('creator-wrapper');

                const csoport = document.createElement('div');
                csoport.classList.add('tarolo');

                const header = document.createElement('div');
                header.classList.add('creator-head');
                header.style.cursor = 'pointer';
                header.style.userSelect = 'none';
                header.style.display = 'flex';
                header.style.justifyContent = 'flex-start';
                header.style.alignItems = 'center';

                const creatorSpan = document.createElement('span');
                creatorSpan.textContent = kitoltes.creator_name || 'Felhasználó';
                header.appendChild(creatorSpan);

                const toggle = document.createElement('div');
                const toggleIcon = createMaterialIcon('expand_more', 'toggle-icon');
                toggleIcon.style.transition = 'transform 0.3s';
                toggleIcon.style.color = 'orangered';
                toggle.appendChild(toggleIcon);
                header.appendChild(toggle);

                const helyicsop = document.createElement('button');
                helyicsop.classList.add('helyicsopgomb');
                helyicsop.textContent = 'Csoport kijelölése';
                header.appendChild(helyicsop);

                header.addEventListener('click', () => {
                    const myTargetList = header.nextElementSibling;
                    const icon = header.querySelector('.toggle-icon');
                    if (!myTargetList) return;

                    if (myTargetList.style.display === 'none') {
                        myTargetList.style.display = 'flex';
                        header.style.height = '45px';
                        helyicsop.style.height = '5vh';

                        if (icon) icon.style.transform = 'rotate(180deg)';
                    } else {
                        myTargetList.style.display = 'none';
                        header.style.height = '8vh';
                        helyicsop.style.height = '8vh';

                        if (icon) icon.style.transform = 'rotate(0deg)';
                    }
                });

                helyicsop.addEventListener('click', (e) => {
                    e.stopPropagation();

                    const myTargetList = header.nextElementSibling;
                    if (!myTargetList) return;

                    const checkboxes = myTargetList.querySelectorAll('.audit-cheking');
                    if (checkboxes.length === 0) return;

                    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
                    checkboxes.forEach(cb => {
                        cb.checked = !allChecked;
                    });

                    helyicsop.textContent = allChecked ? 'Csoport kijelölése' : 'Kijelölés törlése';
                    handleAuditBulkSelection();
                });

                currentList = document.createElement('div');
                currentList.classList.add('creator-list');
                currentList.style.display = 'none';
                currentList.appendChild(createLocalSorter());

                currentWrapper.append(header, currentList);
                csoport.append(currentWrapper);
                container.appendChild(csoport);

                lastCreatorName = kitoltes.creator_name;
            }

            const tartaly = document.createElement('div');
            tartaly.classList.add('tart');

            const kitoltesDiv = document.createElement('div');
            kitoltesDiv.classList.add('meglevok');
            kitoltesDiv.style.cursor = 'pointer';

            kitoltesDiv.dataset.kitoltesId = kitoltes.idk;
            kitoltesDiv.dataset.auditId = kitoltes.audit;

            const [periodus, megnev] = (kitoltes.kitoltes_neve || '')
                .split('-')
                .map(s => s.replace(/~/g, '-').trim());

            kitoltesDiv.dataset.nev = kitoltes.vizsgalt_nev || 'Ismeretlen Értékelés';
            kitoltesDiv.dataset.periodus = periodus || 'Egyéb';
            kitoltesDiv.dataset.megnev = megnev || 'Egyéb';
            kitoltesDiv.dataset.mail = kitoltes.creator_mail || '';
            kitoltesDiv.dataset.fnev = kitoltes.creator_name || 'Felhasználó';

            if (kitoltes.hatarido) {
                const hDatum = new Date(kitoltes.hatarido);
                kitoltesDiv.dataset.hatarido = hDatum.toLocaleDateString('hu-HU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } else {
                kitoltesDiv.dataset.hatarido = 'Nincs határidő';
            }

            const decryptedName = kitoltes.vizsgalt_nev || 'Ismeretlen Értékelés';
            createAuditCardText(kitoltesDiv, decryptedName, kitoltes.kitoltes_neve || '');

            if (kitoltes.hatarido) {
                kitoltesDiv.classList.add('hatarido');
                appendDeadlineMarker(kitoltesDiv, kitoltes.hatarido);
            }

            if (!isUserSide) {
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.classList.add('audit-cheking');
                checkbox.dataset.id = kitoltes.idk;
                checkbox.dataset.audit = kitoltes.audit;

                checkbox.addEventListener('click', (e) => e.stopPropagation());
                checkbox.addEventListener('change', handleAuditBulkSelection);

                kitoltesDiv.appendChild(checkbox);
            }

            kitoltesDiv.addEventListener('click', async () => {
                const lapok = document.querySelector('#lapok');
                if (lapok) lapok.scrollIntoView({ behavior: 'smooth', block: 'center' });

                document.querySelectorAll('.audit-cheking').forEach(cb => {
                    cb.checked = false;
                });

                const h3Titles = document.querySelectorAll('.messageouter h3');
                resetAuditTitles(h3Titles);

                document
                    .querySelectorAll('.inner-div-ok .meglevok.kijelolt, .inner-div-notok .meglevok.kijelolt, .inner-div-hatarido .meglevok.kijelolt')
                    .forEach(el => el.classList.remove('kijelolt'));

                kitoltesDiv.classList.add('kijelolt');

                const calendarTitle = document.getElementById('audit-chat-title');
                const calendarBtnArea = document.querySelector('.calendardiv');
                const msgInputArea = document.getElementById('audit-msg-input')
                    ? document.getElementById('audit-msg-input').closest('.audit-input-area')
                    : null;
                const approveBtn = document.getElementById('audit-approve-btn');

                if (kitoltes.audit == 2) {
                    if (calendarTitle) calendarTitle.style.display = 'none';
                    if (calendarBtnArea) calendarBtnArea.style.display = 'none';
                    if (msgInputArea) msgInputArea.style.display = 'none';
                    if (approveBtn) approveBtn.textContent = 'Értékelés visszanyitása';
                } else {
                    if (calendarTitle) calendarTitle.style.display = '';
                    if (calendarBtnArea) calendarBtnArea.style.display = '';
                    if (msgInputArea) msgInputArea.style.display = '';
                    if (approveBtn) approveBtn.textContent = 'Értékelés Jóváhagyása';
                }

                document.querySelectorAll('.ertnev').forEach(span => {
                    span.textContent = decryptedName;
                });

                const messengerDiv = document.querySelector('.messengerdiv');
                if (!messengerDiv) return;

                appendInfoMessage(messengerDiv, 'Üzenetek betöltése...', {
                    color: '',
                    padding: '20px'
                });

                try {
                    const response = await fetch(`/api/get-audit-messages?kitoltes_id=${encodeURIComponent(kitoltes.idk)}`);
                    const data = await response.json();

                    if (data.success) {
                        const hataridoSpan = document.getElementById('akthat');
                        const calendarBtn = document.getElementById('audit-calendar');

                        if (hataridoSpan) {
                            if (data.hatarido) {
                                const hDatum = new Date(data.hatarido);
                                hataridoSpan.textContent = hDatum.toLocaleDateString('hu-HU', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                });
                            } else {
                                hataridoSpan.textContent = 'Nincs megadva';
                            }

                            if (calendarBtn) calendarBtn.textContent = 'Új határidő';
                        }

                        const auditorNev = data.auditor_name || 'Elemző';
                        const userNev = data.user_name || 'Értékelés szerzője';
                        const msgs = getParsedMessages(data.uzenetek);

                        if (msgs.length > 0) {
                            messengerDiv.replaceChildren();

                            msgs.forEach(msg => {
                                appendAuditMessage(messengerDiv, msg, auditorNev, userNev);
                            });

                            messengerDiv.scrollTop = messengerDiv.scrollHeight;
                        } else {
                            appendInfoMessage(
                                messengerDiv,
                                'Még nem küldött javaslatot az adott értékeléshez. Írja le meglátásait, majd nyomja meg a küldés gombot. A felhasználót e-mailben is értesítjük a küldött üzenetről.'
                            );
                        }
                    } else {
                        appendInfoMessage(
                            messengerDiv,
                            'Még nem küldött javaslatot az adott értékeléshez. Írja le meglátásait, majd nyomja meg a küldés gombot. A felhasználót e-mailben is értesítjük a küldött üzenetről.'
                        );
                    }
                } catch (error) {
                    console.error('Hiba a chat betöltésekor:', error);
                    appendInfoMessage(messengerDiv, 'Hiba történt az üzenetek betöltésekor.', {
                        color: 'red'
                    });
                }
            });

            tartaly.appendChild(kitoltesDiv);
            if (currentList) currentList.appendChild(tartaly);
        });
    }

    renderGroupedList(approvedItems, okContainer);
    renderGroupedList(deadlineItems, hataridoContainer);
    renderGroupedList(pendingItems, notOkContainer);
}

// --- CSOPORTOS MŰVELETEK VEZÉRLŐJE ---
export function handleAuditBulkSelection() {
    const checkedBoxes = Array.from(document.querySelectorAll('.audit-cheking:checked'));
    const db = checkedBoxes.length;

    const h3Titles = document.querySelectorAll('.messageouter h3');
    const messengerDiv = document.querySelector('.messengerdiv');
    const approveBtn = document.getElementById('audit-approve-btn');
    const msgInputArea = document.getElementById('audit-msg-input')
        ? document.getElementById('audit-msg-input').closest('.audit-input-area')
        : null;
    const calendarBtnArea = document.querySelector('.calendardiv');

    if (db > 0) {
        const approvedCount = checkedBoxes.filter(cb => cb.dataset.audit == 2).length;
        const isApprovedList = approvedCount > 0 && approvedCount === db;

        if (h3Titles.length >= 2) {
            if (isApprovedList) {
                h3Titles[0].style.display = 'none';
                setGroupTitle(h3Titles[1], 'Csoportos kijelölés', db);
            } else {
                h3Titles[0].style.display = '';
                setGroupTitle(h3Titles[0], 'Csoportos leadási határidő', db);
                setGroupTitle(h3Titles[1], 'Csoportos üzenet írása', db);
            }
        }

        renderBulkSelectionInfo(messengerDiv, checkedBoxes, isApprovedList);

        if (msgInputArea) msgInputArea.style.display = isApprovedList ? 'none' : '';
        if (calendarBtnArea) calendarBtnArea.style.display = isApprovedList ? 'none' : '';

        if (approveBtn) {
            approveBtn.textContent = isApprovedList
                ? `Felsorolt értékelések visszanyitása (${db})`
                : `Felsorolt értékelések Jóváhagyása (${db})`;
        }

        return;
    }

    resetAuditTitles(h3Titles);

    if (messengerDiv) {
        appendInfoMessage(messengerDiv, 'Válasszon ki egy értékelést...');
    }

    if (calendarBtnArea) calendarBtnArea.style.display = '';
    if (msgInputArea) msgInputArea.style.display = '';

    if (approveBtn) approveBtn.textContent = 'Értékelés Jóváhagyása';
}
