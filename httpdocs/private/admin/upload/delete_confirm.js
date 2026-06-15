// delete_confirm.js

function applyStyles(element, styles) {
    Object.assign(element.style, styles);
    return element;
}

function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = String(options.text ?? '');
    if (options.styles) applyStyles(element, options.styles);

    return element;
}

function getDeleteCopy(szint) {
    if (szint === 'fo') {
        return {
            pirosCim: 'EGY FŐTÉMAKÖR TÖRLÉSÉRE KÉSZÜL',
            mindenUtaniSzoveg: ' alkategória, téma, kérdés és alkérdés törlésre kerül.'
        };
    }

    if (szint === 'al') {
        return {
            pirosCim: 'EGY ALKATEGÓRIA TÖRLÉSÉRE KÉSZÜL',
            mindenUtaniSzoveg: ' téma, kérdés és alkérdés törlésre kerül.'
        };
    }

    if (szint === 'alal') {
        return {
            pirosCim: 'EGY ALTÉMA TÖRLÉSÉRE KÉSZÜL',
            mindenUtaniSzoveg: ' kérdés és alkérdés törlésre kerül.'
        };
    }

    return {
        pirosCim: 'TÖRLÉSRE KÉSZÜL',
        mindenUtaniSzoveg: null
    };
}

export class DeleteConfirm {
    // A 'szint' alapértelmezetten 'fo' marad, így a főkategóriáknál nem is muszáj átírnod a hívást
    static open(kategoriaNev, szint = 'fo') {
        return new Promise((resolve) => {
            const { pirosCim, mindenUtaniSzoveg } = getDeleteCopy(szint);

            const overlay = createElement('div', { className: 'color-picker-overlay' });

            const modal = createElement('div', { className: 'color-picker-modal' });
            modal.style.width = '350px';

            const title = createElement('h3', {
                text: 'Törlés megerősítése',
                styles: {
                    color: '#ff4444',
                    borderBottomColor: '#ffaaaa',
                    background: 'white',
                    borderRadius: '10px',
                    display: 'flex',
                    justifyContent: 'center'
                }
            });

            const body = createElement('div', {
                styles: {
                    textAlign: 'center',
                    background: 'white',
                    padding: '15px',
                    borderRadius: '15px',
                    marginBottom: '25px',
                    lineHeight: '1.5',
                    color: 'black'
                }
            });

            const dangerTitle = createElement('h3', {
                text: pirosCim,
                styles: {
                    marginTop: '0',
                    color: '#dc3545'
                }
            });

            const message = createElement('p', {
                styles: {
                    marginBottom: '0'
                }
            });

            message.append(
                document.createTextNode('Biztosan törölni szeretnéd a(z) ')
            );

            const itemName = createElement('b');
            itemName.append(
                document.createTextNode('"'),
                document.createTextNode(String(kategoriaNev ?? '')),
                document.createTextNode('"')
            );
            message.appendChild(itemName);

            message.append(
                document.createTextNode(' elemet? Ezt a műveletet később nem lehet visszavonni! ')
            );

            if (mindenUtaniSzoveg) {
                const minden = createElement('b', { text: 'MINDEN' });
                message.append(minden, document.createTextNode(mindenUtaniSzoveg));
            } else {
                message.appendChild(document.createTextNode('Minden kapcsolódó adat törlésre kerül.'));
            }

            body.append(dangerTitle, message);

            const buttonContainer = createElement('div', { className: 'color-picker-btn-container' });
            const btnMegse = createElement('button', {
                id: 'confirm-megse',
                className: 'color-picker-btn-cancel',
                text: 'Mégse'
            });
            const btnOk = createElement('button', {
                id: 'confirm-ok',
                className: 'color-picker-btn-save',
                text: 'Igen, törlöm',
                styles: {
                    background: '#dc3545'
                }
            });

            buttonContainer.append(btnMegse, btnOk);
            modal.append(title, body, buttonContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const close = (valasz) => {
                if (overlay.parentElement) {
                    overlay.remove();
                }
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(false));

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close(false);
            });

            btnOk.addEventListener('click', () => close(true));
        });
    }
}
