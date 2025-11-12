export async function renderRoles(userState) {
  try {
    const { modulId, intezmeny_id: intId } = userState;

    const res = await fetch(
      `/users-by-module?modulId=${encodeURIComponent(modulId)}&intId=${encodeURIComponent(intId)}`
    );
    if (!res.ok) throw new Error(`HTTP hibakód: ${res.status}`);

    const data = await res.json();

    document.getElementById('user-sectiont').textContent =
      `Teljes állomány: ${data.users.length} Személy`;

    const wrapper = document.getElementById('module-users-list');
    wrapper.innerHTML = '';

    const roleMeta = {
      unassigned: {                         
        icon : '<span class="material-symbols-outlined pen">person_alert</span>',
      label: 'Besorolásra váró felhasználók'
       },
      admin: {
        icon: '<span class="material-symbols-outlined adm">person_shield</span>',
        label: 'Adminisztrátor'
      },
      analist: {
        icon: '<span class="material-symbols-outlined ana">person_search</span>',
        label: 'Elemző'
      },
      evaluator: {
        icon: '<span class="material-symbols-outlined eva">person_edit</span>',
        label: 'Értékelő'
      },
    };

    const rolesHun = {
      evaluator: `<span class="material-symbols-outlined eva">person_edit</span>`,
      analist: `<span class="material-symbols-outlined ana">person_search</span>`,
      admin: `<span class="material-symbols-outlined adm">person_shield</span>`,
      unassigned: '<span class="material-symbols-outlined pen">person_alert</span>',
    };

    ['unassigned','admin', 'analist', 'evaluator'].forEach(roleKey => {
      const section = document.createElement('section');
      section.dataset.role = roleKey;
      section.className = 'role-section';

      const header = document.createElement('h4');
      header.innerHTML = `${roleMeta[roleKey].icon} ${roleMeta[roleKey].label}`;
      section.appendChild(header);

      const listDiv = document.createElement('div');
      listDiv.className = 'role-list';
      section.appendChild(listDiv);

      wrapper.appendChild(section);
    });

    data.users.forEach(user => {
      const roleKey = user.role;
      const target = wrapper.querySelector(`section[data-role="${roleKey}"] .role-list`);

      const card = document.createElement('div');
      card.className = 'user-card';

      card.innerHTML = `
        <div class="dob">
          <div class="dobal">
            <div class="nev">
              <div class="vez">${user.vez}</div>
              <div class="rejtettinfo">
                <div class="eler">${user.mail || 'Nincs email-cím megadva'}</div>
                <div class="eler">${user.tel  || 'Nincs telefonszám megadva'}</div>
              </div>
            </div>
            <div class="role">${rolesHun[user.role]}</div>
          </div>

          <div class="kitoltes-db">
            ${user.kitoltes_db} darab értékelés a fiókjában
          </div>

          <div class="role-radio">
            <label><input type="radio" name="role_${user.id}" value="admin"
                   ${user.role === 'admin' ? 'checked' : ''}> Adminisztrátor</label>
            <label><input type="radio" name="role_${user.id}" value="analist"
                   ${user.role === 'analist' ? 'checked' : ''}> Elemző</label>
            <label><input type="radio" name="role_${user.id}" value="evaluator"
                   ${user.role === 'evaluator' ? 'checked' : ''}> Értékelő</label>
          </div>
        </div>
      `;

      target.appendChild(card);

      card.querySelectorAll(`input[type="radio"][name="role_${user.id}"]`).forEach(radio => {
        radio.addEventListener('change', () => {
          const newRole = radio.value;
          const oldRole = user.role;
          const modal = document.getElementById('confirmModal');
          const modalText = document.getElementById('modalText');
          const yesBtn = document.getElementById('confirmYes');
          const noBtn  = document.getElementById('confirmNo');

          modalText.innerHTML = `
            <strong>${user.vez}</strong> szerepköre megváltozik:<br><br>
            <u>${roleMeta[oldRole].label}</u> → <u>${roleMeta[newRole].label}</u><br><br>
            Biztosan végrehajtja a módosításokat?
          `;

          modal.classList.remove('hidden');
                      modal.classList.add('active');
          yesBtn.onclick = async () => {
            modal.classList.add('hidden');
            try {
              const resp = await fetch('/update-user-role', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, newRole })
              });
              const result = await resp.json();
              if (!result.success) {
                alert('Hiba: ' + result.message);
                radio.checked = false;
                card.querySelector(`input[value="${oldRole}"]`).checked = true;
              } else {
                const newSection = wrapper.querySelector(
                  `section[data-role="${newRole}"] .role-list`
                );
                const oldSection = wrapper.querySelector(
                  `section[data-role="${oldRole}"] .role-list`
                );

                oldSection.removeChild(card);
                newSection.appendChild(card);

                const roleIconDiv = card.querySelector('.role');
                roleIconDiv.innerHTML = rolesHun[newRole];

                user.role = newRole;

                [oldSection, newSection].forEach(sec => {
                  const parent = sec.closest('section');
                  const hasUsers = !!sec.querySelector('.user-card');
                  parent.style.display = hasUsers ? '' : 'none';
                });
              }
            } catch (err) {
              console.error(err);
              alert('Szerverhiba a mentés közben.');
            }
          };

          noBtn.onclick = () => {
            modal.classList.add('hidden');
            radio.checked = false;
            card.querySelector(`input[value="${oldRole}"]`).checked = true;
          };
        });
      });
    });

    wrapper.querySelectorAll('section').forEach(sec => {
      const hasUsers = !!sec.querySelector('.user-card');
      if (!hasUsers) sec.style.display = 'none';
    });
  } catch (err) {
    console.error('Felhasználók lekérése közben hiba:', err);
  }
}
