// category_editor.js

export class CategoryEditor {
    static open(jelenlegiCim, jelenlegiLeiras, jelenlegiHatter) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'color-picker-overlay';

            const modal = document.createElement('div');
            modal.className = 'color-picker-modal';
            modal.style.width = '450px'; 

            modal.innerHTML = `
                <h3 class="color-picker-title">
                    Témakör szerkesztése
                </h3>

                <div class="minta" style="margin-bottom: 20px;    justify-content: center;">
                    <div id="live-preview-card" class="category fo color-picker-preview-card" style="background: ${jelenlegiHatter}; min-height: 80px;">
                        <div class="cim">${jelenlegiCim}</div>
                        <div class="leiras">${jelenlegiLeiras}</div>
                    </div>
                </div>

                <div class="color-picker-input-container">
                    <label for="editor-cim" class="color-picker-label">Cím:</label>
                    <input type="text" id="editor-cim" value="${jelenlegiCim}" style="width: 100%; color: black; font-family: inherit;">
                </div>

                <div class="color-picker-input-container">
                    <label for="editor-leiras" class="color-picker-label">Leírás:</label>
                    <textarea id="editor-leiras" rows="3" style="width: 100%; color: black; font-family: inherit;">${jelenlegiLeiras}</textarea>
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

            // Élő frissítés gépelés közben
            inputCim.addEventListener('input', () => {
                previewCim.textContent = inputCim.value;
            });

            inputLeiras.addEventListener('input', () => {
                previewLeiras.textContent = inputLeiras.value;
            });

            const close = (valasz) => {
                document.body.removeChild(overlay);
                resolve(valasz);
            };

            // Eseménykezelők: Csak a gombok zárják be
            btnMegse.addEventListener('click', () => close(null));
            
            btnOk.addEventListener('click', () => {
                close({
                    ujCim: inputCim.value.trim(),
                    ujLeiras: inputLeiras.value.trim()
                });
            });

            // Megjegyzés: Az overlay kattintásfigyelőt szándékosan eltávolítottuk
        });
    }
}