import { showAlert } from "/both/alert.js";

// Ez a HTML tartalom, amit a hover (title) tájékoztatással bővítettünk
export const passwordPanelContent = `
    <p> Kérjük, adja meg jelenlegi és új jelszavát.</p>
    <div style="flex-direction: row">
        <div style="width:60%">
            <span class="jelszo-wrapper">
                <input id="old" type="password" placeholder="Régi jelszó">
                <span class="material-symbols-rounded toggle-jelszo">visibility</span>
            </span>
            <span class="jelszo-wrapper" title="Minimum 8 karakter, tartalmaznia kell: kisbetűt, nagybetűt és legalább egy számot!">
                <input id="new" type="password" placeholder="Új jelszó">
                <span class="material-symbols-rounded toggle-jelszo">visibility</span>
            </span>
            <span class="jelszo-wrapper">
                <input id="newtwo" type="password" placeholder="Új jelszó mégegyszer">
                <span class="material-symbols-rounded toggle-jelszo">visibility</span>
            </span>
        </div>
        <span class="gobut6" style="width:40%; cursor:pointer;">Új jelszó beállítása</span>
    </div>
`;

// A logikai modul, amit az info panelbe fecskendezünk
export function addPasswordValidationLogic(panel, currentUserName) {
    const newPassInput = panel.querySelector('#new');
    const newTwoPassInput = panel.querySelector('#newtwo');
    const oldPassInput = panel.querySelector('#old');
    const submitButton = panel.querySelector('.gobut6');

    function updateVisualFeedback() {
        const pass1 = newPassInput.value;
        const pass2 = newTwoPassInput.value;

        if (pass2 === '') {
            newTwoPassInput.classList.remove('jelszo-jo', 'jelszo-rossz');
            return;
        }
        if (pass1 === pass2) {
            newTwoPassInput.classList.remove('jelszo-rossz');
            newTwoPassInput.classList.add('jelszo-jo');
        } else {
            newTwoPassInput.classList.remove('jelszo-jo');
            newTwoPassInput.classList.add('jelszo-rossz');
        }
    }

    newPassInput.addEventListener('input', updateVisualFeedback);
    newTwoPassInput.addEventListener('input', updateVisualFeedback);


    submitButton.addEventListener('click', async function() {
        const pass1 = newPassInput.value;
        const pass2 = newTwoPassInput.value;
        const oldPass = oldPassInput.value;

        // Validáció: üres mezők
        if (pass1 === '' || pass2 === '' || oldPass === '') {
            showAlert('Minden jelszómező kitöltése kötelező!');
            return;
        } 
        // Validáció: egyezés
        else if (pass1 !== pass2) {
            showAlert('A két új jelszó nem egyezik meg!');
            return;
        } 
        // Validáció: biztonsági feltételek (min 8 karakter, kisbetű, nagybetű, SZÁM)
        else if (pass1.length < 8 || !/[a-z]/.test(pass1) || !/[A-Z]/.test(pass1) || !/\d/.test(pass1)) {
            showAlert('Az új jelszónak min. 8 karakternek kell lennie, és tartalmaznia kell kisbetűt, nagybetűt és számot!');
            return;
        } 
        // Validáció: megegyezik-e az eredetivel
        else if (pass1 === oldPass) {
            showAlert('Az új jelszó nem egyezhet meg a régivel!');
            return;
        }

        // API hívás a szerver felé
        try {
            const response = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userName: currentUserName, 
                    oldPass: oldPass,
                    newPass: pass1
                })
            });

            const data = await response.json();

            if (data.success) {
                showAlert('Jelszó sikeresen megváltoztatva!');
                // Mezők törlése
                newPassInput.value = '';
                newTwoPassInput.value = '';
                oldPassInput.value = '';
                updateVisualFeedback();
                
                // Opcionális: a panel automatikus bezárása
                const closeBtn = panel.querySelector('.bezaras');
                if(closeBtn) closeBtn.click();
            } else {
                showAlert(data.message || 'Hiba történt a jelszó mentésekor!');
            }
        } catch (error) {
            console.error('Fetch hiba:', error);
            showAlert('Szerver kommunikációs hiba!');
        }
    });
}