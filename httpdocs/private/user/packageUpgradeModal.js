const PACKAGE_BILLING_LABELS = {
    monthly: { suffix: '/ hó', hint: 'Bruttó, havi díjak.', note: 'Havi fizetés' },
    quarterly: { suffix: '/ negyedév', hint: 'Bruttó, negyedéves díjak.', note: '3 havi díj egyben' },
    yearly: { suffix: '/ év', hint: 'Bruttó, éves fizetés, kedvezményesebb díjjal.', note: 'Éves fizetés, kedvezményesebb díjjal' }
};

const PACKAGE_UPGRADE_LABELS = {
    start: 'Start csomagváltást kérek',
    pro: 'Pro csomagváltást kérek',
    fenntartoi: 'Fenntartói csomagot kérek'
};

const PACKAGE_REQUEST_TYPE_LABELS = {
    package_change: 'Csomagváltás',
    user_expansion: 'Felhasználói keret bővítése',
    custom_material_addon: 'Saját szakmai anyag plusz szolgáltatás'
};

const PACKAGE_RANK = {
    demo: 0,
    start: 1,
    pro: 2,
    fenntartoi: 3
};

let packageUpgradeModalCsrfToken = '';
let packageUpgradeModalRequestInProgress = false;

function createElement(tag, options = {}, ...children) {
    const element = document.createElement(tag);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = String(options.text);
    if (options.htmlFor) element.htmlFor = options.htmlFor;
    if (options.type) element.type = options.type;
    if (options.value !== undefined) element.value = String(options.value);
    if (options.disabled !== undefined) element.disabled = Boolean(options.disabled);
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

function formatPackagePrice(value) {
    const n = Number(value || 0);
    return new Intl.NumberFormat('hu-HU').format(n) + ' Ft';
}

export function packageRegisterBillingValue(period) {
    const map = {
        monthly: 'havi',
        quarterly: 'negyedeves',
        yearly: 'eves',
        havi: 'havi',
        negyedeves: 'negyedeves',
        eves: 'eves'
    };
    return map[period] || 'havi';
}

function normalizeBillingKey(period) {
    const map = {
        havi: 'monthly',
        monthly: 'monthly',
        negyedeves: 'quarterly',
        quarterly: 'quarterly',
        eves: 'yearly',
        yearly: 'yearly'
    };
    return map[String(period || '').trim().toLowerCase()] || 'monthly';
}

function escapePackageHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

export function normalizePackageCodeForModal(value) {
    return String(value || '').trim().toLowerCase();
}

function currentLicense() {
    return window.__licenseStatus || {};
}

function getCurrentPackageCode() {
    const license = currentLicense();
    return normalizePackageCodeForModal(license.packageCode || license.csomagKod || license.csomag_kod || license.idoszak);
}

function getCurrentPackageName() {
    const license = currentLicense();
    return license.packageName || license.csomagNev || license.csomag_nev || getCurrentPackageCode() || 'nincs adat';
}

function ensurePackageUpgradeModalStyles() {
    if (document.getElementById('package-upgrade-modal-css')) return;

    const link = document.createElement('link');
    link.id = 'package-upgrade-modal-css';
    link.rel = 'stylesheet';
    link.href = './packageUpgradeModal.css?v=20260614-2';
    document.head.appendChild(link);
}

export async function loadPackageUpgradeCsrfToken() {
    if (packageUpgradeModalCsrfToken) return packageUpgradeModalCsrfToken;

    try {
        const response = await fetch('/api/csrf-token', {
            method: 'GET',
            credentials: 'same-origin',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) return '';
        const data = await response.json();
        packageUpgradeModalCsrfToken = data && data.success && data.csrfToken ? data.csrfToken : '';
        return packageUpgradeModalCsrfToken;
    } catch (err) {
        return '';
    }
}

function createSafePackageMessage(message) {
    const fragment = document.createDocumentFragment();
    const template = document.createElement('template');
    template.innerHTML = String(message || '');

    const allowedTags = new Set(['strong', 'b', 'br']);
    const sanitize = node => {
        if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent || '');
        if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();

        const tag = node.tagName.toLowerCase();
        if (!allowedTags.has(tag)) {
            const nested = document.createDocumentFragment();
            node.childNodes.forEach(child => nested.appendChild(sanitize(child)));
            return nested;
        }

        const el = document.createElement(tag);
        node.childNodes.forEach(child => el.appendChild(sanitize(child)));
        return el;
    };

    template.content.childNodes.forEach(node => fragment.appendChild(sanitize(node)));
    return fragment;
}

function showPackageUpgradeStatus(modalBody, title, message, success = false) {
    clearAndAppend(
        modalBody,
        createElement('div', { className: success ? 'package-upgrade-loading' : 'package-upgrade-error' },
            createElement('h3', { text: title }),
            createElement('p', {}, createSafePackageMessage(message))
        )
    );
}

function getCardPackageName(card, fallbackCode = '') {
    const titleElement = card.querySelector('h2');
    if (!titleElement) return fallbackCode || 'Kiválasztott csomag';

    const clone = titleElement.cloneNode(true);

    clone.querySelectorAll('.material-symbols-rounded, .material-icons').forEach(icon => {
        icon.remove();
    });

    const title = clone.textContent.replace(/\s+/g, ' ').trim();
    return title || fallbackCode || 'Kiválasztott csomag';
}

function getCardPrice(card, period) {
    const packageCode = normalizePackageCodeForModal(card.dataset.package);
    if (packageCode === 'demo') return 0;
    return Number(card.dataset[period] || 0);
}

function collectCardBenefits(card, requestType, extraUsers = 0) {
    if (requestType === 'user_expansion') {
        const license = currentLicense();
        const currentMaxUsers = Number(license.maxUsers || license.maxFelhasznalo || license.intfo || 0);
        const next = currentMaxUsers > 0 ? currentMaxUsers + Number(extraUsers || 0) : Number(extraUsers || 0);
        return [
            `${extraUsers} új felhasználói hely`,
            currentMaxUsers > 0 ? `A keret ${currentMaxUsers} főről ${next} főre nő` : `A kért plusz keret ${extraUsers} fő`,
            'Az aktív csomag típusa nem változik'
        ];
    }

    if (requestType === 'custom_material_addon') {
        return [
            'Saját szakmai anyag egyeztetett feltöltése vagy előkészítése',
            'A jelenlegi Start / Pro csomag nem íródik át automatikusan',
            'Feltöltői működés és modulkezelés üzemeltetői egyeztetés után'
        ];
    }

    const benefits = Array.from(card.querySelectorAll('li'))
        .map(li => li.textContent.replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 5);

    const packageCode = normalizePackageCodeForModal(card.dataset.package);
    const currentCode = getCurrentPackageCode();

    if (currentCode === 'start' && packageCode === 'pro') {
        return [
            'Minden Start funkció megmarad',
            'Csoportos statisztika és intézményi elemzés',
            'Elemzői szerepkörök és nagyobb csapatkeret',
            'Audit / megosztási működés bővebb intézményi használatra'
        ];
    }

    return benefits.length ? benefits : ['A kiválasztott csomaghoz tartozó bővebb hozzáférés aktiválás után lép életbe.'];
}

function showPackageConfirmDialog({ requestType, targetName, fromName, period, price, benefits }) {
    return new Promise(resolve => {
        const old = document.getElementById('package-confirm-overlay');
        if (old) old.remove();

        const label = PACKAGE_REQUEST_TYPE_LABELS[requestType] || 'Kérelem';
        const periodText = PACKAGE_BILLING_LABELS[period]?.note || 'Havi fizetés';
        const priceText = price === null || price === undefined
            ? 'A pontos díj a kérelem rögzítése után jelenik meg.'
            : formatPackagePrice(price);
        const overlay = createElement('div', { id: 'package-confirm-overlay', className: 'package-confirm-overlay' });
        const listItems = (benefits || []).map(item => createElement('li', { text: item }));

        const box = createElement('div', { className: 'package-confirm-box' },
            createElement('h3', { text: 'Kérelem megerősítése' }),
            createElement('div', { className: 'package-confirm-summary' },
                createElement('div', {}, createElement('strong', { text: 'Típus: ' }), textNode(label)),
                createElement('div', {}, createElement('strong', { text: 'Jelenleg: ' }), textNode(fromName || 'nincs adat')),
                createElement('div', {}, createElement('strong', { text: 'Kért cél: ' }), textNode(targetName || 'nincs adat')),
                createElement('div', {}, createElement('strong', { text: 'Fizetési időszak: ' }), textNode(periodText)),
                createElement('div', {}, createElement('strong', { text: 'Várható összeg: ' }), textNode(priceText))
            ),
            createElement('p', { text: 'Pluszban ezt kéri:' }),
            createElement('ul', { className: 'package-confirm-benefits' }, listItems),
            createElement('div', { className: 'package-confirm-actions' },
                createElement('button', { className: 'package-confirm-cancel', text: 'Mégsem', attrs: { type: 'button' } }),
                createElement('button', { className: 'package-confirm-submit', text: 'Kérelem elküldése', attrs: { type: 'button' } })
            )
        );

        const cleanup = value => {
            overlay.remove();
            resolve(value);
        };

        box.querySelector('.package-confirm-cancel').addEventListener('click', () => cleanup(false));
        box.querySelector('.package-confirm-submit').addEventListener('click', () => cleanup(true));
        overlay.addEventListener('click', event => {
            if (event.target === overlay) cleanup(false);
        });

        overlay.appendChild(box);
        document.body.appendChild(overlay);
    });
}

function buildPendingRequestBox(pendingRequest = {}) {
    const label = pendingRequest.requestTypeLabel || pendingRequest.statusz || 'függőben lévő kérelem';
    const target = pendingRequest.packageName || pendingRequest.csomag_nev || pendingRequest.csomagKod || pendingRequest.csomag_kod || 'nincs adat';

    return createElement('div', { className: 'package-upgrade-locked' },
        createElement('h3', { text: 'Már van folyamatban lévő kérelem' }),
        createElement('p', {
            text: `Amíg az üzemeltető / sysadmin oldalon nem történik jóváhagyás, elutasítás vagy lezárás, újabb csomagváltási vagy bővítési kérelmet nem lehet indítani.`
        }),
        createElement('p', {},
            createElement('strong', { text: 'Folyamatban: ' }),
            textNode(`${label} – ${target}`)
        )
    );
}

function renderPackageModalPrices(scope, period) {
    const label = PACKAGE_BILLING_LABELS[period] || PACKAGE_BILLING_LABELS.monthly;

    scope.querySelectorAll('.pricing-card[data-package]').forEach(card => {
        const priceEl = card.querySelector('[data-price]');
        const noteEl = card.querySelector('[data-note]');
        if (!priceEl || !noteEl) return;

        if (card.dataset.package === 'demo') {
            priceEl.textContent = '0 Ft';
            noteEl.textContent = '3 napos kipróbálás';
            return;
        }

        const price = Number(card.dataset[period] || 0);
        priceEl.innerHTML = `${formatPackagePrice(price)} <small>${label.suffix}</small>${card.dataset.from === '1' ? ' <small>-tól</small>' : ''}`;
        noteEl.textContent = label.note;
    });

    const hint = scope.querySelector('#billingHint, .billing-hint');
    if (hint) hint.textContent = label.hint;
}

async function sendPackageUpgradeRequest(packageCode, billingPeriod, modalBody, options = {}) {
    const requestType = options.requestType || 'package_change';
    const extraUsers = Math.max(0, Math.min(20, Math.floor(Number(options.extraUsers || 0))));
    const normalizedCode = normalizePackageCodeForModal(packageCode);
    if (!normalizedCode || packageUpgradeModalRequestInProgress) return;

    const license = currentLicense();
    if (license.pendingRequest) {
        clearAndAppend(modalBody, buildPendingRequestBox(license.pendingRequest));
        return;
    }

    const currentCode = getCurrentPackageCode();
    const requestTypeLabel = PACKAGE_REQUEST_TYPE_LABELS[requestType] || 'Kérelem';

    if (requestType === 'user_expansion') {
        if (!currentCode || currentCode === 'demo') {
            showPackageUpgradeStatus(modalBody, 'Előbb aktív csomag szükséges', 'Felhasználói keret bővítést csak aktív, nem demo csomaghoz lehet kérni.');
            return;
        }
        if (extraUsers < 1) {
            showPackageUpgradeStatus(modalBody, 'Hiányzó darabszám', 'Legalább 1 plusz felhasználót meg kell adni.');
            return;
        }
    } else if (requestType === 'custom_material_addon') {
        if (currentCode === 'demo') {
            showPackageUpgradeStatus(modalBody, 'Előbb aktív csomag szükséges', 'A saját szakmai anyag plusz szolgáltatás demó mellé nem kérhető. Előbb Start vagy Pro csomagot kell aktiválni.');
            return;
        }
        if (currentCode === 'sajat') {
            showPackageUpgradeStatus(modalBody, 'Ez már saját rendszer', 'Ehhez az intézményhez már Saját rendszer csomag tartozik.');
            return;
        }
    } else {
        if (normalizedCode === 'demo') {
            showPackageUpgradeStatus(modalBody, 'Demo csak új regisztrációhoz', 'Már meglévő intézménynél a Demo nem csomagváltási cél. Start vagy Pro csomag kérhető.');
            return;
        }

        if (currentCode && normalizedCode === currentCode) {
            showPackageUpgradeStatus(modalBody, 'Ez a jelenlegi csomag', 'Ehhez a csomaghoz már tartozik aktív hozzáférés. Felhasználói keretet a külön bővítési résznél lehet kérni.');
            return;
        }
    }

    packageUpgradeModalRequestInProgress = true;
    showPackageUpgradeStatus(modalBody, 'Kérelem küldése', `${requestTypeLabel} rögzítése folyamatban van…`, true);

    try {
        const csrfToken = await loadPackageUpgradeCsrfToken();
        if (!csrfToken) {
            showPackageUpgradeStatus(modalBody, 'Bejelentkezés szükséges', 'A kérelemhez aktív bejelentkezés szükséges.');
            return;
        }

        const response = await fetch('/api/package-change-request', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            body: JSON.stringify({
                csomagKod: normalizedCode,
                kerelemTipus: requestType,
                fizetesiIdoszak: packageRegisterBillingValue(billingPeriod),
                extraFelhasznalo: extraUsers,
                megjegyzes: options.note || `${requestTypeLabel} dashboard modalból indítva.`
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            if (data.pendingRequest) {
                clearAndAppend(modalBody, buildPendingRequestBox(data.pendingRequest));
                return;
            }

            showPackageUpgradeStatus(modalBody, 'Nem sikerült rögzíteni', escapePackageHTML(data.message || 'A kérelem rögzítése sikertelen.'));
            return;
        }

        if (window.loadLicenseStatus) {
            window.__licenseStatus = { ...(window.__licenseStatus || {}), pendingRequest: data.pendingRequest || {
                requestType,
                requestTypeLabel,
                packageName: data.packageName || normalizedCode,
                csomagKod: data.requestedPackage || normalizedCode
            }};
        }

        const usersLine = data.osszesFelhasznalo
            ? `Felhasználói keret: <strong>${escapePackageHTML(data.osszesFelhasznalo)} fő</strong><br>`
            : '';

        showPackageUpgradeStatus(
            modalBody,
            `${escapePackageHTML(data.requestTypeLabel || requestTypeLabel)} rögzítve`,
            `Kért cél: <strong>${escapePackageHTML(data.packageName || normalizedCode)}</strong><br>` +
            usersLine +
            `Várható összeg: <strong>${escapePackageHTML(formatPackagePrice(data.fizetendoOsszeg || 0))}</strong><br>` +
            escapePackageHTML(data.message || 'A változás az üzemeltetői aktiválás után lép életbe.'),
            true
        );
    } catch (err) {
        showPackageUpgradeStatus(modalBody, 'Hálózati hiba', 'A kérelem elküldése nem sikerült.');
    } finally {
        packageUpgradeModalRequestInProgress = false;
    }
}

function buildPackageExtraUsersPanel(modalBody, getBillingPeriod) {
    const license = currentLicense();
    const currentCode = getCurrentPackageCode();
    const currentMaxUsers = Number(license.maxUsers || license.maxFelhasznalo || license.intfo || 0);
    const registeredUsers = Number(license.registeredUsers || license.regisztraltFelhasznalok || 0);
    const disabled = !currentCode || currentCode === 'demo' || Boolean(license.pendingRequest);

    const input = createElement('input', {
        attrs: {
            type: 'number',
            min: '1',
            max: '20',
            step: '1',
            value: '1'
        }
    });

    const button = createElement('button', {
        text: 'Felhasználói keret bővítését kérem',
        attrs: { type: 'button' }
    });

    if (disabled) {
        button.disabled = true;
        input.disabled = true;
    }

    button.addEventListener('click', async () => {
        const extraUsers = Math.max(1, Math.min(20, Math.floor(Number(input.value || 1))));
        const ok = await showPackageConfirmDialog({
            requestType: 'user_expansion',
            targetName: `${extraUsers} plusz felhasználói hely`,
            fromName: getCurrentPackageName(),
            period: getBillingPeriod(),
            price: null,
            benefits: collectCardBenefits(null, 'user_expansion', extraUsers)
        });
        if (!ok) return;

        sendPackageUpgradeRequest(currentCode, getBillingPeriod(), modalBody, {
            requestType: 'user_expansion',
            extraUsers,
            note: `Felhasználói keret bővítése dashboard modalból indítva. Plusz felhasználó: ${extraUsers} fő.`
        });
    });

    const currentLine = currentMaxUsers > 0
        ? `Jelenlegi keret: ${currentMaxUsers} fő${registeredUsers > 0 ? `, ebből regisztrált: ${registeredUsers} fő.` : '.'}`
        : 'A jelenlegi keretet a rendszer nem tudta egyértelműen beazonosítani.';

    const helpText = license.pendingRequest
        ? 'Folyamatban lévő kérelem mellett újabb felhasználói keretbővítés nem indítható.'
        : disabled
            ? 'Demo csomagban előbb Start vagy Pro csomagot kell kérnie, utána bővíthető a felhasználói keret.'
            : `${currentLine} Itt csak plusz felhasználói helyeket kérhet, a csomag maga nem változik.`;

return createElement('div', { className: 'package-extra-users-box' },
    createElement('h3', { text: 'Felhasználói keret bővítése' }),

    createElement('div', { className: 'package-extra-users-content' },
        createElement('div', { className: 'package-extra-users-row' },
            createElement('p', { text: helpText }),
            createElement('label', { text: 'Plusz fő:' }),
            input
        ),

        createElement('div', { className: 'package-extra-users-actions' },
            button
        )
    )
);
}

function shouldDisplayPackageCard(packageCode) {
    const currentCode = getCurrentPackageCode();
    if (packageCode === 'demo') return false;
    if (packageCode === currentCode) return false;

    if (packageCode === 'sajat') {
        return currentCode !== 'demo' && currentCode !== 'sajat';
    }

    const currentRank = PACKAGE_RANK[currentCode] ?? 0;
    const targetRank = PACKAGE_RANK[packageCode];
    if (targetRank === undefined) return false;

    return targetRank > currentRank;
}

function preparePackageUpgradeFragment(fragment, modalBody) {
    const currentCode = getCurrentPackageCode();
    const currentName = getCurrentPackageName();
    let modalBillingPeriod = normalizeBillingKey(currentLicense().billingPeriod || currentLicense().fizetesiIdoszak || 'monthly');

    fragment.querySelectorAll('script').forEach(script => script.remove());
    fragment.querySelectorAll('[id]').forEach(el => {
        if (el.id === 'billingHint') el.id = 'packageUpgradeBillingHint';
    });

    const wrapper = createElement('div');
    wrapper.appendChild(buildPackageExtraUsersPanel(modalBody, () => modalBillingPeriod));

    const cards = Array.from(fragment.querySelectorAll('.pricing-card[data-package]'));
    let selectableCount = 0;

    cards.forEach(card => {
        const packageCode = normalizePackageCodeForModal(card.dataset.package);
        if (!shouldDisplayPackageCard(packageCode)) {
            card.remove();
            return;
        }

        selectableCount += 1;

        const isOwnMaterialAddon = packageCode === 'sajat';
        const action = card.querySelector('a, button');

        if (isOwnMaterialAddon) {
            const addonBadge = createElement('span', {
                className: 'addon-package-badge',
                text: 'Plusz szolgáltatásként kérhető'
            });
            card.insertBefore(addonBadge, card.firstChild);
        } else {
            const routeBadge = createElement('span', {
                className: 'upgrade-route-badge',
                text: `${currentName} → ${getCardPackageName(card, packageCode)}`
            });
            card.insertBefore(routeBadge, card.firstChild);
        }

        if (action) {
            action.href = '#csomagvaltas';
            action.dataset.packageCode = packageCode;
            action.dataset.requestType = isOwnMaterialAddon ? 'custom_material_addon' : 'package_change';
            action.textContent = isOwnMaterialAddon
                ? 'Saját szakmai anyagot kérek pluszban'
                : (PACKAGE_UPGRADE_LABELS[packageCode] || 'Csomagváltást kérek');

            action.addEventListener('click', async event => {
                event.preventDefault();
                const requestType = action.dataset.requestType || 'package_change';
                const targetName = isOwnMaterialAddon ? 'Saját szakmai anyag plusz szolgáltatás' : getCardPackageName(card, packageCode);
                const price = getCardPrice(card, modalBillingPeriod);
                const benefits = collectCardBenefits(card, requestType);
                const ok = await showPackageConfirmDialog({
                    requestType,
                    targetName,
                    fromName: currentName,
                    period: modalBillingPeriod,
                    price,
                    benefits
                });
                if (!ok) return;

                sendPackageUpgradeRequest(packageCode, modalBillingPeriod, modalBody, {
                    requestType,
                    note: isOwnMaterialAddon
                        ? 'Saját szakmai anyag plusz szolgáltatás dashboard modalból indítva. Nem automatikus csomagváltásként kezelendő.'
                        : `Csomagváltási kérelem dashboard modalból indítva. ${currentName} → ${targetName}.`
                });
            });
        }
    });

    fragment.querySelectorAll('.billing-options button').forEach(button => {
        const buttonBilling = normalizeBillingKey(button.dataset.billing || button.dataset.period || button.textContent);
        button.dataset.billing = buttonBilling;
        button.classList.toggle('active', buttonBilling === modalBillingPeriod);

        button.addEventListener('click', () => {
            modalBillingPeriod = button.dataset.billing || 'monthly';
            fragment.querySelectorAll('.billing-options button').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            renderPackageModalPrices(fragment, modalBillingPeriod);
        });
    });

    renderPackageModalPrices(fragment, modalBillingPeriod);

    if (selectableCount > 0) {
        wrapper.appendChild(fragment);
    } else {
        wrapper.appendChild(createElement('div', { className: 'package-upgrade-empty' },
            createElement('h3', { text: 'Nincs közvetlenül választható magasabb csomag' }),
            createElement('p', { text: 'A jelenlegi csomag nem jelenik meg választhatóként. Kisebb csomagra váltást nem kínálunk fel automatikus kérelemként; az inkább külön egyeztetést igényel.' })
        ));
    }

    if ((PACKAGE_RANK[currentCode] || 0) >= PACKAGE_RANK.pro) {
        wrapper.appendChild(createElement('div', { className: 'package-downgrade-note' },
            createElement('strong', { text: 'Visszaváltás kisebb csomagra: ' }),
            textNode('nem önkiszolgáló bővítésként kezeljük. Ilyenkor érdemes külön egyeztetni, mert ez nem plusz hozzáférés, hanem szolgáltatáscsökkentés.')
        ));
    }

    return wrapper;
}

function buildFallbackPackageSection() {
    const section = createElement('section', { className: 'pricing-section' });
    section.innerHTML = `
        <div class="section-head">
            <span class="section-step">02</span>
            <div class="hatos">
                <div class="hatdiv">
                    <h2>Csomagok</h2>
                    <p>Nem sikerült az árak oldal csomagrészletét betölteni, ezért a beépített csomagkártyák jelennek meg.</p>
                </div>
                <div class="billing-switch" aria-label="Fizetési időszak választása">
                    <div class="billing-switch-title">Fizetési időszak</div>
                    <div class="billing-options">
                        <button type="button" class="active" data-billing="monthly">Havi</button>
                        <button type="button" data-billing="quarterly">Negyedéves</button>
                        <button type="button" data-billing="yearly">Éves</button>
                    </div>
                    <div class="billing-hint">Bruttó, havi díjak.</div>
                </div>
            </div>
        </div>
        <div class="pricing-grid">
            <article class="pricing-card featured" data-package="start" data-monthly="18900" data-quarterly="75000" data-yearly="222000">
                <span class="badge">Ajánlott indulásra</span><h2>Értékek Start</h2><div class="price" data-price></div><div class="billing-note" data-note></div>
                <div class="package-role"><div class="package-small-title">Szerepkör</div><strong>2 értékelő</strong><br>Teljes értékelői működés kisebb intézményi használatra.</div>
                <ul><li>korlátlan értékelés</li><li>teljes szakmai anyag</li><li>PDF, grafikon és AI-szövegezés</li></ul>
                <a href="#csomagvaltas">Start csomagváltást kérek</a>
            </article>
            <article class="pricing-card" data-package="pro" data-monthly="24900" data-quarterly="139000" data-yearly="279000">
                <h2>Értékek Pro</h2><div class="price" data-price></div><div class="billing-note" data-note></div>
                <div class="package-role"><div class="package-small-title">Szerepkörök</div><strong>3 értékelő + 2 elemző</strong><br>Intézményi és csoportos elemzéshez.</div>
                <ul><li>minden Start funkció</li><li>intézményi és csoportos statisztika</li><li>audit és megosztás</li></ul>
                <a href="#csomagvaltas">Pro csomagváltást kérek</a>
            </article>
            <article class="pricing-card secondary" data-package="sajat" data-monthly="19900" data-quarterly="79000" data-yearly="189000" data-from="1">
                <h2>Saját rendszer</h2><div class="price" data-price></div><div class="billing-note" data-note></div>
                <div class="package-role"><div class="package-small-title">Kiegészítő lehetőség</div><strong>Saját szakmai anyag</strong><br>Aktív Start vagy Pro csomag mellé plusz szolgáltatásként is kérhető.</div>
                <ul><li>üres értékelő rendszer vagy saját szakmai anyag</li><li>feltöltői működés egyeztetéssel</li><li>nem írja át automatikusan a jelenlegi csomagot</li></ul>
                <a href="#csomagvaltas">Saját szakmai anyagot kérek pluszban</a>
            </article>
        </div>
    `;
    return section;
}

async function loadPackagesSectionFromPricingPage() {
    const response = await fetch('/araink.html?modal=packages', {
        method: 'GET',
        credentials: 'same-origin',
        headers: { 'Accept': 'text/html' }
    });

    if (!response.ok) throw new Error('Az árak oldal nem tölthető be.');

    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const sections = Array.from(doc.querySelectorAll('.pricing-section'));
    const packagesSection = sections.find(section => {
        const step = (section.querySelector('.section-step')?.textContent || '').trim();
        const title = (section.querySelector('h2')?.textContent || '').trim().toLowerCase();
        return step === '02' || title.includes('csomagok');
    });

    if (!packagesSection) throw new Error('A csomagok blokk nem található.');

    return packagesSection.cloneNode(true);
}

export async function openPackageUpgradeModal() {
    ensurePackageUpgradeModalStyles();

    if (window.loadLicenseStatus && (!window.__licenseStatus || !window.__licenseStatus.success)) {
        await window.loadLicenseStatus();
    }

    const old = document.getElementById('package-upgrade-modal');
    if (old) old.remove();

    const overlay = createElement('div', { id: 'package-upgrade-modal', className: 'package-upgrade-modal' });
    const box = createElement('div', { className: 'package-upgrade-modal-box' });
    const body = createElement('div', { className: 'package-upgrade-modal-body' });

    const closeButton = createElement('button', {
        className: 'package-upgrade-modal-close',
        text: '×',
        attrs: { type: 'button', title: 'Bezárás' }
    });

    closeButton.addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', event => {
        if (event.target === overlay) overlay.remove();
    });

    const currentPackageText = getCurrentPackageName()
        ? `Jelenlegi csomag: ${getCurrentPackageName()}`
        : 'A jelenlegi csomagot a rendszer külön jelöli, ha be tudja azonosítani.';

    const head = createElement('div', { className: 'package-upgrade-modal-head' },
        createElement('div', {},
            createElement('h2', { text: 'Csomagok és bővítések' }),
            createElement('p', { text: currentPackageText })
        ),
        closeButton
    );

    clearAndAppend(body, createElement('div', { className: 'package-upgrade-loading', text: 'Csomagok betöltése…' }));
    box.append(head, body);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const license = currentLicense();
    if (license.pendingRequest) {
        clearAndAppend(body, buildPendingRequestBox(license.pendingRequest));
        return;
    }

    try {
        const section = await loadPackagesSectionFromPricingPage();
        clearAndAppend(body, preparePackageUpgradeFragment(section, body));
    } catch (err) {
        const fallback = buildFallbackPackageSection();
        clearAndAppend(body, preparePackageUpgradeFragment(fallback, body));
    }
}
