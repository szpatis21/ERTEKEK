import { showAlert } from "/both/alert.js";
import { passwordPanelContent, addPasswordValidationLogic } from "/both/passwordChange.js";
import { openPackageUpgradeModal, loadPackageUpgradeCsrfToken, packageRegisterBillingValue, normalizePackageCodeForModal } from "./packageUpgradeModal.js";

function applyStyles(element, styles = {}) {
    Object.assign(element.style, styles);
    return element;
}

function createElement(tag, options = {}, ...children) {
    const element = document.createElement(tag);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = String(options.text);
    if (options.htmlFor) element.htmlFor = options.htmlFor;
    if (options.type) element.type = options.type;
    if (options.value !== undefined) element.value = String(options.value);
    if (options.disabled !== undefined) element.disabled = Boolean(options.disabled);
    if (options.styles) applyStyles(element, options.styles);
    if (options.attrs) {
        Object.entries(options.attrs).forEach(([key, value]) => {
            if (value === false || value === null || value === undefined) return;
            element.setAttribute(key, value === true ? '' : String(value));
        });
    }

    children.flat().forEach(child => {
        if (child === null || child === undefined) return;
        element.append(child);
    });

    return element;
}

function clearAndAppend(parent, ...children) {
    parent.replaceChildren(...children.filter(child => child !== null && child !== undefined));
}

function textNode(value) {
    return document.createTextNode(String(value ?? ''));
}

function createOverlay(id = '') {
    const overlay = createElement('div', { id });
    applyStyles(overlay, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '99999'
    });
    return overlay;
}

function createModalBox() {
    const modalBox = createElement('div');
    applyStyles(modalBox, {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '8px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        color: '#333'
    });
    return modalBox;
}

function appendBoldText(parent, value) {
    parent.appendChild(createElement('b', { text: value }));
}

function createWarningBox(borderColor, backgroundColor) {
    return createElement('div', {
        styles: {
            marginBottom: '15px',
            padding: '10px',
            background: backgroundColor,
            borderLeft: `4px solid ${borderColor}`,
            textAlign: 'left'
        }
    });
}

function createSafePasswordFragment(html) {
    const allowedTags = new Set([
        'div', 'span', 'p', 'br', 'strong', 'b', 'em', 'i', 'small',
        'label', 'input', 'button', 'form', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4'
    ]);

    const allowedAttrs = new Set([
        'id', 'class', 'type', 'name', 'placeholder', 'value', 'autocomplete',
        'required', 'minlength', 'maxlength', 'min', 'max', 'step', 'for',
        'aria-label', 'aria-describedby', 'rows', 'cols', 'disabled'
    ]);

    const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    const fragment = document.createDocumentFragment();

    const sanitizeNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent || '');
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createDocumentFragment();
        }

        const tag = node.tagName.toLowerCase();
        if (!allowedTags.has(tag)) {
            const safeFragment = document.createDocumentFragment();
            node.childNodes.forEach(child => {
                safeFragment.appendChild(sanitizeNode(child));
            });
            return safeFragment;
        }

        const safeElement = document.createElement(tag);
        Array.from(node.attributes).forEach(attr => {
            const name = attr.name.toLowerCase();
            const value = attr.value || '';

            if (name.startsWith('on')) return;
            if (!allowedAttrs.has(name)) return;
            if ((name === 'id' || name === 'class') && /[<>"'`]/.test(value)) return;

            safeElement.setAttribute(name, value);
        });

        node.childNodes.forEach(child => {
            safeElement.appendChild(sanitizeNode(child));
        });

        return safeElement;
    };

    doc.body.childNodes.forEach(node => {
        fragment.appendChild(sanitizeNode(node));
    });

    return fragment;
}

function createInfoPanelContent(cardId, accountContext = {}) {
    const fragment = document.createDocumentFragment();

    if (cardId === 'changepass') {
        fragment.appendChild(createSafePasswordFragment(passwordPanelContent));
        return fragment;
    }

    if (cardId === 'remove') {
        fragment.append(
            createElement('p', {
                text: 'Biztosan visszavonja a hozzájárulását? Ez a művelet nem vonható vissza.'
            }),
            createElement('button', { text: 'Visszavonás' })
        );
        return fragment;
    }

    if (cardId === 'plussj') {
        fragment.appendChild(createPermissionUpgradePanel(accountContext));
        return fragment;
    }

    if (cardId === 'csomagvaltas') {
        fragment.append(
            createElement('p', {
                text: 'A csomagváltás, felhasználói keret bővítése és a saját szakmai anyag plusz szolgáltatás külön ablakban kezelhető.'
            }),
            createElement('button', {
                id: 'account-package-upgrade-open',
                text: 'Csomagváltás / bővítés megnyitása',
                attrs: { type: 'button' }
            })
        );
        return fragment;
    }

    if (cardId === 'deleteacc') {
        const loader = createElement('div', { id: 'delete-loader' },
            createElement('p', { text: 'Fiók információk ellenőrzése...' }),
            createElement('div', { className: 'spinner' })
        );

        const content = createElement('div', {
            id: 'delete-content',
            styles: { display: 'none' }
        });

        fragment.append(loader, content);
        return fragment;
    }

    return fragment;
}

function normalizePermissionRole(value = '') {
    const text = String(value || '').toLowerCase();
    if (text.includes('sysadmin')) return 'admin';
    if (text.includes('admin') || text.includes('feltölt') || text.includes('feltolto')) return 'admin';
    if (text.includes('elemz')) return 'elemzo';
    if (text.includes('értékel') || text.includes('ertekel')) return 'ertekelo';
    return '';
}

function createPermissionOption(value, label, hint = '') {
    const optionId = `permission-upgrade-${value}`;
    const input = createElement('input', {
        attrs: {
            type: 'checkbox',
            id: optionId,
            value
        }
    });

    return createElement('label', {
        htmlFor: optionId,
        styles: {
            display: 'block',
            padding: '10px',
            marginBottom: '8px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            background: '#fff',
            cursor: 'pointer'
        }
    },
        input,
        textNode(` ${label}`),
        hint ? createElement('small', {
            text: ` – ${hint}`,
            styles: { display: 'block', marginLeft: '22px', color: '#666', marginTop: '4px' }
        }) : null
    );
}

function createPermissionUpgradePanel(accountContext = {}) {
    const currentRole = accountContext.aktualisSzerep || accountContext.leiras || 'Nincs adat';
    const currentRoleKey = normalizePermissionRole(currentRole);
    const panel = createElement('div', { className: 'permission-upgrade-panel' });
    const pendingRequest = window.__licenseStatus?.pendingRequest;

    const options = [
        { value: 'ertekelo', label: 'Értékelő jogosultság', hint: 'értékelések létrehozása és kitöltése' },
        { value: 'elemzo', label: 'Elemző jogosultság', hint: 'intézményi áttekintés, megosztott értékelések, elemzések' },
        { value: 'admin', label: 'Admin / feltöltő jogosultság', hint: 'szakmai anyagok és sablonok kezelése' }
    ].filter(option => option.value !== currentRoleKey);

    const optionsBox = createElement('div', {
        styles: { margin: '12px 0', textAlign: 'left' }
    });

    if (pendingRequest) {
        optionsBox.appendChild(createElement('p', {
            text: 'Már van folyamatban lévő kérelem. Új jogosultságbővítés csak annak sysadmin oldali lezárása után indítható.',
            styles: { color: '#7c2d12', fontWeight: 'bold' }
        }));
    } else if (options.length) {
        options.forEach(option => {
            optionsBox.appendChild(createPermissionOption(option.value, option.label, option.hint));
        });
    } else {
        optionsBox.appendChild(createElement('p', {
            text: 'Nincs további standard jogosultság, amelyet ebből a szerepkörből közvetlen bővítésként lehetne kérni.',
            styles: { color: '#666' }
        }));
    }

    const textarea = createElement('textarea', {
        id: 'permission-upgrade-note',
        attrs: {
            rows: '4',
            placeholder: 'Pl. szeretnék elemzőként is rálátni a kollégák által megosztott értékelésekre.'
        },
        styles: {
            width: '100%',
            boxSizing: 'border-box',
            minHeight: '90px',
            resize: 'vertical',
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '10px'
        }
    });

    const sendButton = createElement('button', {
        id: 'permission-upgrade-send',
        text: 'Jogosultságbővítési kérelem küldése',
        attrs: { type: 'button' },
        disabled: Boolean(pendingRequest) || !options.length,
        styles: {
            marginTop: '12px',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '8px',
            background: '#ff7c00',
            color: '#fff',
            fontWeight: 'bold',
            cursor: pendingRequest || !options.length ? 'not-allowed' : 'pointer',
            opacity: pendingRequest || !options.length ? '.6' : '1'
        }
    });

    panel.append(
        createElement('p', {
            text: 'Itt nem történik azonnali jogosultságmódosítás. A kérelem az üzemeltetőhöz kerül, és utána kézzel jóváhagyható.'
        }),
        createElement('p', {},
            createElement('b', { text: 'Jelenlegi szerepkör: ' }),
            textNode(currentRole)
        ),
        optionsBox,
        createElement('label', {
            htmlFor: 'permission-upgrade-note',
            text: 'Indoklás / megjegyzés',
            styles: { display: 'block', fontWeight: 'bold', marginTop: '10px', marginBottom: '6px' }
        }),
        textarea,
        createElement('div', { id: 'permission-upgrade-status', styles: { marginTop: '10px', minHeight: '20px' } }),
        sendButton
    );

    if (pendingRequest) textarea.disabled = true;
    return panel;
}

async function sendPermissionUpgradeRequest(infoPanel, accountContext = {}) {
    const status = infoPanel.querySelector('#permission-upgrade-status');
    const button = infoPanel.querySelector('#permission-upgrade-send');
    const selected = Array.from(infoPanel.querySelectorAll('.permission-upgrade-panel input[type="checkbox"]:checked'))
        .map(input => input.value);
    const note = (infoPanel.querySelector('#permission-upgrade-note')?.value || '').trim();

    if (window.__licenseStatus?.pendingRequest) {
        if (status) status.textContent = 'Már van folyamatban lévő kérelem. Új jogosultságbővítés csak sysadmin oldali lezárás után indítható.';
        return;
    }

    if (!selected.length && !note) {
        if (status) status.textContent = 'Jelöljön be legalább egy jogosultságot, vagy írjon rövid indoklást.';
        return;
    }

    if (button) button.disabled = true;
    if (status) status.textContent = 'Kérelem küldése folyamatban…';

    try {
        const csrfToken = await loadPackageUpgradeCsrfToken();
        if (!csrfToken) {
            if (status) status.textContent = 'Bejelentkezés szükséges a kérelem küldéséhez.';
            return;
        }

        const license = window.__licenseStatus || {};
        const currentPackageCode = normalizePackageCodeForModal(
            license.packageCode || license.csomagKod || license.csomag_kod || accountContext.csomagKod || accountContext.idoszak || 'start'
        );
        const roleText = accountContext.aktualisSzerep || accountContext.leiras || 'Nincs adat';
        const noteLines = [
            `Jogosultság bővítési kérelem a Fiókom menüpontból.`,
            `Jelenlegi szerepkör: ${roleText}`,
            selected.length ? `Kért jogosultságok: ${selected.join(', ')}` : '',
            note ? `Indoklás: ${note}` : ''
        ].filter(Boolean).join('\n');

        const response = await fetch('/api/package-change-request', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                csomagKod: currentPackageCode || 'start',
                kerelemTipus: 'permission_upgrade',
                fizetesiIdoszak: packageRegisterBillingValue(license.billingPeriod || license.idoszak || 'havi'),
                megjegyzes: noteLines
            })
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
            if (status) status.textContent = data.message || 'A kérelem rögzítése sikertelen.';
            return;
        }

        if (status) status.textContent = data.message || 'A jogosultságbővítési kérelmet rögzítettük.';
        window.__licenseStatus = {
            ...(window.__licenseStatus || {}),
            pendingRequest: data.pendingRequest || {
                requestType: 'permission_upgrade',
                requestTypeLabel: 'Jogosultság bővítési kérelem',
                packageName: 'Jogosultság bővítési kérelem'
            }
        };
        infoPanel.querySelectorAll('.permission-upgrade-panel input[type="checkbox"]').forEach(input => { input.checked = false; input.disabled = true; });
        const textarea = infoPanel.querySelector('#permission-upgrade-note');
        if (textarea) {
            textarea.value = '';
            textarea.disabled = true;
        }
        if (button) button.disabled = true;
    } catch (error) {
        console.error('Jogosultságbővítési kérelem hiba:', error);
        if (status) status.textContent = 'Hálózati hiba történt a kérelem küldése közben.';
    } finally {
        if (button) button.disabled = false;
    }
}

function createBlockingAdminModal(modules) {
    const overlay = createOverlay();
    const modalBox = createModalBox();

    const content = createElement('div', {
        styles: {
            textAlign: 'left',
            padding: '15px',
            fontFamily: 'sans-serif',
            color: '#333'
        }
    });

    content.append(
        createElement('h3', {
            text: 'Jogosultság átadása szükséges!',
            styles: {
                color: 'red',
                textAlign: 'center',
                marginBottom: '15px'
            }
        }),
        createElement('p', {},
            textNode('Ön az '),
            createElement('b', { text: 'egyedüli Adminisztrátor' }),
            textNode(' a következő modulokban, ezért jelenleg nem törölheti a fiókját:')
        )
    );

    const list = createElement('ul', {
        styles: {
            marginTop: '10px',
            marginBottom: '15px',
            paddingLeft: '20px',
            color: 'red'
        }
    });

    modules.forEach(module => {
        const li = createElement('li');
        li.appendChild(createElement('b', { text: module.leiras || module.nev || 'Ismeretlen modul' }));
        list.appendChild(li);
    });

    const instruction = createElement('p', {
        text: 'A felső menüsávban az "átjelentkezésre" kattintva váltson szerepkört, ha kell szakmai anyagot, és az Adminisztrátori felületen adjon adminisztrátori jogot egy kollégájának a profil törlése előtt!'
    });

    const closeButton = createElement('button', {
        id: 'btnElzavaroBezaras',
        text: 'Bezárás',
        styles: {
            marginTop: '20px',
            width: '100%',
            backgroundColor: '#555',
            color: 'white',
            padding: '12px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '5px',
            fontWeight: 'bold',
            fontSize: '1rem'
        }
    });

    closeButton.addEventListener('click', () => overlay.remove());

    content.append(list, instruction, closeButton);
    modalBox.appendChild(content);
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);
}

function createSharedUsersWarning(sharedUsers) {
    const box = createWarningBox('orange', 'rgba(255,165,0,0.1)');
    const title = createElement('b', {
        text: 'Az alábbi megosztott értékelései fognak végleg eltűnni a kollégáitól:'
    });

    const list = createElement('ul', {
        styles: {
            marginTop: '5px',
            paddingLeft: '20px'
        }
    });

    sharedUsers.forEach(user => {
        const li = createElement('li');

        const modulLeiras = user.modul_leiras ? `[${user.modul_leiras}]` : '[Ismeretlen modul]';
        const teljesNev = user.vizsgalt_nev
            ? `${user.kitoltes_neve || 'Névtelen értékelés'} (${user.vizsgalt_nev})`
            : (user.kitoltes_neve || 'Névtelen értékelés');

        li.append(
            textNode(`${modulLeiras} `),
            createElement('b', { text: teljesNev }),
            textNode(` (Kolléga: ${user.vez || 'Ismeretlen kolléga'})`)
        );

        list.appendChild(li);
    });

    box.append(title, list);
    return box;
}

function createDeleteWarningModal(data) {
    const overlay = createOverlay('customDeleteModal');
    const modalBox = createModalBox();

    const content = createElement('div', {
        styles: {
            textAlign: 'center',
            fontFamily: 'sans-serif'
        }
    });

    content.append(
        createElement('h3', {
            text: 'Biztosan törölni szeretné a profilját?',
            styles: {
                color: 'red',
                marginBottom: '10px'
            }
        }),
        createElement('p', {
            styles: {
                marginBottom: '15px'
            }
        },
            textNode('Ez a művelet '),
            createElement('b', { text: 'nem vonható vissza' }),
            textNode('!')
        )
    );

    if (data.isOnlyUser) {
        const onlyUserWarning = createWarningBox('red', 'rgba(255,0,0,0.1)');
        onlyUserWarning.append(
            createElement('b', { text: 'FIGYELEM:' }),
            textNode(' Ön az egyetlen regisztrált felhasználó az intézményben! A fiók törlésével a teljes intézményi adatbázis hozzáférhetetlenné válik.')
        );
        content.appendChild(onlyUserWarning);
    } else if (data.roleId === 2 && Array.isArray(data.soleRolesInModules) && data.soleRolesInModules.length > 0) {
        const analystWarning = createWarningBox('orange', 'rgba(255,165,0,0.2)');
        const moduleNames = data.soleRolesInModules
            .map(module => module.leiras || module.nev || 'Ismeretlen modul')
            .join(', ');

        analystWarning.append(
            createElement('b', { text: 'FIGYELEM:' }),
            textNode(' Ön az egyetlen Elemző az alábbi modul(ok)ban: '),
            createElement('b', { text: moduleNames }),
            textNode('. Kérjük a törlés után jelezze ezt az Adminnak.')
        );

        content.appendChild(analystWarning);
    }

    if (Array.isArray(data.sharedUsers) && data.sharedUsers.length > 0) {
        content.appendChild(createSharedUsersWarning(data.sharedUsers));
    }

    const buttonContainer = createElement('div', {
        id: 'alertDeleteButtons',
        styles: {
            marginTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }
    });

    const confirmButton = createElement('button', {
        id: 'btnMegertettem',
        text: 'Megértettem, mindenképp törlöm a fiókot',
        styles: {
            backgroundColor: 'red',
            color: 'white',
            padding: '12px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '5px',
            fontWeight: 'bold',
            fontSize: '1rem',
            transition: '0.3s'
        }
    });

    const cancelButton = createElement('button', {
        id: 'btnMegsem',
        text: 'Mégsem',
        styles: {
            backgroundColor: '#555',
            color: 'white',
            padding: '12px',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '5px',
            fontWeight: 'bold',
            fontSize: '1rem',
            transition: '0.3s'
        }
    });

    cancelButton.addEventListener('click', () => overlay.remove());

    confirmButton.addEventListener('click', async () => {
        confirmButton.disabled = true;
        confirmButton.textContent = 'Törlés folyamatban...';
        confirmButton.style.backgroundColor = 'gray';
        cancelButton.style.display = 'none';

        try {
            const delRes = await fetch('/api/delete-my-account', { method: 'DELETE' });
            const delData = await delRes.json();

            if (delData.success) {
                clearAndAppend(buttonContainer,
                    createElement('p', {
                        text: 'Fiókja és minden adata sikeresen törölve. Kijelentkezés...',
                        styles: {
                            color: 'green',
                            fontWeight: 'bold',
                            fontSize: '1.1rem',
                            padding: '10px'
                        }
                    })
                );

                setTimeout(() => {
                    window.location.href = '/index.html';
                }, 3000);
            } else {
                showAlert('Hiba történt a törlés során!');
                confirmButton.disabled = false;
                confirmButton.textContent = 'Megértettem, mindenképp törlöm a fiókot';
                confirmButton.style.backgroundColor = 'red';
                cancelButton.style.display = 'block';
            }
        } catch (error) {
            console.error('Hálózati hiba történt a törléskor.');
            showAlert('Hálózati hiba történt a törléskor.');
            confirmButton.disabled = false;
            confirmButton.textContent = 'Megértettem, mindenképp törlöm a fiókot';
            confirmButton.style.backgroundColor = 'red';
            cancelButton.style.display = 'block';
        }
    });

    buttonContainer.append(confirmButton, cancelButton);
    content.appendChild(buttonContainer);

    modalBox.appendChild(content);
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);
}

function createTestModalContent(isExt) {
    const container = createElement('div', { className: 'modal-container' });
    const license = window.__licenseStatus || {};
const isLicenseExpired =
    license.status === 'trial_expired' ||
    license.status === 'demo_expired' ||
    license.status === 'demo_limit_reached' ||
    license.status === 'expired';
    container.append(
        createElement('div', { className: 'modal-icon-wrapper' },
            createElement('span', {
                className: 'material-symbols-rounded icon-orange',
                text: isExt ? 'lock' : 'volunteer_activism'
            })
        ),
        createElement('h2', {
            className: 'modal-title',
            text: isLicenseExpired ? 'A próbaidő lejárt' : (isExt ? 'A tesztidőszak véget ért!' : 'Elérte a tesztelési limitet!')
        }),
        createElement('p', {
            className: 'modal-text',
            text: license.message || 'A próbaidő vagy a létrehozható értékelések kerete lejárt.'
        }),
        createElement('p', {
            className: 'modal-text',
            text: 'A meglévő értékeléseit továbbra is megnézheti és PDF-be mentheti, de új értékelés, szerkesztés, másolás, törlés és megosztás csak aktiválás után érhető el.'
        })
    );

    if (!isExt) {
        container.append(
            createElement('p', {
                className: 'modal-subtext',
                text: 'A folytatáshoz válasszon csomagot, vagy jelezze a kapcsolattartó felé, hogy kéri az élesítést.'
            }),
            createElement('div', { className: 'modal-info-box' },
                createElement('b', { text: 'Továbbhasználat:' }),
                createElement('p', {},
                    textNode('A csomag kiválasztása után a rendszerüzemeltető a szerződés és a fizetés beérkezése után aktiválja az intézményt.')
                )
            )
        );

        const actions = createElement('div', { className: 'modal-actions' },
            createElement('button', {
                id: 'btnAraink',
                className: 'btn4 btn-primary'
            },
                createElement('span', {
                    className: 'material-symbols-rounded',
                    text: 'shopping_cart'
                }),
                textNode(' Csomagajánlatok')
            ),
            createElement('button', {
                id: 'btnModalZar',
                className: 'btn4 btn-secondary',
                text: 'Bezárás'
            })
        );

        container.appendChild(actions);
        return container;
    }

    container.append(
        createElement('div', { className: 'modal-info-box' },
            createElement('p', {
                text: 'A rendszer további használati feltételeiről hamarosan e-mailben tájékoztatjuk.'
            }),
            createElement('p', {
                text: 'Köszönjük, hogy részt vett a tesztelési időszakban! Tapasztalatai felbecsülhetetlenek számunkra!'
            })
        ),
        createElement('div', { className: 'modal-actions' },
            createElement('button', {
                id: 'btnModalZar',
                className: 'btn4 btn-secondary',
                text: 'Bezárás',
                styles: {
                    width: 'fit-content',
                    background: 'orange'
                }
            })
        )
    );

    return container;
}

function formatLogDate(value) {
    if (!value || typeof value !== 'string' || !value.includes('T')) {
        return value || '';
    }

    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;

    return d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0') + ' ' +
        String(d.getHours()).padStart(2, '0') + ':' +
        String(d.getMinutes()).padStart(2, '0');
}

function renderEmptyState(container, message, color = 'gray') {
    clearAndAppend(container,
        createElement('div', {
            text: message,
            styles: { color }
        })
    );
}

export function playIntroSequence() {
    const pairs = [
        ['.analysis', '.growth2'],
        ['.growth', '.goals2'],
        ['.goals', '.dashboards2'],
        ['.dashboards']
    ];

    let delay = 0;
    const interval = 1500;

    pairs.forEach((pair, index) => {
        setTimeout(() => {
            pair.forEach(selector => {
                const card = document.querySelector(selector);
                if (card) {
                    card.classList.add('simulated-hover');
                }
            });

            if (index === pairs.length - 1) {
                setTimeout(() => {
                    document.querySelectorAll('.simulated-hover').forEach(card => {
                        card.classList.remove('simulated-hover');
                    });
                }, 2000);
            }

        }, delay);
        delay += interval;
    });
}

const infoPanelekTartalma = {
    changepass: {
        title: 'Jelszó Megváltoztatása'
    },
    remove: {
        title: 'Hozzájárulás Visszavonása'
    },
    plussj: {
        title: 'Jogosultságok Bővítése'
    },
    csomagvaltas: {
        title: 'Csomagváltás és bővítések'
    },
    deleteacc: {
        title: 'Profil Törlése'
    }
};

export async function fetchAccountDeletionInfo(infoPanel) {
    try {
        const response = await fetch('/api/delete-account-info');
        const data = await response.json();

        if (infoPanel) {
            infoPanel.classList.remove('aktivp');
            setTimeout(() => infoPanel.remove(), 300);
        }

        if (!data.success) {
            showAlert('Hiba történt az adatok lekérésekor.');
            return;
        }

        if (
            data.roleId === 1 &&
            !data.isOnlyUser &&
            Array.isArray(data.soleRolesInModules) &&
            data.soleRolesInModules.length > 0
        ) {
            createBlockingAdminModal(data.soleRolesInModules);
            return;
        }

        createDeleteWarningModal(data);
    } catch (error) {
        console.error('Hálózati hiba történt a törlés ellenőrzésekor.');
        showAlert('Hálózati hiba történt a törlés ellenőrzésekor.');
    }
}

export function setupAccountInfoListeners(mainElement, userName, accountContext = {}) {
    const elsoDiv = mainElement.querySelector('.elso');
    const infoCards = mainElement.querySelectorAll('.infocard');

    if (!elsoDiv || infoCards.length === 0) return;

    infoCards.forEach(card => {
        card.addEventListener('click', function() {
            const cardId = this.id;
            const tartalom = infoPanelekTartalma[cardId];

            if (cardId === 'csomagvaltas') {
                openPackageUpgradeModal();
                return;
            }

            const letezikPanel = elsoDiv.querySelector('.info-panel');
            if (letezikPanel) {
                letezikPanel.remove();
            }

            if (tartalom) {
                const infoPanel = createElement('div', { className: 'info-panel' });

                const closeButton = createElement('span', {
                    className: 'bezaras',
                    text: '×'
                });

                const title = createElement('h3', { text: tartalom.title });
                const content = createElement('div');
                content.appendChild(createInfoPanelContent(cardId, accountContext));

                infoPanel.append(closeButton, title, content);
                elsoDiv.appendChild(infoPanel);

                if (cardId === 'changepass') {
                    addPasswordValidationLogic(infoPanel, userName);
                }

                if (cardId === 'csomagvaltas') {
                    const openButton = infoPanel.querySelector('#account-package-upgrade-open');
                    if (openButton) {
                        openButton.addEventListener('click', () => openPackageUpgradeModal());
                    }
                }

                if (cardId === 'plussj') {
                    const sendButton = infoPanel.querySelector('#permission-upgrade-send');
                    if (sendButton) {
                        sendButton.addEventListener('click', () => sendPermissionUpgradeRequest(infoPanel, accountContext));
                    }
                }

                if (cardId === 'deleteacc') {
                    fetchAccountDeletionInfo(infoPanel);
                }

                setTimeout(() => {
                    infoPanel.classList.add('aktivp');
                }, 10);

                closeButton.addEventListener('click', () => {
                    infoPanel.classList.remove('aktivp');
                    infoPanel.addEventListener('transitionend', () => {
                        infoPanel.remove();
                    }, { once: true });
                });
            }
        });
    });
}




export { openPackageUpgradeModal };


function openPackagePage() {
    openPackageUpgradeModal();
}

function formatRemainingDays(daysLeft) {
    if (daysLeft === null || daysLeft === undefined || Number.isNaN(Number(daysLeft))) return 'nincs adat';
    const n = Number(daysLeft);
    if (n <= 0) return 'ma jár le / lejárt';
    return `${n} nap`;
}

function renderLicenseFloatingPanel(license) {
    if (!license || !license.success) return;

const relevantStatuses = ['demo_active', 'demo_expired', 'demo_limit_reached', 'pending_activation', 'expired'];
    if (!relevantStatuses.includes(license.status)) return;

    const dismissedKey = `ertekek_license_panel_dismissed_${license.status}_${license.packageCode || 'default'}`;
    if (localStorage.getItem(dismissedKey) === '1') return;
    if (document.getElementById('license-floating-panel')) return;

    const used = Number(license.evaluationCount || 0);
    const limit = license.evaluationLimit === null || license.evaluationLimit === undefined ? null : Number(license.evaluationLimit);
    const remaining = limit === null ? `${used} létrehozott értékelés` : `${used} / ${limit} létrehozott értékelés`;
const expired = ['demo_expired', 'demo_limit_reached', 'expired'].includes(license.status);
    const pending = license.status === 'pending_activation';

    const panel = createElement('div', { id: 'license-floating-panel' });
    applyStyles(panel, {
        position: 'fixed',
        right: '22px',
        bottom: '22px',
        width: 'min(380px, calc(100vw - 44px))',
        background: '#fff7ed',
        border: '1px solid #fb923c',
        borderLeft: '7px solid #ff6500',
        borderRadius: '16px',
        boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
        zIndex: '99999',
        padding: '16px',
        color: '#333',
        fontFamily: 'inherit'
    });

    const close = createElement('button', { text: '×', attrs: { type: 'button', title: 'Ne mutassa újra ezt az ablakot' } });
    applyStyles(close, {
        position: 'absolute',
        right: '10px',
        top: '8px',
        border: 'none',
        background: 'transparent',
        fontSize: '24px',
        cursor: 'pointer',
        color: '#9a3412'
    });
    close.addEventListener('click', () => {
        localStorage.setItem(dismissedKey, '1');
        panel.remove();
    });

    const title = createElement('div');
    applyStyles(title, { fontWeight: '800', fontSize: '1.05rem', marginRight: '22px', color: '#9a3412' });
title.textContent = pending
    ? 'A hozzáférés aktiválásra vár'
    : license.status === 'demo_limit_reached'
        ? 'A demó értékelésszám-kerete betelt'
        : expired
            ? 'A hozzáférés jelenleg korlátozott'
            : `${license.packageName || 'Demo'} hozzáférés aktív`;

    const text = createElement('div');
    applyStyles(text, { marginTop: '8px', lineHeight: '1.45', fontSize: '0.95rem' });
text.innerHTML = pending
    ? 'A regisztráció megtörtént, de a rendszer még nem aktív. A belépéshez szerződés, fizetés és sysadmin aktiválás szükséges.'
    : expired
        ? 'A létrehozott értékelések megtekinthetők és PDF-be menthetők. Új munka, szerkesztés, másolás, törlés és megosztás csak aktiválás után érhető el.'
        : `Hátralévő idő: <strong>${formatRemainingDays(license.daysLeft)}</strong><br>Értékelések: <strong>${remaining}</strong>`;
    const actions = createElement('div');
    applyStyles(actions, { display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' });

    const packageBtn = createElement('button', { text: 'Csomag választása', attrs: { type: 'button' } });
    applyStyles(packageBtn, {
        background: '#ff6500',
        color: '#fff',
        border: 'none',
        borderRadius: '999px',
        padding: '9px 14px',
        cursor: 'pointer',
        fontWeight: '700'
    });
    packageBtn.addEventListener('click', openPackagePage);

    const laterBtn = createElement('button', { text: 'Rendben', attrs: { type: 'button' } });
    applyStyles(laterBtn, {
        background: '#fff',
        color: '#9a3412',
        border: '1px solid #fdba74',
        borderRadius: '999px',
        padding: '9px 14px',
        cursor: 'pointer'
    });
    laterBtn.addEventListener('click', () => panel.remove());

    actions.append(packageBtn, laterBtn);
    panel.append(close, title, text, actions);
    document.body.appendChild(panel);
}

window.showLicenseToast = function(message) {
    const old = document.getElementById('license-toast');
    if (old) old.remove();

    const toast = createElement('div', { id: 'license-toast' });
    applyStyles(toast, {
        position: 'fixed',
        right: '22px',
        bottom: document.getElementById('license-floating-panel') ? '190px' : '22px',
        maxWidth: '360px',
        background: '#1f2937',
        color: '#fff',
        padding: '11px 14px',
        borderRadius: '12px',
        boxShadow: '0 10px 24px rgba(0,0,0,0.25)',
        zIndex: '100000',
        fontSize: '0.92rem',
        lineHeight: '1.35',
        opacity: '0',
        transform: 'translateY(8px)',
        transition: 'opacity .18s ease, transform .18s ease'
    });
    toast.textContent = message || 'Ez a művelet a jelenlegi csomagban nem érhető el.';
    document.body.appendChild(toast);
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 220);
    }, 3200);
};


window.__licenseStatus = null;

window.loadLicenseStatus = async function() {
    try {
        const response = await fetch('/api/license-status');
        const data = await response.json();
        if (data && data.success) {
            window.__licenseStatus = data;
            renderLicenseFloatingPanel(data);
            return data;
        }
    } catch (err) {
        console.error('Licencállapot betöltési hiba:', err);
    }
    return null;
};

window.mutasdPiackutatoAblakot = function(idoszak) {
    if (document.getElementById('teszt-modal')) return;

    const isExt = idoszak === 'teszt_ext';

    const overlay = createElement('div', { id: 'teszt-modal' });
    applyStyles(overlay, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: '999999',
        backdropFilter: 'blur(5px)',
        opacity: '0',
        transition: 'opacity 0.3s ease'
    });

    const modalBox = createElement('div');
    applyStyles(modalBox, {
        backgroundColor: '#fff',
        padding: '40px',
        borderRadius: '15px',
        maxWidth: '550px',
        width: '90%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        transform: 'translateY(50px)',
        transition: 'transform 0.3s ease'
    });

    modalBox.appendChild(createTestModalContent(isExt));
    overlay.appendChild(modalBox);
    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.opacity = '1';
        modalBox.style.transform = 'translateY(0)';
    }, 10);

    document.getElementById('btnModalZar').addEventListener('click', () => {
        overlay.style.opacity = '0';
        modalBox.style.transform = 'translateY(50px)';
        setTimeout(() => overlay.remove(), 300);
    });

    const btnKardiov = document.getElementById('btnKardiov');
    if (btnKardiov) {
        btnKardiov.addEventListener('click', () => {
            window.location.href = '/private/kerdoiv.html';
        });
    }

    const btnAraink = document.getElementById('btnAraink');
    if (btnAraink) {
        btnAraink.addEventListener('click', openPackageUpgradeModal);
    }
};


window.isLicenseFeatureBlocked = function(featureOrAction) {
    const license = window.__licenseStatus;
    if (!license || !license.success || !license.permissions) return false;

    const action = String(featureOrAction || '');
    const map = {
        fo_edit: 'canEditEvaluation',
        edit: 'canEditEvaluation',
        save: 'canEditEvaluation',
        deleted: 'canDeleteEvaluation',
        delete: 'canDeleteEvaluation',
        duplicate: 'canDuplicateEvaluation',
        share: 'canShareEvaluation',
        generate_ai: 'canUseAi',
        audit: 'canUseAudit',
        group_stats: 'canUseGroupStatistics',
        groupStatistics: 'canUseGroupStatistics',
        csoportos_statisztika: 'canUseGroupStatistics',
        add: 'canCreateEvaluation',
        create: 'canCreateEvaluation'
    };

    const key = map[action] || Object.keys(map).find(k => action.includes(k));
    if (!key) return false;
    return license.permissions[key] === false;
};


window.canUseGroupStatistics = function() {
    const license = window.__licenseStatus;

    if (!license || !license.success || !license.permissions) {
        return true;
    }

    return license.permissions.canUseGroupStatistics !== false;
};

window.explainGroupStatisticsBlocked = function() {
    const license = window.__licenseStatus;
    const packageName = license?.packageName || 'jelenlegi csomag';

    if (packageName.toLowerCase().includes('start')) {
        return 'A csoportos statisztika és több értékelés kijelölése a Pro csomagban érhető el.';
    }

    return 'A csoportos statisztika a jelenlegi csomagban nem érhető el.';
};

window.isTesztLejart = function(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin) {
    const license = window.__licenseStatus;
    if (license && license.success) {
        return ['demo_expired', 'expired', 'suspended', 'pending_activation'].includes(license.status);
    }

    if (idoszak !== 'teszt' && idoszak !== 'teszt_ext') return false;

    const maxErtekeles = idoszak === 'teszt' ? 2 : 4;
    let lejart = false;

    if (fizetve && int_fin) {
        const fizetesDatuma = new Date(fizetve);
        const ma = new Date();
        const lejaratDatuma = new Date(fizetesDatuma);
        lejaratDatuma.setDate(lejaratDatuma.getDate() + parseInt(int_fin, 10));

        const maNormalizalt = new Date(ma.getFullYear(), ma.getMonth(), ma.getDate());
        const lejaratNormalizalt = new Date(lejaratDatuma.getFullYear(), lejaratDatuma.getMonth(), lejaratDatuma.getDate());
        const idokulonbseg = lejaratNormalizalt.getTime() - maNormalizalt.getTime();
        const napokSzama = Math.ceil(idokulonbseg / (1000 * 3600 * 24));

        if (napokSzama < 0) lejart = true;
    }

    // v5: a létrehozott értékelések száma nem zárja le a próbát, csak a napalapú lejárat.

    return lejart;
};

export function ellenorizTesztStatusz(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin) {
    if (window.isTesztLejart(idoszak, fizetve, int_fin, sajatLetrehozasuAdmin)) {
        window.mutasdPiackutatoAblakot(idoszak);
    }
}

export async function loadAdminLogs() {
    const sysContainer = document.getElementById('minden-log-container');
    const actContainer = document.getElementById('aktivitas-log-container');

    if (!sysContainer || !actContainer) return;

    try {
        const response = await fetch('/api/admin-logs');
        const data = await response.json();

        if (!data.success) {
            renderEmptyState(sysContainer, 'Hiba történt a logok betöltésekor.', 'red');
            renderEmptyState(actContainer, 'Hiba történt a logok betöltésekor.', 'red');
            return;
        }

        if (Array.isArray(data.systemLogs) && data.systemLogs.length > 0) {
            const systemItems = data.systemLogs.map(log => {
                const row = createElement('div', { className: 'logi' });
                const logText = String(log ?? '');
                const match = logText.match(/^\[(.*?)\]\s*\[.*?\]:\s*(.*)$/);

                if (match) {
                    const rawDate = match[1];
                    const message = match[2];
                    const formattedDate = formatLogDate(rawDate);

                    row.append(
                        createElement('span', {
                            text: formattedDate,
                            styles: {
                                color: '#ff6500',
                                fontWeight: 'bold',
                                fontStyle: 'italic'
                            }
                        }),
                        textNode(`: ${message}`)
                    );
                } else {
                    row.append(textNode(`- ${logText}`));
                }

                return row;
            });

            clearAndAppend(sysContainer, ...systemItems);
        } else {
            renderEmptyState(sysContainer, 'Nincs elérhető rendszer log.');
        }

        if (Array.isArray(data.activityLogs) && data.activityLogs.length > 0) {
            const activityItems = data.activityLogs.map(log => {
                const nev = log.vez || 'Ismeretlen felhasználó';
                const intezmeny = log.intnev || 'Ismeretlen intézmény';
                const akcio = log.tevekenyseg || 'Ismeretlen akció';
                const datumStr = formatLogDate(log.datum);

                return createElement('div', { className: 'log-sor' },
                    createElement('span', { className: 'log-jel', text: '-' }),
                    createElement('span', { className: 'log-nev', text: nev }),
                    createElement('span', { className: 'log-zaro', text: '(' }),
                    createElement('span', { className: 'log-intezmeny', text: intezmeny }),
                    createElement('span', { className: 'log-zaro', text: ')' }),
                    createElement('span', { className: 'log-valaszto', text: ':' }),
                    createElement('span', { className: 'log-akcio', text: akcio }),
                    createElement('span', { className: 'log-datum', text: datumStr })
                );
            });

            clearAndAppend(actContainer, ...activityItems);
        } else {
            renderEmptyState(actContainer, 'Nincs elérhető aktivitás log az adatbázisban.');
        }
    } catch (error) {
        console.error('Fetch hiba a logok lekérésekor.');
        renderEmptyState(sysContainer, 'Hálózati hiba.', 'red');
        renderEmptyState(actContainer, 'Hálózati hiba.', 'red');
    }
}
