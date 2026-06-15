import { showAlert } from '/both/alert.js';

function applyStyles(element, styles) {
    Object.assign(element.style, styles);
    return element;
}

function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.className) element.className = options.className;
    if (options.id) element.id = options.id;
    if (options.text !== undefined) element.textContent = String(options.text ?? '');
    if (options.type) element.type = options.type;
    if (options.placeholder !== undefined) element.placeholder = String(options.placeholder ?? '');
    if (options.value !== undefined) element.value = String(options.value ?? '');
    if (options.styles) applyStyles(element, options.styles);

    return element;
}

export class BasicEditor {
    static open(ablakCim, jelenlegiCim) {
        return new Promise((resolve) => {
            const overlay = createElement('div', { className: 'color-picker-overlay' });

            const modal = createElement('div', { className: 'color-picker-modal' });
            modal.style.width = '350px';

            const title = createElement('h3', {
                className: 'color-picker-title',
                text: ablakCim || 'Szerkesztés'
            });

            const inputContainer = createElement('div', { className: 'color-picker-input-container' });
            const label = createElement('label', {
                className: 'color-picker-label',
                text: 'Név:'
            });

            const inputCim = createElement('input', {
                id: 'basic-cim',
                type: 'text',
                value: jelenlegiCim || '',
                placeholder: 'Írja be a nevet...',
                styles: {
                    width: '100%',
                    color: 'black',
                    fontFamily: 'inherit',
                    padding: '5px',
                    fontSize: '15px'
                }
            });

            inputContainer.append(label, inputCim);

            const buttonContainer = createElement('div', { className: 'color-picker-btn-container' });
            const btnMegse = createElement('button', {
                id: 'basic-megse',
                className: 'color-picker-btn-cancel',
                text: 'Mégse'
            });

            const btnOk = createElement('button', {
                id: 'basic-ok',
                className: 'color-picker-btn-save',
                text: 'Mentés'
            });

            buttonContainer.append(btnMegse, btnOk);
            modal.append(title, inputContainer, buttonContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            setTimeout(() => inputCim.focus(), 10);

            const close = (valasz) => {
                if (overlay.parentElement) {
                    overlay.remove();
                }
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(null));

            btnOk.addEventListener('click', () => {
                const cim = inputCim.value.trim();
                if (!cim) {
                    showAlert('A név megadása kötelező!');
                    return;
                }
                close(cim);
            });

            inputCim.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') btnOk.click();
            });
        });
    }
}
