// Értékelési / PDF-előkészítő nézetből visszanavigálás a kérdőív megfelelő pontjára.
// Ugyanazt az elvet használja, mint a kereső: útvonal nyitása, majd cél kiemelése.

let ertekelesNavigacioFolyamatban = false;

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

function cleanValue(value) {
    const clean = String(value || '').trim();
    return clean && clean !== 'null' && clean !== 'undefined' ? clean : '';
}

function sameText(a, b) {
    return normalizeText(a) === normalizeText(b);
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(getter, timeout = 3000, interval = 60) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeout) {
        const value = getter();
        if (value) return value;
        await wait(interval);
    }

    return null;
}

function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') {
        return window.CSS.escape(String(value));
    }

    return String(value).replace(/"/g, '\\"');
}

function getCleanElementText(elem) {
    if (!elem) return '';

    const clone = elem.cloneNode(true);
    clone.querySelectorAll('.pontA, .pontB, .pontC, .pontD, .pontE, .pontF').forEach(item => item.remove());

    return String(clone.textContent || '')
        .replace(/:$/, '')
        .trim();
}

function getFoNameFromBlock(elem) {
    const foBlock = elem?.closest?.('.fo-kategoria');
    const h3 = foBlock?.querySelector?.('h3');
    return getCleanElementText(h3);
}

function findPreviousAlCategoryName(row) {
    let current = row?.previousElementSibling || null;

    while (current) {
        const alCell = current.querySelector?.('td.al-kategoria');
        if (alCell) return getCleanElementText(alCell);
        current = current.previousElementSibling;
    }

    return '';
}

function findCategoryByTitle(selector, title) {
    return [...document.querySelectorAll(selector)].find(elem => {
        const cim = elem.querySelector('.cim');
        return sameText(cim ? cim.textContent : elem.textContent, title);
    }) || null;
}

function findQuestionElement(questionId) {
    return document.querySelector(`.question[data-id="${cssEscape(questionId)}"]`);
}

function findAlkerdesContainer(parentId) {
    return document.getElementById(`alkerdesek-${parentId}`);
}

async function ensureParentQuestionReady(parentId) {
    return await waitFor(() => findQuestionElement(parentId), 4500, 70);
}

async function ensureAlkerdesContainerReady(parentId) {
    const existing = findAlkerdesContainer(parentId);
    if (existing) return existing;

    const parentQuestion = await ensureParentQuestionReady(parentId);
    if (!parentQuestion) return null;

    return await waitFor(() => findAlkerdesContainer(parentId), 2500, 70);
}

function highlightElement(elem) {
    if (!elem) return;

    document.querySelectorAll('.kereso-talalat-highlight').forEach(item => {
        item.classList.remove('kereso-talalat-highlight');
    });

    elem.classList.add('kereso-talalat-highlight');
    elem.scrollIntoView({ behavior: 'smooth', block: 'center' });

    setTimeout(() => {
        elem.classList.remove('kereso-talalat-highlight');
    }, 2800);
}
async function ensureFoOpen(foKategoria) {
    const { KategoriaKezelo } = await import('./main_quest.js');

    let foElem = findCategoryByTitle('#fo_kategoriak .fo', foKategoria);

    if (!foElem) {
        KategoriaKezelo.loadFoKategoriak();
        foElem = await waitFor(() => findCategoryByTitle('#fo_kategoriak .fo', foKategoria), 4500, 70);
    }

    if (!foElem) return null;

    if (!foElem.classList.contains('active')) {
        foElem.click();
        await waitFor(() => foElem.classList.contains('active'), 3500, 70);
        await wait(250);
    }

    return foElem;
}

async function ensureAlOpen(foKategoria, alKategoria) {
    await ensureFoOpen(foKategoria);

    const selector = `.al-blokk[data-fo-kategoria="${cssEscape(foKategoria)}"][data-al-kategoria="${cssEscape(alKategoria)}"] .al`;
    let alElem = document.querySelector(selector);

    if (!alElem) {
        alElem = await waitFor(() => document.querySelector(selector));
    }

    if (!alElem) return null;

    if (!alElem.classList.contains('active')) {
        alElem.click();
        await waitFor(() => alElem.classList.contains('active'));
        await wait(250);
    }

    return alElem;
}

async function ensureAltOpen(foKategoria, alKategoria, altTema) {
    if (alKategoria) {
        await ensureAlOpen(foKategoria, alKategoria);
    } else {
        await ensureFoOpen(foKategoria);
    }

    const key = [foKategoria || '', alKategoria || '', altTema || ''].join('|');
    const selector = `[data-altema-utvonal="${cssEscape(key)}"]`;
    let altElem = document.querySelector(selector);

    if (!altElem) {
        altElem = await waitFor(() => document.querySelector(selector));
    }

    if (!altElem) return null;

    if (!altElem.classList.contains('active')) {
        altElem.click();
        await waitFor(() => altElem.classList.contains('active'));
        await wait(250);
    }

    return altElem;
}

async function openPath(item) {
    const foKategoria = cleanValue(item.foKategoria);
    const alKategoria = cleanValue(item.alKategoria);
    const altTema = cleanValue(item.altTema);

    if (!foKategoria) return null;

    if (altTema) {
        return await ensureAltOpen(foKategoria, alKategoria, altTema);
    }

    if (alKategoria) {
        return await ensureAlOpen(foKategoria, alKategoria);
    }

    return await ensureFoOpen(foKategoria);
}

async function findQuestionDataById(questionId) {
    const { KategoriaKezelo } = await import('./main_quest.js');
    const id = Number(questionId);

    return KategoriaKezelo.kerdesek.find(k => Number(k.id) === id) || null;
}
let fokuszKerdesIndexPromise = null;

async function getFokuszKerdesIndex() {
    if (!fokuszKerdesIndexPromise) {
        fokuszKerdesIndexPromise = fetch('/kerdesek', { cache: 'no-store' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('A kérdés-index betöltése sikertelen.');
                }

                return response.json();
            });
    }

    return fokuszKerdesIndexPromise;
}

async function navigationItemFromQuestionId(questionId) {
    const id = Number(questionId);
    if (!id) return null;

    const rows = await getFokuszKerdesIndex();

    const row = Array.isArray(rows)
        ? rows.find(item => Number(item.id) === id)
        : null;

    if (!row) return null;

    return {
        foKategoria: cleanValue(row.fo_kategoria),
        alKategoria: cleanValue(row.al_kategoria),
        altTema: cleanValue(row.alt_tema),
        questionId: Number(row.id),
        parentId: row.parent_id === null || typeof row.parent_id === 'undefined'
            ? null
            : Number(row.parent_id),
        valaszAg: cleanValue(row.valasz_ag) || 'igen'
    };
}
function questionToNavigationItem(kerdes) {
    if (!kerdes) return null;

    return {
        foKategoria: kerdes.foKategoria,
        alKategoria: kerdes.alKategoria,
        altTema: kerdes.altTema,
        questionId: Number(kerdes.id),
        parentId: kerdes.parentId ? Number(kerdes.parentId) : null,
        valaszAg: kerdes.valaszAg || 'igen'
    };
}

async function scrollToQuestion(item) {
    const { KategoriaKezelo } = await import('./main_quest.js');
    const targetQuestionId = Number(item.questionId);

    if (!targetQuestionId) return null;

    if (item.parentId) {
        const parentId = Number(item.parentId);
        const parentQuestion = await ensureParentQuestionReady(parentId);
        const alkerdesContainer = await ensureAlkerdesContainerReady(parentId);

        if (!parentQuestion || !alkerdesContainer) {
            const parentTarget = parentQuestion?.closest('.kerdesmodul') || parentQuestion;
            if (parentTarget) highlightElement(parentTarget);
            return parentTarget || null;
        }

        const parentKerdes = KategoriaKezelo.kerdesek.find(k => Number(k.id) === parentId);

        if (parentKerdes) {
            await KategoriaKezelo.loadAlKerdesek(parentId, item.valaszAg || 'igen', parentKerdes);
            await wait(180);
        }
    }

    const question = await waitFor(() => findQuestionElement(targetQuestionId), 3500, 70);
    const target = question?.closest('.kerdesmodul') || question;

    if (target) highlightElement(target);

    return target;
}

async function navigateToItem(item) {
    const openedElement = await openPath(item);

    if (item.questionId) {
        const questionElement = await scrollToQuestion(item);
        if (questionElement) return;
    }

    if (openedElement) {
        highlightElement(openedElement.closest('.al-blokk') || openedElement);
    }
}

async function navigationItemFromClickedElement(clickedElement) {
    const container = document.getElementById('ertekelesek-container');
    if (!container || !container.contains(clickedElement)) return null;

    const questionLine = clickedElement.closest('.fokerd, .alkerd');
    if (questionLine) {
        const kerdes = await findQuestionDataById(questionLine.dataset.id);
        return questionToNavigationItem(kerdes);
    }

    const altCell = clickedElement.closest('td.alt-tema');
    if (altCell) {
        const row = altCell.closest('tr');
        const foKategoria = getFoNameFromBlock(altCell);
        const altTema = getCleanElementText(altCell);
        const alKategoria = row?.classList?.contains('fo-kozvetlen-altema')
            ? ''
            : findPreviousAlCategoryName(row);

        return {
            foKategoria,
            alKategoria,
            altTema
        };
    }

    const alCell = clickedElement.closest('td.al-kategoria');
    if (alCell) {
        return {
            foKategoria: getFoNameFromBlock(alCell),
            alKategoria: getCleanElementText(alCell),
            altTema: ''
        };
    }

    const foHeader = clickedElement.closest('.fo-kategoria > h3');
    if (foHeader) {
        return {
            foKategoria: getCleanElementText(foHeader),
            alKategoria: '',
            altTema: ''
        };
    }

    return null;
}

function markClickableParts(container) {
    container.querySelectorAll('.fo-kategoria > h3, td.al-kategoria, td.alt-tema, .fokerd, .alkerd').forEach(elem => {
        elem.classList.add('ertekeles-navigalhato');
        elem.title = 'Ugrás a kérdőív megfelelő pontjára';
    });
}

function bindErtekelesNavigator() {
    const container = document.getElementById('ertekelesek-container');
    if (!container || container.dataset.ertekelesNavigatorBound === '1') return;

    container.dataset.ertekelesNavigatorBound = '1';

    container.addEventListener('mouseover', () => {
        markClickableParts(container);
    }, { passive: true });

    container.addEventListener('click', async (event) => {
        if (ertekelesNavigacioFolyamatban) return;

        const item = await navigationItemFromClickedElement(event.target);
        if (!item || !item.foKategoria) return;

        event.preventDefault();
        event.stopPropagation();

        ertekelesNavigacioFolyamatban = true;
        document.body.classList.add('ertekeles-navigacio-folyamatban');

        try {
            await navigateToItem(item);
        } catch (error) {
            console.error('Értékelésből indított navigációs hiba:', error);
        } finally {
            ertekelesNavigacioFolyamatban = false;
            document.body.classList.remove('ertekeles-navigacio-folyamatban');
        }
    });
}

function initErtekelesNavigator() {
    bindErtekelesNavigator();

    const observer = new MutationObserver(() => {
        const container = document.getElementById('ertekelesek-container');
        if (container) {
            bindErtekelesNavigator();
            markClickableParts(container);
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initErtekelesNavigator, { once: true });
} else {
    initErtekelesNavigator();
}
export async function navigateToFocusEntry(entry = {}) {
    const elemKulcs = cleanValue(
        typeof entry === 'string'
            ? entry
            : entry.elemKulcs
    );

    if (!elemKulcs) return false;

    const [kulcsTipusRaw, kulcsErtekRaw] = elemKulcs.split(':');
    const kulcsTipus = normalizeText(kulcsTipusRaw);
    const kulcsErtek = cleanValue(kulcsErtekRaw);

    /*
      Kérdés / alkérdés esetén NEM az entry.utvonalból találgatunk.
      Ugyanabból a /kerdesek indexből dolgozunk, mint a kereső.
      Ez kezeli:
      - Főkategória → Kérdés
      - Főkategória → Altéma → Kérdés
      - Főkategória → Alkategória → Kérdés
      - Főkategória → Alkategória → Altéma → Kérdés
    */
    if (
        (kulcsTipus.includes('kerdes') || kulcsTipus.includes('alkerdes')) &&
        /^\d+$/.test(kulcsErtek)
    ) {
        const item = await navigationItemFromQuestionId(kulcsErtek);

        if (item) {
            await navigateToItem(item);
            return true;
        }
    }

    /*
      Kategória / alkategória / altéma esetén maradhat az útvonalas fallback,
      mert ott nincs kérdés-ID, amiből pontosan visszakereshetnénk.
    */
    const utvonal = Array.isArray(entry?.utvonal)
        ? entry.utvonal.map(cleanValue).filter(Boolean)
        : [];

    if (utvonal.length) {
        let item = null;

        if (kulcsTipus.includes('fo')) {
            item = {
                foKategoria: utvonal[0],
                alKategoria: '',
                altTema: ''
            };
        } else if (kulcsTipus.includes('al-kategoria') || kulcsTipus.includes('alkategoria')) {
            item = {
                foKategoria: utvonal[0],
                alKategoria: utvonal[1] || '',
                altTema: ''
            };
        } else if (kulcsTipus.includes('altema') || kulcsTipus.includes('alt')) {
            item = {
                foKategoria: utvonal[0],
                alKategoria: utvonal.length >= 3 ? utvonal[1] : '',
                altTema: utvonal.length >= 3 ? utvonal[2] : utvonal[1] || ''
            };
        }

        if (item?.foKategoria) {
            await navigateToItem(item);
            return true;
        }
    }

    const elem = document.querySelector(`[data-fokusz-kulcs="${cssEscape(elemKulcs)}"]`);

    if (elem) {
        highlightElement(elem);
        return true;
    }

    return false;
}
