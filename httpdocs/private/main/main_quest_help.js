import { modulSzamolas } from './main_alap.js';
import { normalizalSzamolasMod } from './szamitasok.js';

// Súgó modal mellékhatás, eredetileg a main_quest.js végén.
document.addEventListener('DOMContentLoaded', () => {
    const helpButtons = document.querySelectorAll('.help');

    if (helpButtons.length === 0) return;

    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'help-modal-overlay';
    modalOverlay.style.display = 'none';

    modalOverlay.innerHTML = `
        <div class="help-modal-content">
            <button class="help-modal-close" title="Bezárás">&times;</button>
            <h2 id="helpModalTitle"></h2>
            <div class="help-modal-body" id="helpModalBody"></div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    const titleElem = modalOverlay.querySelector('#helpModalTitle');
    const bodyElem = modalOverlay.querySelector('#helpModalBody');

    function getHelpTartalom() {
        const aktivSzamolas = normalizalSzamolasMod(modulSzamolas);

        if (aktivSzamolas === 1) {
            return {
                title: 'Útmutató a kérdőív pontösszegző számolásához',
                body: getPontosszegzoHelpHtml()
            };
        }

        return {
            title: 'Útmutató a kérdőív arányosított pontozásához',
            body: getAranyositottHelpHtml()
        };
    }

    helpButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            const tartalom = getHelpTartalom();

            if (titleElem) titleElem.textContent = tartalom.title;
            if (bodyElem) bodyElem.innerHTML = tartalom.body;

            modalOverlay.style.display = 'flex';
        });
    });

    const closeBtn = modalOverlay.querySelector('.help-modal-close');
    closeBtn?.addEventListener('click', () => {
        modalOverlay.style.display = 'none';
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    });
});

function getAranyositottHelpHtml() {
    return `
        <p>
            Ez a kérdőívrendszer jelenleg <strong>arányosított számolást</strong> használ.
            Az eredmény mindig 0% és 100% közötti érték.
        </p>

        <p>
            Ebben a módban a pontszámok nem egyszerűen összeadódnak, hanem a rendszer
            az adott kérdéshez vagy kérdéscsoporthoz tartozó viszonyítási alaphoz méri őket.
            A megadott pontok ezért elsősorban <strong>súlyokat</strong> jelentenek.
        </p>

        <h3>1. Amikor nincsenek alkérdések</h3>
        <p>
            Ha egy főkérdés alatt nincsenek alkérdések, a rendszer a főkérdés saját
            IGEN és NEM pontszámaiból számol.
        </p>

        <ul>
            <li>
                <strong>IGEN válasz esetén:</strong> az IGEN pontszám számít.
            </li>
            <li>
                <strong>NEM válasz esetén:</strong> ha van külön NEM pontszám,
                akkor a rendszer azt használja.
            </li>
            <li>
                A nagyobb érték lesz a 100%-os viszonyítási alap, a kisebb ehhez képest arányosodik.
            </li>
        </ul>

        <p>
            <em>Példa:</em> ha egy kérdés IGEN értéke 10 pont, NEM értéke 2 pont,
            akkor az IGEN 100%, a NEM pedig 20%.
        </p>

        <h3>2. Amikor vannak alkérdések</h3>
        <p>
            Ha a főkérdéshez alkérdések tartoznak, akkor a rendszer a kiválasztott ág
            alkérdései alapján számol. Ilyenkor az alkérdések pontszámai nem pusztán
            összeadódnak, hanem százalékos értékké alakulnak.
        </p>

        <p>
            <em>Példa:</em> ha az alkérdések értékei 1, 5 és 10 pont,
            akkor a 10 pontos alkérdés jelenti a 100%-ot, az 5 pontos 50%-ot,
            az 1 pontos pedig 10%-ot.
        </p>

        <h3>3. Maximalizáló válasz</h3>
        <p>
            Ha egy alkérdésnél be van kapcsolva a <strong>maximalizáló érték</strong>,
            és ezt a kitöltő kiválasztja, akkor az adott kérdésblokk eredménye
            automatikusan 100% lesz.
        </p>

        <h3>4. Mit jelent ez a gyakorlatban?</h3>
        <p>
            Az arányosított mód akkor hasznos, ha nem azt akarjuk látni, hogy
            mennyi pont gyűlt össze összesen, hanem azt, hogy az adott válaszok
            mennyire közelítik meg az ideális vagy legsúlyosabb állapotot.
        </p>
    `;
}

function getPontosszegzoHelpHtml() {
    return `
        <p>
            Ez a kérdőívrendszer jelenleg <strong>pontösszegző számolást</strong> használ.
            Az eredmény továbbra is 0% és 100% közötti érték, de a számítás alapja más.
        </p>

        <p>
            Ebben a módban a rendszer az aktív kérdéságon lévő alkérdések pontjait
            <strong>összeadja</strong>, majd ezt viszonyítja az adott ág maximálisan
            elérhető pontszámához.
        </p>

        <h3>1. Alkérdések esetén</h3>
        <p>
            Ha egy főkérdéshez alkérdések tartoznak, akkor az adott válaszág
            alkérdéseinek összpontszáma lesz a maximum.
        </p>

        <p>
            <em>Példa:</em> ha három alkérdés értéke 1 pont, 5 pont és 10 pont,
            akkor a maximálisan elérhető érték 16 pont.
        </p>

        <ul>
            <li>Ha csak az 1 pontos válasz van kiválasztva: 1 / 16 pont.</li>
            <li>Ha az 1 és 5 pontos válasz van kiválasztva: 6 / 16 pont.</li>
            <li>Ha mindhárom válasz ki van választva: 16 / 16 pont, vagyis 100%.</li>
        </ul>

        <h3>2. IGEN, NEM és üres válasz</h3>
        <p>
            A kiválasztott, pozitív válaszok hozzáadják saját pontértéküket az elért
            pontszámhoz. Az üresen hagyott válaszok nem adnak pontot.
        </p>

        <h3>3. Maximalizáló válasz</h3>
        <p>
            Ha egy alkérdés maximalizálóként van megjelölve, és a kitöltő kiválasztja,
            akkor az adott kérdésblokk ebben a módban is automatikusan 100%-ot kap.
        </p>

        <h3>4. Amikor nincs alkérdés</h3>
        <p>
            Ha egy főkérdés alatt nincsenek alkérdések, akkor a rendszer a főkérdés
            saját IGEN vagy NEM pontértékét használja, és azt viszonyítja a kérdésen
            belül elérhető legnagyobb ponthoz.
        </p>

        <h3>5. Mit jelent ez a gyakorlatban?</h3>
        <p>
            A pontösszegző mód akkor hasznos, ha azt szeretnénk látni, hogy a kitöltő
            az adott kérdéscsoportból mennyi konkrét pontot teljesített a maximálisan
            elérhető pontszámhoz képest.
        </p>
    `;
}