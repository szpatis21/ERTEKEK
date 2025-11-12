//Infó blokkok (később majd létre kell hozni egy admint magamnak hogy ne itt turkáljak)
export function loadInfoAndInit() {
  document.addEventListener('DOMContentLoaded', () => {
    // 1) Kikeressük a szerepkört
    const wrapper = document.getElementById('gyik');
    const role = wrapper?.dataset.role;
    if (!role) return console.error('[loadInfo] Nincs data-role attribútum a #gyik elemen.');

    fetch('/info/info.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(config => {
        // 2) Ellenőrizzük, hogy létezik-e a szerepkör a JSON-ben
        if (!config.roles.includes(role) || !config[role]) {
          throw new Error(`Ismeretlen szerepkör: ${role}`);
        }

        // 3) Betöltjük a híreket és a GYIK-et
        initNews(config[role].news);
        initFaq(config[role].faq);
        nextCycle(0);
      })
      .catch(err => console.error('Adatbetöltési hiba:', err));
  });
}
// 2) Hír-pergő funkcionalitás
const containerNews = document.getElementById("pergo-container");
let currentIndex = 0;
let activeItems = [];

function createNewsItem(text, topOffset) {
  const div = document.createElement("div");
  div.className = "pergo-item";
  div.style.top = `${topOffset}px`;
  div.textContent = text;
  containerNews.appendChild(div);
  return div;
}

export function initNews(messages) {
  window._newsMessages = messages;
}

export function nextCycle(line = 0) {
  const messages = window._newsMessages;
  if (!messages || messages.length === 0) return;

  const index = currentIndex % messages.length;
  const newItem = createNewsItem(messages[index], line * 50);

  if (activeItems[line]) {
    const oldItem = activeItems[line];
    oldItem.classList.replace("enter", "exit");
    setTimeout(() => oldItem.remove(), 500);
  }

  setTimeout(() => newItem.classList.add("enter"), 500);
  activeItems[line] = newItem;
  currentIndex++;

  if (line < 2) {
    setTimeout(() => nextCycle(line + 1), 500);
  } else {
    setTimeout(() => nextCycle(0), 5000);
  }
}

// 3) GYIK render
export function initFaq(faqItems) {
  const containerFaq = document.querySelector('#gykerdesek .inner-div');
  if (!containerFaq) {
    console.error('GYIK konténer nincs a DOM-ban');
    return;
  }

  containerFaq.innerHTML = '';
  faqItems.forEach(item => {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'gyikcontent';

    const qDiv = document.createElement('div');
    qDiv.className = 'gyikkerdes';
    qDiv.innerHTML = item.question;

    const aDiv = document.createElement('div');
    aDiv.className = 'gyikvalasz';
    const p = document.createElement('p');
    p.innerHTML = item.answer;

    aDiv.appendChild(p);
    contentDiv.append(qDiv, aDiv);
    containerFaq.appendChild(contentDiv);
  });
}