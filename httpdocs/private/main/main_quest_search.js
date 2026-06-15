// Kérdés- és kategóriakereső a kérdőív navigációjához.
// Új fájl: importáld a main_alap.js-ben: import './main_quest_search.js';

const SEARCH_MIN_LENGTH = 2;
const MAX_RESULTS = 40;

let keresoIndexPromise = null;
let utolsoTalalatok = [];
let navigacioFolyamatban = false;

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function cleanValue(value) {
    const clean = String(value || '').trim();
    return clean && clean.toLowerCase() !== 'null' && clean.toLowerCase() !== 'undefined'
        ? clean
        : '';
}

function pathParts(item) {
    return [item.foKategoria, item.alKategoria, item.altTema]
        .map(cleanValue)
        .filter(Boolean);
}

function formatPath(item) {
    const parts = pathParts(item);
    return parts.length ? parts.join(' › ') : 'Nincs útvonal';
}

function addUnique(map, item) {
    if (!item.key || map.has(item.key)) return;

    const path = formatPath(item);
    const haystack = normalizeText([
        item.typeLabel,
        item.title,
        item.negaltTitle,
        path,
        item.foKategoria,
        item.alKategoria,
        item.altTema
    ].filter(Boolean).join(' '));

    map.set(item.key, {
        ...item,
        path,
        haystack
    });
}

function buildSearchIndex(rows) {
    const map = new Map();

    (rows || []).forEach(row => {
        const foKategoria = cleanValue(row.fo_kategoria);
        const alKategoria = cleanValue(row.al_kategoria);
        const altTema = cleanValue(row.alt_tema);
        const kerdesSzoveg = cleanValue(row.kerdes_szoveg || row.szoveg);
        const negaltSzoveg = cleanValue(row.negalt_kerdes_szoveg || row.negaltKerdesSzoveg);
        const id = Number(row.id);
        const parentId = row.parent_id === null || typeof row.parent_id === 'undefined'
            ? null
            : Number(row.parent_id);
        const valaszAg = cleanValue(row.valasz_ag);
        const kindex = Number(row.kindex) || 0;

        if (foKategoria) {
            addUnique(map, {
                key: `fo|${foKategoria}`,
                kind: 'fo',
                typeLabel: 'Főkategória',
                title: foKategoria,
                foKategoria,
                alKategoria: '',
                altTema: ''
            });
        }

        if (foKategoria && alKategoria) {
            addUnique(map, {
                key: `al|${foKategoria}|${alKategoria}`,
                kind: 'al',
                typeLabel: 'Alkategória',
                title: alKategoria,
                foKategoria,
                alKategoria,
                altTema: ''
            });
        }

        if (foKategoria && altTema) {
            addUnique(map, {
                key: `alt|${foKategoria}|${alKategoria}|${altTema}`,
                kind: 'alt',
                typeLabel: 'Altéma',
                title: altTema,
                foKategoria,
                alKategoria,
                altTema
            });
        }

        if (id && kerdesSzoveg) {
            addUnique(map, {
                key: `q|${id}`,
                kind: parentId ? 'alkerdes' : 'kerdes',
                typeLabel: parentId ? 'Alkérdés' : 'Kérdés',
                title: kerdesSzoveg,
                foKategoria,
                alKategoria,
                altTema,
                questionId: id,
                parentId,
                valaszAg,
                kindex
            });
        }

        if (id && negaltSzoveg) {
            addUnique(map, {
                key: `qneg|${id}`,
                kind: parentId ? 'alkerdes' : 'kerdes',
                typeLabel: parentId ? 'Alkérdés / NEM ág' : 'Kérdés / NEM változat',
                title: negaltSzoveg,
                foKategoria,
                alKategoria,
                altTema,
                questionId: id,
                parentId,
                valaszAg: valaszAg || 'nem',
                kindex
            });
        }
    });

    return [...map.values()];
}

async function loadSearchIndex(force = false) {
    if (!force && keresoIndexPromise) return keresoIndexPromise;

    keresoIndexPromise = fetch('/kerdesek', { cache: 'no-store' })
        .then(response => {
            if (!response.ok) throw new Error('A kereső-index betöltése sikertelen.');
            return response.json();
        })
        .then(rows => buildSearchIndex(Array.isArray(rows) ? rows : []));

    return keresoIndexPromise;
}

function rankResult(item, normalizedQuery, queryParts) {
    if (!queryParts.every(part => item.haystack.includes(part))) return null;

    const title = normalizeText(item.title);
    const path = normalizeText(item.path);

    let score = 0;

    if (title === normalizedQuery) score += 1000;
    if (title.startsWith(normalizedQuery)) score += 500;
    if (title.includes(normalizedQuery)) score += 250;
    if (path.includes(normalizedQuery)) score += 120;

    if (item.kind === 'kerdes') score += 40;
    if (item.kind === 'alkerdes') score += 35;
    if (item.kind === 'fo') score += 30;
    if (item.kind === 'al') score += 25;
    if (item.kind === 'alt') score += 20;

    score -= Math.min(title.length / 50, 20);
    score -= Math.min((item.kindex || 0) / 1000, 5);

    return score;
}

function searchInIndex(index, query) {
    const normalizedQuery = normalizeText(query);
    const queryParts = normalizedQuery.split(/\s+/).filter(Boolean);

    if (normalizedQuery.length < SEARCH_MIN_LENGTH || queryParts.length === 0) {
        return [];
    }

    return index
        .map(item => ({ item, score: rankResult(item, normalizedQuery, queryParts) }))
        .filter(entry => entry.score !== null)
        .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, 'hu'))
        .slice(0, MAX_RESULTS)
        .map(entry => entry.item);
}

function createResultButton(item, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kereso-result';
    button.dataset.resultIndex = String(index);

    const top = document.createElement('div');
    top.className = 'kereso-result-top';

    const badge = document.createElement('span');
    badge.className = `kereso-result-badge kereso-result-badge-${item.kind}`;
    badge.textContent = item.typeLabel;

    const title = document.createElement('span');
    title.className = 'kereso-result-title';
    title.textContent = item.title;

    top.appendChild(badge);
    top.appendChild(title);

    const path = document.createElement('div');
    path.className = 'kereso-result-path';
    path.textContent = item.path;

    button.appendChild(top);
    button.appendChild(path);

    return button;
}

function renderResults(container, results, message = '') {
    container.replaceChildren();
    container.classList.toggle('is-open', Boolean(message || results.length));

    if (message) {
        const empty = document.createElement('div');
        empty.className = 'kereso-empty';
        empty.textContent = message;
        container.appendChild(empty);
        return;
    }

    results.forEach((item, index) => {
        container.appendChild(createResultButton(item, index));
    });
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

function findCategoryByTitle(selector, title) {
    return [...document.querySelectorAll(selector)].find(elem => {
        const cim = elem.querySelector('.cim');
        return sameText(cim ? cim.textContent : elem.textContent, title);
    }) || null;
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
    }, 2400);
}

async function ensureFoOpen(foKategoria) {
    const { KategoriaKezelo } = await import('./main_quest.js');

    let foElem = findCategoryByTitle('#fo_kategoriak .fo', foKategoria);

    if (!foElem) {
        KategoriaKezelo.loadFoKategoriak();
        foElem = await waitFor(() => findCategoryByTitle('#fo_kategoriak .fo', foKategoria));
    }

    if (!foElem) return null;

    if (!foElem.classList.contains('active')) {
        foElem.click();
        await waitFor(() => foElem.classList.contains('active'));
        await wait(250);
    }

    return foElem;
}

async function ensureAlOpen(foKategoria, alKategoria) {
    await ensureFoOpen(foKategoria);

    const selector = `.al-blokk[data-fo-kategoria="${CSS.escape(foKategoria)}"][data-al-kategoria="${CSS.escape(alKategoria)}"] .al`;
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
    const selector = `[data-altema-utvonal="${CSS.escape(key)}"]`;
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
        return ensureAltOpen(foKategoria, alKategoria, altTema);
    }

    if (alKategoria) {
        return ensureAlOpen(foKategoria, alKategoria);
    }

    return ensureFoOpen(foKategoria);
}

function findQuestionElement(questionId) {
    return document.querySelector(`.question[data-id="${CSS.escape(String(questionId))}"]`);
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

async function navigateToResult(item) {
    const openedElement = await openPath(item);

    if (item.questionId) {
        const questionElement = await scrollToQuestion(item);
        if (questionElement) return;
    }

    if (openedElement) {
        highlightElement(openedElement.closest('.al-blokk') || openedElement);
    }
}

function createSearchPanel() {
    const wrapper = document.createElement('section');
    wrapper.className = 'kereso-panel no-print';
    wrapper.setAttribute('aria-label', 'Kérdés- és kategóriakereső');

    const header = document.createElement('div');
    header.className = 'kereso-header';

    const title = document.createElement('div');
    title.className = 'kereso-title';
    title.textContent = 'Keresés a kérdőívben';

    const count = document.createElement('div');
    count.className = 'kereso-count';
    count.textContent = 'Írj be legalább 2 karaktert';

    const inputWrap = document.createElement('div');
    inputWrap.className = 'kereso-input-wrap';

    const input = document.createElement('input');
    input.className = 'kereso-input';
    input.type = 'search';
    input.placeholder = 'Kérdés, alkérdés, főkategória, alcsoport vagy téma keresése...';
    input.autocomplete = 'off';

    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'kereso-clear';
    clearButton.textContent = '×';
    clearButton.title = 'Keresés törlése';
    clearButton.hidden = true;

    const results = document.createElement('div');
    results.className = 'kereso-results';

    header.appendChild(title);
    header.appendChild(count);
    inputWrap.appendChild(input);
    inputWrap.appendChild(clearButton);
    wrapper.appendChild(header);
    wrapper.appendChild(inputWrap);
    wrapper.appendChild(results);

    let debounceTimer = null;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const query = input.value.trim();
        clearButton.hidden = query.length === 0;

        debounceTimer = setTimeout(async () => {
            if (query.length < SEARCH_MIN_LENGTH) {
                utolsoTalalatok = [];
                count.textContent = 'Írj be legalább 2 karaktert';
                renderResults(results, []);
                return;
            }

            renderResults(results, [], 'Keresés folyamatban...');

            try {
                const index = await loadSearchIndex();
                utolsoTalalatok = searchInIndex(index, query);
                count.textContent = `${utolsoTalalatok.length} találat`;
                renderResults(
                    results,
                    utolsoTalalatok,
                    utolsoTalalatok.length ? '' : 'Nincs találat.'
                );
            } catch (error) {
                console.error(error);
                count.textContent = 'Keresési hiba';
                renderResults(results, [], 'A kereső most nem tudta betölteni az indexet.');
            }
        }, 180);
    });

    clearButton.addEventListener('click', () => {
        input.value = '';
        clearButton.hidden = true;
        utolsoTalalatok = [];
        count.textContent = 'Írj be legalább 2 karaktert';
        renderResults(results, []);
        input.focus();
    });

    results.addEventListener('click', async event => {
        const button = event.target.closest('.kereso-result');
        if (!button || navigacioFolyamatban) return;

        const item = utolsoTalalatok[Number(button.dataset.resultIndex)];
        if (!item) return;

        // Találatra kattintás után az eredményablak azonnal eltűnik.
        // Az input szövegét meghagyjuk, hogy látszódjon, mire keresett a felhasználó.
        renderResults(results, []);
        count.textContent = 'Találat megnyitva';
        input.blur();

        navigacioFolyamatban = true;
        button.classList.add('is-loading');
        button.disabled = true;

        try {
            await navigateToResult(item);
        } catch (error) {
            console.error('Keresési navigációs hiba:', error);
        } finally {
            navigacioFolyamatban = false;
            button.classList.remove('is-loading');
            button.disabled = false;
        }
    });

    return wrapper;
}

function initKereso() {
    if (document.querySelector('.kereso-panel')) return;

    const foTartaly = document.getElementById('fo_kategoriak');
    if (!foTartaly) return;

    const panel = createSearchPanel();
    foTartaly.insertAdjacentElement('beforebegin', panel);

    // Előtöltés üresjáratban, hogy az első keresés gyorsabb legyen.
    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(() => loadSearchIndex().catch(console.error));
    } else {
        setTimeout(() => loadSearchIndex().catch(console.error), 600);
    }
}

document.addEventListener('DOMContentLoaded', initKereso);
