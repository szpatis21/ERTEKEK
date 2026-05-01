import { showAlert } from '/both/alert.js';

export class BasicEditor {
    static open(ablakCim, jelenlegiCim) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.className = 'color-picker-overlay';

            const modal = document.createElement('div');
            modal.className = 'color-picker-modal';
            modal.style.width = '350px';

            modal.innerHTML = `
                <h3 class="color-picker-title">${ablakCim}</h3>
                
                <div class="color-picker-input-container">
                    <label class="color-picker-label">Név:</label>
                    <input type="text" id="basic-cim" value="${jelenlegiCim}" placeholder="Írja be a nevet..." style="width: 100%; color: black; font-family: inherit; padding: 5px; font-size: 15px;">
                </div>

                <div class="color-picker-btn-container">
                    <button id="basic-megse" class="color-picker-btn-cancel">Mégse</button>
                    <button id="basic-ok" class="color-picker-btn-save">Mentés</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const inputCim = modal.querySelector('#basic-cim');
            const btnOk = modal.querySelector('#basic-ok');
            const btnMegse = modal.querySelector('#basic-megse');

            // Fókuszáljunk a beviteli mezőre azonnal
            setTimeout(() => inputCim.focus(), 10);

            const close = (valasz) => {
                document.body.removeChild(overlay);
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(null));
            
            btnOk.addEventListener('click', () => {
                const cim = inputCim.value.trim();
                if (!cim) {
                    showAlert("A név megadása kötelező!"); // alert() helyett
                    return;
                }
                close(cim);
            });

            // Kényelmi funkció: Enter gomb lekezelése
            inputCim.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') btnOk.click();
            });
        });
    }
}
