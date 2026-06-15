// Központi alert / confirm / prompt modalok XSS-biztos DOM-építéssel.
// Fontos: ebben a fájlban nincs innerHTML és nincs insertAdjacentHTML.

const modalRoot = document.body || document.documentElement;

function createEl(tagName, options = {}) {
    const el = document.createElement(tagName);

    if (options.id) el.id = options.id;
    if (options.className) el.className = options.className;
    if (options.text !== undefined) el.textContent = options.text;
    if (options.type) el.type = options.type;
    if (options.value !== undefined) el.value = options.value;
    if (options.placeholder) el.placeholder = options.placeholder;
    if (options.disabled !== undefined) el.disabled = !!options.disabled;
    if (options.htmlFor) el.htmlFor = options.htmlFor;
    if (options.title) el.title = options.title;

    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                el.setAttribute(key, String(value));
            }
        });
    }

    if (options.style) {
        Object.assign(el.style, options.style);
    }

    if (Array.isArray(options.children)) {
        el.append(...options.children.filter(Boolean));
    }

    return el;
}

function appendTextWithBreaks(parent, text) {
    String(text || '').split('\n').forEach((line, index) => {
        if (index > 0) parent.appendChild(document.createElement('br'));
        parent.appendChild(document.createTextNode(line));
    });
}

function createActionButton(id, text, extraStyle = {}) {
    return createEl('button', {
        id,
        text,
        style: {
            padding: '8px 15px',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold',
            ...extraStyle
        }
    });
}

function setOverlayBaseStyle(overlay) {
    Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '10000',
        opacity: '0',
        transition: 'opacity 0.3s'
    });
}

function setBoxBaseStyle(box, overrides = {}) {
    Object.assign(box.style, {
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        textAlign: 'center',
        minWidth: '350px',
        transform: 'scale(0.8)',
        transition: 'transform 0.3s',
        fontFamily: "'Montserrat', sans-serif",
        ...overrides
    });
}

function animateOpen(overlay, box) {
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        box.style.transform = 'scale(1)';
    });
}

function closeAnimated(overlay, box, resolve, result) {
    overlay.style.opacity = '0';
    box.style.transform = 'scale(0.8)';

    setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resolve(result);
    }, 300);
}

function createModalShell(boxStyle = {}) {
    const overlay = document.createElement('div');
    setOverlayBaseStyle(overlay);

    const box = document.createElement('div');
    setBoxBaseStyle(box, boxStyle);

    overlay.appendChild(box);
    modalRoot.appendChild(overlay);
    animateOpen(overlay, box);

    return { overlay, box };
}

function createField({ id, label, type = 'text', value = '', placeholder = '' }) {
    const wrap = createEl('div', {
        style: {
            textAlign: 'left',
            marginBottom: '15px'
        }
    });

    const labelEl = createEl('label', {
        htmlFor: id,
        text: label,
        style: {
            display: 'block',
            fontSize: '0.8em',
            color: '#666',
            marginBottom: '5px'
        }
    });

    const input = createEl('input', {
        id,
        type,
        value: value || '',
        placeholder,
        style: {
            width: '100%',
            padding: '8px',
            border: '1px solid #ddd',
            borderRadius: '6px',
            boxSizing: 'border-box',
            fontFamily: 'inherit'
        }
    });

    wrap.append(labelEl, input);
    return { wrap, input };
}

function createButtonRow(cancelText, okText) {
    const row = createEl('div', {
        style: {
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px'
        }
    });

    const cancel = createActionButton('btn-megsem', cancelText, {
        background: '#eee',
        color: '#333'
    });

    const ok = createActionButton('btn-ok', okText, {
        background: '#ff6500',
        color: 'white'
    });

    row.append(cancel, ok);
    return { row, cancel, ok };
}

const allowedHtmlTags = new Set([
    'b', 'strong', 'i', 'em', 'u', 'br', 'p', 'ul', 'ol', 'li', 'span', 'div', 'small'
]);

const allowedStyleProps = new Set([
    'color',
    'background',
    'background-color',
    'font-size',
    'font-weight',
    'font-style',
    'text-align',
    'margin',
    'margin-top',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'padding',
    'padding-top',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'border',
    'border-top',
    'border-bottom',
    'border-left',
    'border-right',
    'border-radius',
    'display',
    'max-height',
    'overflow-y'
]);

function isSafeStyleValue(value) {
    const v = String(value || '').toLowerCase();
    return !v.includes('url(')
        && !v.includes('expression')
        && !v.includes('javascript:')
        && !v.includes('behavior')
        && !v.includes('-moz-binding')
        && !v.includes('@import')
        && !v.includes('<')
        && !v.includes('>');
}

function sanitizeStyle(styleText) {
    const probe = document.createElement('span');
    probe.setAttribute('style', styleText || '');

    const clean = {};
    for (let i = 0; i < probe.style.length; i += 1) {
        const prop = probe.style[i];
        const value = probe.style.getPropertyValue(prop);

        if (allowedStyleProps.has(prop) && isSafeStyleValue(value)) {
            clean[prop] = value;
        }
    }

    return clean;
}

function sanitizeHtmlNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
        return document.createTextNode(node.textContent || '');
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return document.createDocumentFragment();
    }

    const tag = node.tagName.toLowerCase();

    if (!allowedHtmlTags.has(tag)) {
        const fragment = document.createDocumentFragment();
        Array.from(node.childNodes).forEach(child => {
            fragment.appendChild(sanitizeHtmlNode(child));
        });
        return fragment;
    }

    const clean = document.createElement(tag);

    const classValue = node.getAttribute('class');
    if (classValue && /^[a-zA-Z0-9_\-\s]+$/.test(classValue)) {
        clean.className = classValue;
    }

    const titleValue = node.getAttribute('title');
    if (titleValue) {
        clean.title = titleValue;
    }

    const styleValue = node.getAttribute('style');
    if (styleValue) {
        Object.assign(clean.style, sanitizeStyle(styleValue));
    }

    Array.from(node.childNodes).forEach(child => {
        clean.appendChild(sanitizeHtmlNode(child));
    });

    return clean;
}

function appendSanitizedHtml(parent, html) {
    const doc = new DOMParser().parseFromString(`<body>${String(html ?? '')}</body>`, 'text/html');
    Array.from(doc.body.childNodes).forEach(child => {
        parent.appendChild(sanitizeHtmlNode(child));
    });
}

function setConfirmTitleWithName(parent, prefix, value) {
    parent.replaceChildren();
    parent.appendChild(document.createTextNode(prefix));

    const strong = document.createElement('strong');
    strong.textContent = value || '';
    parent.appendChild(strong);
}

// --- KÖZÖS OVERLAY + ALERT MODAL ---
const modalOverlay = createEl('div', { id: 'modalOverlay' });
modalRoot.appendChild(modalOverlay);

const alertModal = createEl('div', {
    id: 'alertModal',
    className: 'modal'
});

const alertContent = createEl('div', { className: 'modal-content' });
const alertText = createEl('p', { id: 'alertText' });
const alertOk = createEl('button', { id: 'alertOk', text: 'OK' });
alertContent.append(alertText, alertOk);
alertModal.appendChild(alertContent);
modalRoot.appendChild(alertModal);

// --- MISSING AUDIT MODAL ---
const missingModal = createEl('div', {
    id: 'missingModal',
    className: 'modal'
});

const outerDiv = createEl('div', { className: 'outer-div' });
const missingContent = createEl('div', { className: 'modal-content inner-div' });
const missingTitle = createEl('h3', {
    text: 'Az alábbi személyekhez még nincs rögzített hozzájárulási nyilatkozat!'
});

const missingText = document.createElement('p');
appendTextWithBreaks(
    missingText,
    'Jelezze a megfelelő dokumentáció meglétét az érintett személyek neve melletti pipával.\nAmennyiben nem rendelkezik megfelelő dokumentációval, illetve nem biztos ennek tényében, úgy gondoskodjon az ellenőrzésről és a mihamarabbi beszerzésről! Amíg ez nem történt meg, addig az érintettekkel kapcsolatos értékeléseket blokkoljuk, majd 30 nap elteltével töröljük a hozzájuk kapcsolódó adatokat!'
);

const missingFlex = createEl('div', {
    style: {
        display: 'flex',
        flexDirection: 'column',
        width: '50%',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center'
    }
});

const missingListEl = createEl('div', {
    id: 'missingList',
    className: 'missing-list'
});

const missingActionColumn = createEl('div', {
    style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
    }
});

const missingLabel = createEl('label', {
    htmlFor: 'missingConfirm',
    text: 'Nyilatkozom a kiválasztott személyek hozzájáruló nyilatkozatának meglétéről',
    style: {
        margin: '5px',
        fontSize: 'small',
        width:'100%'
    }
});

const missingConfirm = createEl('button', {
    id: 'missingConfirm',
    type: 'button',
    text: 'Meglévők elfogadása',
    disabled: true
});

missingActionColumn.append(missingLabel, missingConfirm);
missingFlex.append(missingListEl, missingActionColumn);
missingContent.append(missingTitle, missingText, missingFlex);
outerDiv.appendChild(missingContent);
missingModal.appendChild(outerDiv);
modalRoot.appendChild(missingModal);

function closeModal() {
    document.querySelectorAll('.modal.open').forEach(modal => modal.classList.remove('open'));
    modalOverlay.classList.remove('open');
}

modalOverlay.addEventListener('click', closeModal);
alertOk.addEventListener('click', closeModal);

export function showAlert(message) {
    alertText.textContent = message ?? '';
    modalOverlay.classList.add('open');
    alertModal.classList.add('open');
}

let onConfirm;

missingConfirm.addEventListener('click', (event) => {
    event.preventDefault();
    closeModal();

    if (typeof onConfirm === 'function') {
        onConfirm();
    }
});

export function showMissingChecklist(items) {
    missingListEl.replaceChildren();

    (items || []).forEach(item => {
        const div = createEl('div', { className: 'missing-item' });

        const chk = createEl('input', { type: 'checkbox' });
        chk.value = item?.vizsgalt_id ?? '';

        const label = createEl('label', { text: item?.vizsgalt_nev ?? '' });

        div.append(chk, label);
        missingListEl.appendChild(div);

        chk.addEventListener('change', updateConfirmState);
    });

    missingConfirm.disabled = true;

    modalOverlay.classList.add('open');
    missingModal.classList.add('open');

    return new Promise(resolve => {
        onConfirm = () => resolve(
            Array.from(missingListEl.querySelectorAll('input:checked')).map(cb => cb.value)
        );
    });
}

function updateConfirmState() {
    const total = missingListEl.querySelectorAll('input').length;
    const checked = missingListEl.querySelectorAll('input:checked').length;

    missingConfirm.disabled = total === 0 || checked !== total;
}

// Formázott megerősítő ablak.
// A kapott szövegben csak szűkített, sanitizált HTML engedélyezett: b/strong/i/em/u/br/p/ul/ol/li/span/div/small.
// Eseményattribútum, script, iframe, link, kép és veszélyes CSS nem kerülhet be a DOM-ba.
export function customConfirm(uzenet) {
    return new Promise((resolve) => {
        const { overlay, box } = createModalShell({
            padding: '20px',
            borderRadius: '10px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
            minWidth: '300px'
        });

        const messageBox = createEl('div', {
            style: {
                marginBottom: '20px',
                fontSize: '1.1em',
                color: '#333'
            }
        });
        appendSanitizedHtml(messageBox, uzenet);

        const row = createEl('div', {
            style: {
                display: 'flex',
                justifyContent: 'center',
                gap: '15px'
            }
        });

        const cancel = createEl('button', { id: 'btn-nem', text: 'Mégsem' });
        const ok = createEl('button', { id: 'btn-igen', text: 'Igen' });
        row.append(cancel, ok);

        box.append(messageBox, row);

        ok.addEventListener('click', () => closeAnimated(overlay, box, resolve, true));
        cancel.addEventListener('click', () => closeAnimated(overlay, box, resolve, false));
    });
}

export function customPrompt3(uzenet, defaultNev, defaultIdoszak, defaultTipus) {
    return new Promise((resolve) => {
        const { overlay, box } = createModalShell({ minWidth: '350px' });

        const title = createEl('h3', {
            text: uzenet || '',
            style: {
                marginTop: '0',
                color: '#333',
                marginBottom: '20px'
            }
        });

        const nevField = createField({
            id: 'cp3-nev',
            label: 'Vizsgált személy:',
            value: defaultNev || ''
        });

        const idoszakField = createField({
            id: 'cp3-idoszak',
            label: 'Időszak:',
            value: defaultIdoszak || ''
        });

        const tipusField = createField({
            id: 'cp3-tipus',
            label: 'Vizsgálat típusa:',
            value: defaultTipus || ''
        });
        tipusField.wrap.style.marginBottom = '25px';

        const buttons = createButtonRow('Mégsem', 'Másolás');

        box.append(title, nevField.wrap, idoszakField.wrap, tipusField.wrap, buttons.row);

        buttons.cancel.addEventListener('click', () => closeAnimated(overlay, box, resolve, null));
        buttons.ok.addEventListener('click', () => {
            const nev = nevField.input.value;
            const idoszak = idoszakField.input.value;
            const tipus = tipusField.input.value;

            if (!nev || !idoszak || !tipus) {
                showAlert('Minden mezőt ki kell tölteni!');
                return;
            }

            closeAnimated(overlay, box, resolve, { nev, idoszak, tipus });
        });
    });
}

export function customDatePrompt(vizsgaltNev) {
    return new Promise((resolve) => {
        const { overlay, box } = createModalShell({ minWidth: '350px' });
        const maiDatum = new Date().toISOString().split('T')[0];

        const title = createEl('h3', {
            text: 'Határidő beállítása',
            style: {
                marginTop: '0',
                color: '#333',
                marginBottom: '20px'
            }
        });

        const desc = createEl('p', {
            style: {
                fontSize: '0.9em',
                color: '#555',
                marginBottom: '15px'
            }
        });
        setConfirmTitleWithName(desc, 'Értékelés: ', vizsgaltNev || '');

        const dateWrap = createEl('div', {
            style: {
                textAlign: 'left',
                marginBottom: '25px'
            }
        });

        const dateLabel = createEl('label', {
            htmlFor: 'cp-date',
            text: 'Válasszon határidőt:',
            style: {
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '5px'
            }
        });

        const dateInput = createEl('input', {
            id: 'cp-date',
            type: 'date',
            attrs: { min: maiDatum },
            style: {
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
            }
        });

        dateWrap.append(dateLabel, dateInput);
        const buttons = createButtonRow('Mégsem', 'Tovább');

        box.append(title, desc, dateWrap, buttons.row);

        buttons.cancel.addEventListener('click', () => closeAnimated(overlay, box, resolve, null));
        buttons.ok.addEventListener('click', () => {
            const dateVal = dateInput.value;

            if (!dateVal) {
                showAlert('Kérem válasszon egy dátumot!');
                return;
            }

            closeAnimated(overlay, box, resolve, dateVal);
        });
    });
}

export function customAuditPrompt(vizsgaltNev) {
    return new Promise((resolve) => {
        const { overlay, box } = createModalShell({
            minWidth: '400px',
            maxWidth: '550px'
        });
        const maiDatum = new Date().toISOString().split('T')[0];

        const title = createEl('h3', {
            text: 'Megjelölés Auditációra',
            style: {
                marginTop: '0',
                color: '#333',
                marginBottom: '20px'
            }
        });

        const desc = createEl('p', {
            style: {
                fontSize: '0.9em',
                color: '#555',
                marginBottom: '15px'
            }
        });
        setConfirmTitleWithName(desc, 'Értékelés: ', vizsgaltNev || '');

        const messengerDiv = createEl('div', {
            className: 'inner-div messengerdiv',
            style: { marginBottom: '20px' }
        });

        const infoBox = createEl('div', {
            style: {
                textAlign: 'center',
                padding: '10px',
                color: '#555'
            }
        });

        const icon = createEl('span', {
            className: 'material-symbols-rounded',
            text: 'checklist',
            style: {
                fontSize: '3em',
                color: '#ffbd16'
            }
        });

        const infoText = createEl('p', {
            text: 'Írjon javaslatokat az értékeléshez. Az utolsó Ön által küldött üzenet megjelenik a szerkesztő oldalán és válaszolni is tud majd rá. Ha folytatná a beszélgetést az auditáció fülön az adott értékelésre kattintva tud további üzeneteket küldeni.',
            style: {
                fontSize: '0.9em',
                marginBottom: '10px'
            }
        });

        infoBox.append(icon, infoText);

        const auditInputArea = createEl('div', {
            className: 'audit-input-area',
            style: {
                display: 'flex',
                gap: '10px',
                marginTop: '15px'
            }
        });

        const msgInput = createEl('input', {
            id: 'audit-msg-input',
            type: 'text',
            placeholder: 'Üzenet írása...',
            style: {
                flexGrow: '1',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px'
            }
        });

        auditInputArea.appendChild(msgInput);
        messengerDiv.append(infoBox, auditInputArea);

        const chceckboxRow = createEl('div', {
            style: {
                textAlign: 'left',
                marginBottom: '15px'
            }
        });

        const wantsDateCheckbox = createEl('input', {
            id: 'szeretne',
            type: 'checkbox',
            attrs: { name: 'szeretne' }
        });

        const wantsDateLabel = createEl('label', {
            htmlFor: 'szeretne',
            text: ' Szeretne határidőt beállítani a megjelölt értékeléshez?',
            style: {
                fontSize: '0.9em',
                color: '#333',
                cursor: 'pointer'
            }
        });

        chceckboxRow.append(wantsDateCheckbox, wantsDateLabel);

        const dateContainer = createEl('div', {
            id: 'date-container',
            style: {
                display: 'none',
                textAlign: 'left',
                marginBottom: '25px'
            }
        });

        const dateLabel = createEl('label', {
            htmlFor: 'cp-date',
            text: 'Válasszon határidőt:',
            style: {
                display: 'block',
                fontSize: '0.8em',
                color: '#666',
                marginBottom: '5px'
            }
        });

        const dateInput = createEl('input', {
            id: 'cp-date',
            type: 'date',
            attrs: { min: maiDatum },
            style: {
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
            }
        });

        dateContainer.append(dateLabel, dateInput);
        const buttons = createButtonRow('Mégsem', 'Tovább');

        box.append(title, desc, messengerDiv, chceckboxRow, dateContainer, buttons.row);

        wantsDateCheckbox.addEventListener('change', (event) => {
            if (event.target.checked) {
                dateContainer.style.display = 'block';
            } else {
                dateContainer.style.display = 'none';
                dateInput.value = '';
            }
        });

        buttons.cancel.addEventListener('click', () => closeAnimated(overlay, box, resolve, null));
        buttons.ok.addEventListener('click', () => {
            const msg = msgInput.value.trim();
            const wantsDate = wantsDateCheckbox.checked;
            const dateVal = dateInput.value;

            if (!msg) {
                showAlert('Kérem, írjon egy üzenetet a szerkesztőnek!');
                return;
            }

            if (wantsDate && !dateVal) {
                showAlert('Kérem válasszon egy dátumot, vagy vegye ki a pipát!');
                return;
            }

            closeAnimated(overlay, box, resolve, {
                message: msg,
                deadline: wantsDate ? dateVal : null
            });
        });
    });
}

export function showSuccessToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message ?? '';

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: '#4CAF50',
        color: 'white',
        padding: '12px 24px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: '10000',
        opacity: '0',
        transition: 'opacity 0.3s ease-in-out',
        fontFamily: "'Montserrat', sans-serif",
        fontWeight: 'bold'
    });

    modalRoot.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    setTimeout(() => {
        toast.style.opacity = '0';

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}
