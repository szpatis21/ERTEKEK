ó// Hozzájáruló nyilatkozat HTML generálása
const hozzajaruloHtml = `
    <div id="hozzajaruloModal">
        <button class="close-btn" id="closeHozzajaruloModal">Bezárás</button>
        <h1>Hozzájáruló Nyilatkozat</h1>
        <p>Alulírott felhasználó ezúton nyilatkozom, hogy önkéntesen hozzájárulok a személyes adataim (név, e-mail cím, telefonszám) kezeléséhez az értékelő szoftver tesztelésének céljából.</p>
        <p>Nyilatkozom továbbá, hogy tudomásul vettem, hogy a szoftver fejlesztés alatt áll, és kizárólag tesztelési célból használható egy zárt tesztelői csoport számára.</p>
        <p>A hozzájárulásomat bármikor visszavonhatom az adatkezelő elérhetőségein keresztül.</p>
        <h2>Adatkezelő adatai</h2>
        <ul>
            <li><strong>Név:</strong> Szalai Péter</li>
            <li><strong>E-mail:</strong> szpatis21@gmail.com</li>
            <li><strong>Telefonszám:</strong> +36 30 178 4272</li>
        </ul>
        <p>A jelen nyilatkozat elfogadásával kijelentem, hogy megértettem a fentieket, és önkéntesen hozzájárulok a személyes adataim kezeléséhez.</p>
    </div>
`;

// Modal és overlay elemek létrehozása
document.body.insertAdjacentHTML('beforeend', hozzajaruloHtml);

// Modal és overlay működés
const hozzajaruloModal = document.getElementById('hozzajaruloModal');
const modalOverlay = document.getElementById('modalOverlay');
const closeHozzajaruloBtn = document.getElementById('closeHozzajaruloModal');

// Kattintás figyelése a hozzájáruló nyilatkozat linkre
const hozzajarulasLink = document.getElementById('hozzajarulas');

if (hozzajarulasLink) {
    hozzajarulasLink.addEventListener('click', openHozzajaruloModal);
}

function openHozzajaruloModal(e) {
    e.preventDefault();
    hozzajaruloModal.style.display = 'block';
    modalOverlay.style.display = 'block';
}

closeHozzajaruloBtn.addEventListener('click', closeHozzajaruloModal);
modalOverlay.addEventListener('click', closeHozzajaruloModal);

function closeHozzajaruloModal() {
    hozzajaruloModal.style.display = 'none';
    modalOverlay.style.display = 'none';
}
