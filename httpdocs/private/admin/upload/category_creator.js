import { showAlert } from "/both/alert.js";
import { QuestionInsertWizard } from "./question_insert_wizard.js";

function el(tag, options = {}, ...children) {
    const node = document.createElement(tag);

    if (options.className) node.className = options.className;
    if (options.id) node.id = options.id;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.value !== undefined) node.value = options.value;
    if (options.placeholder !== undefined) node.placeholder = options.placeholder;
    if (options.title !== undefined) node.title = options.title;
    if (options.rows !== undefined) node.rows = options.rows;
    if (options.checked !== undefined) node.checked = !!options.checked;
    if (options.disabled !== undefined) node.disabled = !!options.disabled;
    if (options.selected !== undefined) node.selected = !!options.selected;
    if (options.dataset) {
        Object.entries(options.dataset).forEach(([key, value]) => {
            node.dataset[key] = String(value ?? '');
        });
    }
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            if (value !== false && value !== null && value !== undefined) {
                node.setAttribute(key, String(value));
            }
        });
    }
    if (options.style) {
        if (typeof options.style === 'string') {
            node.style.cssText = options.style;
        } else {
            Object.assign(node.style, options.style);
        }
    }

    children.flat().forEach(child => appendChildSafe(node, child));
    return node;
}

function appendChildSafe(parent, child) {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) {
        child.forEach(item => appendChildSafe(parent, item));
        return;
    }
    if (child instanceof Node) {
        parent.appendChild(child);
        return;
    }
    parent.appendChild(document.createTextNode(String(child)));
}

function materialIcon(text, className = '') {
    return el('span', {
        className: `material-symbols-rounded${className ? ` ${className}` : ''}`,
        text
    });
}

function createButton(className, title, iconText, text = '') {
    const button = el('button', { className, title });
    if (iconText) button.appendChild(materialIcon(iconText, 'inline-icon'));
    if (text) button.appendChild(document.createTextNode(text));
    return button;
}

function createInlineCheckbox(className, labelText, checked = false, labelOptions = {}) {
    const input = el('input', { type: 'checkbox', className, checked });
    const label = el('label', labelOptions, input, document.createTextNode(` ${labelText}`));
    return { label, input };
}

function createNumberInput(className, value) {
    return el('input', { type: 'number', className, value });
}

function createSorszamBlock(value) {
    const input = createNumberInput('kerdes-sorszam-jelzo2', value);

    const wrapper = el('label', {
        className: 'inline-sorszam-wrapper',
        title: 'Sorszám',
        style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginBottom: '6px',
            fontSize: '13px'
        }
    },
        el('span', {
            className: 'inline-sorszam-label',
            text: 'Sorszám:'
        }),
        input
    );

    return { wrapper, input };
}

function wrapPlainSorszamInput(input) {
    if (!input || input.closest('.inline-sorszam-wrapper')) return;
    if (!input.parentElement) return;

    const wrapper = el('label', {
        className: 'inline-sorszam-wrapper',
        title: 'Sorszám',
        style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginBottom: '6px',
            fontSize: '13px'
        }
    },
        el('span', {
            className: 'inline-sorszam-label',
            text: 'Sorszám:'
        })
    );

    input.parentElement.insertBefore(wrapper, input);
    wrapper.appendChild(input);
}

function ensurePlainSorszamLabels(root = document) {
    const scope = root instanceof Element || root instanceof Document ? root : document;

    scope.querySelectorAll?.('.kerdes-sorszam-jelzo2').forEach(input => {
        wrapPlainSorszamInput(input);
    });

    if (scope instanceof HTMLInputElement && scope.classList.contains('kerdes-sorszam-jelzo2')) {
        wrapPlainSorszamInput(scope);
    }
}

function createAddSvg() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.setAttribute('height', '24px');
    svg.setAttribute('viewBox', '0 -960 960 960');
    svg.setAttribute('width', '24px');
    svg.setAttribute('fill', '#e8eaed');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z');
    svg.appendChild(path);
    return svg;
}

function createQuestionAddButton(text, className = 'kerdesmodul new btn-add-ideiglenes-alkerdes') {
    const span = el('span', { className: 'add-alkerdes-szoveg', text });
    const questionadd = el('div', { className: 'questionadd' }, span, createAddSvg());
    return el('div', {
        className,
        style: 'cursor: pointer; flex: 1; margin-bottom: 0;'
    }, questionadd);
}

function createAddButtonText(btnAddSzoveg, ag) {
    const label = ag === 'nem' ? 'nem' : 'igen';
    btnAddSzoveg.textContent = `Alkérdés hozzáadása (${label} válasz esetén)`;
}

function renumberAlkerdesek(lista) {
    lista.querySelectorAll('.uj-ideiglenes-alkerdes').forEach((elem, idx) => {
        const jelzo = elem.querySelector('.kerdes-sorszam-jelzo2');
        if (jelzo) jelzo.value = idx + 1;
        elem.dataset.kindex = String(idx + 1);
    });
}

function ensureInlineTypeCheckboxStyles() {
    if (document.getElementById('inline-type-checkbox-style')) return;

    const style = document.createElement('style');
    style.id = 'inline-type-checkbox-style';
    style.textContent = `
        .inline-tulajdonsagok-toggle {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            width: fit-content;
            border: 1px solid rgba(0, 0, 0, .14);
            border-radius: 999px;
            background: rgba(255, 255, 255, .72);
            color: inherit;
            font-family: system-ui;
            cursor: pointer;
        }

        .inline-tulajdonsagok-panel {
            justify-content: center;
            margin-bottom: 8px;
        }
        .inline-tulajdonsagok-sor {
              display: flex;
    width: 100%;
    justify-content: space-around;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 8px;
        }

        .inline-tulajdonsagok-sor .inline-maxi-checkbox {
            margin-left: 0;
        }


        .inline-tipus-wrapper {
            display: inline-flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }

        .inline-tipus-cim {
            font-size: 13px;
            opacity: .78;
        }

        .inline-tipus-choice {
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            min-height: 28px;
            padding: 5px 10px;
            border-radius: 12px;
            border: 1px solid rgba(0, 0, 0, .18);
            background: rgba(255, 255, 255, .72);
            font-size: 13px;
            line-height: 1;
            cursor: pointer;
            user-select: none;
            transition: background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease;
        }

        .inline-tipus-choice:hover {
            transform: translateY(-1px);
            border-color: #FF5722;
            background: rgb(255 193 7 / 24%);
        }

        .inline-tipus-choice.is-active {
         border-color: #FF5722;
    background: rgb(255 193 7 / 24%);
    box-shadow: 0 0 0 2px rgb(255 152 0 / 36%);
    font-weight: 700;
        }

        .inline-tipus-choice.is-disabled {
            opacity: .55;
        }

        .inline-tipus-choice input {
            position: absolute;
            opacity: 0;
            pointer-events: none;
        }

        .inline-fejlec.inline-tulajdonsagok-panel {
            display: none;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
        }
        /*
          Korábban az inline szerkesztő nyitva hagyásakor az egész kérdéslista
          halvány maradt. Ez függőben hagyott szerkesztésnél zavaró, ezért
          a globális halványítást kikapcsoljuk, a fókusz-keret viszont marad.
        */
        body.inline-editor-active .kerdesmodul {
            opacity: 1;
            filter: none;
            transition: box-shadow .18s ease, background .18s ease;
        }

        body.inline-editor-active .kerdesmodul.inline-editor-focus,
        body.inline-editor-active .kerdesmodul.inline-editor-focus .kerdesmodul {
            opacity: 1;
            filter: none;
        }

        body.inline-editor-active .kerdesmodul.inline-editor-focus {
            position: relative;
            z-index: 20;
        }

        body.inline-editor-active .kerdesmodul.inline-editor-focus > .question {
            box-shadow:
                0 0 0 3px rgba(255, 152, 0, .42),
                0 14px 38px rgba(0, 0, 0, .22);
            background: rgba(255, 248, 225, .94);
        }

        body.inline-editor-active .kerdesmodul.inline-editor-focus::before {
            content: "Szerkesztés alatt";
            position: absolute;
            top: -12px;
            left: 18px;
            z-index: 25;
            padding: 4px 10px;
            border-radius: 999px;
            background: #ff9800;
            color: white;
            font-size: 12px;
            font-weight: 700;
            box-shadow: 0 4px 12px rgba(0, 0, 0, .18);
            pointer-events: none;
        }

        body.inline-editor-active .kerdesmodul.inline-editor-focus .kisgombok {
            position: relative;
            z-index: 26;
        }
    `;

    document.head.appendChild(style);
}

function updateInlineTypeVisuals(controls) {
    if (!controls) return;

    const isText = !!controls.szovegesInput?.checked;
    const isNemAg = !!controls.nemAgInput?.checked;
    const isOpcio = !!controls.opcioInput?.checked;

    if (controls.egyaguInput) {
        controls.egyaguInput.checked = !isText && !isNemAg && !isOpcio;
    }

    controls.egyaguLabel?.classList.toggle('is-active', !!controls.egyaguInput?.checked);
    controls.nemAgLabel?.classList.toggle('is-active', isNemAg);
    controls.szovegesLabel?.classList.toggle('is-active', isText);
    controls.opcioLabel?.classList.toggle('is-active', isOpcio);
}

function createInlineControls({ maxi = false, szoveges = false, vanNemAg = false, opcios = false } = {}) {
    ensureInlineTypeCheckboxStyles();

    const maxiCb = createInlineCheckbox('inline-maxi-checkbox', 'Maximalizált', maxi);

    const egyaguCb = createInlineCheckbox('inline-egyagu-checkbox', 'Egyágú', !szoveges && !vanNemAg && !opcios, {
        className: 'inline-tipus-choice inline-egyagu-label'
    });

    const nemAgCb = createInlineCheckbox('inline-nem-ag-checkbox', 'Kétágú', vanNemAg, {
        className: 'inline-tipus-choice inline-nem-ag-label'
    });

    const szovegesCb = createInlineCheckbox('inline-szoveges-checkbox', 'Szöveges', szoveges, {
        className: 'inline-tipus-choice inline-szoveges-label'
    });

    const opcioCb = createInlineCheckbox('inline-opcio-checkbox', 'Opció', opcios, {
        className: 'inline-tipus-choice inline-opcio-label',
        title: 'Opció: azonos csoporton belül csak egy választható.'
    });

    const tipusWrapper = el('div', { className: 'inline-tipus-wrapper' },
        el('span', { className: 'inline-tipus-cim', text: 'Kérdés típusa:' }),
        egyaguCb.label,
        nemAgCb.label,
        szovegesCb.label,
        opcioCb.label
    );

    const inlineFejlec = el('div', { className: 'inline-fejlec inline-tulajdonsagok-panel' },
        tipusWrapper
    );

    const tulajdonsagokToggle = el('button', {
        type: 'button',
        className: 'inline-tulajdonsagok-toggle',
        title: 'Tulajdonságok megjelenítése',
        attrs: { 'aria-expanded': 'false' }
    },
        el('span', { className: 'inline-tulajdonsagok-label', text: 'Tulajdonságok' }),
        el('span', { className: 'material-symbols-rounded inline-tulajdonsagok-nyil', text: 'expand_more' })
    );

    const controls = {
        inlineFejlec,
        tulajdonsagokToggle,
        tulajdonsagokSor: el('div', {
            className: 'inline-tulajdonsagok-sor'
        }, tulajdonsagokToggle, maxiCb.label),
        maxiInput: maxiCb.input,
        szovegesInput: szovegesCb.input,
        nemAgInput: nemAgCb.input,
        egyaguInput: egyaguCb.input,
        opcioInput: opcioCb.input,
        maxiLabel: maxiCb.label,
        szovegesLabel: szovegesCb.label,
        nemAgLabel: nemAgCb.label,
        egyaguLabel: egyaguCb.label,
        opcioLabel: opcioCb.label,
        tipusWrapper
    };

    const setCheckbox = (input, checked) => {
        if (!input || input.checked === checked) return;
        input.checked = checked;
        input.dispatchEvent(new Event('change'));
    };

    egyaguCb.input.addEventListener('change', () => {
        if (!egyaguCb.input.checked) {
            updateInlineTypeVisuals(controls);
            return;
        }

        setCheckbox(szovegesCb.input, false);
        setCheckbox(nemAgCb.input, false);
        setCheckbox(opcioCb.input, false);
        updateInlineTypeVisuals(controls);
    });

    nemAgCb.input.addEventListener('change', () => {
        if (nemAgCb.input.checked) {
            setCheckbox(szovegesCb.input, false);
            setCheckbox(opcioCb.input, false);
        }

        updateInlineTypeVisuals(controls);
    });

    szovegesCb.input.addEventListener('change', () => {
        if (szovegesCb.input.checked) {
            setCheckbox(nemAgCb.input, false);
            setCheckbox(opcioCb.input, false);
        }

        updateInlineTypeVisuals(controls);
    });

    opcioCb.input.addEventListener('change', () => {
        if (opcioCb.input.checked) {
            setCheckbox(szovegesCb.input, false);
            setCheckbox(nemAgCb.input, false);
        }

        updateInlineTypeVisuals(controls);
    });

    const toggleArrow = tulajdonsagokToggle.querySelector('.inline-tulajdonsagok-nyil');

    tulajdonsagokToggle.addEventListener('click', () => {
        const isOpen = inlineFejlec.style.display !== 'none' && inlineFejlec.style.display !== '';
        const nextOpen = !isOpen;

        inlineFejlec.style.display = nextOpen ? 'flex' : 'none';
        tulajdonsagokToggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
        tulajdonsagokToggle.title = nextOpen ? 'Tulajdonságok elrejtése' : 'Tulajdonságok megjelenítése';
        if (toggleArrow) toggleArrow.textContent = nextOpen ? 'expand_less' : 'expand_more';
    });

    updateInlineTypeVisuals(controls);

    return controls;
}

function createValueBlock({ ertek = 0, negaltErtek = 0, szoveges = false, vanNemAg = false } = {}) {
    const ertekBlokk = el('div', {
        className: 'ertek inline-ertek-blokk',
        style: { display: szoveges ? 'none' : 'flex' }
    }, createNumberInput('inline-ertek-input', ertek), document.createTextNode(' pont'));

    const negaltErtekContainer = el('div', {
        className: 'ertek inline-negalt-ertek-container inline-ertek-blokk',
        style: { display: vanNemAg && !szoveges ? 'flex' : 'none' }
    }, createNumberInput('inline-negalt-ertek-input', negaltErtek), document.createTextNode(' pont'));

    const wrapper = el('div', { className: 'szerkesztolec inline-szerkesztolec' },
        el('div', {}, ertekBlokk, negaltErtekContainer)
    );

    return { wrapper, ertekBlokk, negaltErtekContainer };
}

function createSlider(tempId, { vanNemAg = false, display = 'flex', opcios = false } = {}) {
    const labelNem = el('label', {
        className: 'labelnem',
        style: { display: vanNemAg ? 'inline-block' : 'none' }
    },
        el('input', { type: 'radio', className: `nem${vanNemAg ? ' nem2' : ''}`, attrs: { name: `valasz-${tempId}`, value: 'nem' } }),
        el('div', { className: 'material-symbols-rounded nemszoveg', text: 'close', style: 'color: grey; transition: all 0.3s ease;' })
    );

    const labelUres = el('label', { className: `labelures${vanNemAg ? ' labelures2' : ''}` },
        el('input', { type: 'radio', className: `ures${vanNemAg ? ' ures2' : ''}`, checked: true, attrs: { name: `valasz-${tempId}`, value: 'ures' } }),
        el('div', { className: 'material-symbols-rounded uresszoveg', title: 'Kattintson a válasz elvetéséhez.', text: 'settings_ethernet' })
    );

    const labelIgen = el('label', { className: `labeligen${vanNemAg ? ' labeligen2' : ''}` },
        el('input', { type: 'radio', className: `igen${vanNemAg ? ' igen2' : ''}`, attrs: { name: `valasz-${tempId}`, value: 'igen' } }),
        el('div', { className: 'material-symbols-rounded igenszoveg', text: opcios ? 'radio_button_unchecked' : 'check' })
    );

    const gomboc = el('div', {
        className: 'gomboc',
        style: { transform: vanNemAg ? 'translate(0px, 0px) rotate(45deg)' : 'translate(-20px, 0px) rotate(45deg)' }
    });

    const csuszkaValtozo = el('div', {
        className: `csuszka csuszka-valtozo${vanNemAg ? ' csuszka2' : ''}`,
        style: { display }
    }, labelNem, labelUres, labelIgen, gomboc);

    return { csuszkaValtozo, labelNem, labelUres, labelIgen, gomboc };
}

function playSliderIntroAnimation(ui) {
    // Kikapcsolva: a csúszka beszúráskori bemutató animációjára kiadás előtt nincs szükség.
}

function activateInlineEditorFocus(editorElem) {
    if (!editorElem) return;

    document.querySelectorAll('.inline-editor-focus').forEach(elem => {
        elem.classList.remove('inline-editor-focus');
    });

    document.body.classList.add('inline-editor-active');
    editorElem.classList.add('inline-editor-focus');
}

function deactivateInlineEditorFocus(editorElem = null) {
    if (editorElem) {
        editorElem.classList.remove('inline-editor-focus');
    } else {
        document.querySelectorAll('.inline-editor-focus').forEach(elem => {
            elem.classList.remove('inline-editor-focus');
        });
    }

    if (!document.querySelector('.inline-editor-focus')) {
        document.body.classList.remove('inline-editor-active');
    }
}

function resetInlineEditorFocusState() {
    document.querySelectorAll('.inline-editor-focus').forEach(elem => {
        elem.classList.remove('inline-editor-focus');
    });
    document.body.classList.remove('inline-editor-active');
}

window.resetInlineEditorFocusState = resetInlineEditorFocusState;

window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        resetInlineEditorFocusState();
    }
});

function createAlkerdesContainer(tempId, { isAlkerdes = false } = {}) {
    const btnAddAlkerdes = createQuestionAddButton('Új alkérdés hozzáadása');
    const listaIgen = el('div', { className: 'ideiglenes-alkerdesek-lista-igen', style: 'display: none; width: 100%;' });
    const listaNem = el('div', { className: 'ideiglenes-alkerdesek-lista-nem', style: 'display: none; width: 100%;' });

    const alki = el('div', { className: 'alki' }, btnAddAlkerdes);
    const alkerdesKont = el('div', {
        className: 'alkerdeskont question-container fade-in hidden',
        id: `alkerdesek-${tempId}`,
        style: {
            display: isAlkerdes ? 'none' : '',
            filter: 'none',
            flexDirection: 'column',
            width: '100%'
        }
    }, alki, listaIgen, listaNem);

    return {
        alkerdesKont,
        btnAddAlkerdes,
        btnAddSzoveg: btnAddAlkerdes.querySelector('.add-alkerdes-szoveg'),
        listaIgen,
        listaNem
    };
}

function createQuestionShell({
    tempId,
    kindex = 1,
    szoveg = '',
    ertek = 0,
    szoveges = false,
    maxi = false,
    vanNemAg = false,
    opcios = false,
    negaltSzoveg = '',
    negaltErtek = 0,
    isEdit = false,
    isAlkerdes = false
}) {
    const ujModul = el('div', {
        className: 'kerdesmodul uj-ideiglenes-kerdes',
        dataset: { kindex }
    });

    const sorszam = createSorszamBlock(kindex);
    const sorszamInput = sorszam.input;
    const controls = createInlineControls({ maxi, szoveges, vanNemAg, opcios });
    if (szoveges) controls.maxiLabel.style.display = 'none';

    const pi = el('p', {
        className: 'pi',
        style: {
            display: szoveges || isAlkerdes ? 'none' : 'block',
            margin: '0 0 6px 0'
        }
    },
        document.createTextNode(isEdit ? '(Alkérdések szerkesztéséhez húzza a csúszkát a kívánt helyre (' : '(Alkérdés hozzáadásához, húzza a csúszkát a kívánt helyre ('),
        el('span', { style: 'color:green', text: ' igen' }),
        document.createTextNode('/ '),
        el('span', { style: 'color:red', text: 'nem' }),
        document.createTextNode('))')
    );

    const foSzovegInput = el('input', {
        type: 'text',
        className: 'editor-input-number inline-szoveg-input',
        placeholder: 'Fogalmazza meg a kérdést/állítást...',
        value: szoveg,
        style: 'padding: 0px; border: 1px solid #008000fc;background: #468a4612;'
    });

    const negaltSzovegInput = el('input', {
        type: 'text',
        className: 'editor-input-number inline-negalt-szoveg-input',
        placeholder: 'Fogalmazza meg a kérdés tagadását...',
        value: negaltSzoveg,
        style: { display: vanNemAg && !szoveges ? 'block' : 'none', padding: '0px' }
    });

    const szovegContainer = el('div', {
        className: 'color-picker-input-container inline-szoveg-container',
        style: 'padding: 0px;'
    }, foSzovegInput, negaltSzovegInput);

    const values = createValueBlock({ ertek, negaltErtek, szoveges, vanNemAg });
    const slider = createSlider(tempId, { vanNemAg, opcios, display: szoveges || isAlkerdes ? 'none' : 'flex' });

    const szovegEsPontWrapper = el('div', {
        className: 'inline-szoveg-es-pont-wrapper',
        style: 'display: flex; flex: 1; align-items: center; gap: 12px;'
    }, szovegContainer, values.wrapper);

    const csuszkaWrapper = el('div', {
        className: 'inline-csuszka-wrapper',
        style: 'display: flex; flex-direction: column; align-items: center; justify-content: center;'
    }, pi, slider.csuszkaValtozo);

    const middleRow = el('div', {
        className: 'inline-question-middle-row',
        style: 'display: flex; width: 100%; align-items: center; justify-content: center; gap: 12px;'
    }, szovegEsPontWrapper, csuszkaWrapper);

    const alkerdes = createAlkerdesContainer(tempId, { isAlkerdes });

    const kartya = el('div', {
        className: `question${opcios ? ' opcios-question' : ''}`,
        dataset: { id: tempId, value: 0, opcios: opcios ? '1' : '0' }
    }, controls.tulajdonsagokSor, controls.inlineFejlec, middleRow, alkerdes.alkerdesKont);

    const kisgombok = el('div', { className: isEdit ? 'kisgombok' : 'kisgombok muti' },
        createButton('btn-inline-mentes szerkesztogomb', 'Mentés', 'check_circle'),
        createButton('btn-inline-megse szerkesztogomb', 'Mégse', 'cancel')
    );

    ujModul.append(sorszam.wrapper, kartya, kisgombok);

    return {
        ujModul,
        sorszamInput,
        kartya,
        foSzovegInput,
        negaltSzovegInput,
        controls,
        slider,
        values,
        pi,
        isAlkerdes,
        ...alkerdes
    };
}

function setNemAgEnabled(ujModul, enabled) {
    const csuszkaValtozo = ujModul.querySelector('.csuszka-valtozo');
    const igenLabel = ujModul.querySelector('[class^="labeligen"]');
    const uresLabel = ujModul.querySelector('[class^="labelures"]');
    const labelNem = ujModul.querySelector('.labelnem');
    const igenRadioInput = ujModul.querySelector('input[value="igen"]');
    const uresRadioInput = ujModul.querySelector('input[value="ures"]');
    const gomboc = ujModul.querySelector('.gomboc');

    if (enabled) {
        labelNem.style.display = 'inline-block';
        csuszkaValtozo.classList.replace('csuszka', 'csuszka2');
        igenLabel.classList.replace('labeligen', 'labeligen2');
        uresLabel.classList.replace('labelures', 'labelures2');
        igenRadioInput.classList.replace('igen', 'igen2');
        uresRadioInput.classList.replace('ures', 'ures2');
        if (uresRadioInput.checked) gomboc.style.transform = 'translate(0px, 0px) rotate(45deg)';
        if (igenRadioInput.checked) gomboc.style.transform = 'translate(42px, 0px) rotate(-135deg)';
    } else {
        labelNem.style.display = 'none';
        csuszkaValtozo.classList.replace('csuszka2', 'csuszka');
        igenLabel.classList.replace('labeligen2', 'labeligen');
        uresLabel.classList.replace('labelures2', 'labelures');
        igenRadioInput.classList.replace('igen2', 'igen');
        uresRadioInput.classList.replace('ures2', 'ures');
        if (uresRadioInput.checked) gomboc.style.transform = 'translate(-20px, 0px) rotate(45deg)';
        if (igenRadioInput.checked) gomboc.style.transform = 'translate(28px, 0px) rotate(135deg)';
    }
}

function setOpcioVisual(root, enabled) {
    if (!root) return;

    const question = root.classList?.contains('question') ? root : root.querySelector('.question');
    const igenIkon = root.querySelector('.igenszoveg');
    const igenRadio = root.querySelector('input[value="igen"]');

    if (question) {
        question.classList.toggle('opcios-question', !!enabled);
        question.dataset.opcios = enabled ? '1' : '0';
    }

    if (igenIkon) {
        igenIkon.textContent = enabled
            ? (igenRadio?.checked ? 'radio_button_checked' : 'radio_button_unchecked')
            : 'check';
    }
}

function refreshOpcioRadioIcon(root, valasz) {
    if (!root) return;
    const opcioInput = root.querySelector('.inline-opcio-checkbox');
    if (!opcioInput?.checked) return;

    const igenIkon = root.querySelector('.igenszoveg');
    if (igenIkon) {
        igenIkon.textContent = valasz === 'igen' ? 'radio_button_checked' : 'radio_button_unchecked';
    }
}

function extractAlkerdesek(listaContainer, ag, foKerdes = null) {
    return Array.from(listaContainer.querySelectorAll('.uj-ideiglenes-alkerdes')).map(sub => {
        const szovegesSub = sub.querySelector('.inline-szoveges-checkbox').checked;
        const vanNemAgSub = sub.querySelector('.inline-nem-ag-checkbox').checked;
        const opciosSub = sub.querySelector('.inline-opcio-checkbox')?.checked || false;
        const alkIdRaw = sub.getAttribute('data-alk-id');

        return {
            al_id: alkIdRaw ? parseInt(alkIdRaw, 10) : null,
            parent_id: foKerdes ? foKerdes.id : null,
            vanNemAg: vanNemAgSub,
            al_kindex: parseInt(sub.querySelector('.kerdes-sorszam-jelzo2').value) || 1,
            al_kerdesSzoveg: sub.querySelector('.inline-szoveg-input').value.trim(),
            al_ertek: parseFloat(sub.querySelector('.inline-ertek-input').value) || 0,
            szoveges: szovegesSub,
            maximalis_szint: sub.querySelector('.inline-maxi-checkbox').checked ? 1 : 0,
            opcios: opciosSub ? 1 : 0,
            al_negaltKerdesSzoveg: !opciosSub && vanNemAgSub && !szovegesSub
                ? sub.querySelector('.inline-negalt-szoveg-input').value.trim()
                : '',
            al_negalt_ertek: !opciosSub && vanNemAgSub && !szovegesSub
                ? parseFloat(sub.querySelector('.inline-negalt-ertek-input').value) || 0
                : 0,
            // Az opció itt csak az alkérdés saját válaszlogikáját jelenti.
            // A szülő főkérdés ága ettől még lehet IGEN vagy NEM, ezért az ágat meg kell őrizni.
            valasz_ag: ag
        };
    });
}

function validateFoKerdes({ szoveg, szovegesVeg, vanNemAgVeg, fokerdesNegaltSzoveg, maxiVeg, ertekVeg, negaltErtekVeg, osszesAlkerdes, noSubQuestionLabel = 'főkérdés' }) {
    const vanAlkerdes = osszesAlkerdes.length > 0;

    if (!szoveg) {
        showAlert('A kérdés szövegének megadása kötelező!');
        return false;
    }

    if (vanNemAgVeg && !szovegesVeg && !fokerdesNegaltSzoveg) {
        showAlert("Ha a főkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
        return false;
    }

    if (!szovegesVeg && !maxiVeg && !vanAlkerdes) {
        if (ertekVeg === 0) {
            showAlert(`Az alkérdés nélküli ${noSubQuestionLabel} pontszáma nem lehet 0!`);
            return false;
        }

        if (vanNemAgVeg && negaltErtekVeg === 0) {
            showAlert(`Az alkérdés nélküli ${noSubQuestionLabel} 'NEM' ágának pontszáma nem lehet 0!`);
            return false;
        }
    }

    for (const alk of osszesAlkerdes) {
        if (!alk.al_kerdesSzoveg) {
            showAlert('Minden alkérdés szövegének megadása kötelező!');
            return false;
        }

        if (alk.al_negaltKerdesSzoveg === '' && !alk.szoveges && alk.vanNemAg) {
            showAlert("Ha egy alkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
            return false;
        }

        if (!alk.szoveges && alk.maximalis_szint === 0) {
            if (alk.al_ertek === 0) {
                showAlert('Az alkérdés pontszáma nem lehet 0!');
                return false;
            }

            if (alk.vanNemAg && alk.al_negalt_ertek === 0) {
                showAlert("Az alkérdés 'NEM' ágának pontszáma nem lehet 0!");
                return false;
            }
        }
    }

    return true;
}

function bindSubQuestionRemove(ujSub, lista) {
    const btnMegse = ujSub.querySelector('.btn-inline-megse');
    if (!btnMegse) return;

    btnMegse.addEventListener('click', () => {
        ujSub.remove();
        if (lista) renumberAlkerdesek(lista);
    });
}

function bindSablonLogic({ listaIgen, listaNem }) {
    let betoltottSablonCsoportok = [];

    const sablonBetoltesPromise = fetch('/get-username')
        .then(res => res.json())
        .then(user => {
            if (user.success) {
                return fetch(`/api/get-sablonok?modulId=${encodeURIComponent(user.modulId)}&userId=${encodeURIComponent(user.id)}`);
            }
            throw new Error('Nincs bejelentkezve');
        })
        .then(res => res.json())
        .then(data => {
            if (data.SABLON_CSOPORTOK) betoltottSablonCsoportok = data.SABLON_CSOPORTOK;
            return betoltottSablonCsoportok;
        })
        .catch(err => {
            console.error('Sablon betöltés hiba:', err);
            betoltottSablonCsoportok = [];
            return betoltottSablonCsoportok;
        });

    const betoltSablonAgba = async (ag) => {
        await sablonBetoltesPromise;

        const lista = ag === 'igen' ? listaIgen : listaNem;
        if (!lista) return;

        const valaszthatoCsoportok = betoltottSablonCsoportok
            .map((csoport, index) => ({
                index,
                nev: csoport.nev,
                count: Array.isArray(csoport.elemek)
                    ? csoport.elemek.filter(elem => elem.valasz_ag === ag).length
                    : 0
            }))
            .filter(csoport => csoport.count > 0);

        if (valaszthatoCsoportok.length === 0) {
            showAlert(`Nincs betölthető sablon a(z) ${ag.toUpperCase()} ághoz.`);
            return;
        }

        const selectedIndexRaw = await QuestionInsertWizard.chooseTemplate(ag, valaszthatoCsoportok);
        if (selectedIndexRaw === null || selectedIndexRaw === undefined || selectedIndexRaw === '') return;

        const selectedIndex = parseInt(selectedIndexRaw, 10);
        const csoport = betoltottSablonCsoportok[selectedIndex];
        if (!csoport || !Array.isArray(csoport.elemek)) return;

        csoport.elemek
            .filter(sablon => sablon.valasz_ag === ag)
            .forEach(sablon => {
                const subKindex = lista.querySelectorAll('.uj-ideiglenes-alkerdes').length + 1;
                const ujSub = InlineQuestionCreator.createAlkerdesUI({
                    kindex: subKindex,
                    szoveg: sablon.szoveg,
                    ertek: sablon.ertek,
                    szoveges: (sablon.opcios == 1 || sablon.opcios === true || sablon.opcio == 1 || sablon.opcio === true || sablon.kerdes_tipus === 'opcio' || sablon.kerdesTipus === 'opcio' || sablon.tipus === 'opcio') ? false : sablon.szoveges,
                    vanNemAg: (sablon.opcios == 1 || sablon.opcios === true || sablon.opcio == 1 || sablon.opcio === true || sablon.kerdes_tipus === 'opcio' || sablon.kerdesTipus === 'opcio' || sablon.tipus === 'opcio') ? false : (!!sablon.vanNemAg || !!sablon.negalt_kerdes_szoveg || (parseFloat(sablon.negalt_ertek) || 0) > 0),
                    negaltSzoveg: sablon.negalt_kerdes_szoveg || sablon.negaltKerdesSzoveg || '',
                    negaltErtek: sablon.negalt_ertek || sablon.negaltErtek || 0,
                    maxi: (sablon.opcios == 1 || sablon.opcios === true || sablon.opcio == 1 || sablon.opcio === true || sablon.kerdes_tipus === 'opcio' || sablon.kerdesTipus === 'opcio' || sablon.tipus === 'opcio')
                        ? false
                        : (sablon.maximalis_szint == 1 || sablon.maximalisSzint == 1),
                    opcios: sablon.opcios == 1 || sablon.opcios === true || sablon.opcio == 1 || sablon.opcio === true || sablon.kerdes_tipus === 'opcio' || sablon.kerdesTipus === 'opcio' || sablon.tipus === 'opcio'
                }, false);

                lista.appendChild(ujSub);
                ensurePlainSorszamLabels(ujSub);
                bindSubQuestionRemove(ujSub, lista);
            });

        if (lista.lastElementChild) {
            lista.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    return { betoltSablonAgba };
}

function bindMainQuestionBehaviour(ui, { emptyReferenceText = 'az új főkérdéshez', isEdit = false } = {}) {
    const { ujModul, negaltSzovegInput, controls, values, slider, pi, isAlkerdes, alkerdesKont, btnAddAlkerdes, btnAddSzoveg, listaIgen, listaNem } = ui;
    const { betoltSablonAgba } = bindSablonLogic(ui);

    const updateAddButtonText = () => {
        const ag = btnAddAlkerdes.dataset.ag;
        if (!ag) return;
        createAddButtonText(btnAddSzoveg, ag);
    };

    ujModul.querySelectorAll('input[type="radio"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const val = e.target.value;
            const isKetAgu = slider.csuszkaValtozo.classList.contains('csuszka2');
            const igenIkon = ujModul.querySelector('.igenszoveg');
            const nemIkon = ujModul.querySelector('.nemszoveg');
            const uresIkon = ujModul.querySelector('.uresszoveg');

            if (val === 'igen') {
                slider.gomboc.style.boxShadow = 'inset 0px 0px 3px 1px #88ca00';
                slider.gomboc.style.background = 'rgb(145 204 0)';
                slider.gomboc.style.transform = isKetAgu ? 'translate(42px, 0px) rotate(-135deg)' : 'translate(28px, 0px) rotate(135deg)';
                ui.kartya.style.boxShadow = 'inset 6px 0px 1px 1px #0d8200a3';
                ui.kartya.style.background = 'rgb(48 255 0 / 8%)';
                if (igenIkon) igenIkon.style.color = 'white';
                if (nemIkon) nemIkon.style.color = 'grey';
                if (uresIkon) uresIkon.style.color = 'grey';

                alkerdesKont.classList.remove('hidden');
                listaIgen.style.display = 'block';
                listaNem.style.display = 'none';
                btnAddAlkerdes.dataset.ag = 'igen';
                updateAddButtonText();
                setTimeout(() => alkerdesKont.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            } else if (val === 'nem') {
                slider.gomboc.style.boxShadow = 'inset 0px 0px 3px 1px red';
                slider.gomboc.style.background = '#ff0000';
                slider.gomboc.style.transform = 'translate(-38px, 0px) rotate(135deg)';
                ui.kartya.style.boxShadow = 'inset 6px 0px 1px 1px #e2000033';
                ui.kartya.style.background = 'rgb(255 0 0 / 6%)';
                if (nemIkon) nemIkon.style.color = 'white';
                if (igenIkon) igenIkon.style.color = 'grey';
                if (uresIkon) uresIkon.style.color = 'grey';

                alkerdesKont.classList.remove('hidden');
                listaIgen.style.display = 'none';
                listaNem.style.display = 'block';
                btnAddAlkerdes.dataset.ag = 'nem';
                updateAddButtonText();
                setTimeout(() => alkerdesKont.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
            } else {
                slider.gomboc.style.boxShadow = 'inset 0px 0px 3px 1px grey';
                slider.gomboc.style.background = 'transparent';
                slider.gomboc.style.transform = isKetAgu ? 'translate(0px, 0px) rotate(45deg)' : 'translate(-20px, 0px) rotate(45deg)';
                ui.kartya.style.boxShadow = 'none';
                ui.kartya.style.background = '';
                if (uresIkon) uresIkon.style.color = 'black';
                if (igenIkon) igenIkon.style.color = 'grey';
                if (nemIkon) nemIkon.style.color = 'grey';

                alkerdesKont.classList.add('hidden');
            }

            refreshOpcioRadioIcon(ujModul, val);
        });
    });

    controls.nemAgInput.addEventListener('change', (e) => {
        updateInlineTypeVisuals(controls);
        if (e.target.checked) {
            negaltSzovegInput.style.display = 'block';
            values.negaltErtekContainer.style.display = 'block';
            setNemAgEnabled(ujModul, true);
            negaltSzovegInput.focus();
        } else {
            negaltSzovegInput.style.display = 'none';
            values.negaltErtekContainer.style.display = 'none';
            negaltSzovegInput.value = '';
            setNemAgEnabled(ujModul, false);

            const radioNem = ujModul.querySelector('.nem');
            const uresRadioInput = ujModul.querySelector('input[value="ures"]');
            const nemIkon = ujModul.querySelector('.nemszoveg');
            const uresIkon = ujModul.querySelector('.uresszoveg');

            if (radioNem?.checked) {
                radioNem.checked = false;
                uresRadioInput.checked = true;
                slider.gomboc.style.boxShadow = 'inset 0px 0px 3px 1px grey';
                slider.gomboc.style.background = 'transparent';
                ui.kartya.style.boxShadow = 'none';
                ui.kartya.style.background = '';
                if (uresIkon) uresIkon.style.color = 'black';
                if (nemIkon) nemIkon.style.color = 'grey';
                alkerdesKont.classList.add('hidden');
            }
        }
    });

    controls.szovegesInput.addEventListener('change', (e) => {
        updateInlineTypeVisuals(controls);
        if (e.target.checked) {
            controls.maxiLabel.style.display = 'none';
            slider.csuszkaValtozo.style.display = 'none';
            if (pi) pi.style.display = 'none';
            values.ertekBlokk.style.display = 'none';

            if (controls.nemAgInput.checked) {
                controls.nemAgInput.checked = false;
                controls.nemAgInput.dispatchEvent(new Event('change'));
            }
            alkerdesKont.classList.add('hidden');
        } else {
            controls.maxiLabel.style.display = '';
            if (!isAlkerdes) {
                slider.csuszkaValtozo.style.display = 'flex';
                if (pi) pi.style.display = 'block';
                playSliderIntroAnimation(ui);
            }
            values.ertekBlokk.style.display = 'flex';
        }
    });

    controls.opcioInput?.addEventListener('change', (e) => {
        updateInlineTypeVisuals(controls);
        setOpcioVisual(ujModul, e.target.checked);
        refreshOpcioRadioIcon(ujModul, ujModul.querySelector('input[type="radio"]:checked')?.value || 'ures');
    });

    setOpcioVisual(ujModul, controls.opcioInput?.checked || false);

    const createAlkerdesForCurrentAg = (options = {}) => {
        const ag = btnAddAlkerdes.dataset.ag;
        const lista = ag === 'igen' ? listaIgen : listaNem;
        if (!lista) return null;

        const subKindex = lista.querySelectorAll('.uj-ideiglenes-alkerdes').length + 1;
        const ujSub = InlineQuestionCreator.createAlkerdesUI({ kindex: subKindex, ...options }, false);

        lista.appendChild(ujSub);
        ensurePlainSorszamLabels(ujSub);
        ujSub.scrollIntoView({ behavior: 'smooth', block: 'center' });
        bindSubQuestionRemove(ujSub, lista);

        return ujSub;
    };

    btnAddAlkerdes.addEventListener('click', async () => {
        const ag = btnAddAlkerdes.dataset.ag;
        if (!ag) return;

        const selectedType = await QuestionInsertWizard.chooseSubQuestionType(ag);

        if (!selectedType) return;

        if (selectedType === 'simple') {
            createAlkerdesForCurrentAg();
            return;
        }

        if (selectedType === 'yes-no') {
            createAlkerdesForCurrentAg({ vanNemAg: true });
            return;
        }

        if (selectedType === 'text') {
            createAlkerdesForCurrentAg({ szoveges: true });
            return;
        }

        if (selectedType === 'template') {
            await betoltSablonAgba(ag);
            return;
        }

        if (selectedType === 'option') {
            createAlkerdesForCurrentAg({ opcios: true });
        }
    });
}

export class CategoryCreator {
    static hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        return [r, g, b];
    }

    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    static hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    static kalkulaldDiagramSzineket(hexColor, numSegments) {
        const [r, g, b] = this.hexToRgb(hexColor);
        const [h, s, l] = this.rgbToHsl(r, g, b);
        const backgroundColors = [];
        for (let index = 0; index < numSegments; index++) {
            const lightnessStep = 0.4 / (numSegments || 1);
            const newL = Math.max(0.1, Math.min(0.9, l + (index * lightnessStep) - 0.2));
            const [newR, newG, newB] = this.hslToRgb(h, s, newL);
            backgroundColors.push(`rgba(${newR}, ${newG}, ${newB}, 0.8)`);
        }
        return backgroundColors;
    }

    static open() {
        return new Promise((resolve) => {
            const alapSzin = '#006cb5';

            const overlay = el('div', { className: 'color-picker-overlay' });
            const modal = el('div', { className: 'color-picker-modal', style: { width: '450px' } });

            const previewCard = el('div', {
                id: 'creator-preview-card',
                className: 'category fo color-picker-preview-card',
                style: { background: alapSzin, minHeight: '100px' }
            },
                el('div', { className: 'cim', id: 'preview-cim', text: 'Új kategória neve' }),
                el('div', { className: 'leiras', id: 'preview-leiras', text: 'Ide kerül a rövid leírás...', style: { fontSize: '0.85em', marginTop: '5px' } })
            );

            const chartCanvas = el('canvas', { id: 'creator-preview-chart' });

            const inputCim = el('input', {
                type: 'text',
                id: 'creator-cim',
                placeholder: 'pl. Általános jellemzők',
                style: 'width: 100%; color: black; font-family: inherit;'
            });
            const inputLeiras = el('textarea', {
                id: 'creator-leiras',
                rows: 2,
                placeholder: 'Rövid tájékoztató...',
                style: 'width: 100%; color: black; font-family: inherit;'
            });
            const inputSzin = el('input', {
                type: 'color',
                id: 'creator-szin',
                className: 'color-picker-input',
                value: alapSzin
            });

            const btnMegse = el('button', { id: 'creator-megse', className: 'color-picker-btn-cancel', text: 'Mégse' });
            const btnOk = el('button', { id: 'creator-ok', className: 'color-picker-btn-save', text: 'Létrehozás' });

            modal.append(
                el('h3', { className: 'color-picker-title', text: 'Új főkategória létrehozása' }),
                el('div', { className: 'minta', style: 'display: flex; gap: 15px; margin-bottom: 25px;' },
                    el('div', { style: { flex: '1' } },
                        el('p', { className: 'color-picker-preview-label', text: 'Kártya:' }),
                        previewCard
                    ),
                    el('div', { style: { flex: '1' } },
                        el('p', { className: 'color-picker-preview-label', text: 'Diagram árnyalatok:' }),
                        el('div', { style: 'position: relative; height: 120px; width: 100%;' }, chartCanvas)
                    )
                ),
                el('div', { className: 'color-picker-input-container' },
                    el('label', { className: 'color-picker-label', text: 'Cím:' }),
                    inputCim
                ),
                el('div', { className: 'color-picker-input-container' },
                    el('label', { className: 'color-picker-label', text: 'Leírás:' }),
                    inputLeiras
                ),
                el('div', { className: 'color-picker-input-container' },
                    el('label', { className: 'color-picker-label', text: 'Alapszín:' }),
                    inputSzin
                ),
                el('div', { className: 'color-picker-btn-container' }, btnMegse, btnOk)
            );

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const ctx = chartCanvas.getContext('2d');
            const dummyLabels = ['1', '2', '3'];
            const previewChart = new Chart(ctx, {
                type: 'polarArea',
                data: {
                    labels: dummyLabels,
                    datasets: [{
                        data: [80, 60, 95],
                        backgroundColor: this.kalkulaldDiagramSzineket(alapSzin, dummyLabels.length),
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: { r: { ticks: { display: false } } },
                    animation: { duration: 0 }
                }
            });

            inputCim.addEventListener('input', () => {
                modal.querySelector('#preview-cim').textContent = inputCim.value || 'Új kategória neve';
            });

            inputLeiras.addEventListener('input', () => {
                modal.querySelector('#preview-leiras').textContent = inputLeiras.value || 'Ide kerül a rövid leírás...';
            });

            inputSzin.addEventListener('input', (e) => {
                const ujSzin = e.target.value;
                previewCard.style.background = ujSzin;
                previewChart.data.datasets[0].backgroundColor = this.kalkulaldDiagramSzineket(ujSzin, dummyLabels.length);
                previewChart.update();
            });

            const close = (valasz) => {
                if (previewChart) previewChart.destroy();
                document.body.removeChild(overlay);
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(null));

            btnOk.addEventListener('click', () => {
                const cim = inputCim.value.trim();
                if (!cim) {
                    showAlert('A főkategória neve nem lehet üres!');
                    return;
                }
                close({
                    ujCim: cim,
                    ujLeiras: inputLeiras.value.trim(),
                    ujSzin: inputSzin.value
                });
            });
        });
    }
}

export class InlineQuestionCreator {
    static createAlkerdesUI(options = {}, isStandalone = false) {
        const {
            alkId = null,
            parentId = null,
            kindex = 1,
            szoveg = '',
            ertek = 0,
            szoveges = false,
            maxi = false,
            vanNemAg = false,
            opcios = false,
            negaltSzoveg = '',
            negaltErtek = 0
        } = options;

        const veglegesId = alkId ? alkId : (Date.now() + Math.floor(Math.random() * 1000));
        const div = el('div', {
            className: 'kerdesmodul uj-ideiglenes-alkerdes',
            dataset: { kindex },
            style: { marginTop: '10px' }
        });

        if (alkId) div.setAttribute('data-alk-id', alkId);
        if (parentId) div.setAttribute('data-parent-id', parentId);

        const sorszam = createSorszamBlock(kindex);
        const controls = createInlineControls({ maxi, szoveges, vanNemAg, opcios });
        if (szoveges) controls.maxiLabel.style.display = 'none';
        const szovegInput = el('input', {
            type: 'text',
            className: 'editor-input-number inline-szoveg-input',
            placeholder: 'Fogalmazza meg az alkérdést/állítást...',
            value: szoveg,
            style: 'padding: 0px; border: 1px solid #008000fc;background: #468a4612;'
        });
        const negaltSzovegInput = el('input', {
            type: 'text',
            className: 'editor-input-number inline-negalt-szoveg-input',
            placeholder: 'Fogalmazza meg az alkérdés tagadását...',
            value: negaltSzoveg,
            style: { display: vanNemAg && !szoveges ? 'block' : 'none', padding: '0px' }
        });
        const values = createValueBlock({ ertek, negaltErtek, szoveges, vanNemAg });

        const question = el('div', {
            className: `question${opcios ? ' opcios-question' : ''}`,
            dataset: { id: veglegesId, parentId: parentId || '', value: 0, opcios: opcios ? '1' : '0' }
        },
            controls.tulajdonsagokSor,
            controls.inlineFejlec,
            el('div', { style: 'display: flex; width: 100%; align-items: center; justify-content: space-between;' },
                el('div', { className: 'color-picker-input-container inline-szoveg-container', style: 'padding: 0px;' }, szovegInput, negaltSzovegInput),
                values.wrapper
            )
        );

        const kisgombok = el('div', { className: 'kisgombok' });
        if (isStandalone) {
            kisgombok.appendChild(createButton('btn-inline-mentes szerkesztogomb', 'Mentés', 'check_circle'));
        }
        kisgombok.appendChild(createButton('btn-inline-megse szerkesztogomb', 'Mégse / Törlés', 'cancel'));

        div.append(sorszam.wrapper, question, kisgombok);

        const subNemAgCb = controls.nemAgInput;
        subNemAgCb.addEventListener('change', (e) => {
            updateInlineTypeVisuals(controls);
            if (e.target.checked) {
                negaltSzovegInput.style.display = 'block';
                values.negaltErtekContainer.style.display = 'block';
                negaltSzovegInput.focus();
            } else {
                negaltSzovegInput.style.display = 'none';
                values.negaltErtekContainer.style.display = 'none';
                negaltSzovegInput.value = '';
                div.querySelector('.inline-negalt-ertek-input').value = '0';
            }
        });

        controls.szovegesInput.addEventListener('change', (e) => {
            updateInlineTypeVisuals(controls);
            if (e.target.checked) {
                controls.maxiLabel.style.display = 'none';
                values.ertekBlokk.style.display = 'none';
                    if (subNemAgCb.checked) {
                    subNemAgCb.checked = false;
                    subNemAgCb.dispatchEvent(new Event('change'));
                }
            } else {
                controls.maxiLabel.style.display = '';
                values.ertekBlokk.style.display = 'flex';
                }
        });

        controls.opcioInput?.addEventListener('change', (e) => {
            updateInlineTypeVisuals(controls);
            setOpcioVisual(div, e.target.checked);
        });

        setOpcioVisual(div, controls.opcioInput?.checked || false);

        return div;
    }

    static open(tartaly, kindex, foKategoriaNev, alKategoriaNev, altTemaNev) {
        return new Promise(async (resolve) => {
            const selectedType = await QuestionInsertWizard.chooseQuestionType();
            if (!selectedType) {
                resolve(null);
                return;
            }

            const questionPresetByType = {
                simple: {},
                'yes-no': { vanNemAg: true },
                text: { szoveges: true },
                option: { opcios: true }
            };

            const tempId = Date.now();
            const ui = createQuestionShell({
                tempId,
                kindex,
                ...(questionPresetByType[selectedType] || {})
            });

            tartaly.appendChild(ui.ujModul);
            ensurePlainSorszamLabels(ui.ujModul);
            activateInlineEditorFocus(ui.ujModul);
            ui.ujModul.scrollIntoView({ behavior: 'smooth', block: 'center' });
            bindMainQuestionBehaviour(ui, { emptyReferenceText: 'az új főkérdéshez' });
            playSliderIntroAnimation(ui);

            const btnMent = ui.ujModul.querySelector('.btn-inline-mentes');
            const btnMegse = ui.ujModul.querySelector('.btn-inline-megse');

            btnMegse.addEventListener('click', () => {
                deactivateInlineEditorFocus(ui.ujModul);
                ui.ujModul.remove();
                resolve(null);
            });

            btnMent.addEventListener('click', () => {
                const szoveg = ui.foSzovegInput.value.trim();
                const szovegesVeg = ui.controls.szovegesInput.checked;
                const vanNemAgVeg = ui.controls.nemAgInput.checked;
                const opciosVeg = ui.controls.opcioInput?.checked || false;
                const fokerdesNegaltSzoveg = vanNemAgVeg && !szovegesVeg ? ui.negaltSzovegInput.value.trim() : '';
                const maxiVeg = ui.ujModul.querySelector('.inline-maxi-checkbox').checked;
                const ertekVeg = parseFloat(ui.ujModul.querySelector('.inline-ertek-input').value) || 0;
                const negaltErtekVeg = parseFloat(ui.ujModul.querySelector('.inline-negalt-ertek-input').value) || 0;

                const igenAlkerdesek = extractAlkerdesek(ui.listaIgen, 'igen');
                const nemAlkerdesek = extractAlkerdesek(ui.listaNem, 'nem');
                const osszesAlkerdes = [...igenAlkerdesek, ...nemAlkerdesek];

                if (!validateFoKerdes({
                    szoveg,
                    szovegesVeg,
                    vanNemAgVeg,
                    fokerdesNegaltSzoveg,
                    maxiVeg,
                    ertekVeg,
                    negaltErtekVeg,
                    osszesAlkerdes,
                    noSubQuestionLabel: 'főkérdés'
                })) return;

                const eredmeny = {
                    kindex: parseInt(ui.ujModul.querySelector('.kerdes-sorszam-jelzo2').value) || 1,
                    szoveg,
                    ertek: ertekVeg,
                    szoveges: szovegesVeg,
                    maxi: maxiVeg,
                    opcios: opciosVeg,
                    vanNemAg: vanNemAgVeg,
                    negaltSzoveg: fokerdesNegaltSzoveg,
                    negaltErtek: vanNemAgVeg && !szovegesVeg ? negaltErtekVeg : 0,
                    alkerdesek: osszesAlkerdes
                };

                deactivateInlineEditorFocus(ui.ujModul);
                ui.ujModul.remove();
                resolve(eredmeny);
            });
        });
    }

    static openSub(referenciaElem, kindex) {
        return new Promise(async (resolve) => {
            const selectedType = await QuestionInsertWizard.chooseStandaloneSubQuestionType(referenciaElem?.dataset?.ag || 'igen');

            if (!selectedType) {
                resolve(null);
                return;
            }

            const presetByType = {
                simple: {},
                'yes-no': { vanNemAg: true },
                text: { szoveges: true },
                option: { opcios: true }
            };

            const ujSub = InlineQuestionCreator.createAlkerdesUI({
                kindex,
                ...(presetByType[selectedType] || {})
            }, true);

            referenciaElem.parentElement.appendChild(ujSub);
            ensurePlainSorszamLabels(ujSub);
            activateInlineEditorFocus(ujSub);
            ujSub.scrollIntoView({ behavior: 'smooth', block: 'center' });

            const btnMent = ujSub.querySelector('.btn-inline-mentes');
            const btnMegse = ujSub.querySelector('.btn-inline-megse');
            const subSzovegesCb = ujSub.querySelector('.inline-szoveges-checkbox');
            const subNemAgCb = ujSub.querySelector('.inline-nem-ag-checkbox');
            const subNegaltSzovegInput = ujSub.querySelector('.inline-negalt-szoveg-input');

            btnMegse.addEventListener('click', () => {
                deactivateInlineEditorFocus(ujSub);
                ujSub.remove();
                resolve(null);
            });

            btnMent.addEventListener('click', () => {
                const szoveg = ujSub.querySelector('.inline-szoveg-input').value.trim();
                const szoveges = subSzovegesCb.checked;
                const vanNemAg = subNemAgCb.checked;
                const opcios = ujSub.querySelector('.inline-opcio-checkbox')?.checked || false;
                const maxi = ujSub.querySelector('.inline-maxi-checkbox').checked;
                const ertek = parseFloat(ujSub.querySelector('.inline-ertek-input').value) || 0;
                const negaltSzoveg = vanNemAg && !szoveges ? subNegaltSzovegInput.value.trim() : '';
                const negaltErtek = vanNemAg && !szoveges
                    ? parseFloat(ujSub.querySelector('.inline-negalt-ertek-input').value) || 0
                    : 0;

                if (!szoveg) {
                    showAlert('Az alkérdés szövegének megadása kötelező!');
                    return;
                }

                if (!szoveges && !maxi && ertek === 0) {
                    showAlert('Az alkérdés pontszáma nem lehet 0!');
                    return;
                }

                if (vanNemAg && !szoveges && !negaltSzoveg) {
                    showAlert("Ha az alkérdés rendelkezik 'NEM' ággal, a tagadás szövegének megadása kötelező!");
                    return;
                }

                if (vanNemAg && !szoveges && !maxi && negaltErtek === 0) {
                    showAlert("Az alkérdés 'NEM' ágának pontszáma nem lehet 0!");
                    return;
                }

                if (btnMent.dataset.busy === '1') return;
                btnMent.dataset.busy = '1';
                btnMent.disabled = true;

                const eredmeny = {
                    kindex,
                    szoveg,
                    ertek,
                    szoveges,
                    maxi,
                    opcios,
                    vanNemAg,
                    negaltSzoveg,
                    negaltErtek,
                    valasz: 'ures'
                };

                deactivateInlineEditorFocus(ujSub);
                resolve({ elem: ujSub, adat: eredmeny });
            });
        });
    }

    static edit(referenciaElem, foKerdes, igenAlkerdesek, nemAlkerdesek) {
        return new Promise((resolve) => {
            const tempId = Date.now();
            const szoveges = foKerdes.szoveges == 1;
            const maxi = foKerdes.maximalis_szint == 1 || foKerdes.maximalisSzint == 1;
            const opcios = foKerdes.opcios == 1 || foKerdes.opcios === true;
            const vanNemAg = !opcios && (!!foKerdes.negaltKerdesSzoveg || foKerdes.negalt_ertek > 0 || foKerdes.hasNemAg);
            const isAlkerdes = !!foKerdes.parentId;

            const ui = createQuestionShell({
                tempId,
                kindex: foKerdes.kindex,
                szoveg: foKerdes.szoveg || '',
                ertek: foKerdes.ertek || 0,
                szoveges,
                maxi,
                opcios,
                vanNemAg,
                negaltSzoveg: foKerdes.negaltKerdesSzoveg || '',
                negaltErtek: foKerdes.negalt_ertek || 0,
                isEdit: true,
                isAlkerdes
            });

            referenciaElem.style.display = 'none';
            referenciaElem.after(ui.ujModul);
            ensurePlainSorszamLabels(ui.ujModul);
            activateInlineEditorFocus(ui.ujModul);

            const betoltAlkerdesek = (adatok, celLista) => {
                adatok.forEach(alk => {
                    const sub = InlineQuestionCreator.createAlkerdesUI({
                        alkId: alk.id || alk.al_id,
                        parentId: foKerdes.id,
                        kindex: alk.kindex,
                        szoveg: alk.szoveg || alk.kerdes_szoveg || '',
                        ertek: alk.ertek || 0,
                        szoveges: alk.szoveges == 1,
                        maxi: alk.maximalis_szint == 1 || alk.maximalisSzint == 1,
                        opcios: alk.opcios == 1 || alk.opcios === true,
                        vanNemAg: !!(alk.negaltKerdesSzoveg || alk.negalt_kerdes_szoveg) || (alk.negalt_ertek > 0) || (alk.negaltErtek > 0),
                        negaltSzoveg: alk.negaltKerdesSzoveg || alk.negalt_kerdes_szoveg || '',
                        negaltErtek: alk.negalt_ertek || alk.negaltErtek || 0
                    }, false);
                    celLista.appendChild(sub);
                    ensurePlainSorszamLabels(sub);
                    bindSubQuestionRemove(sub, celLista);
                });
            };

            betoltAlkerdesek(igenAlkerdesek, ui.listaIgen);
            betoltAlkerdesek(nemAlkerdesek, ui.listaNem);

            bindMainQuestionBehaviour(ui, { emptyReferenceText: 'a főkérdéshez', isEdit: true });

            const btnFoMegse = ui.ujModul.querySelector(':scope > .kisgombok .btn-inline-megse');
            const btnFoMent = ui.ujModul.querySelector(':scope > .kisgombok .btn-inline-mentes');

            btnFoMegse?.addEventListener('click', () => {
                deactivateInlineEditorFocus(ui.ujModul);
                ui.ujModul.remove();
                referenciaElem.style.display = '';
                resolve(null);
            });

            btnFoMent?.addEventListener('click', () => {
                const szoveg = ui.ujModul.querySelector('.inline-szoveg-input').value.trim();
                const szovegesVeg = ui.controls.szovegesInput.checked;
                const vanNemAgVeg = ui.controls.nemAgInput.checked;
                const opciosVeg = ui.controls.opcioInput?.checked || false;
                const fokerdesNegaltSzoveg = vanNemAgVeg && !szovegesVeg ? ui.ujModul.querySelector('.inline-negalt-szoveg-input').value.trim() : '';

                const igenAlkerdesek = extractAlkerdesek(ui.listaIgen, 'igen', foKerdes);
                const nemAlkerdesek = extractAlkerdesek(ui.listaNem, 'nem', foKerdes);
                const osszesAlkerdes = [...igenAlkerdesek, ...nemAlkerdesek];

                const maxiVeg = ui.ujModul.querySelector('.inline-maxi-checkbox').checked;
                const ertekVeg = parseFloat(ui.ujModul.querySelector('.inline-ertek-input').value) || 0;
                const negaltErtekVeg = parseFloat(ui.ujModul.querySelector('.inline-negalt-ertek-input').value) || 0;

                if (!validateFoKerdes({
                    szoveg,
                    szovegesVeg,
                    vanNemAgVeg,
                    fokerdesNegaltSzoveg,
                    maxiVeg,
                    ertekVeg,
                    negaltErtekVeg,
                    osszesAlkerdes,
                    noSubQuestionLabel: 'kérdés'
                })) return;

                const result = {
                    id: foKerdes.id,
                    kerdesSzoveg: szoveg,
                    ertek: ertekVeg,
                    szoveges: szovegesVeg ? 1 : 0,
                    opcios: opciosVeg ? 1 : 0,
                    maximalis_szint: maxiVeg ? 1 : 0,
                    negaltKerdesSzoveg: vanNemAgVeg && !szovegesVeg ? ui.ujModul.querySelector('.inline-negalt-szoveg-input').value.trim() : '',
                    negalt_ertek: vanNemAgVeg && !szovegesVeg ? negaltErtekVeg : 0,
                    kindex: parseInt(ui.ujModul.querySelector('.kerdes-sorszam-jelzo2').value) || foKerdes.kindex,
                    foKategoria: foKerdes.foKategoria,
                    alKategoria: foKerdes.alKategoria,
                    altTema: foKerdes.altTema,
                    alkerdesek: osszesAlkerdes
                };

                deactivateInlineEditorFocus(ui.ujModul);
                ui.ujModul.remove();
                referenciaElem.style.display = '';
                resolve(result);
            });
        });
    }
}
