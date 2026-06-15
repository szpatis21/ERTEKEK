// Közös állapot és segédfüggvények a main_quest modulokhoz.
import { modulIdBetoltve } from './main_alap.js';

export const questState = {
    kerdesek: [],
    kategoriakSzinek: {},
    kategoriakChartSzinek: {},
    leirasok: {},
    alKerdesMap: {},
    alKerdesBatchPromise: null,
    temaLookupsPromise: null
};

export const questApi = {
    KategoriaKezelo: null
};

export function setQuestApi(KategoriaKezelo) {
    questApi.KategoriaKezelo = KategoriaKezelo;
}

export function normalizeChartColor(c) {
    if (!c) return 'rgba(102, 102, 102, 0.5)';

    if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
        const hex = c.length === 4
            ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3]
            : c;

        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        return `rgba(${r}, ${g}, ${b}, 0.5)`;
    }

    return c.replace(/^rgb\s*\(/i, (m) =>
        c.includes(',') && c.split(',').length === 4 ? 'rgba(' : m
    );
}

export function normalizeKategoriaKey(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
}

export async function ensureTemaLookupsLoaded(force = false) {
    if (
        !force &&
        Object.keys(questState.kategoriakChartSzinek).length > 0 &&
        Object.keys(questState.kategoriakSzinek).length > 0
    ) {
        return;
    }

    if (!force && questState.temaLookupsPromise) {
        return questState.temaLookupsPromise;
    }

    questState.temaLookupsPromise = (async () => {
        const aktualisModulId = await modulIdBetoltve;

        const response = await fetch(`/api/get-fo_kategoriak?modulId=${encodeURIComponent(aktualisModulId)}`, {
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error('Főkategória-színek betöltése sikertelen.');
        }

        const rows = await response.json();
        initTemaLookupsFromRows(rows);
    })();

    return questState.temaLookupsPromise;
}

export function initTemaLookupsFromRows(rows) {
    questState.kategoriakSzinek = {};
    questState.kategoriakChartSzinek = {};
    questState.leirasok = {};

    for (const item of rows || []) {
        const nev = String(item.nev || '').trim();

        if (!nev) continue;

        const normalizedNev = normalizeKategoriaKey(nev);
        const bgColor = item.szin ?? '';
        const chartColor = normalizeChartColor(item.chart ?? item.szin ?? '#666666');

        questState.leirasok[nev] = item.leiras ?? '';
        questState.leirasok[normalizedNev] = item.leiras ?? '';

        questState.kategoriakSzinek[nev] = bgColor;
        questState.kategoriakSzinek[normalizedNev] = bgColor;

        questState.kategoriakChartSzinek[nev] = chartColor;
        questState.kategoriakChartSzinek[normalizedNev] = chartColor;
    }

    window.kategoriakChartSzinek = questState.kategoriakChartSzinek;
    window.kategoriakSzinek = questState.kategoriakSzinek;
}

export function clearAlkerdesCache() {
    questState.alKerdesMap = {};
    questState.alKerdesBatchPromise = null;
}

export function ujratoltParentAgak() {
    const kerdesek = questState.kerdesek;

    kerdesek.forEach(kerdes => {
        if (!kerdes.parentId) {
            const alkerdesek = kerdesek.filter(k => k.parentId === kerdes.id);
            kerdes.igenAg = alkerdesek
                .filter(k => (k.valaszAg || '').toLowerCase() === 'igen')
                .map(k => k.id);
            kerdes.nemAg = alkerdesek
                .filter(k => (k.valaszAg || '').toLowerCase() === 'nem')
                .map(k => k.id);
        }
    });
}

export class Kategoria {
    constructor(id, nev) {
        this.id = id;
        this.nev = nev;
    }

    render(tartaly) {
        const div = document.createElement('div');
        div.textContent = this.nev;
        div.setAttribute('data-id', this.id);
        div.classList.add('category');
        tartaly.appendChild(div);

        return div;
    }
}
