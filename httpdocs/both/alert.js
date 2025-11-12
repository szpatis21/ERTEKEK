// 1. LÉPÉS: Létrehozunk egy közös overlay-t minden modal számára
const modalOverlay = document.createElement('div');
modalOverlay.id = 'modalOverlay';
document.body.appendChild(modalOverlay);

// --- ALERT MODAL LÉTREHOZÁSA ---
const alertModal = document.createElement('div');
alertModal.className = 'modal';
alertModal.id = 'alertModal';
alertModal.innerHTML = `
  <div class="modal-content">
    <p id="alertText"></p>
    <button id="alertOk">OK</button>
  </div>
`;
document.body.appendChild(alertModal);

// --- MISSING AUDIT MODAL LÉTREHOZÁSA ---
const missingModal = document.createElement('div');
missingModal.className = 'modal';
missingModal.id = 'missingModal';
// ... a missingModal innerHTML tartalma változatlan ...
missingModal.innerHTML = `
<div class=" outer-div">
  <div class="modal-content inner-div">
   
    <h3> Az alábbi személyekhez még nincs rögzített hozzájárulási nyilatkozat! </h3>
      <p>
    Jelezze a megfelelő dokumentáció meglétét az érintett személyek neve melleti pipával.
    <br> Amennyiben nem rendelkezik megfelelő dokumentációval, illetve nem biztos ennek tényében, úgy az gondoskodjon az ellenőrzésről és a mihamarabbi beszerzésről!
    Amíg ez nem történt meg, addig az értintetettekel kapcsolatos értékeléseket blokkoljuk, majd 30 nap elteltével töröljük a hozzájuk kapcsolódó adatokat! 
    </p>
    <div style="display=flex; width=50%;align-items: center;">
    <div class="missing-list" id="missingList"></div>
    <div    style=" display: flex;
    flex-direction: column;
    align-items: center;"}>
    <label for="missingConfirm" style="    margin: 5px;
    font-size: small;"> Nyilatkozom a kiválasztott személyek hozzájáruló nyilatkozatának meglétéről</label>
    <button id="missingConfirm" disabled>Meglévők elfogadása</button>
    </div>
      </div>

  
  </div>
</div>`;
document.body.appendChild(missingModal);


// 2. LÉPÉS: Általános open/close logikát használunk
function closeModal() {
    // Minden nyitott modalt bezárunk
    document.querySelectorAll('.modal.open').forEach(modal => modal.classList.remove('open'));
    modalOverlay.classList.remove('open');
}

// Az overlay-re kattintva bezáródik minden
modalOverlay.addEventListener('click', closeModal);


// --- ALERT MODAL KEZELÉSE ---
const alertText = alertModal.querySelector('#alertText');
const alertOk = alertModal.querySelector('#alertOk');
alertOk.addEventListener('click', () => closeModal()); // A közös bezáró függvényt hívjuk

export function showAlert(message) {
  alertText.textContent = message;
  modalOverlay.classList.add('open');
  alertModal.classList.add('open');
}


// --- MISSING AUDIT MODAL KEZELÉSE ---
const missingListEl = missingModal.querySelector('#missingList');
const missingConfirm = missingModal.querySelector('#missingConfirm');
let onConfirm;

missingConfirm.addEventListener('click', () => {
  closeModal(); // A közös bezáró függvényt hívjuk
  if (typeof onConfirm === 'function') onConfirm();
});

export function showMissingChecklist(items) {
  missingListEl.innerHTML = '';
  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'missing-item';
    const chk = document.createElement('input');
    chk.type = 'checkbox';
    chk.value = item.vizsgalt_id;
    const label = document.createElement('label');
    label.textContent = item.vizsgalt_nev;
    div.append(chk, label);
    missingListEl.appendChild(div);
    chk.addEventListener('change', updateConfirmState);
  });
  missingConfirm.disabled = true;
  
  modalOverlay.classList.add('open');
  missingModal.classList.add('open');
  
  return new Promise(resolve => {
    onConfirm = () => resolve(
      Array.from(missingListEl.querySelectorAll('input:checked')).map(cb => cb.value)
    );
  });
}

function updateConfirmState() {
  const total = missingListEl.querySelectorAll('input').length;
  const checked = missingListEl.querySelectorAll('input:checked').length;
  missingConfirm.disabled = checked !== total;
}