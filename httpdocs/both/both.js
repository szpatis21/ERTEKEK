// Nav menü export
import { menuTartalmak, ikonok } from './navmenu.js';
import { showAlert } from "/both/alert.js";

const menuId = document.getElementById('menu-type')?.value || 'public';

function appendText(parent, value) {
  parent.appendChild(document.createTextNode(String(value ?? '')));
}

function setStyles(el, styles) {
  Object.assign(el.style, styles);
  return el;
}

function removeUnsafeNodesAndAttrs(root) {
  const forbiddenTags = new Set([
    'script', 'iframe', 'object', 'embed', 'link', 'meta', 'base', 'form'
  ]);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const toRemove = [];

  while (walker.nextNode()) {
    const el = walker.currentNode;
    const tag = el.tagName.toLowerCase();

    if (forbiddenTags.has(tag)) {
      toRemove.push(el);
      continue;
    }

    [...el.attributes].forEach(attr => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || '').trim().toLowerCase();

      if (name.startsWith('on')) {
        el.removeAttribute(attr.name);
        return;
      }

      if ((name === 'href' || name === 'src' || name === 'xlink:href') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
        return;
      }

      if (name === 'srcdoc') {
        el.removeAttribute(attr.name);
      }
    });
  }

  toRemove.forEach(el => el.remove());
}

function createSanitizedFragmentFromHtml(html) {
  const doc = new DOMParser().parseFromString(String(html ?? ''), 'text/html');
  removeUnsafeNodesAndAttrs(doc.body);

  const fragment = document.createDocumentFragment();
  [...doc.body.childNodes].forEach(node => {
    fragment.appendChild(document.importNode(node, true));
  });

  return fragment;
}

class Elem {
  constructor({ adottId = '', adottOsztaly = '', szuloElem = '', tartalom = '' }) {
    this.adottId = adottId;
    this.adottOsztaly = adottOsztaly;
    this.szuloElem = szuloElem;
    this.tartalom = tartalom;
  }

  letrehoz() {
    const div = document.createElement('div');

    if (this.adottId) div.id = this.adottId;
    if (this.adottOsztaly) {
      String(this.adottOsztaly)
        .split(/\s+/)
        .filter(Boolean)
        .forEach(cls => div.classList.add(cls));
    }

    if (this.tartalom instanceof Node) {
      div.appendChild(this.tartalom);
    } else if (this.tartalom) {
      div.appendChild(createSanitizedFragmentFromHtml(this.tartalom));
    }

    const szuloElem = document.querySelector(this.szuloElem);
    if (szuloElem) {
      szuloElem.appendChild(div);
    } else {
      console.warn(`A szülő elem a következő kijelölővel nem található: "${this.szuloElem}".`);
    }
  }
}

const nav = new Elem({
  adottId: 'navmenu',
  adottOsztaly: '',
  szuloElem: 'men',
  tartalom: menuTartalmak[menuId] || menuTartalmak.public || ''
});
nav.letrehoz();

function hasCompleteLoginBlock(root = document) {
  const log = root?.querySelector?.('#log');

  return !!(
    log &&
    log.querySelector('#fnev') &&
    log.querySelector('#pass') &&
    log.querySelector('#llog') &&
    log.querySelector('#whbutt')
  );
}

function isLegacyLoginBlock(log) {
  if (!log) return false;

  return !log.closest('.generated-login-panel') &&
    !log.closest('.generated-login-shell') &&
    hasCompleteLoginBlock(log.parentElement || document);
}

function ensureLoginPanel() {
  let loginHost = document.getElementById('login');
  const existingLog = document.querySelector('#log');

  // Regisztrációs oldal / régi oldalak: ha már van teljes login blokk,
  // nem generálunk rá új overlayt és nem csomagoljuk forgó keretbe.
  // A regisztrációs oldalon a #login maga .belso és 45 fokkal forgatott,
  // ezért a belegenerált fixed overlay is ferdülne.
  if (isLegacyLoginBlock(existingLog)) {
    return;
  }

  if (!loginHost) {
    loginHost = document.createElement('div');
    loginHost.id = 'login';
    loginHost.className = 'generated-login-host';
    document.body.appendChild(loginHost);
  }

  let szoveg = loginHost.querySelector('.szoveg') || document.querySelector('.szoveg');

  if (!szoveg) {
    szoveg = document.createElement('div');
    szoveg.className = 'szoveg generated-login-copy';
    szoveg.style.display = 'none';

    const title = document.createElement('strong');
    title.textContent = 'Bejelentkezés';

    const lead = document.createElement('span');
    lead.textContent = '';

    szoveg.append(title, lead);
    loginHost.appendChild(szoveg);
  }

  let panel = loginHost.querySelector('.kulso-border') ||
    document.querySelector('.kulso-border') ||
    document.getElementById('kulso-border');

  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'kulso-border';
    panel.className = 'kulso-border generated-login-panel';
    panel.style.display = 'none';
    loginHost.appendChild(panel);
  } else {
    panel.classList.add('kulso-border');
    if (!panel.parentElement) loginHost.appendChild(panel);
  }

  const hasRequestedLoginBlock = panel.querySelector('#log') &&
    panel.querySelector('#fnev') &&
    panel.querySelector('#pass') &&
    panel.querySelector('#llog') &&
    panel.querySelector('#whbutt');

  if (!hasRequestedLoginBlock) {
    panel.replaceChildren();

    const log = document.createElement('div');
    log.id = 'log';

    const userWrap = document.createElement('div');
    userWrap.className = 'inputs';

    const userInput = document.createElement('input');
    userInput.id = 'fnev';
    userInput.type = 'text';
    userInput.name = 'fnev';
    userInput.required = true;
    userInput.placeholder = 'Felhasználónév';
    userInput.autocomplete = 'username';

    userWrap.appendChild(userInput);

    const passWrap = document.createElement('div');
    passWrap.className = 'inputs jelszo-wrapper';
    passWrap.style.position = 'relative';

    const passInput = document.createElement('input');
    passInput.id = 'pass';
    passInput.type = 'password';
    passInput.name = 'pass';
    passInput.required = true;
    passInput.placeholder = 'Jelszó:';
    passInput.autocomplete = 'current-password';

    const passToggle = document.createElement('span');
    passToggle.className = 'material-symbols-rounded toggle-jelszo';
    passToggle.textContent = 'visibility';

    passWrap.append(passInput, passToggle);

    const submit = document.createElement('button');
    submit.type = 'button';
    submit.id = 'llog';
    submit.textContent = 'Bejelentkezek';

    const forgot = document.createElement('button');
    forgot.type = 'button';
    forgot.id = 'whbutt';
    forgot.textContent = 'Mi is a jelszavam...?';

    const error = document.createElement('div');
    error.id = 'error-message';
    error.className = 'hidden';

    log.append(userWrap, passWrap, submit, forgot, error);
    panel.appendChild(log);
  }

  let log = panel.querySelector('#log');
  if (log) {
    let shell = panel.querySelector('.generated-login-shell');

    if (!shell) {
      shell = document.createElement('div');
      shell.className = 'generated-login-shell';
      panel.appendChild(shell);
    }

    let rotatingFrame = shell.querySelector('#logokulso');
    if (!rotatingFrame) {
      rotatingFrame = document.createElement('div');
      rotatingFrame.id = 'logokulso';
      rotatingFrame.setAttribute('aria-hidden', 'true');
      shell.appendChild(rotatingFrame);
    }

    if (log.parentElement !== shell) {
      shell.appendChild(log);
    }

    let closeBtn = shell.querySelector('.generated-login-close');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'generated-login-close';
      closeBtn.setAttribute('aria-label', 'Bejelentkezés bezárása');
      closeBtn.textContent = '×';
      shell.appendChild(closeBtn);
    }

    if (closeBtn.dataset.bound !== '1') {
      closeBtn.dataset.bound = '1';
      closeBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        closeLoginPanel();
      });
    }
  }

  if (panel.dataset.backdropBound !== '1') {
    panel.dataset.backdropBound = '1';
    panel.addEventListener('click', (event) => {
      if (event.target === panel) {
        closeLoginPanel();
      }
    });
  }

  panel.dataset.generatedLoginReady = '1';
  injectGeneratedLoginStyles();
}

function closeLoginPanel() {
  const kulsoElem = document.querySelector('.generated-login-panel') || document.querySelector('.kulso-border') || document.getElementById('kulso-border');
  const szoveg = document.querySelector('.generated-login-copy') || document.querySelector('.szoveg');
  const logElem = document.querySelector('#log');

  [kulsoElem, szoveg].filter(Boolean).forEach(elem => {
    elem.classList.remove('show');
    elem.style.display = 'none';
  });

  if (logElem && isLegacyLoginBlock(logElem)) {
    logElem.classList.remove('show');
    logElem.style.display = 'none';

    const loginHost = logElem.closest('#login');
    if (loginHost && !loginHost.classList.contains('generated-login-host')) {
      loginHost.classList.remove('show');
    }

    const bejbutt = logElem.closest('.szoveg')?.querySelector?.('#bejbutt');
    if (bejbutt) bejbutt.style.display = '';
  }
}

function injectGeneratedLoginStyles() {
  if (document.getElementById('generated-login-styles')) return;

  const style = document.createElement('style');
  style.id = 'generated-login-styles';
  style.textContent = `
    #login.generated-login-host {
      position: relative;
      z-index: 9999;
    }

    .generated-login-panel {
      position: fixed;
      inset: 0;
      z-index: 9999;
      justify-content: center;
      align-items: center;
      padding: 18px;
      background: rgba(17, 24, 39, 0.48);
      backdrop-filter: blur(4px);
    }

    .generated-login-panel.show {
      display: flex !important;
    }

    .generated-login-copy {
      position: fixed;
      left: 50%;
      top: calc(50% - 210px);
      z-index: 10000;
      transform: translateX(-50%);
      flex-direction: column;
      gap: 2px;
      color: #fff;
      text-align: center;
      text-shadow: 0 2px 12px rgba(0,0,0,.45);
      pointer-events: none;
    }

    .generated-login-copy.show {
      display: flex !important;
    }

    .generated-login-copy strong {
      color: #ffbd16;
      font-size: 1.25rem;
      letter-spacing: .08em;
    }



    .generated-login-shell {
      position: relative;
      width: min(340px, 92vw);
      min-height: min(340px, 92vw);
      display: grid;
      place-items: center;
      isolation: isolate;
    }

    #logokulso {
      border-radius: 30px;
      border: 3px solid white;
      width: 320px;
      height: 320px;
      max-width: calc(92vw - 20px);
      max-height: calc(92vw - 20px);
      display: flex;
      justify-content: center;
      align-items: center;
      animation: rotateClock 7s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
      position: absolute;
      z-index: 1;
      pointer-events: none;
      box-shadow: 0 0 34px rgba(255, 189, 22, .18);
    }

    @keyframes rotateClock {
      0% {
        transform: rotate(0deg);
        border-color: gold;
      }
      12.5% {
        transform: rotate(45deg);
        border-color: white;
      }
      25% {
        transform: rotate(45deg);
        border-color: white;
      }
      37.5% {
        transform: rotate(90deg);
        border-color: white;
      }
      50% {
        transform: rotate(90deg);
        border-color: gold;
      }
      62.5% {
        transform: rotate(135deg);
        border-color: white;
      }
      75% {
        transform: rotate(135deg);
        border-color: white;
      }
      87.5% {
        transform: rotate(180deg);
        border-color: white;
      }
      100% {
        transform: rotate(180deg);
        border-color: gold;
      }
    }

    .generated-login-panel #log {
    position: relative;
    z-index: 2;
    width: 44vh;
    height: 44vh;
    min-height: 250px;
    display: grid;
    gap: 12px;
    padding: 28px;
    border-radius: 30px;
    background: linear-gradient(180deg, #fff, #fff7ed);
    border: 1px solid rgba(255, 101, 0, .24);
    box-shadow: 0 24px 80px rgba(0, 0, 0, .28);
    color: #273142;
    }

    .generated-login-panel #log .inputs {
      width: 100%;
    }

    .generated-login-panel #log input {
      width: 100%;
      min-height: 42px;
      border: 1px solid #fed7aa;
      border-radius: 12px;
      padding: 10px 12px;
      color: #273142;
      background: #fff;
      outline: none;
      box-sizing: border-box;
    }

    .generated-login-panel #log input:focus {
      border-color: #ff6500;
      box-shadow: 0 0 0 4px rgba(255,101,0,.12);
    }

    .generated-login-panel #log .jelszo-wrapper input {
      padding-right: 44px;
    }

    .generated-login-panel #log .toggle-jelszo {
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      color: #9a3412;
      cursor: pointer;
      user-select: none;
    }

    .generated-login-panel #log #whbutt {
      border: 0;
      background: transparent;
      color: #9a3412;
      font-weight: 800;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .generated-login-card {
      width: min(420px, 94vw);
      position: relative;
      display: grid;
      gap: 12px;
      padding: 28px;
      border-radius: 22px;
      background: linear-gradient(180deg, #fff, #fff7ed);
      border: 1px solid rgba(255, 101, 0, .24);
      box-shadow: 0 24px 80px rgba(0,0,0,.28);
      color: #273142;
    }

    .generated-login-card h2 {
      margin: 0 0 6px;
      color: #ff6500;
      text-align: center;
    }

    .generated-login-card input {
      width: 100%;
      min-height: 42px;
      border: 1px solid #fed7aa;
      border-radius: 12px;
      padding: 10px 12px;
      color: #273142;
      background: #fff;
      outline: none;
      box-sizing: border-box;
    }

    .generated-login-card input:focus {
      border-color: #ff6500;
      box-shadow: 0 0 0 4px rgba(255,101,0,.12);
    }

    .generated-password-row {
      position: relative;
      display: flex;
      align-items: center;
    }

    .generated-password-row input {
      padding-right: 44px;
    }

    .generated-password-row .toggle-jelszo {
      position: absolute;
      right: 10px;
      color: #9a3412;
      cursor: pointer;
      user-select: none;
    }

    .generated-login-panel #llog {
      min-height: 42px;
      border: 0;
      border-radius: 12px;
      background: #ff6500;
      color: #fff;
      font-weight: 900;
      cursor: pointer;
    }

    .generated-forgot-button {
      border: 0;
      background: transparent;
      color: #9a3412;
      font-weight: 800;
      cursor: pointer;
      text-decoration: underline;
      text-underline-offset: 3px;
    }

    .generated-login-close {
      position: absolute;
      top: -6px;
      right: -6px;
      z-index: 3;
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,.75);
      border-radius: 50%;
      background: #ff6500;
      color: #fff;
      font-size: 1.45rem;
      line-height: 1;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 10px 26px rgba(0,0,0,.22);
    }

    .generated-login-close:hover,
    .generated-login-close:focus-visible {
      background: #9a3412;
      outline: none;
    }

    #error-message.visible {
      display: block !important;
      color: #b91c1c;
      background: rgba(239, 68, 68, .1);
      border: 1px solid rgba(239, 68, 68, .25);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: .9rem;
    }
  `;

  document.head.appendChild(style);
}

ensureLoginPanel();

const $ = (sel) => document.querySelector(sel);

const llogBtn = document.querySelector('#llog');
if (llogBtn) {
  llogBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    const fnevInput = $('#fnev');
    const passInput = $('#pass');

    const fnev = fnevInput?.value.trim() || '';
    const pass = passInput?.value || '';

    if (!fnev || !pass) {
      return hiba('Felhasználónév és jelszó megadása kötelező');
    }

    try {
      llogBtn.textContent = 'Ellenőrzés...';
      llogBtn.disabled = true;

      const res = await fetch('/login-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fnev, pass })
      });

      const out = await res.json();

      if (!out.success) {
        hiba(out.message || 'Sikertelen bejelentkezés');
        return;
      }

      if (!out.requiresChoice) {
        await loginVegrehajtas({
          fnev,
          pass,
          modul_id: out.defaultModulId,
          szerepkor: out.defaultRoleId
        });
        return;
      }

      createLoginChoiceModal({
        fnev,
        pass,
        roles: Array.isArray(out.roles) ? out.roles : [],
        modules: Array.isArray(out.modules) ? out.modules : [],
        defaultRoleId: out.defaultRoleId,
        defaultModulId: out.defaultModulId,
        hasMultipleRoles: out.hasMultipleRoles === true,
        hasMultipleModules: out.hasMultipleModules === true
      });
    } catch (err) {
      console.error('Fetch hiba:', err);
      hiba('Hálózati vagy szerverhiba');
    } finally {
      llogBtn.textContent = 'Bejelentkezek';
      llogBtn.disabled = false;
    }
  });
}

async function loginVegrehajtas({ fnev, pass, modul_id, szerepkor }) {
  const payload = {
    fnev,
    pass,
    modul_id: Number(modul_id),
    szerepkor: Number(szerepkor)
  };

  if (!payload.fnev || !payload.pass || !payload.modul_id || !payload.szerepkor) {
    hiba('Hiányzó belépési adat');
    return;
  }

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload)
  });

  const out = await res.json();

  if (out.success) {
    location.href = out.redirect;
    return;
  }

  hiba(out.message || 'Sikertelen bejelentkezés');
}

function loginItemText(item) {
  return String(item.leiras || item.nev || item.role || item.id || '-');
}
function getLoginChoiceTitle(hasMultipleRoles, hasMultipleModules) {
  if (hasMultipleRoles && hasMultipleModules) {
    return 'Válasszon szerepkört és szakmai anyagot';
  }

  if (hasMultipleRoles) {
    return 'Válasszon szerepkört';
  }

  if (hasMultipleModules) {
    return 'Válasszon szakmai anyagot';
  }

  return 'Belépés';
}

function createLoginChoiceModal({
  fnev,
  pass,
  roles,
  modules,
  defaultRoleId,
  defaultModulId,
  hasMultipleRoles,
  hasMultipleModules
}) {
  const existing = document.getElementById('login-choice-modal-overlay');
  if (existing) existing.remove();

  let selectedRoleId = hasMultipleRoles ? null : String(defaultRoleId || roles[0]?.id || '');
  let selectedModulId = hasMultipleModules ? null : String(defaultModulId || modules[0]?.id || '');

  const overlay = document.createElement('div');
  overlay.id = 'login-choice-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'login-choice-modal';

const modalTitleText = getLoginChoiceTitle(hasMultipleRoles, hasMultipleModules);

const title = document.createElement('h3');
title.textContent = modalTitleText;

const lead = document.createElement('p');
lead.textContent = modalTitleText;
  modal.append(title, lead);

  const submitBtn = createButton('login-choice-submit', 'Belépek');
  const cancelBtn = createButton('login-choice-cancel', 'Mégse');

  function refreshSubmitState() {
    submitBtn.disabled = !selectedRoleId || !selectedModulId;
  }

function appendChoiceSection({ titleText, items, type, hasMultiple }) {
  if (!hasMultiple) return;

  const section = document.createElement('section');
  section.className = 'login-choice-section';

  const sectionTitle = document.createElement('div');
  sectionTitle.className = 'login-choice-section-title';
  sectionTitle.textContent = titleText;
  section.appendChild(sectionTitle);

    const grid = document.createElement('div');
    grid.className = 'login-choice-grid';

    items.forEach(item => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'login-choice-card';
      card.dataset.choiceType = type;
      card.dataset.choiceId = String(item.id);

      const strong = document.createElement('div');
      strong.textContent = loginItemText(item);
      card.appendChild(strong);

      if (item.nev && item.leiras && item.nev !== item.leiras) {
        const small = document.createElement('small');
        small.textContent = item.nev;
        card.appendChild(small);
      }

      card.addEventListener('click', () => {
        grid.querySelectorAll('.login-choice-card').forEach(el => el.classList.remove('selected'));
        card.classList.add('selected');

        if (type === 'role') selectedRoleId = String(item.id);
        if (type === 'module') selectedModulId = String(item.id);

        refreshSubmitState();
      });

      grid.appendChild(card);
    });

    section.appendChild(grid);
    modal.appendChild(section);
  }

appendChoiceSection({
  titleText: 'Szerepkörök',
  items: roles,
  type: 'role',
  hasMultiple: hasMultipleRoles
});

appendChoiceSection({
  titleText: 'Szakmai anyagok',
  items: modules,
  type: 'module',
  hasMultiple: hasMultipleModules
});

  cancelBtn.addEventListener('click', () => overlay.remove());
  submitBtn.addEventListener('click', async () => {
    submitBtn.textContent = 'Belépés...';
    submitBtn.disabled = true;

    try {
      await loginVegrehajtas({
        fnev,
        pass,
        modul_id: selectedModulId,
        szerepkor: selectedRoleId
      });
    } finally {
      submitBtn.textContent = 'Belépés';
      refreshSubmitState();
    }
  });

  const actions = document.createElement('div');
  actions.className = 'login-choice-actions';
  actions.append(cancelBtn, submitBtn);
  modal.appendChild(actions);

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) overlay.remove();
  });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  refreshSubmitState();
}

function hiba(msg) {
  showLoginError(msg);
}

function showLoginError(msg) {
  const err = document.getElementById('error-message');
  const btn = document.getElementById('llog');
  const box = document.getElementById('login');

  if (btn) btn.classList.add('shake');
  if (box) {
    box.style.background = 'linear-gradient(0deg,#e91e31 0%,rgba(255,119,0,.911) 100%)';
  }

  if (err) {
    err.textContent = msg;
    err.classList.remove('hidden');
    err.classList.add('visible');
  }

  setTimeout(() => {
    if (btn) btn.classList.remove('shake');
  }, 600);
}

function fadeInFlex(elem) {
  if (!elem) return;

  elem.classList.remove('show');
  elem.style.display = 'flex';

  // Reflow: ettől a böngésző külön állapotként érzékeli a display:flex-et,
  // és a show osztály már tud átmenettel, nem villanva érvényesülni.
  void elem.offsetHeight;

  requestAnimationFrame(() => {
    elem.classList.add('show');
  });
}

function openLegacyLoginPanel(logElem) {
  if (!logElem) return false;

  const szoveg = logElem.closest('.szoveg') || document.querySelector('.szoveg');

  // Fontos: ne kapjuk fel az index oldal tetején lévő, üres #login formot.
  // Csak azt a #login-t kezeljük, amelyik tényleg a megnyitott login blokk őse.
  const loginHost = logElem.closest('#login');

  const kulsoElem =
    logElem.closest('.kulso-border') ||
    logElem.closest('.kulso') ||
    loginHost?.closest?.('.kulso-border') ||
    null;

  fadeInFlex(kulsoElem);
  fadeInFlex(loginHost);
  fadeInFlex(szoveg);

  const bejbutt = szoveg?.querySelector?.('#bejbutt');
  if (bejbutt) {
    bejbutt.style.display = 'none';
  }

  fadeInFlex(logElem);

  setTimeout(() => {
    logElem.querySelector('#fnev')?.focus?.();
  }, 120);

  return true;
}

function openLoginPanel() {
  const existingLog = document.querySelector('#log');

  if (isLegacyLoginBlock(existingLog)) {
    return openLegacyLoginPanel(existingLog);
  }

  ensureLoginPanel();

  const kulsoElem = document.querySelector('.generated-login-panel') || document.querySelector('.kulso-border') || document.getElementById('kulso-border');
  const szoveg = document.querySelector('.generated-login-copy') || document.querySelector('.szoveg');

  if (szoveg) toggleShow(szoveg);
  if (kulsoElem) toggleShow(kulsoElem);

  return true;
}

document.body.addEventListener('click', (e) => {
  const loginGomb = e.target.closest('#bejelentkezes, #lepjenbe');
  if (!loginGomb) return;

  e.preventDefault();

  const toggleBtn = document.querySelector('.toggle_btn');

  if (toggleBtn && getComputedStyle(toggleBtn).display !== 'none') {
    toggleBtn.click();
  }

  openLoginPanel();
});

function toggleShow(elem) {
  if (!elem) {
    console.warn('A szükséges elem nem található a DOM-ban!');
    return;
  }

  if (elem.classList.contains('show')) {
    elem.classList.remove('show');
    setTimeout(() => {
      elem.style.display = 'none';
    }, 500);
  } else {
    elem.style.display = 'flex';
    setTimeout(() => {
      elem.classList.add('show');
    }, 50);
  }
}

document.body.addEventListener('click', async (e) => {
  const logoutBtn = e.target.closest('.lepjenki, .logout-btn');
  if (!logoutBtn) return;

  e.preventDefault();

  try {
    const res = await fetch('/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (res.redirected) {
      window.location.href = res.url;
      return;
    }

    window.location.href = '/index.html';
  } catch (err) {
    console.error('Kijelentkezési hiba:', err);
    window.location.href = '/index.html';
  }
});

const toggleBtn = document.querySelector('.toggle_btn');
const toogleBtnIcon = document.querySelector('.toggle_btn i');
const dropDownMenu = document.querySelector('.dropdown_menu');

if (toggleBtn && dropDownMenu && toogleBtnIcon) {
  toggleBtn.addEventListener('click', () => {
    dropDownMenu.classList.toggle('open');

    const isOpen = dropDownMenu.classList.contains('open');
    toogleBtnIcon.className = isOpen ? 'fa-solid fa-xmark' : 'fa-solid fa-bars';
  });
}

function createButton(id, text, styles = {}) {
  const button = document.createElement('button');
  button.type = 'button';
  if (id) button.id = id;
  button.textContent = text;
  setStyles(button, styles);
  return button;
}

function createLabel(text) {
  const label = document.createElement('label');
  label.textContent = text;
  setStyles(label, {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold'
  });
  return label;
}

function createSwitchOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'switch-modal-overlay';
  setStyles(overlay, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '9999'
  });

  const modal = document.createElement('div');
  setStyles(modal, {
    background: '#fff',
    padding: '30px',
    borderRadius: '10px',
    width: '400px',
    maxWidth: '90%',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    position: 'relative',
    color: '#333'
  });

  const title = document.createElement('h3');
  title.textContent = 'Átjelentkezés';
  setStyles(title, { marginTop: '0', color: '#ffbd16' });

  const subtitle = document.createElement('div');
  subtitle.textContent = 'Szerepkör és/vagy modul váltás';
  setStyles(subtitle, { marginBottom: '20px', color: '#555' });

  modal.append(title, subtitle);
  overlay.appendChild(modal);

  return { overlay, modal };
}

function appendSelectOrFixedValue(parent, { id, labelText, items, currentId, valueTextFn }) {
  const hasMultiple = items.length > 1;
  parent.appendChild(createLabel(labelText));

  if (hasMultiple) {
    const select = document.createElement('select');
    select.id = id;
    setStyles(select, {
      width: '100%',
      padding: '8px',
      marginBottom: id === 'switch-role' ? '15px' : '20px',
      borderRadius: '5px',
      border: '1px solid #ccc'
    });

    items.forEach(item => {
      const option = document.createElement('option');
      option.value = String(item.id ?? '');
      option.textContent = valueTextFn(item);
      option.selected = String(item.id ?? '') === String(currentId ?? '');
      select.appendChild(option);
    });

    parent.appendChild(select);
    return select;
  }

  const onlyItem = items[0] || { id: '', nev: '-' };
  const p = document.createElement('p');
  p.textContent = valueTextFn(onlyItem);
  setStyles(p, {
    padding: '8px',
    background: '#f5f5f5',
    borderRadius: '5px',
    marginTop: '0',
    marginBottom: id === 'switch-role' ? '15px' : '20px'
  });

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.id = id;
  hidden.value = String(onlyItem.id ?? '');

  parent.append(p, hidden);
  return hidden;
}

async function executeSwitch() {
  const newRoleId = document.getElementById('switch-role')?.value || '';
  const newModulId = document.getElementById('switch-modul')?.value || '';
  const btn = document.getElementById('execute-switch-btn');

  if (btn) {
    btn.textContent = 'Átjelentkezés folyamatban...';
    btn.disabled = true;
  }

  try {
    const switchRes = await fetch('/switch-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ szerepkor: newRoleId, modul_id: newModulId })
    });

    const switchOut = await switchRes.json();

    if (switchOut.success) {
      window.location.href = switchOut.redirect;
    } else {
      alert('Hiba a váltás során: ' + (switchOut.message || ''));
      if (btn) {
        btn.textContent = 'Váltás végrehajtása';
        btn.disabled = false;
      }
    }
  } catch (err) {
    console.error(err);
    alert('Hálózati hiba történt az átjelentkezéskor.');
    if (btn) {
      btn.textContent = 'Váltás végrehajtása';
      btn.disabled = false;
    }
  }
}

document.body.addEventListener('click', async function(e) {
  const engedelyekGomb = e.target.closest('#engedelyek');
  if (!engedelyekGomb) return;

  e.preventDefault();

  const existingModal = document.getElementById('switch-modal-overlay');
  if (existingModal) existingModal.remove();

  try {
    const res = await fetch('/switch-info', { credentials: 'same-origin' });
    const data = await res.json();

    if (!data.success) {
      alert('Hiba történt az adatok lekérésekor: ' + (data.message || ''));
      return;
    }

    const roles = Array.isArray(data.roles) ? data.roles : [];
    const modules = Array.isArray(data.modules) ? data.modules : [];
    const { overlay, modal } = createSwitchOverlay();

    const hasMultipleRoles = roles.length > 1;
    const hasMultipleModules = modules.length > 1;

    if (!hasMultipleRoles && !hasMultipleModules) {
      const message = document.createElement('p');
      message.textContent = 'Sajnos nincs más jogosultságod vagy szakmai anyag hozzáférésed, amire válthatnál!';
      setStyles(message, { color: 'red', fontWeight: 'bold' });

      const closeBtn = createButton('close-switch-modal', 'Értettem', {
        marginTop: '15px',
        width: '100%',
        padding: '10px',
        border: 'none',
        borderRadius: '5px',
        background: '#ddd',
        cursor: 'pointer',
        color: '#000',
        fontWeight: 'bold'
      });
      closeBtn.addEventListener('click', () => overlay.remove());

      modal.append(message, closeBtn);
      document.body.appendChild(overlay);
      return;
    }

    const formContainer = document.createElement('div');
    formContainer.id = 'switch-form-container';

    appendSelectOrFixedValue(formContainer, {
      id: 'switch-role',
      labelText: hasMultipleRoles ? 'Elérhető szerepkörök:' : 'Szerepkör (Fix):',
      items: roles,
      currentId: data.currentRoleId,
      valueTextFn: item => String(item.nev ?? '-')
    });

    appendSelectOrFixedValue(formContainer, {
      id: 'switch-modul',
      labelText: hasMultipleModules ? 'Váltsunk szakmai anyagot:' : 'Szakmai anyag (Fix):',
      items: modules,
      currentId: data.currentModulId,
      valueTextFn: item => String(item.leiras || item.nev || '-')
    });

    const actions = document.createElement('div');
    setStyles(actions, { display: 'flex', gap: '10px' });

    const cancelBtn = createButton('cancel-switch', 'Mégse', {
      flex: '1',
      padding: '10px',
      border: 'none',
      borderRadius: '5px',
      background: '#ddd',
      cursor: 'pointer',
      color: '#000',
      fontWeight: 'bold'
    });
    cancelBtn.addEventListener('click', () => overlay.remove());

    const executeBtn = createButton('execute-switch-btn', 'Átjelentkezés', {
      flex: '1',
      padding: '10px',
      border: 'none',
      borderRadius: '5px',
      background: '#ff6500',
      color: '#ffff',
      cursor: 'pointer',
      fontWeight: 'bold'
    });
    executeBtn.addEventListener('click', executeSwitch);

    actions.append(cancelBtn, executeBtn);
    formContainer.appendChild(actions);
    modal.appendChild(formContainer);
    document.body.appendChild(overlay);
  } catch (err) {
    console.error(err);
    alert('Hálózati hiba történt az adatok lekérésekor.');
  }
});

document.addEventListener('click', function(e) {
  if (e.target.classList.contains('toggle-jelszo')) {
    const parent = e.target.parentElement;
    const input = parent?.querySelector('input');

    if (input) {
      const isPassword = input.getAttribute('type') === 'password';
      input.setAttribute('type', isPassword ? 'text' : 'password');
      e.target.textContent = isPassword ? 'visibility_off' : 'visibility';
    }
  }
});

function createForgotPasswordModal() {
  const modal = document.createElement('div');
  modal.id = 'forgot-pw-modal';

  const overlay = document.createElement('div');
  setStyles(overlay, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '900'
  });

  const box = document.createElement('div');
  setStyles(box, {
    background: 'white',
    padding: '30px',
    borderRadius: '8px',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    color: '#333',
    boxShadow: '0 0 20px rgba(255,189,22,0.3)'
  });

  const title = document.createElement('h3');
  title.textContent = 'Jelszó visszaállítása';
  setStyles(title, { marginBottom: '15px', color: '#ffbd16' });

  const desc = document.createElement('p');
  desc.textContent = 'Kérjük, adja meg felhasználónevét és regisztrált e-mail címét a visszaállító link igényléséhez!';
  setStyles(desc, {
    marginBottom: '20px',
    fontSize: '14px',
    lineHeight: '1.5'
  });

  const userInput = document.createElement('input');
  userInput.type = 'text';
  userInput.id = 'fw-user';
  userInput.placeholder = 'Felhasználónév';
  setStyles(userInput, {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box'
  });

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.id = 'fw-email';
  emailInput.placeholder = 'E-mail cím';
  setStyles(emailInput, {
    width: '100%',
    padding: '10px',
    marginBottom: '20px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxSizing: 'border-box'
  });

  const actions = document.createElement('div');
  setStyles(actions, {
    display: 'flex',
    justifyContent: 'space-between'
  });

  const cancelBtn = createButton('fw-cancel', 'Mégse', {
    padding: '10px 20px',
    border: 'none',
    background: '#ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  });

  const sendBtn = createButton('fw-send', 'Ellenőrzés és Küldés', {
    padding: '10px 20px',
    border: 'none',
    background: '#ffbd16',
    color: 'white',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  });

  cancelBtn.addEventListener('click', () => modal.remove());
  sendBtn.addEventListener('click', async () => {
    const user = userInput.value.trim();
    const email = emailInput.value.trim();

    if (!user || !email) {
      showAlert('A felhasználónév és az e-mail cím megadása is kötelező!');
      return;
    }

    try {
      const response = await fetch('/api/forgot-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fnev: user, email: email })
      });
      const data = await response.json();

      if (data.success) {
        showAlert('Sikeres! Az aktiváló linket elküldtük az e-mail címére!');
        modal.remove();
      } else {
        showAlert(data.message || 'Hiba történt a kérelem során!');
      }
    } catch (err) {
      console.error(err);
      showAlert('Szerver kommunikációs hiba!');
    }
  });

  actions.append(cancelBtn, sendBtn);
  box.append(title, desc, userInput, emailInput, actions);
  overlay.appendChild(box);
  modal.appendChild(overlay);

  return modal;
}

document.body.addEventListener('click', (e) => {
  const forgotPwBtn = e.target.closest('#whbutt');
  if (!forgotPwBtn) return;

  e.preventDefault();

  if (document.getElementById('forgot-pw-modal')) {
    return;
  }

  document.body.appendChild(createForgotPasswordModal());
});

/* ==============================
   Videós segédanyag modal
   - dashdvideos: kezelőpanel / dashboard videók
   - ertekelovideos: értékelő felület videók
   A YouTube URL-eket itt kell cserélni a végleges linkekre.
   ============================== */

const VIDEO_SEGEDANYAGOK = {
  dashd: {
    title: 'Videós segédanyagok – Kezelőpanel',
    lead: 'Rövid bemutatók a belépés utáni kezelőpanel használatához.',
    items: [
      {
        cim: 'Lejátszási lista',
        leiras: 'Nézze végig a komplett anyagot jól behatárolt szakaszokra bontva',
        url: 'https://www.youtube.com/playlist?list=PLf_nL6qXU6-okHPM46NnXG4ChfSYo-4my'
      },
      {
        cim: 'Kezelőpanel áttekintése',
        leiras: 'Infók, Értékeim, Új értékelés és Javaslatok röviden.',
        url: 'https://www.youtube.com/watch?v=dH-kQ0J2rBE&list=PLf_nL6qXU6-okHPM46NnXG4ChfSYo-4my&index=2'
      },
      {
        cim: 'Infók képernyő',
        leiras: 'Modul, intézmény, szakmai anyag, licenc, hírek és határidők.',
        url: 'https://www.youtube.com/watch?v=iC79m8jEzAA&list=PLf_nL6qXU6-okHPM46NnXG4ChfSYo-4my&index=3'
      },
      {
        cim: 'Értékeim – keresés és rendezés',
        leiras: 'Meglévő értékelések keresése, rendezése és nézetváltása.',
        url: 'https://www.youtube.com/watch?v=SYyec65AJIg&list=PLf_nL6qXU6-okHPM46NnXG4ChfSYo-4my&index=4'
      },
      {
        cim: 'Csoportos kijelölés és generálás',
        leiras: 'Értékelések kijelölése és csoportos generálás.',
        url: 'https://www.youtube.com/watch?v=kRg2HjMlVlU&list=PLf_nL6qXU6-okHPM46NnXG4ChfSYo-4my&index=5'
      },
  {
        cim: 'Csoportos értékelések adatai',
        leiras: 'Több értékelés elemzése, statisztika készítése és csoportos összegzés.',
        url: 'https://youtu.be/MYe14bhekUg'
      },
      {
        cim: 'Új értékelés indítása',
        leiras: 'Vizsgálati név, időszak, típus és nyilatkozat megadása.',
        url: 'https://www.youtube.com/watch?v=lfvVOUQbutk&list=PLf_nL6qXU6-okHPM46NnXG4ChfSYo-4my&index=6'
      }
    ]
  },
  ertekelo: {
    title: 'Videós segédanyagok – Értékelés menete',
    lead: 'Rövid bemutatók az értékelő felület és a válaszadás használatához.',
    items: [ {
        cim: 'Lejátszási lista',
        leiras: 'Nézze végig a komplett anyagot jól behatárolt szakaszokra bontva',
        url: 'https://www.youtube.com/watch?v=dppMeuNPPls&list=PLf_nL6qXU6-rrMEEvkiejcaNXbnDp8UdO'
      },
      {
        cim: 'Kezelőfelület',
        leiras: 'Az értékelő modul kezelőfelületének bemutatása.',
        url: 'https://youtu.be/Dl-d1CzEPME'
      },
      {
        cim: 'Értékelés menete',
        leiras: 'Kérdések megválaszolása, válaszok hozzáadása, típusok',
        url: 'https://youtu.be/ZxqqracyUpc'
      },
      {
        cim: 'Diagramok',
        leiras: 'Grafikonos megjelenítés az értékelés közben.',
        url: 'https://youtu.be/dppMeuNPPls'
      },
       {
        cim: 'Kereshetőség',
        leiras: 'Keresés a szakmai anyagban és a készülő értékelésben.',
        url: 'https://youtu.be/DyAe83Q8KYs'
      }
    /*  {
        cim: 'Diagramok értelmezése',
        leiras: 'Százalékos eredmények, cikkelyek, részletek és szűrés témakör szerint.',
        url: 'https://www.youtube.com/watch?v=IDE_KERUL_A_DIAGRAMOK_LINK'
      } */
    ]
  },
    private2: {
    title: 'Videós segédanyagok – Feltöltőpanel',
    lead: 'Rövid bemutatók a belépés utáni kezelőpanel használatához.',
    items: [
      {
        cim: 'Lejátszási lista',
        leiras: 'Nézze végig a komplett anyagot jól behatárolt szakaszokra bontva',
        url: 'https://www.youtube.com/playlist?list=PLf_nL6qXU6-q08GlaQB-PDJtwr20aa7T_'
      },
      {
        cim: 'Kezelőpanel áttekintése',
        leiras: 'Infók, Értékeim, Új értékelés és Javaslatok röviden.',
        url: 'https://youtu.be/O6ezud8n5uc'
      },
      {
        cim: 'Infók képernyő',
        leiras: 'Modul, intézmény, szakmai anyag, részletek, hírek és mi.',
        url: 'https://www.youtube.com/watch?v=iC79m8jEzAA&list=PLf_nL6qXU6-okHPM46NnXG4ChfSYo-4my&index=3'
      },
      {
        cim: 'Feltöltés indítása és pontszámítás',
        leiras: 'Belépés a feltöltéshez és pontszámítás beállítása.',
        url: 'https://youtu.be/wFdWl49gNQM'
      },
      {
        cim: 'Mesterséges intelligencia beállításai',
        leiras: 'Generálási beállítások.',
        url: 'https://youtu.be/QYwVheSjZh0'
      },
  {
        cim: 'Sablonok',
        leiras: 'Sablonok létrehozása és használata.',
        url: 'https://youtu.be/tuYV2_NSZAg'
      }
    ]
  },
   view2: {
    title: 'Videós segédanyagok – Feltöltőfelület',
    lead: 'Rövid bemutatók a feltöltőfelület használatához: szintek, kérdéstípusok, kategóriaműveletek és pontozás.',
    items: [
      {
        cim: 'Lejátszási lista',
        leiras: 'Nézze végig a komplett anyagot jól behatárolt szakaszokra bontva',
        url: 'https://www.youtube.com/playlist?list=PLf_nL6qXU6-rjncJ5OwR9avvR3-TlA9Es'
      },
      {
        cim: 'Feltöltő felület bemutatása',
        leiras: 'Elrendezési felület megismerése',
        url: 'https://youtu.be/T0imBSmsBsw'
      },
       {
        cim: 'Feltöltés',
        leiras: 'Feltöltési ismeretek, kérdések felvitele',
        url: 'https://youtu.be/-4x7HSXHTmA'
      },
      {
        cim: 'Kérdések típusai és értékük',
        leiras: 'Kérdéstípusok bemutatása és tulajdonságaik.',
        url: 'https://youtu.be/DTn1emziE8U'
      },
      {
        cim: 'Kategóriák tulajdonságai',
        leiras: 'Szerkesztés, törlés, színezés',
        url: 'https://youtu.be/EQW86VANv38'
      },
      {
        cim: 'Pontozási rendszer',
        leiras: 'Útmutató kérdések és állítások pontozásához.',
        url: 'https://youtu.be/H5IYR8x4tGQ'
      }
    ]
  },

};

function ensureVideoHelpModalStyles() {
  if (document.getElementById('video-help-modal-style')) return;

  const style = document.createElement('style');
  style.id = 'video-help-modal-style';
  style.textContent = `
    .video-help-overlay {
      position: fixed;
      inset: 0;
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(35, 18, 8, .66);
      backdrop-filter: blur(5px);
    }

    .video-help-modal {
      width: min(880px, 96vw);
      max-height: min(760px, 92vh);
      overflow: auto;
      border-radius: 24px;
      background: linear-gradient(145deg, #fff7ed 0%, #ffffff 54%, #fff1dc 100%);
      border: 1px solid #f3d4bf;
      box-shadow: 0 24px 70px rgba(45, 21, 21, .32);
      color: #35231d;
    }

    .video-help-header {
      position: sticky;
      top: 0;
      z-index: 1;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 24px 18px;
      color: #fff;
      background: linear-gradient(135deg, #ff6500, #ffaa00);
    }

    .video-help-title-wrap {
      min-width: 0;
    }

    .video-help-kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 7px;
      padding: 5px 10px;
      border-radius: 999px;
      font-size: .82rem;
      font-weight: 900;
      background: rgba(255, 255, 255, .18);
      border: 1px solid rgba(255, 255, 255, .42);
    }

    .video-help-title {
      margin: 0;
      font-size: clamp(1.45rem, 3.5vw, 2.35rem);
      line-height: 1.05;
      letter-spacing: -.05em;
    }

    .video-help-lead {
      margin: 9px 0 0;
      max-width: 680px;
      line-height: 1.45;
      font-weight: 650;
      opacity: .96;
    }

    .video-help-close {
      flex: 0 0 auto;
      width: 42px;
      height: 42px;
      border: 1px solid rgba(255, 255, 255, .55);
      border-radius: 999px;
      color: #fff;
      background: rgba(255, 255, 255, .16);
      cursor: pointer;
      font-size: 1.45rem;
      line-height: 1;
      font-weight: 900;
    }

    .video-help-body {
      padding: 22px;
    }

    .video-help-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .video-help-card {
      display: flex;
      gap: 13px;
      min-height: 118px;
      padding: 16px;
      border-radius: 20px;
      border: 1px solid #f3d4bf;
      border-left: 7px solid #ff6500;
      background: rgba(255, 255, 255, .92);
      color: #35231d;
      text-decoration: none;
      box-shadow: 0 12px 30px rgba(45, 21, 21, .10);
      transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
    }

    .video-help-card:hover,
    .video-help-card:focus-visible {
      transform: translateY(-2px);
      box-shadow: 0 18px 42px rgba(45, 21, 21, .16);
      border-color: #ffaa00;
      outline: none;
    }

    .video-help-play {
      flex: 0 0 auto;
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 15px;
      color: #fff;
      background: linear-gradient(135deg, #ff6500, #ffaa00);
      font-weight: 900;
      box-shadow: 0 8px 18px rgba(255, 101, 0, .24);
    }

    .video-help-card-title {
      margin: 0 0 5px;
      font-size: 1.02rem;
      line-height: 1.2;
      color: #2d1515;
      font-weight: 900;
    }

    .video-help-card-desc {
      margin: 0;
      color: #735d50;
      font-size: .94rem;
      line-height: 1.42;
      font-weight: 600;
    }

    .video-help-footer {
      margin-top: 16px;
      padding: 14px 16px;
      border-radius: 18px;
      background: #fff1e3;
      border: 1px solid #f3d4bf;
      color: #735d50;
      font-size: .92rem;
      font-weight: 650;
    }

    @media (max-width: 720px) {
      .video-help-header { padding: 18px; }
      .video-help-body { padding: 16px; }
      .video-help-grid { grid-template-columns: 1fr; }
      .video-help-card { min-height: auto; }
    }
  `;
  document.head.appendChild(style);
}

function normalizeVideoUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.href;
  } catch (err) {
    return '';
  }
}

function closeVideoHelpModal() {
  const overlay = document.getElementById('video-help-modal-overlay');
  if (overlay) overlay.remove();
  document.body.style.overflow = document.body.dataset.videoHelpPreviousOverflow || '';
  delete document.body.dataset.videoHelpPreviousOverflow;
  document.removeEventListener('keydown', handleVideoHelpEsc);
}

function handleVideoHelpEsc(e) {
  if (e.key === 'Escape') {
    closeVideoHelpModal();
  }
}

function createVideoCard(video) {
  const href = normalizeVideoUrl(video.url);
  const card = document.createElement('a');
  card.className = 'video-help-card';
  card.href = href || '#';
  card.target = '_blank';
  card.rel = 'noopener noreferrer';

  if (!href) {
    card.addEventListener('click', (e) => e.preventDefault());
    card.setAttribute('aria-disabled', 'true');
  }

  const play = document.createElement('span');
  play.className = 'video-help-play';
  play.textContent = '▶';

  const textBox = document.createElement('span');

  const title = document.createElement('h3');
  title.className = 'video-help-card-title';
  title.textContent = video.cim;

  const desc = document.createElement('p');
  desc.className = 'video-help-card-desc';
  desc.textContent = video.leiras;

  textBox.append(title, desc);
  card.append(play, textBox);

  return card;
}

function openVideoHelpModal(type) {
  const data = VIDEO_SEGEDANYAGOK[type];
  if (!data) return;

  ensureVideoHelpModalStyles();
  closeVideoHelpModal();

  document.body.dataset.videoHelpPreviousOverflow = document.body.style.overflow || '';
  document.body.style.overflow = 'hidden';

  const overlay = document.createElement('div');
  overlay.id = 'video-help-modal-overlay';
  overlay.className = 'video-help-overlay';

  const modal = document.createElement('section');
  modal.className = 'video-help-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'video-help-modal-title');

  const header = document.createElement('div');
  header.className = 'video-help-header';

  const titleWrap = document.createElement('div');
  titleWrap.className = 'video-help-title-wrap';

  const kicker = document.createElement('div');
  kicker.className = 'video-help-kicker';
  kicker.textContent = 'Videós segédanyag';

  const title = document.createElement('h2');
  title.id = 'video-help-modal-title';
  title.className = 'video-help-title';
  title.textContent = data.title;

  const lead = document.createElement('p');
  lead.className = 'video-help-lead';
  lead.textContent = data.lead;

  titleWrap.append(kicker, title, lead);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'video-help-close';
  closeBtn.setAttribute('aria-label', 'Videós segédanyag bezárása');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', closeVideoHelpModal);

  header.append(titleWrap, closeBtn);

  const body = document.createElement('div');
  body.className = 'video-help-body';

  const grid = document.createElement('div');
  grid.className = 'video-help-grid';
  data.items.forEach(video => grid.appendChild(createVideoCard(video)));

  const footer = document.createElement('div');
  footer.className = 'video-help-footer';
  footer.textContent = 'A videók új böngészőfülön nyílnak meg YouTube-on.';

  body.append(grid, footer);
  modal.append(header, body);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeVideoHelpModal();
  });

  document.body.appendChild(overlay);
  document.addEventListener('keydown', handleVideoHelpEsc);
  closeBtn.focus();
}

document.body.addEventListener('click', (e) => {
  const view2VideoBtn = e.target.closest('.view2videos, .view2');
  const private2VideoBtn = e.target.closest('.private2videos, .private2');
  const dashVideoBtn = e.target.closest('.dashdvideos');
  const ertekeloVideoBtn = e.target.closest('.ertekelovideos');

  if (!view2VideoBtn && !private2VideoBtn && !dashVideoBtn && !ertekeloVideoBtn) return;

  e.preventDefault();

  const dropDownMenu = document.querySelector('.dropdown_menu.open');
  const toogleBtnIcon = document.querySelector('.toggle_btn i');

  if (dropDownMenu) {
    dropDownMenu.classList.remove('open');
    if (toogleBtnIcon) toogleBtnIcon.className = 'fa-solid fa-bars';
  }

  const videoType = view2VideoBtn ? 'view2' : private2VideoBtn ? 'private2' : dashVideoBtn ? 'dashd' : 'ertekelo';
  openVideoHelpModal(videoType);
});

