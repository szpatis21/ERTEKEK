// Vékony kompatibilitási réteg: a régi KategoriaKezelo API kívülről változatlan marad.
import { questState, clearAlkerdesCache, ujratoltParentAgak, setQuestApi } from './main_quest_state.js';
import { frissitErtekelesekContainer } from './main_quest_render.js';
import {
    logKerdesValaszok,
    loadFoKategoriak,
    loadAlKategoriak,
    loadAltTemak,
    loadKerdesek
} from './main_quest_loaders.js';
import {
    loadAlKerdesek,
    loadAllAlKerdesek,
    loadValaszok
} from './main_quest_answers.js';
import './main_quest_help.js';

export class KategoriaKezelo {
    static get kerdesek() {
        return questState.kerdesek;
    }

    static set kerdesek(value) {
        questState.kerdesek = Array.isArray(value) ? value : [];
    }

    static get _kerdesek() {
        return questState.kerdesek;
    }

    static set _kerdesek(value) {
        questState.kerdesek = Array.isArray(value) ? value : [];
    }

    static logKerdesValaszok() {
        return logKerdesValaszok();
    }

    static clearAlkerdesCache() {
        return clearAlkerdesCache();
    }

    static frissitErtekelesekContainer() {
        return frissitErtekelesekContainer();
    }

    static loadFoKategoriak() {
        return loadFoKategoriak();
    }

    static loadAlKategoriak(foKategoriaNev) {
        return loadAlKategoriak(foKategoriaNev);
    }

    static loadAltTemak(foKategoriaNev, alKategoriaNev, autoLoadKerdesekHaNincsAlt = true, options = {}) {
        return loadAltTemak(foKategoriaNev, alKategoriaNev, autoLoadKerdesekHaNincsAlt, options);
    }

    static loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev, options = {}) {
        return loadKerdesek(foKategoriaNev, alKategoriaNev, altTemaNev, options);
    }

    static loadAlKerdesek(parentId, valaszAg, parentKerdes) {
        return loadAlKerdesek(parentId, valaszAg, parentKerdes);
    }

    static loadAllAlKerdesek(force = false) {
        return loadAllAlKerdesek(force);
    }

    static loadValaszok() {
        return loadValaszok();
    }
}

setQuestApi(KategoriaKezelo);

export { ujratoltParentAgak };
