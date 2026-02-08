export const menuTartalmak = {
    public: `
        <aside>
        <div class="navbar">
            <div class="motto"><a href="#">...értékről értékre</a></div>
            <ul class="links">
                <li>
                    <span class="nav-icon material-symbols-rounded">home</span>
                    <a href="/index.html">Fooldal</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">settings</span>
                    <a href="/index.html">Szolgáltatásaink</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">policy</span>
                    <a href="/index.html">Adatvédelem</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">account_circle</span>
                    <a href="/register.html">Regisztráció</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded" id="lepjenbe">logout</span>
                    <a class="action_btn" id="bejelentkezes">Bejelentkezés</a>
                </li>
            </ul>

            <div class="toggle_btn">
                <i class="fa-solid fa-bars"></i>            
            </div>
        </div>
        <div class="dropdown_menu">
                  <li>
                    <span class="nav-icon material-symbols-rounded">home</span>
                    <a href="/index.html">Fooldal</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">settings</span>
                    <a href="/index.html">Szolgáltatásaink</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">policy</span>
                    <a href="/index.html">Adatvédelem</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">account_circle</span>
                    <a href="/register.html">Regisztráció</a>
                </li>
                
                <li>
                    <span class="nav-icon material-symbols-rounded" id="lepjenbe">logout</span>
                    <a href="" class="action_btn" id="bejelentkezes">Bejelentkezés</a>
                </li>
                <div class="mobillogo">
                    <div id="mobillogokulso"></div>
                    <div id="mobillogobelso"><span class="gold">É</span>RTÉKEK</div>
                </div> 
        </div>
    </aside>
    `,
    private: `
     <aside>
        <div class="navbar">
            <div class="motto"><a href="#">...értékről értékre</a></div>
            <ul class="links">
                <li>
                    <span class="nav-icon material-symbols-rounded">lab_panel</span>
                    <a href="/upload.html">Tesztfelület</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">group</span>
                    <a >Felhasználok</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">factory</span>
                    <a>Licenszek</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">account_circle</span>
                    <a>Fiókom</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
            </ul>

            <div class="toggle_btn">
                <i class="fa-solid fa-bars"></i>            
            </div>
        </div>
        <div class="dropdown_menu">
                <li>
                    <span class="nav-icon material-symbols-rounded">lab_panel</span>
                    <a href="/upload.html">Tesztfelület</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">group</span>
                    <a >Felhasználok</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">factory</span>
                    <a>Licenszek</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">account_circle</span>
                    <a>Fiókom</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
                <div class="mobillogo">
                    <div id="mobillogokulso"></div>
                    <div id="mobillogobelso"><span class="gold">É</span>RTÉKEK</div>
                </div> 
        </div>
    </aside>
    `,
    dashd: `
     <aside>
        <div class="navbar">
            <div class="motto"><a href="#">...értékről értékre</a></div>
            <ul class="links">
               <li>
                    <span class="nav-icon material-symbols-rounded">widgets</span>
                    <a>Új értékelés</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">widgets</span>
                    <a>Értékeim</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">quiz</span>
                    <a >GYIK</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">finance_chip</span>
                    <a>Engedélyek</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">account_circle</span>
                    <a>Fiókom</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
            </ul>

            <div class="toggle_btn">
                <i class="fa-solid fa-bars"></i>            
            </div>
        </div>
        <div class="dropdown_menu">
                <li>
                    <span class="nav-icon material-symbols-rounded">home</span>
                    <a>Új értékelés</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">widgets</span>
                    <a>Értékeim</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">quiz</span>
                    <a >GYIK</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">finance_chip</span>
                    <a>Engedélyek</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">account_circle</span>
                    <a>Fiókom</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
                <div class="mobillogo">
                    <div id="mobillogokulso"></div>
                    <div id="mobillogobelso"><span class="gold">É</span>RTÉKEK</div>
                </div> 
        </div>
    </aside>
    `,
    view: `
     <aside>
        <div class="navbar">
            <div class="motto"><a href="#">...értékről értékre</a></div>
            <ul class="links">
                <li>
                    <span class="nav-icon material-symbols-rounded">home</span>
                    <a href="/user/dashboard.html">ÉRtÉKEIM</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded ertekelesek">preview</span>
                    <a class="ertekelesek">Nézet</a>
                </li>
                <li class="diagrammok">
                    <span class="nav-icon material-symbols-rounded">pie_chart</span>
                    <button>Diagramm Be-Ki</button>
                </li>
                <li class="navment">
                    <span class="nav-icon material-symbols-rounded">picture_as_pdf</span>
                    <a>PDF</a>
                </li>
                <li class="navnyom">
                    <span class="nav-icon material-symbols-rounded">print</span>
                    <a>Nyomtatás</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">quiz</span>
                    <a>GYIK</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
            </ul>

            <div class="toggle_btn">
                <i class="fa-solid fa-bars"></i>            
            </div>
        </div>
        <div class="dropdown_menu">
                       <li>
                    <span class="nav-icon material-symbols-rounded">home</span>
                    <a href="/user/dashboard.html">ÉRtÉKEIM</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded ertekelesek">preview</span>
                    <a class="ertekelesek">Nézet</a>
                </li>
                <li class="diagrammok">
                    <span class="nav-icon material-symbols-rounded">pie_chart</span>
                    <button>Diagramm Be-Ki</button>
                </li>
                <li class="navment">
                    <span class="nav-icon material-symbols-rounded">picture_as_pdf</span>
                    <a>PDF</a>
                </li>
                <li class="navnyom">
                    <span class="nav-icon material-symbols-rounded">print</span>
                    <a>Nyomtatás</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">quiz</span>
                    <a>GYIK</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
                <div class="mobillogo">
                    <div id="mobillogokulso"></div>
                    <div id="mobillogobelso"><span class="gold">É</span>RTÉKEK</div>
                </div> 
        </div>
    </aside>
`,
    view2: `
   <aside>
        <div class="navbar">
            <div class="motto"><a href="#">...értékről értékre</a></div>
            <ul class="links">
                <li>
                    <span class="nav-icon material-symbols-rounded">home</span>
                    <a href="/user/dashboard.html">ÉRtÉKEIM</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded ertekelesek">preview</span>
                    <a class="ertekelesek">Nézet</a>
                </li>
                <li class="diagrammok">
                    <span class="nav-icon material-symbols-rounded">pie_chart</span>
                    <button>Diagramm Be-Ki</button>
                </li>
                <li class="pontok toggleButton">
                    <span class="nav-icon material-symbols-rounded">page_info</span>
                    <a>Pontrendszer</a>
                </li>
                <li id="nyil">
                    <span class="nav-icon material-symbols-rounded">edit</span>
                    <a>Menü</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">quiz</span>
                    <a>GYIK</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
            </ul>

            <div class="toggle_btn">
                <i class="fa-solid fa-bars"></i>            
            </div>
        </div>
        <div class="dropdown_menu">
                   <li>
                    <span class="nav-icon material-symbols-rounded">home</span>
                    <a href="/user/dashboard.html">ÉRtÉKEIM</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded ertekelesek">preview</span>
                    <a class="ertekelesek">Nézet</a>
                </li>
                <li class="diagrammok">
                    <span class="nav-icon material-symbols-rounded">pie_chart</span>
                    <button>Diagramm Be-Ki</button>
                </li>
                <li class="pontok toggleButton">
                    <span class="nav-icon material-symbols-rounded">page_info</span>
                    <a>Pontrendszer</a>
                </li>
                <li id="nyil">
                    <span class="nav-icon material-symbols-rounded">edit</span>
                    <a>Menü</a>
                </li>
                <li>
                    <span class="nav-icon material-symbols-rounded">quiz</span>
                    <a>GYIK</a>
                </li>
            <form action="/logout" method="POST">
                <li>
                    <span class="nav-icon material-symbols-rounded lepjenki">logout</span>
                    <span class="nav-label"><button type="submit">Kijelentkezés</button></span>
                </li>
            </form>
                <div class="mobillogo">
                    <div id="mobillogokulso"></div>
                    <div id="mobillogobelso"><span class="gold">É</span>RTÉKEK</div>
                </div> 
        </div>
    </aside>
    `
};