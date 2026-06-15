function wizardEl(tag, options = {}, ...children) {
    const node = document.createElement(tag);

    if (options.className) node.className = options.className;
    if (options.id) node.id = options.id;
    if (options.text !== undefined) node.textContent = options.text;
    if (options.type) node.type = options.type;
    if (options.value !== undefined) node.value = options.value;
    if (options.checked !== undefined) node.checked = !!options.checked;
    if (options.disabled !== undefined) node.disabled = !!options.disabled;
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

    children.flat().forEach(child => {
        if (child === null || child === undefined || child === false) return;
        if (child instanceof Node) {
            node.appendChild(child);
            return;
        }
        node.appendChild(document.createTextNode(String(child)));
    });

    return node;
}

const QUESTION_TYPE_ACTIONS = [
    {
        id: 'simple',
        badge: 'Egy ág',
        label: 'Egyágú kérdés',
        description: 'Sima pontozott kérdés vagy állítás. Csak az IGEN válasz kap pontszámot.',
        resultText: 'A szerkesztő egyágú, pontozott kérdésként nyílik meg.'
    },
    {
        id: 'yes-no',
        badge: 'Két ág',
        label: 'Kétágú kérdés',
        description: 'A kérdésnek külön IGEN és NEM ága is van, külön pontszámmal.',
        resultText: 'A „Rendelkezik NEM ággal” be lesz pipálva, és megjelenik a tagadó kérdés mező.'
    },
    {
        id: 'text',
        badge: 'Szöveg',
        label: 'Szöveges mező',
        description: 'Nem pontozott megjegyzés vagy szabad szöveges válaszmező.',
        resultText: 'A „Szöveges” be lesz pipálva, a pontszámmező és a válaszcsúszka nem lesz aktív.'
    },
    {
        id: 'option',
        badge: 'Opció',
        label: 'Opció mező',
        description: 'Pontozott, csak IGEN ágas választás. Azonos csoporton belül csak egy jelölhető.',
        resultText: 'A szerkesztő opciós, pontozott kérdésként nyílik meg.'
    }
];

const SUBQUESTION_TYPE_ACTIONS = [
    {
        id: 'simple',
        badge: 'Egy ág',
        label: 'Egyágú alkérdés',
        description: 'Egyszerű, pontozott alkérdés saját NEM ág nélkül.',
        resultText: 'Egyágú pontozott alkérdés jön létre.'
    },
    {
        id: 'yes-no',
        badge: 'Két ág',
        label: 'Kétágú alkérdés',
        description: 'Az alkérdésnek saját IGEN és NEM ága is lesz.',
        resultText: 'A „Rendelkezik NEM ággal” be lesz pipálva.'
    },
    {
        id: 'text',
        badge: 'Szöveg',
        label: 'Szöveges mező',
        description: 'Nem pontozott alkérdés, megjegyzés vagy szöveges válaszmező.',
        resultText: 'A „Szöveges” be lesz pipálva, a pontszámmező eltűnik.'
    },
    {
        id: 'template',
        badge: 'Sablon',
        label: 'Sablon alkérdés',
        description: 'Előre mentett alkérdéscsoport betöltése az aktuális ágba.',
        resultText: 'A következő lépésben sablont választhat.'
    },
    {
        id: 'option',
        badge: 'Opció',
        label: 'Opció alkérdés',
        description: 'Pontozott, csak IGEN ágas alkérdés. Azonos főkérdés alatt csak egy jelölhető.',
        resultText: 'Opciós, pontozott alkérdés jön létre.'
    }
];


const TEMPLATE_BUILDER_SUBQUESTION_TYPE_ACTIONS = SUBQUESTION_TYPE_ACTIONS.filter(action => {
    return action.id !== 'yes-no' && action.id !== 'template';
});

function hasNemPreview(action) {
    return action.id === 'yes-no';
}

function createSliderPreview(action) {
    const vanNemAg = hasNemPreview(action);
    const muted = action.id === 'text' || action.id === 'template';
    const isOption = action.id === 'option';

    return wizardEl('div', {
        className: `csuszka csuszka-valtozo question-insert-wizard-preview-slider${vanNemAg ? ' csuszka2' : ''}${muted ? ' is-preview-muted' : ''}${isOption ? ' is-opcio-preview' : ''}`
    },
        wizardEl('label', {
            className: 'labelnem',
            style: { display: vanNemAg ? 'inline-block' : 'none' }
        },
            wizardEl('input', {
                type: 'radio',
                className: `nem${vanNemAg ? ' nem2' : ''}`,
                disabled: true,
                attrs: { tabindex: '-1', value: 'nem' }
            }),
            wizardEl('div', { className: 'material-symbols-rounded nemszoveg', text: 'close' })
        ),
        wizardEl('label', { className: `labelures${vanNemAg ? ' labelures2' : ''}` },
            wizardEl('input', {
                type: 'radio',
                className: `ures${vanNemAg ? ' ures2' : ''}`,
                checked: true,
                disabled: true,
                attrs: { tabindex: '-1', value: 'ures' }
            }),
            wizardEl('div', { className: 'material-symbols-rounded uresszoveg', text: 'settings_ethernet' })
        ),
        wizardEl('label', { className: `labeligen${vanNemAg ? ' labeligen2' : ''}` },
            wizardEl('input', {
                type: 'radio',
                className: `igen${vanNemAg ? ' igen2' : ''}`,
                disabled: true,
                attrs: { tabindex: '-1', value: 'igen' }
            }),
            wizardEl('div', {
                className: `material-symbols-rounded igenszoveg${isOption ? ' opcio-radio-preview-icon' : ''}`,
                text: isOption ? 'radio_button_unchecked' : 'check'
            })
        ),
        wizardEl('div', {
            className: 'gomboc',
            style: { transform: vanNemAg ? 'translate(0px, 0px) rotate(45deg)' : 'translate(-20px, 0px) rotate(45deg)' }
        })
    );
}

function createPreview(action, mode) {
    const isText = action.id === 'text';
    const isTemplate = action.id === 'template';
    const preview = wizardEl('div', { className: 'question-insert-wizard-preview' });
    const title = mode === 'subquestion' ? 'Alkérdés' : 'Kérdés';
    const inputLabel = isTemplate ? 'Sablonból betöltött alkérdés' : (isText ? 'Szöveges mező' : title);

    const question = wizardEl('div', { className: 'kerdesmodul question-insert-wizard-preview-kerdesmodul' },
        wizardEl('div', { className: 'question' },
            wizardEl('div', { className: 'inline-fejlec' },
                wizardEl('label', { className: isText ? '' : 'is-preview-active' }, 'Pontozott'),
                wizardEl('label', { className: isText ? 'is-preview-active' : '' }, 'Szöveges'),
                wizardEl('label', { className: hasNemPreview(action) ? 'is-preview-active' : '' }, 'NEM ág'),
                wizardEl('label', { className: action.id === 'option' ? 'is-preview-active' : '' }, 'Opció')
            ),
            wizardEl('div', { className: 'question-insert-wizard-preview-body' },
                wizardEl('div', { className: 'color-picker-input-container inline-szoveg-container' },
                    wizardEl('div', { className: 'editor-input-number inline-szoveg-input', text: inputLabel })
                ),
                wizardEl('div', {
                    className: `szerkesztolec inline-szerkesztolec${isText ? ' is-preview-muted' : ''}`
                },
                    wizardEl('div', { className: 'ertek inline-ertek-blokk', text: isText ? 'szöveg' : 'pont' })
                ),
                createSliderPreview(action)
            )
        )
    );

    preview.appendChild(question);
    return preview;
}

function buildOption(action, mode) {
    const button = wizardEl('button', {
        type: 'button',
        className: 'question-insert-wizard-option',
        dataset: { action: action.id },
        attrs: { role: 'radio', 'aria-checked': 'false' }
    },
        wizardEl('span', { className: 'question-insert-wizard-radio' }),
        wizardEl('span', { className: 'question-insert-wizard-text' },
            wizardEl('span', { className: 'question-insert-wizard-badge', text: action.badge || '' }),
            wizardEl('strong', { text: action.label }),
            wizardEl('span', { className: 'question-insert-wizard-description', text: action.description || '' })
        ),
        createPreview(action, mode)
    );

    return button;
}

function createStyles() {
    return wizardEl('style', { text: `
        .question-insert-wizard-modal {
            width: min(760px, calc(100vw - 32px));
            color: #222;
        }

        .question-insert-wizard-modal .question-insert-wizard-lead {
            margin: -4px 0 14px;
            font-size: 13px;
            line-height: 1.45;
            opacity: .78;
        }

        .question-insert-wizard-modal .question-insert-wizard-step-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 8px 0 16px;
            font-size: 12px;
            opacity: .78;
        }

        .question-insert-wizard-modal .question-insert-wizard-step-pill {
            border: 1px solid rgba(31, 143, 77, .28);
            background: rgba(31, 143, 77, .08);
            border-radius: 999px;
            padding: 4px 9px;
        }

        .question-insert-wizard-modal .question-insert-wizard-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin: 16px 0;
        }

        .question-insert-wizard-modal .question-insert-wizard-option {
            width: 100%;
            border: 1px solid rgba(255, 140, 0, 0.38);
            background: rgba(255, 140, 0, 0.06);
            border-radius: 14px;
            padding: 12px;
            cursor: pointer;
            text-align: left;
            color: #222;
            font-family: inherit;
            display: grid;
            grid-template-columns: 22px minmax(210px, 1fr) minmax(230px, .85fr);
            gap: 12px;
            align-items: center;
            transition: border-color .15s ease, background .15s ease, box-shadow .15s ease, transform .15s ease;
        }

        .question-insert-wizard-modal .question-insert-wizard-option:hover {
            transform: translateY(-1px);
            border-color: rgba(31, 143, 77, .52);
            background: rgba(31, 143, 77, .07);
        }

        .question-insert-wizard-modal .question-insert-wizard-option.is-selected {
            border-color: #1f8f4d;
            background: rgba(31, 143, 77, .12);
            box-shadow: 0 0 0 2px rgba(31, 143, 77, .16);
        }

        .question-insert-wizard-modal .question-insert-wizard-radio {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(0, 0, 0, .35);
            border-radius: 999px;
            position: relative;
            background: rgba(255, 255, 255, .75);
        }

        .question-insert-wizard-modal .question-insert-wizard-option.is-selected .question-insert-wizard-radio {
            border-color: #1f8f4d;
        }

        .question-insert-wizard-modal .question-insert-wizard-option.is-selected .question-insert-wizard-radio::after {
            content: '';
            position: absolute;
            inset: 3px;
            border-radius: 999px;
            background: #1f8f4d;
        }

        .question-insert-wizard-modal .question-insert-wizard-text {
            display: block;
        }

        .question-insert-wizard-modal .question-insert-wizard-badge {
            display: inline-flex;
            width: fit-content;
            margin-bottom: 6px;
            padding: 3px 8px;
            border-radius: 999px;
            background: rgba(0,0,0,.06);
            font-size: 11px;
            line-height: 1.2;
            opacity: .82;
        }

        .question-insert-wizard-modal .question-insert-wizard-text strong {
            display: block;
            font-size: 15px;
            line-height: 1.25;
        }

        .question-insert-wizard-modal .question-insert-wizard-description {
            display: block;
            font-size: 12px;
            opacity: .75;
            margin-top: 5px;
            line-height: 1.35;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview {
            border-radius: 12px;
            background: rgba(255, 255, 255, .72);
            border: 1px dashed rgba(0, 0, 0, .12);
            padding: 9px;
            overflow: hidden;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview-kerdesmodul {
            width: 100%;
            margin: 0;
            padding: 0;
            background: transparent;
            box-shadow: none;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview-body {
            display: grid;
            grid-template-columns: minmax(92px, 1fr) auto auto;
            align-items: center;
            gap: 8px;
            font-size: 11px;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .inline-fejlec {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-bottom: 8px;
            font-size: 10px;
            opacity: .72;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .inline-fejlec label {
            border-radius: 999px;
            padding: 2px 6px;
            background: rgba(0,0,0,.05);
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .inline-fejlec label.is-preview-active {
            background: rgba(31, 143, 77, .16);
            color: #155f35;
            font-weight: 700;
        }


        .question-insert-wizard-modal .question-insert-wizard-preview-slider.is-opcio-preview .opcio-radio-preview-icon {
            font-size: 23px;
            color: #1f8f4d;
        }

        .question-insert-wizard-modal .question-insert-wizard-option.is-selected .question-insert-wizard-preview-slider.is-opcio-preview .opcio-radio-preview-icon {
            font-variation-settings: 'FILL' 1;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .inline-szoveg-container,
        .question-insert-wizard-modal .question-insert-wizard-preview .inline-szerkesztolec {
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,.1);
            background: rgba(255,255,255,.8);
            padding: 6px 8px;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .editor-input-number {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .inline-ertek-blokk {
            min-width: 44px;
            justify-content: center;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .question-insert-wizard-preview-slider {
            width: 100px;
            min-width: 100px;
            transform: scale(.72);
            transform-origin: center;
            pointer-events: none;
        }

        .question-insert-wizard-modal .question-insert-wizard-preview .question-insert-wizard-preview-slider.is-preview-muted,
        .question-insert-wizard-modal .question-insert-wizard-preview .is-preview-muted {
            opacity: .46;
            filter: grayscale(.45);
        }

        .question-insert-wizard-modal .question-insert-wizard-result {
            min-height: 42px;
            border-radius: 12px;
            padding: 10px 12px;
            background: rgba(31, 143, 77, .08);
            border: 1px solid rgba(31, 143, 77, .16);
            font-size: 13px;
            line-height: 1.4;
            color: #1c4f33;
        }

        .question-insert-wizard-modal .question-insert-wizard-next:disabled {
            opacity: .45;
            cursor: not-allowed;
        }

        .question-insert-wizard-modal.question-insert-wizard--template .question-insert-wizard-option {
            grid-template-columns: 22px minmax(240px, 1fr);
        }

        .question-insert-wizard-modal.question-insert-wizard--template .question-insert-wizard-preview {
            display: none;
        }

        @media (max-width: 780px) {
            .question-insert-wizard-modal .question-insert-wizard-option {
                grid-template-columns: 22px 1fr;
            }

            .question-insert-wizard-modal .question-insert-wizard-preview {
                grid-column: 1 / -1;
            }
        }
    ` });
}

function openWizard({ mode, title, lead, actions, confirmLabel = 'Tovább', stepText = '1. lépés' }) {
    return new Promise((resolve) => {
        const overlay = wizardEl('div', { className: 'color-picker-overlay question-insert-wizard-overlay' });
        const modal = wizardEl('div', { className: `color-picker-modal question-insert-wizard-modal question-insert-wizard--${mode}` });

        const titleEl = wizardEl('h3', { className: 'color-picker-title', text: title });
        const leadEl = lead ? wizardEl('p', { className: 'question-insert-wizard-lead', text: lead }) : null;
        const stepRow = wizardEl('div', { className: 'question-insert-wizard-step-row' },
            wizardEl('span', { className: 'question-insert-wizard-step-pill', text: stepText }),
            wizardEl('span', { text: 'Válasszon típust, majd nyomjon a Tovább gombra. (Létrehozás után a "tulajdonságok" fölön tudja módosítani a típust)' })
        );
        const list = wizardEl('div', {
            className: 'question-insert-wizard-list',
            attrs: { role: 'radiogroup', 'aria-label': title }
        }, actions.map(action => buildOption(action, mode)));
        const result = wizardEl('div', { className: 'question-insert-wizard-result', text: 'Még nincs kiválasztott típus.' });
        const cancelButton = wizardEl('button', { id: 'question-insert-wizard-cancel', className: 'color-picker-btn-cancel', text: 'Mégse' });
        const nextButton = wizardEl('button', { id: 'question-insert-wizard-next', className: 'color-picker-btn-save question-insert-wizard-next', text: confirmLabel, disabled: true });
        const buttonRow = wizardEl('div', { className: 'color-picker-btn-container' }, cancelButton, nextButton);

        modal.append(createStyles(), titleEl);
        if (leadEl) modal.appendChild(leadEl);
        modal.append(stepRow, list, result, buttonRow);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        let selectedAction = null;
        const buttons = Array.from(modal.querySelectorAll('.question-insert-wizard-option'));

        const selectButton = (button) => {
            selectedAction = button.dataset.action;
            const actionData = actions.find(action => action.id === selectedAction);

            buttons.forEach(item => {
                const active = item === button;
                item.classList.toggle('is-selected', active);
                item.setAttribute('aria-checked', active ? 'true' : 'false');
            });

            result.textContent = actionData?.resultText || 'A választott típus alapján nyílik meg a szerkesztő.';
            nextButton.disabled = false;
        };

        const close = (value) => {
            if (document.body.contains(overlay)) document.body.removeChild(overlay);
            resolve(value);
        };

        cancelButton.addEventListener('click', () => close(null));
        nextButton.addEventListener('click', () => close(selectedAction));

        buttons.forEach((button, index) => {
            button.addEventListener('click', () => selectButton(button));
            button.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
                e.preventDefault();

                const direction = e.key === 'ArrowDown' ? 1 : -1;
                const nextIndex = (index + direction + buttons.length) % buttons.length;
                buttons[nextIndex].focus();
                selectButton(buttons[nextIndex]);
            });
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close(null);
        });
    });
}

export class QuestionInsertWizard {
    static chooseQuestionType() {
        return openWizard({
            mode: 'question',
            title: 'Milyen kérdést szeretne létrehozni?',
            lead: 'A választás után a kérdésszerkesztő előre beállított állapotban nyílik meg.',
            stepText: 'Kérdés típusa',
            actions: QUESTION_TYPE_ACTIONS
        });
    }

    static chooseSubQuestionType(ag) {
        const agLabel = ag === 'nem' ? 'NEM' : 'IGEN';
        return openWizard({
            mode: 'subquestion',
            title: `Mit szeretne hozzáadni a(z) ${agLabel} ághoz?`,
            lead: 'A választás után az alkérdés a megfelelő kezdő beállításokkal kerül be az aktuális ágba.',
            stepText: 'Alkérdés típusa',
            actions: SUBQUESTION_TYPE_ACTIONS
        });
    }

    static chooseStandaloneSubQuestionType(ag = 'igen') {
        const agLabel = ag === 'nem' ? 'NEM' : 'IGEN';
        return openWizard({
            mode: 'subquestion',
            title: `Mit szeretne hozzáadni a(z) ${agLabel} ághoz?`,
            lead: 'A választás után az alkérdés a megfelelő kezdő beállításokkal kerül be az aktuális ágba.',
            stepText: 'Alkérdés típusa',
            actions: SUBQUESTION_TYPE_ACTIONS
        });
    }

    static chooseTemplateBuilderSubQuestionType(ag = 'igen') {
        const agLabel = ag === 'nem' ? 'NEM' : 'IGEN';
        return openWizard({
            mode: 'subquestion',
            title: `Milyen alkérdés kerüljön a(z) ${agLabel} ágba?`,
            lead: 'A sablon-létrehozásnál kétágú alkérdés nem választható. Az ág kiválasztása a nulladik lépésben történik.',
            stepText: '1. lépés: alkérdés típusa',
            actions: TEMPLATE_BUILDER_SUBQUESTION_TYPE_ACTIONS
        });
    }

    static chooseTemplate(ag, csoportok = []) {
        const agLabel = ag === 'nem' ? 'NEM' : 'IGEN';
        const actions = csoportok.map(csoport => ({
            id: String(csoport.index),
            badge: `${csoport.count} elem`,
            label: csoport.nev || 'Névtelen sablon',
            description: `Sablon betöltése a(z) ${agLabel} ágba.`,
            resultText: `A(z) „${csoport.nev || 'Névtelen sablon'}” sablon elemei kerülnek be a(z) ${agLabel} ágba.`
        }));

        return openWizard({
            mode: 'template',
            title: `Melyik sablont szeretné betölteni a(z) ${agLabel} ágba?`,
            lead: 'A sablon elemei az aktuális ág meglévő alkérdései után kerülnek be.',
            stepText: 'Sablon kiválasztása',
            confirmLabel: 'Betöltés',
            actions
        });
    }
}
