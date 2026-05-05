// category_editor.js

import { showAlert } from "/both/alert.js";

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

function safeBackground(value) {
    const hatter = String(value ?? '').trim();

    // Hex, rgb/rgba, linear-gradient engedélyezve.
    // Ha bármi gyanús jön, kap egy semleges hátteret.
    if (
        /^#[0-9a-f]{3,8}$/i.test(hatter) ||
        /^rgba?\([^)]+\)$/i.test(hatter) ||
        /^linear-gradient\(.+\)$/i.test(hatter)
    ) {
        return hatter;
    }

    return '#006cb5';
}

export class CategoryEditor {
    static open(jelenlegiCim, jelenlegiLeiras, jelenlegiHatter) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'color-picker-overlay';

            const modal = document.createElement('div');
            modal.className = 'color-picker-modal';
            modal.style.width = '450px';

            const biztonsagosCimHtml = escapeHtml(jelenlegiCim);
            const biztonsagosLeirasHtml = escapeHtml(jelenlegiLeiras);
            const biztonsagosCimAttr = escapeAttr(jelenlegiCim);
            const biztonsagosHatter = safeBackground(jelenlegiHatter);

            modal.innerHTML = `
                <h3 class="color-picker-title">
                    Témakör szerkesztése
                </h3>

                <div class="minta" style="margin-bottom: 20px; justify-content: center;">
                    <div id="live-preview-card" class="category fo color-picker-preview-card" style="background: ${biztonsagosHatter}; min-height: 80px;">
                        <div class="cim">${biztonsagosCimHtml}</div>
                        <div class="leiras">${biztonsagosLeirasHtml}</div>
                    </div>
                </div>

                <div class="color-picker-input-container">
                    <label for="editor-cim" class="color-picker-label">Cím:</label>
                    <input type="text" id="editor-cim" value="${biztonsagosCimAttr}" style="width: 100%; color: black; font-family: inherit;">
                </div>

                <div class="color-picker-input-container">
                    <label for="editor-leiras" class="color-picker-label">Leírás:</label>
                    <textarea id="editor-leiras" rows="3" style="width: 100%; color: black; font-family: inherit;"></textarea>
                </div>

                <div class="color-picker-btn-container">
                    <button id="editor-megse" class="color-picker-btn-cancel">Mégse</button>
                    <button id="editor-ok" class="color-picker-btn-save">Mentés</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const inputCim = modal.querySelector('#editor-cim');
            const inputLeiras = modal.querySelector('#editor-leiras');
            const previewCard = modal.querySelector('#live-preview-card');
            const previewCim = previewCard.querySelector('.cim');
            const previewLeiras = previewCard.querySelector('.leiras');

            const btnOk = modal.querySelector('#editor-ok');
            const btnMegse = modal.querySelector('#editor-megse');

            inputLeiras.value = String(jelenlegiLeiras ?? '');

            inputCim.addEventListener('input', () => {
                previewCim.textContent = inputCim.value || 'Névtelen témakör';
            });

            inputLeiras.addEventListener('input', () => {
                previewLeiras.textContent = inputLeiras.value || '';
            });

            const close = (valasz) => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(null));

            btnOk.addEventListener('click', () => {
                const ujCim = inputCim.value.trim();
                const ujLeiras = inputLeiras.value.trim();

                if (!ujCim) {
                    showAlert("A témakör címe nem lehet üres!");
                    return;
                }

                close({
                    ujCim,
                    ujLeiras
                });
            });
        });
    }
}