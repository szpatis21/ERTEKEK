import { showAlert } from '/both/alert.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function escapeAttr(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

function previewLabel(value, fallback) {
    const clean = String(value || '').trim();
    return escapeHtml(clean || fallback);
}

function safePreviewColor(value, fallback = '#007bff') {
    const clean = String(value || '').trim();

    if (
        /^#[0-9a-f]{3,8}$/i.test(clean) ||
        /^rgba?\([^)]+\)$/i.test(clean) ||
        /^hsla?\([^)]+\)$/i.test(clean)
    ) {
        return clean;
    }

    return fallback;
}

function renderPreview(preview = {}) {
    const type = preview.type || 'generic';
    const foColor = safePreviewColor(preview.foColor, '#007bff');

    const questionBox = `
        <div class="kerdesmodul">
            <div class="question">
                <div class="question-belso">
                    <div class="question-szoveg">Kérdés/Állítás</div>
                    <div class="question-csuszka">
                        <div class="csuszka2">
                            <label class="labelnem">
                                <input type="radio" class="nem" tabindex="-1">
                                <div class="material-symbols-rounded nemszoveg">close</div>

                                <input type="radio" class="ures2" tabindex="-1">
                                <div class="material-symbols-rounded uresszoveg">settings_ethernet</div>
                            </label>

                            <label class="labeligen2">
                                <input type="radio" class="igen2" tabindex="-1">
                                <div class="material-symbols-rounded igenszoveg">check</div>
                            </label>

                            <div class="gomboc"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    const alBox = `
        <div class="al-blokk">
            <div class="category al" style="background:${foColor};">
                <div class="cim">További bontás</div>
            </div>
            <div class="al-direkt-kerdesek hidden" style="border-color:${foColor}; border-style:solid; border-width:3px;"></div>
            <div class="al-belso-alt-temak hidden" style="border-color:${foColor}; border-style:solid; border-width:3px;"></div>
        </div>
    `;

    const altBox = `
        <div class="category alal" style="border-color:${foColor}; border-style:solid; border-width:2px;">
            <div class="cim">Kisebb bontás</div>
        </div>
    `;

    const arrow = `<div class="add-preview-arrow">➜</div>`;

    const flow = (...items) => `
        <div class="add-preview-flow">
            ${items.join('')}
        </div>
    `;

    const templates = {
        'question-only': flow(questionBox),
        'fo-question': flow(questionBox),
        'fo-breakdown': flow(alBox),
        'fo-al': flow(alBox, arrow, altBox, arrow, questionBox),
        'fo-alt': flow(altBox, arrow, questionBox),
        'al-question': flow(questionBox),
        'al-alt': flow(altBox, arrow, questionBox),
        'generic': flow(questionBox)
    };

    return `
        <div class="add-action-preview-tree" aria-hidden="true">
            ${templates[type] || templates.generic}
        </div>
    `;
}


function isDirectQuestionAction(action = {}) {
    const id = String(action.id || '').toLowerCase();
    const type = String(action.preview?.type || '').toLowerCase();

    return (
        type === 'question-only' ||
        type === 'fo-question' ||
        type === 'al-question' ||
        id.includes('question') ||
        id.includes('kerdes')
    );
}

function sortActionsWithQuestionsLast(actions = []) {
    return [...actions].sort((a, b) => {
        const aQuestion = isDirectQuestionAction(a);
        const bQuestion = isDirectQuestionAction(b);

        if (aQuestion === bQuestion) return 0;
        return aQuestion ? 1 : -1;
    });
}

export class AddActionChooser {
    static open({
        title = 'Mit szeretne hozzáadni?',
        lead = '',
        actions = [],
        confirmLabel = 'Tovább'
    } = {}) {
        return new Promise((resolve) => {
            if (!Array.isArray(actions) || actions.length === 0) {
                showAlert('Nincs elérhető hozzáadási lehetőség.');
                resolve(null);
                return;
            }

            const orderedActions = sortActionsWithQuestionsLast(actions);

            const overlay = document.createElement('div');
            overlay.className = 'color-picker-overlay';

            const modal = document.createElement('div');
            modal.className = 'color-picker-modal add-action-modal';
            modal.style.width = '76vh';
            modal.style.maxWidth = 'calc(100vw - 32px)';

            const safeTitle = escapeHtml(title);
            const safeLead = escapeHtml(lead);

            modal.innerHTML = `
                <style>
                    .add-action-modal .add-action-lead {
                        margin: -4px 0 14px;
                        font-size: 13px;
                        line-height: 1.45;
                        opacity: .78;
                        color: #222;
                    }

                    .add-action-modal .add-action-list {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                        margin: 18px 0;
                    }

                    .add-action-modal .add-action-option {
                        width: 100%;
                        border: 1px solid rgba(255, 140, 0, 0.38);
                        background: rgba(255, 140, 0, 0.06);
                        border-radius: 14px;
                        padding: 12px;
                        cursor: pointer;
                        text-align: left;
                        color: #222;
                        font-family: inherit;
                        display: flex;
                           flex-wrap: wrap;
                        gap: 12px;
                        align-items: center;
                        transition: border-color .15s ease, background .15s ease, box-shadow .15s ease, transform .15s ease;
                    }

                    .add-action-modal .add-action-option:hover {
                        transform: translateY(-1px);
                        border-color: rgba(31, 143, 77, .52);
                        background: rgba(31, 143, 77, .07);
                    }

                    .add-action-modal .add-action-option.is-selected {
                        border-color: #1f8f4d;
                        background: rgba(31, 143, 77, .12);
                        box-shadow: 0 0 0 2px rgba(31, 143, 77, .16);
                    }

                    .add-action-modal .add-action-radio {
                        width: 18px;
                        height: 18px;
                        border: 2px solid rgba(0, 0, 0, .35);
                        border-radius: 999px;
                        position: relative;
                        background: rgba(255, 255, 255, .75);
                    }

                    .add-action-modal .add-action-option.is-selected .add-action-radio {
                        border-color: #1f8f4d;
                    }

                    .add-action-modal .add-action-option.is-selected .add-action-radio::after {
                        content: '';
                        position: absolute;
                        inset: 3px;
                        border-radius: 999px;
                        background: #1f8f4d;
                    }

                    .add-action-modal .add-action-text strong {
                        display: block;
                        font-size: 15px;
                        line-height: 1.25;
                        
                    }
                    
                    .add-action-modal .add-action-text span {
                        display: block;
                        font-size: 12px;
                        opacity: .75;
                        margin-top: 5px;
                        line-height: 1.35;
                    }

                    .add-action-modal .add-action-preview-tree {
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.72);
                        border: 1px dashed rgba(0, 0, 0, 0.12);
                        padding: 10px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        overflow: hidden;
                        width: 100%;
                    }

                    .add-action-modal .add-preview-flow {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        min-width:250px;
                        flex-wrap: wrap;
                    }
                    .add-preview-flow .question{
                        width: -webkit-fill-available;
                    }
                        .add-preview-flow  .kerdesmodul {width:180px}
                        .add-preview-flow .uresszoveg{left:38px}
                                                .add-preview-flow .igenszoveg{left:70px}
.add-preview-flow .al{width: 17vh}
                        .add-preview-flow .csuszka2{width: 100px}

                    .add-action-modal .add-preview-arrow {
                        font-size: 18px;
                        line-height: 1;
                        color: rgba(0, 0, 0, 0.52);
                        font-weight: 700;
                    }

                    /* KÉRDÉS MINI ELŐNÉZET */
                    .add-action-modal .add-preview-question-real {
                        width: 152px !important;
                        min-height: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: transparent !important;
                        border: 0 !important;
                        box-shadow: none !important;
                    }

                    
                

                   

                 

                    .add-action-modal .add-preview-question-real input {
                        display: none !important;
                    }

                  
                  

                    /* ALKATEGÓRIA MINI ELŐNÉZET */
                    


                 

                    .add-action-modal .add-preview-al-real .al-direkt-kerdesek,
                    .add-action-modal .add-preview-al-real .al-belso-alt-temak {
                        display: none !important;
                    }

                    /* ALTÉMA MINI ELŐNÉZET */
                    .add-action-modal .add-preview-alt-real {
                        width: 132px !important;
                        min-height: 38px !important;
                        margin: 0 !important;
                        padding: 7px 8px !important;
                        border-radius: 10px !important;
                        background: rgba(255, 255, 255, 0.78) !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        box-shadow: 0 4px 10px rgba(0,0,0,.08) !important;
                    }

                   

                    .add-action-modal .add-action-next:disabled {
                        opacity: .45;
                        cursor: not-allowed;
                    }

                    @media (max-width: 760px) {
                        .add-action-modal .add-action-option {
                            grid-template-columns: 24px 1fr;
                        }

                        .add-action-modal .add-action-preview-tree {
                            grid-column: 1 / -1;
                        }
                    }

                    @media (max-width: 520px) {
                        .add-action-modal .add-preview-flow {
                            gap: 7px;
                        }

                        .add-action-modal .add-preview-question-real,
                        .add-action-modal .add-preview-question-real .question,
                        .add-action-modal .add-preview-al-real,
                        .add-action-modal .add-preview-al-real .category.al,
                        .add-action-modal .add-preview-alt-real {
                            width: 118px !important;
                        }

                        .add-action-modal .add-preview-question-real .question {
                            min-height: 56px !important;
                        }

                        .add-action-modal .add-preview-question-real .csuszka2 {
                            width: 86px !important;
                        }

                        .add-action-modal .add-preview-question-real .gomboc {
                            left: 33px !important;
                        }
                    }
                </style>

                <h3 class="color-picker-title">${safeTitle}</h3>
                ${safeLead ? `<p class="add-action-lead">${safeLead}</p>` : ''}

                <div class="add-action-list" role="radiogroup" aria-label="${escapeAttr(title)}">
                    ${orderedActions.map(action => `
                        <button
                            type="button"
                            class="add-action-option"
                            data-action="${escapeAttr(action.id)}"
                            role="radio"
                            aria-checked="false"
                        >
                            <span class="add-action-radio"></span>

                            <span class="add-action-text">
                                <strong>${escapeHtml(action.label)}</strong>
                                <span>${escapeHtml(action.description || '')}</span>
                            </span>

                            ${renderPreview(action.preview || {})}
                        </button>
                    `).join('')}
                </div>

                <div class="color-picker-btn-container">
                    <button id="add-action-megse" class="color-picker-btn-cancel">Mégse</button>
                    <button id="add-action-next" class="color-picker-btn-save add-action-next" disabled>${escapeHtml(confirmLabel)}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            let selectedAction = null;
            const buttons = Array.from(modal.querySelectorAll('.add-action-option'));
            const nextButton = modal.querySelector('#add-action-next');

            const selectButton = (button) => {
                selectedAction = button.dataset.action;

                buttons.forEach(item => {
                    const active = item === button;
                    item.classList.toggle('is-selected', active);
                    item.setAttribute('aria-checked', active ? 'true' : 'false');
                });

                nextButton.disabled = false;
            };

            const close = (value) => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }

                resolve(value);
            };

            modal.querySelector('#add-action-megse').addEventListener('click', () => {
                close(null);
            });

            nextButton.addEventListener('click', () => {
                close(selectedAction);
            });

            buttons.forEach((button, index) => {
                button.addEventListener('click', () => {
                    selectButton(button);
                });

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
                if (e.target === overlay) {
                    close(null);
                }
            });
        });
    }
}