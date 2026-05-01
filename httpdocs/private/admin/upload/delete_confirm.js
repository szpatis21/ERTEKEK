// delete_confirm.js

export class DeleteConfirm {
    // A 'szint' alapértelmezetten 'fo' marad, így a főkategóriáknál nem is muszáj átírnod a hívást
    static open(kategoriaNev, szint = 'fo') {
        return new Promise((resolve) => {
            let pirosCim = "";
            let kovetkezmeny = "";

            // Szövegek beállítása a szint alapján
            if (szint === 'fo') {
                pirosCim = "EGY FŐTÉMAKÖR TÖRLÉSÉRE KÉSZÜL";
                kovetkezmeny = "<b>MINDEN</b> alkategória, téma, kérdés és alkérdés törlésre kerül.";
            } else if (szint === 'al') {
                pirosCim = "EGY ALKATEGÓRIA TÖRLÉSÉRE KÉSZÜL";
                kovetkezmeny = "<b>MINDEN</b> téma, kérdés és alkérdés törlésre kerül.";
            } else if (szint === 'alal') {
                pirosCim = "EGY ALTÉMA TÖRLÉSÉRE KÉSZÜL";
                kovetkezmeny = "<b>MINDEN</b> kérdés és alkérdés törlésre kerül.";
            } else {
                pirosCim = "TÖRLÉSRE KÉSZÜL";
                kovetkezmeny = "Minden kapcsolódó adat törlésre kerül.";
            }

            const overlay = document.createElement('div');
            overlay.className = 'color-picker-overlay';

            const modal = document.createElement('div');
            modal.className = 'color-picker-modal';
            modal.style.width = '350px';

            modal.innerHTML = `
                <h3 style="color: #ff4444; border-bottom-color: #ffaaaa;  background: white; border-radius: 10px; display: flex; justify-content: center;">
                    Törlés megerősítése
                </h3>
                
                <div style="text-align: center; background: white; padding: 15px; border-radius: 15px; margin-bottom: 25px; line-height: 1.5; color: black;">
                    
                    <h3 style="margin-top: 0; color: #dc3545;">${pirosCim}</h3>          
        
                    <p style="margin-bottom: 0;">
                        Biztosan törölni szeretnéd a(z) <b>"${kategoriaNev}"</b> elemet? Ezt a műveletet később nem lehet visszavonni! ${kovetkezmeny}
                    </p>
                    
                </div>

                <div class="color-picker-btn-container">
                    <button id="confirm-megse" class="color-picker-btn-cancel">Mégse</button>
                    <button id="confirm-ok" class="color-picker-btn-save" style="background: #dc3545;">Igen, törlöm</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const btnOk = modal.querySelector('#confirm-ok');
            const btnMegse = modal.querySelector('#confirm-megse');

            const close = (valasz) => {
                document.body.removeChild(overlay);
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