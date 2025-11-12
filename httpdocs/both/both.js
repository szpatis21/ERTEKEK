// KÖzös html elemek osztály

const menuId = document.getElementById('menu-type')?.value || 'public';

const menuTartalmak = {
    public: `
        <aside class="sidebar">
            <!-- Sidebar header -->
            <header class="sidebar-header">
                <button class="toggler sidebar-toggler">
                    <span class="material-symbols-rounded">menu</span>
                </button>
                <button class="toggler menu-toggler"> 
                    <span class="material-symbols-rounded">menu</span>
                </button>
            </header>
            <nav class="sidebar-nav">
                <!-- Primary top nav -->
                <ul class="nav-list primary-nav">
                    <li class="nav-item">
                        <a href="/index.html" class="nav-link">
                            <span class="nav-icon material-symbols-rounded">home</span>
                            <span class="nav-label">Fooldal</span>
                        </a>
                        <span class="nav-tooltip">Fooldal</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">widgets</span>
                            <span class="nav-label">Értékeink</span>
                        </a>
                        <span class="nav-tooltip">Értékeink</span>
                    </li>
                  
              
               
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">settings</span>
                            <span class="nav-label">Szolgáltatásaink</span>
                        </a>
                        <span class="nav-tooltip">Szolgáltatásaink</span>
                    </li>
                     <li class="nav-item">
                        <a id="adatvedelem" class="nav-link" style="color: #ffb835">
                            <span class="nav-icon material-symbols-rounded">policy</span>
                            <span class="nav-label">Adatvédelem</span>
                        </a>
                        <span class="nav-tooltip">Adatvédelem</span>
                    </li>
                </ul>

                <!-- Secondary bottom nav -->
                <ul class="nav-list secondary-nav">
                    <li class="nav-item">
                        <a href="/register.html" class="nav-link">
                            <span class="nav-icon material-symbols-rounded">account_circle</span>
                            <span class="nav-label">Regisztráció</span>
                        </a>
                        <span class="nav-tooltip">Regisztráció</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded" id="lepjenbe">logout</span>
                            <span class="nav-label" id="bejelentkezes">Bejelentkezés</span>
                        </a>
                        <span class="nav-tooltip" id="bejelentkezes">Bejelentkezés</span>
                    </li>
                </ul>
            </nav>
                <div class="mobillogo">
          <div id="logokulso" style="width: 130px; height: 130px; border-radius: 15px;"></div>
          <div id="logobelso" style="width: 110px; height: 110px; font-size: small;border-radius: 15px; color: black"><span class="gold">É</span>RTÉKEK</div>
        </div>    
        </aside>
    `,
    private: `
         <aside class="sidebar collapsed">
            <!-- Sidebar header -->
            <header class="sidebar-header">
                <button class="toggler sidebar-toggler">
                    <span class="material-symbols-rounded">menu</span>
                </button>
                <button class="toggler menu-toggler"> 
                    <span class="material-symbols-rounded">menu</span>
                </button>
            </header>
            <nav class="sidebar-nav">
                <!-- Primary top nav -->
                <ul class="nav-list primary-nav">
                    <li class="nav-item">
                        <a href="/index.html" class="nav-link">
                            <span class="nav-icon material-symbols-rounded">home</span>
                            <span class="nav-label">Fooldal</span>
                        </a>
                        <span class="nav-tooltip">Fooldal</span>
                    </li>
                    <li class="nav-item">
                        <a href="/upload.html" class="nav-link">
                            <span class="nav-icon material-symbols-rounded">lab_panel</span>
                            <span class="nav-label">Tesztfelület</span>
                        </a>
                        <span class="nav-tooltip">Tesztfelület</span>
                    </li>
                    
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">group</span>
                            <span class="nav-label">Felhasználok</span>
                        </a>
                        <span class="nav-tooltip">Felhasználók</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">factory</span>
                            <span class="nav-label">Licenszek</span>
                        </a>
                        <span class="nav-tooltip">Licenszek</span>
                    </li>
                    
                </ul>

                <!-- Secondary bottom nav -->
                <ul class="nav-list secondary-nav">
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">account_circle</span>
                            <span class="nav-label">Fiókom</span>
                        </a>
                        <span class="nav-tooltip">Fiókom</span>
                    </li>
                <form action="/logout" method="POST">
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                            <span class="nav-label"><button  type="submit">Kijelentkezés</button></span>
                        </a>
                        <span class="nav-tooltip lepjenki"><button type="submit">Kijelentkezés</button></span>
                    </li>
                </form>

                </ul>
                
            </nav>
                      <div class="mobillogo">
          <div id="logokulso" style="width: 130px; height: 130px; border-radius: 15px;"></div>
          <div id="logobelso" style="width: 110px; height: 110px; font-size: small;border-radius: 15px; color: black"><span class="gold">É</span>RTÉKEK</div>
        </div>    
        </aside>
    `,
    dashd: `
         <aside class="sidebar collapsed">
            <!-- Sidebar header -->
            <header class="sidebar-header">
                <button class="toggler sidebar-toggler">
                    <span class="material-symbols-rounded">menu</span>
                </button>
                <button class="toggler menu-toggler"> 
                    <span class="material-symbols-rounded">menu</span>
                </button>
            </header>
            <nav class="sidebar-nav">
                <!-- Primary top nav -->
                <ul class="nav-list primary-nav">
                    <li class="nav-item">
                        <a href="/index.html" class="nav-link">
                            <span class="nav-icon material-symbols-rounded">home</span>
                            <span class="nav-label">Fooldal</span>
                        </a>
                        <span class="nav-tooltip">Fooldal</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">widgets</span>
                            <span class="nav-label">Értékeim</span>
                        </a>
                        <span class="nav-tooltip">Értékeim</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">contact_phone</span>
                            <span class="nav-label">Kapcsolat</span>
                        </a>
                        <span class="nav-tooltip">Kapcsolat</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">quiz</span>
                            <span class="nav-label">GYIK</span>
                        </a>
                        <span class="nav-tooltip">GYIK</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">finance_chip</span>
                            <span class="nav-label">Licenszem</span>
                        </a>
                        <span class="nav-tooltip">Licenszem</span>
                    </li>
                    
                </ul>

                <!-- Secondary bottom nav -->
                <ul class="nav-list secondary-nav">
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">account_circle</span>
                            <span class="nav-label">Fiókom</span>
                        </a>
                        <span class="nav-tooltip">Fiókom</span>
                    </li>
                <form action="/logout" method="POST">
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                            <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                        </a>
                        <span class="nav-tooltip lepjenki"><button type="submit">Kijelentkezés</button></span>
                    </li>
                </form>

                </ul>
            </nav>
                     <div class="mobillogo">
          <div id="logokulso" style="width: 130px; height: 130px; border-radius: 15px;"></div>
          <div id="logobelso" style="width: 110px; height: 110px; font-size: small;border-radius: 15px; color: black"><span class="gold">É</span>RTÉKEK</div>
        </div>    
        </aside>
    `,
    view: `
        <aside class="sidebar collapsed">
            <!-- Sidebar header -->
            <header class="sidebar-header">
                <button class="toggler sidebar-toggler">
                    <span class="material-symbols-rounded">menu</span>
                </button>
                <button class="toggler menu-toggler"> 
                    <span class="material-symbols-rounded">menu</span>
                </button>

            </header>
            <nav class="sidebar-nav">
                <!-- Primary top nav -->
                <ul class="nav-list primary-nav">
               
                    <li class="nav-item">
                        <a class="nav-link ertekelesek">
                            <span class="nav-icon material-symbols-rounded">preview</span>
                            <span class="nav-label">Nézet</span>
                        </a>
                        <span class="nav-tooltip ertekelesek">Nézet</span>
                    </li>
                    <li class="nav-item">
                            <a  class="nav-link diagrammok">
                                <span class="nav-icon material-symbols-rounded ">pie_chart</span>
                                <span class="nav-label">
                                  <button>Diagramm Be-Ki</button>
                                </span>
                            </a>
                            <span class="nav-tooltip diagrammok"> 
                                <button>Diagramm Be-Ki</button>
                            </span>
                        </li>
                    <li class="nav-item">
                            <a  class="nav-link pontok">
                                <span class="nav-icon material-symbols-rounded toggleButton">page_info</span>
                                <span class="nav-label">
                                  <button class="toggleButton">Pontrendszer</button>
                                </span>
                            </a>
                            <span class="nav-tooltip toggleButton"> 
                                <button>Pontrendszer</button>
                            </span>
                        </li>
                    <li class="nav-item">
                        <a class="nav-link navment">
                            <span class="nav-icon material-symbols-rounded">picture_as_pdf</span>
                            <span class="nav-label">PDF</span>
                        </a>
                        <span class="nav-tooltip navment">PDF</span>
                    </li>
                       <li class="nav-item">
                        <a class="nav-link navnyom">
                            <span class="nav-icon material-symbols-rounded">print</span>
                            <span class="nav-label">Nyomtatás</span>
                        </a>
                        <span class="nav-tooltip navnyom">Nyomtatás</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">quiz</span>
                            <span class="nav-label">Segítség</span>
                        </a>
                        <span class="nav-tooltip">Segítség</span>
                    </li>
                     <li class="nav-item">
                  <li class="nav-item">
                        <a href="./dashboard.html" class="nav-link">
                            <span class="nav-icon material-symbols-rounded color">home</span>
                            <span class="nav-label">Kezelöpanel</span>
                        </a>
                        <span class="nav-tooltip">Kezelöpanel</span>
                    </li>
                    <li class="nav-item">
                            <a class="nav-link mentesGomb">
                                <span class="nav-icon material-symbols-rounded">save</span>
                                <span class="nav-label"><button>Mentés</button></span>
                            </a>
                            <span class="nav-tooltip"><button class="mentesGomb">Mentés</button></span>
                         </li>

                    
                        <li class="nav-item">
                        <form action="/logout" method="POST">
                            <a class="nav-link">
                                <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                                <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                            </a>
                            <span class="nav-tooltip lepjenki"><button type="submit">Kijelentkezés</button></span>
                        </form>

                        </li> 
                </ul>
    
               
            </nav>
                     <div class="mobillogo">
          <div id="logokulso" style="width: 130px; height: 130px; border-radius: 15px;"></div>
          <div id="logobelso" style="width: 110px; height: 110px; font-size: small;border-radius: 15px; color: black"><span class="gold">É</span>RTÉKEK</div>
        </div>    
        </aside>
    `,
    view2: `
        <aside class="sidebar collapsed">
            <!-- Sidebar header -->
            <header class="sidebar-header">
                <button class="toggler sidebar-toggler">
                    <span class="material-symbols-rounded">menu</span>
                </button>
                <button class="toggler menu-toggler"> 
                    <span class="material-symbols-rounded">menu</span>
                </button>


            </header>
            <nav class="sidebar-nav">
                <!-- Primary top nav -->
                <ul class="nav-list primary-nav">
               
                    <li class="nav-item">
                        <a class="nav-link ertekelesek">
                            <span class="nav-icon material-symbols-rounded">preview</span>
                            <span class="nav-label">Értékelési nézet</span>
                        </a>
                        <span class="nav-tooltip ertekelesek">Értékelési nézet</span>
                    </li>
                        <li class="nav-item">
                            <a  class="nav-link ">
                                <span class="nav-icon material-symbols-rounded">pie_chart</span>
                                <span class="nav-label">
                                  <button class="diagrammok">Diagramm nézet</button>
                                </span>
                            </a>
                            <span class="nav-tooltip diagrammok"> 
                                <button>Diagramm nézet</button>
                            </span>
                        </li>
                      <li class="nav-item">
                            <a  class="nav-link pontok">
                                <span class="nav-icon material-symbols-rounded toggleButton">page_info</span>
                                <span class="nav-label">
                                  <button class="toggleButton">Pontrendszer</button>
                                </span>
                            </a>
                            <span class="nav-tooltip toggleButton"> 
                                <button>Pontrendszer</button>
                            </span>
                        </li>
                     <li class="nav-item" id="nyil">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">edit</span>
                            <span class="nav-label">Szerkesztö menü</span>
                        </a>
                        <span class="nav-tooltip">Szerkesztö menü</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link navment">
                            <span class="nav-icon material-symbols-rounded">picture_as_pdf</span>
                            <span class="nav-label" >PDF generálás</span>
                        </a>
                        <span class="nav-tooltip navment" >PDF generálás</span>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link">
                            <span class="nav-icon material-symbols-rounded">quiz</span>
                            <span class="nav-label">Segítség</span>
                        </a>
                        <span class="nav-tooltip">Segítség</span>
                    </li>
                </ul>
    
                <!-- Secondary bottom nav -->
                <ul class="nav-list secondary-nav" style="margin-top:65px;">
               
                   <li class="nav-item">
                        <a href="./dashboard.html" class="nav-link">
                            <span class="nav-icon material-symbols-rounded">space_dashboard</span>
                            <span class="nav-label">Kezelöpanel</span>
                        </a>
                        <span class="nav-tooltip">Kezelöpanel</span>
                    </li>
                    
                        <li class="nav-item">
                                            <form action="/logout" method="POST">
                            <a class="nav-link">
                                <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                                <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                            </a>
                            <span class="nav-tooltip lepjenki"><button type="submit">Kijelentkezés</button></span>
                                                </form>

                        </li> 
                </ul>
            </nav>
                     <div class="mobillogo">
          <div id="logokulso" style="width: 130px; height: 130px; border-radius: 15px;"></div>
          <div id="logobelso" style="width: 110px; height: 110px; font-size: small;border-radius: 15px; color: black"><span class="gold">É</span>RTÉKEK</div>
        </div>    
        </aside>
    `
};

    class Elem {
        constructor({ adottId = '', adottOsztaly = '', szuloElem = '', tartalom = '' }) {
            this.adottId = adottId;
            this.adottOsztaly = adottOsztaly;
            this.szuloElem = szuloElem;
            this.tartalom = tartalom;
        }

        // Metódus az elem létrehozására és hozzáadására a DOM-hoz
        letrehoz() {
     
            const div = document.createElement('div');
          
            if (this.adottId) div.id = this.adottId;
            if (this.adottOsztaly) div.classList.add(this.adottOsztaly);
            
            div.innerHTML = this.tartalom;
            
            const szuloElem = document.querySelector(this.szuloElem);
            if (szuloElem) {
                szuloElem.appendChild(div);
            } else {
                console.warn(`A szülő elem a következő kijelölővel nem található: "${this.szuloElem}".`);
            }
        }
    }


    //Nav
        const nav = new Elem({
            adottId: 'navmenu',
            adottOsztaly: '',
            szuloElem: 'men',
            tartalom: menuTartalmak[menuId]

        });

        nav.letrehoz();
    //Bejelentkezés
        const bejelentkezes = new Elem({
            adottId: 'kulso-border',
            adottOsztaly: '',
            szuloElem: '#login',
            tartalom: `
         
            `
        });
        bejelentkezes.letrehoz();



//Bejelentkező menu
const bejelentkezesElem2 = document.querySelector("#login");

// ------------ BEJELENTKEZÉS GOMB -----------------
const $ = (sel) => document.querySelector(sel);
const llogBtn = document.querySelector('#llog');
  if (llogBtn) llogBtn.addEventListener('click', async (e) => {
    e.preventDefault();                        // ne küldjön POST-ot a <form>

    /* --- Gyors kliens-oldali validálás ------------------------------ */
    const fnev      = $('#fnev').value.trim();
    const pass      = $('#pass').value;
    const modul_id  = parseInt($('#temakor').value, 10);
    const szerepkor = parseInt($('#szerepkor').value, 10);

    if (!fnev || !pass || !modul_id || !szerepkor) {
      return hiba('Minden mező kitöltése kötelező');
    }

    /* --- Adatcsomag -------------------------------------------------- */
    const payload = { fnev, pass, modul_id, szerepkor };

    try {
      const res = await fetch('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',           // session-cookie kell
        body: JSON.stringify(payload)
      });

      const out = await res.json();

      if (out.success) {
        location.href = out.redirect;
      } else {
        hiba(out.message);
      }

    } catch (err) {
      console.error('Fetch hiba:', err);
      hiba('Hálózati vagy szerverhiba');
    }
  });

  /* --- Egyszerű hibakiíró ------------------------------------------- */
  function hiba(msg) {
    // Legegyszerűbb: alert. Ha szebb UI kell, cseréld.
    showLoginError(msg);
  }

// ------------ ÜZENET + ANIMÁCIÓ -------------------
function showLoginError(msg) {
  const err  = document.getElementById('error-message');
  const btn  = document.getElementById('llog');
  const box  = document.getElementById('login');

  btn.classList.add('shake');
  box.style.background =
    'linear-gradient(0deg,#e91e31 0%,rgba(255,119,0,.911) 100%)';

  err.textContent = msg;
  err.classList.remove('hidden');
  err.classList.add('visible');

  setTimeout(() => btn.classList.remove('shake'), 600);
}


["#bejelentkezes", "#lepjenbe"].forEach(id => {
  const bejelentkezesElem = document.querySelector(id);
  if (!bejelentkezesElem) return;

  bejelentkezesElem.addEventListener("click", () => {
    const mobile = window.matchMedia("(max-width: 500px)").matches;

    // Oldalsáv és gomb szinkronban
    sidebar.classList.toggle("collapsed", mobile);
    sidebarToggler.classList.toggle("collapsed", mobile);
    // ───────────────────────────────────────────────
    // NE hívd meg újra:  sidebarToggler?.click()
    // ───────────────────────────────────────────────

    const kulsoElem = document.querySelector(".kulso-border");
    const szoveg    = document.querySelector(".szoveg");

    toggleShow(szoveg);
    toggleShow(kulsoElem);
  });
});

// Közös show/hide animáció
function toggleShow(elem) {
  if (!elem) {
    console.warn("A szükséges elem nem található a DOM-ban!");
    return;
  }

  if (elem.classList.contains("show")) {
    elem.classList.remove("show");
    setTimeout(() => { elem.style.display = "none"; }, 500);
  } else {
    elem.style.display = "flex";
    setTimeout(() => { elem.classList.add("show"); }, 50);
  }
}



//NAVMENU
const sidebar = document.querySelector(".sidebar");
const sidebarToggler = document.querySelector(".sidebar-toggler");
const menuToggler = document.querySelector(".menu-toggler");

// Ensure these heights match the CSS sidebar height values
let collapsedSidebarHeight = "56px"; // Height in mobile view (collapsed)
let fullSidebarHeight = "calc(100vh - 32px)"; // Height in larger screen

// Toggle sidebar's collapsed state
 const mobillogo = document.querySelector(".mobillogo");
 const herobg = document.querySelector(".hero-bg");
sidebarToggler.addEventListener("click", () => {
      

  sidebar.classList.toggle("collapsed");
 if (window.innerWidth > 600) { 
  if (sidebar.classList.contains("collapsed")) {
    herobg.classList.remove("blur");
    herobg.style.width="40%";
    mobillogo.style.display="none";
  } else {
    herobg.classList.add("blur");
     mobillogo.style.display="flex";
        herobg.style.width="100vh" ;
 }
}
  });

// Update sidebar height and menu toggle text

// Toggle menu-active class and adjust height
/* menuToggler.addEventListener("click", () => {
  toggleMenu(sidebar.classList.toggle("menu-active"));
}); */

// (Optional code): Adjust sidebar height on window resize
/* window.addEventListener("resize", () => {
  if (window.innerWidth >= 1024) {
    sidebar.style.height = fullSidebarHeight;
  } else {
    sidebar.classList.remove("collapsed");
    sidebar.style.height = "auto";
    toggleMenu(sidebar.classList.contains("menu-active"));
  }
}); 
/* if (window.innerWidth >= 1024) { 
    setTimeout(() => {
        const togglerIcon = sidebarToggler.querySelector("span");

        if (togglerIcon) {
            togglerIcon.classList.add("scale-color-effect");

            setTimeout(() => {
                sidebar.classList.add("collapsed");
                if (sidebar.classList.contains("menu-active")) {
                    toggleMenu(false);
                    sidebar.classList.remove("menu-active");
                }
                togglerIcon.classList.remove("scale-color-effect");
            }, 500); // Animáció ideje
        }
    }, 5); // 3 másodperc után indít
} */


document.querySelectorAll(".lepjenki").forEach(elem => {
  elem.addEventListener("click", () => {
    document.querySelector("form[action='/logout'] button[type='submit']")?.click();
  });
});

document.addEventListener("DOMContentLoaded", () => {
  if (window.innerWidth > 500) {
    sidebar.classList.remove("collapsed");
  }
});