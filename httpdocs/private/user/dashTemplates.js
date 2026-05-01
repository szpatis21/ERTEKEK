// dashTemplates.js

export const templates = {
    'ujert': {
        main: () => ` 
            <div id="tartalom2">
                <div id="uj" class="tartdob">
                    <div id="ujinek">
                        <form action="">
                        <div class="inek">
                            <div class="gyikcim">Új értékelés indítása</div>
                    
                            <div>
                                <label for="neve">Vizsgálat neve:</label>
                                <input id="neve" type="text" required placeholder="Adja meg a vizsgálat nevét, címét">
                            </div>
                            <div>
                                <label for="idoszak">Vizsgált időszak:</label>
                                <input id="idoszak" type="text" required placeholder="Pl tanév, évszám, tárgyhó, stb">
                            </div>
                            <div>
                                <label for="megnevezes">Vizsgálat típusa:</label>
                        <input id="megnevezes" type="text" required placeholder="Pl: év végi értékelés, jelentés, stb.">
                            </div>
                        </div>
                        <div id="go" style="height:100%; flex-direction:column">
                            <div class="kijelentem">
                                <label for="kijelentem">
                                    „Nyilatkozom, hogy rendelkezem a kitöltésben érintett személyek személyes adatainak jogszerű kezeléséhez szükséges
                                    hozzájárulásokkal és tájékoztatással, továbbá tudomásul veszem, hogy ezeket saját intézményemben tárolom és dokumentálom.
                                    Amennyiben a vizsgált személy nem töltötte be 16. életévét úgy én, vagy azon intézmény/munkahely melyenek képviseletében eljárok,
                                    a gyermek törvényes képviselőjének hozzájárulásával is rendelkezem és mind a törvényes képviselő mind a gyermek felé
                                    a megfelelő tájékoztatást nyújtottam ”
                                </label>
                                <input type="checkbox" name="kijelentem" id="kijelentem">
                            </div>
                <div class="mas">
                        <div id="masik">
                                <p>Keressünk...</p>
                            </div>
                                 
                            <button id="gobut" type="submit" style="box-shadow: #ffbd1673 0px 0px 11px 11px;">
                                <span class="material-symbols-rounded">edit</span>
                                <p>Indítás</p>
                            </button>
                            
                                 <div id="egyik">
                                <p>...Értékeket</p>
                            </div>
                        </div>

                        </div>
                    </form>
                    </div>
                </div>
            </div>`,
        lapok: () => `
            <div class="info-strip">
                <div class="infocard">
                    <h3>Hogy indítok új értékelést?</h3>
                    <p>                                    
                        Az alábbi adatok a kinyomtatott/lementett értékelés Főcímét fogják képezni. Később a <span class="material-symbols-rounded">page_header</span> gomb segítségével bármikor változtathat rajta!
                        <br> Töltse ki a vizsgálatra vonatkozó adatokat, majd kattintson az <b>"Indítás"</b>  gombra. Így rögtön az értékelő modulba kerül.
                    </p>
                </div>
                
                <div class="infocard">
                    <h3>Mire jók a bekért adatok?</h3>
                    <p>                                    
                        Azon kívűl hogy a dokumentum címét képzik, a meglévő értékeléseknél, ezek alapján lehet szűrni.
                        Például: Szűrés vizsgálat típusa szerint: Az összes olyan értékelés egy helyre lesz csoportosítva amelynek a neve azonos (havi riport, negyedéves értékelés, stb)                                    </p>            
                    </p>
                </div>
                <div class="infocard">
                    <h3>Mire való a hozzájárulás?</h3>
                    <p>                                    
                        Amennyiben egy személyt értékel, hozzjáruló nyilatkozattal kell rendelkeznie, hogy az értékelés az ő tudtával és beleegyezésével történt. A hozzájárulás tényét (pipálás) rendszerenünkben rögzítjük.
                    </p>
                </div>
            </div>`
    },
    'accunt': {
        main: (d) => {
            if (d.isUser) {
                return `      
                    <div class="kontainer">
                        <div class="grid-layout">
                            <div class="main-title card">
                                <span>Jó újra látni ${d.userName}!</span>
                            </div>
                            <div class="description card">
                               <div class="icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/></svg>
                                </div>
                             <span>
                             <ul>
                                <li>${d.aktualisSzerep}</li>
                                <li>${d.intezmeny}</li>
                                <li>${d.modul_leiras}</li>
                             </ul>
                              
                                        </span>
                            </div>
                            
                            <div class="card growth">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m312-751-40-120 56-18 40 119-56 19Zm138-49v-120h60v120h-60Zm198 49-56-19 40-119 56 19-40 119ZM86-40l-12-79 211-32q11-2 19.5-9.5T317-179l34-106q5-14 0-27t-18-20l-33 104-76-24 88-278q2-6 2-13t-2-13L178-304q-16 29-44.5 46.5T72-240H40v-80h32q11 0 20.5-5.5T107-341l177-334 50 28q37 21 52.5 60.5T389-506l-31 98q44 17 63.5 60t5.5 88l-34 106q-11 32-36.5 54.5T297-72L86-40Zm788 0L663-72q-34-5-59.5-27.5T567-154l-34-106q-14-45 5.5-88t63.5-60l-31-98q-13-41 2.5-80.5T626-647l50-28 177 334q5 10 14.5 15.5T888-320h32v80h-32q-33 0-61.5-17.5T782-304L648-556q-2 6-2 13t2 13l88 278-76 24-33-104q-13 7-18 20t0 27l34 106q4 11 12.5 18.5T675-151l211 32-12 79ZM224-252Zm512 0Zm-76 24-58-180 58 180ZM358-408l-58 180 58-180Z"/></svg></div>
                                <div class="card-text-container">
                                          <span class="default-text">CSAPAT</span>
                                    <span class="alt-text">${d.azonosIntezmenyRegisztraltak} kolléga</span>
                                    
                                </div>
                            </div>

                            <div class="card analysis">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">STATISZTIKA</span>
                                        <div class="alt-text" style="text-align:left">
                                                    Legjobban sikerült értékelés:
                                                        <ul style="list-style-type: square;">
                                                            <li>${d.legjobbErtekelesNev} - ${d.legjobbErtekelesSzazalek} %</li>
                                                        </ul>
                                                        Legjobb témakör:
                                                        <ul style="list-style-type: square;">
                                                        <li>${d.kedvencKategoriaNev} (Átlag: ${d.kedvencKategoriaAtlag}%)</li>                                                            </ul>
                                        </div>                                    
                                </div>
                            </div>
                            
                            <div class="card goals">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-40q-112 0-206-51T120-227v107H40v-240h240v80h-99q48 72 126.5 116T480-120q75 0 140.5-28.5t114-77q48.5-48.5 77-114T840-480h80q0 91-34.5 171T791-169q-60 60-140 94.5T480-40Zm-36-160v-52q-47-11-76.5-40.5T324-370l66-26q12 41 37.5 61.5T486-314q33 0 56.5-15.5T566-378q0-29-24.5-47T454-466q-59-21-86.5-50T340-592q0-41 28.5-74.5T446-710v-50h70v50q36 3 65.5 29t40.5 61l-64 26q-8-23-26-38.5T482-648q-35 0-53.5 15T410-592q0 26 23 41t83 35q72 26 96 61t24 77q0 29-10 51t-26.5 37.5Q583-274 561-264.5T514-250v50h-70ZM40-480q0-91 34.5-171T169-791q60-60 140-94.5T480-920q112 0 206 51t154 136v-107h80v240H680v-80h99q-48-72-126.5-116T480-840q-75 0-140.5 28.5t-114 77q-48.5 48.5-77 114T120-480H40Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text" style="color: #ffffff;">${d.licenszTipus}</span>                                        
                                    <span class="alt-text">${d.altNapokInfo}</span>
                                </div>
                            </div>
                            <div class="card dashboards">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z"/></svg></div>
                               <div class="card-text-container">
                                    <span class="default-text">GENERÁCIÓK</span>
                                    <span class="alt-text">Még ${d.aiOsszMax} darab ai-generáció</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            } else if (d.isElemzo) {
                return `
                    <div class="kontainer">
                        <div class="grid-layout">
                            <div class="main-title card">
                                <span>Jó újra látni ${d.userName}!</span>
                            </div>
                            <div class="description card">
                               <div class="icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/></svg>
                                </div>
                             <span>
                             <ul>
                                <li>${d.aktualisSzerep}</li>
                                <li>${d.intezmeny}</li>
                                <li>${d.modul_leiras}</li>
                             </ul>
                              
                                        </span>
                            </div>
                            
                            <div class="card growth">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m312-751-40-120 56-18 40 119-56 19Zm138-49v-120h60v120h-60Zm198 49-56-19 40-119 56 19-40 119ZM86-40l-12-79 211-32q11-2 19.5-9.5T317-179l34-106q5-14 0-27t-18-20l-33 104-76-24 88-278q2-6 2-13t-2-13L178-304q-16 29-44.5 46.5T72-240H40v-80h32q11 0 20.5-5.5T107-341l177-334 50 28q37 21 52.5 60.5T389-506l-31 98q44 17 63.5 60t5.5 88l-34 106q-11 32-36.5 54.5T297-72L86-40Zm788 0L663-72q-34-5-59.5-27.5T567-154l-34-106q-14-45 5.5-88t63.5-60l-31-98q-13-41 2.5-80.5T626-647l50-28 177 334q5 10 14.5 15.5T888-320h32v80h-32q-33 0-61.5-17.5T782-304L648-556q-2 6-2 13t2 13l88 278-76 24-33-104q-13 7-18 20t0 27l34 106q4 11 12.5 18.5T675-151l211 32-12 79ZM224-252Zm512 0Zm-76 24-58-180 58 180ZM358-408l-58 180 58-180Z"/></svg></div>
                                <div class="card-text-container">
                                          <span class="default-text">${d.azonosIntezmenyRegisztraltak} fős CSAPAT</span>
                                    <span class="alt-text">${d.azonosIntezmenyElemzok} - elemző, ${d.azonosIntezmenyErtekelok} - értékelő</span>
                                    
                                </div>
                            </div>

                            <div class="card analysis">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">STATISZTIKA</span>
                                        <div class="alt-text" style="text-align:left">
                                                    Legtöbb értékelést létrehozó:
                                                        <ul style="list-style-type: square;">
                                                            <li>${d.legtobbetErtekeltNev} - ${d.legtobbetErtekeltDarab} db</li>
                                                        </ul>
                                                        Legtöbbet megosztott létrehozó:
                                                        <ul style="list-style-type: square;">
                                                        <li>${d.legtobbetMegosztottNev} -  ${d.legtobbetMegosztottDarab} db</li>                                                            </ul>
                                        </div>                                    
                                </div>
                            </div>
                            
                            <div class="card goals">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-40q-112 0-206-51T120-227v107H40v-240h240v80h-99q48 72 126.5 116T480-120q75 0 140.5-28.5t114-77q48.5-48.5 77-114T840-480h80q0 91-34.5 171T791-169q-60 60-140 94.5T480-40Zm-36-160v-52q-47-11-76.5-40.5T324-370l66-26q12 41 37.5 61.5T486-314q33 0 56.5-15.5T566-378q0-29-24.5-47T454-466q-59-21-86.5-50T340-592q0-41 28.5-74.5T446-710v-50h70v50q36 3 65.5 29t40.5 61l-64 26q-8-23-26-38.5T482-648q-35 0-53.5 15T410-592q0 26 23 41t83 35q72 26 96 61t24 77q0 29-10 51t-26.5 37.5Q583-274 561-264.5T514-250v50h-70ZM40-480q0-91 34.5-171T169-791q60-60 140-94.5T480-920q112 0 206 51t154 136v-107h80v240H680v-80h99q-48-72-126.5-116T480-840q-75 0-140.5 28.5t-114 77q-48.5 48.5-77 114T120-480H40Z"/></svg></div>
                                <div class="card-text-container">
    <span class="default-text" style="color: #ffffff;">${d.licenszTipus}</span>                                        <span class="alt-text">${d.altNapokInfo}</span>
                                </div>
                            </div>
                            <div class="card dashboards">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">GENERÁCIÓK</span>
                                    <span class="alt-text">Még ${d.aiOsszMax} darab ai-generáció</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            } else if (d.isSysAdmin) {
                return `
                    <div class="kontainer">
                        <div class="grid-layout">
                            <div class="main-title card">
                                <span>Jó újra látni ${d.userName}!</span>
                            </div>
                            <div class="description card">
                               <div class="icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/></svg>
                                </div>
                             <span>
                             <ul>
                                <li>${d.aktualisSzerep}</li>
                                <li>${d.intezmeny}</li>
                                <li>${d.modul_leiras}</li>
                             </ul>
                              
                                        </span>
                            </div>
                            
                            <div class="card growth">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m312-751-40-120 56-18 40 119-56 19Zm138-49v-120h60v120h-60Zm198 49-56-19 40-119 56 19-40 119ZM86-40l-12-79 211-32q11-2 19.5-9.5T317-179l34-106q5-14 0-27t-18-20l-33 104-76-24 88-278q2-6 2-13t-2-13L178-304q-16 29-44.5 46.5T72-240H40v-80h32q11 0 20.5-5.5T107-341l177-334 50 28q37 21 52.5 60.5T389-506l-31 98q44 17 63.5 60t5.5 88l-34 106q-11 32-36.5 54.5T297-72L86-40Zm788 0L663-72q-34-5-59.5-27.5T567-154l-34-106q-14-45 5.5-88t63.5-60l-31-98q-13-41 2.5-80.5T626-647l50-28 177 334q5 10 14.5 15.5T888-320h32v80h-32q-33 0-61.5-17.5T782-304L648-556q-2 6-2 13t2 13l88 278-76 24-33-104q-13 7-18 20t0 27l34 106q4 11 12.5 18.5T675-151l211 32-12 79ZM224-252Zm512 0Zm-76 24-58-180 58 180ZM358-408l-58 180 58-180Z"/></svg></div>
                                <div class="card-text-container">
                                          <span class="default-text">CSAPAT</span>
                                    <span class="alt-text">${d.azonosIntezmenyRegisztraltak} kolléga</span>
                                    
                                </div>
                            </div>

                            <div class="card analysis">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">STATISZTIKA</span>
                                        <div class="alt-text" style="text-align:left">
                                                    Legjobban sikerült értékelés:
                                                        <ul style="list-style-type: square;">
                                                            <li>${d.legjobbErtekelesNev} - ${d.legjobbErtekelesSzazalek} %</li>
                                                        </ul>
                                                        Legjobb témakör:
                                                        <ul style="list-style-type: square;">
                                                        <li>${d.kedvencKategoriaNev} (Átlag: ${d.kedvencKategoriaAtlag}%)</li>                                                            </ul>
                                        </div>                                    
                                </div>
                            </div>
                            
                            <div class="card goals">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M480-40q-112 0-206-51T120-227v107H40v-240h240v80h-99q48 72 126.5 116T480-120q75 0 140.5-28.5t114-77q48.5-48.5 77-114T840-480h80q0 91-34.5 171T791-169q-60 60-140 94.5T480-40Zm-36-160v-52q-47-11-76.5-40.5T324-370l66-26q12 41 37.5 61.5T486-314q33 0 56.5-15.5T566-378q0-29-24.5-47T454-466q-59-21-86.5-50T340-592q0-41 28.5-74.5T446-710v-50h70v50q36 3 65.5 29t40.5 61l-64 26q-8-23-26-38.5T482-648q-35 0-53.5 15T410-592q0 26 23 41t83 35q72 26 96 61t24 77q0 29-10 51t-26.5 37.5Q583-274 561-264.5T514-250v50h-70ZM40-480q0-91 34.5-171T169-791q60-60 140-94.5T480-920q112 0 206 51t154 136v-107h80v240H680v-80h99q-48-72-126.5-116T480-840q-75 0-140.5 28.5t-114 77q-48.5 48.5-77 114T120-480H40Z"/></svg></div>
                                <div class="card-text-container">
    <span class="default-text" style="color: #ffffff;">${d.licenszTipus}</span>                                        <span class="alt-text">${d.altNapokInfo}</span>
                                </div>
                            </div>
                            <div class="card dashboards">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">GENERÁCIÓK</span>
                                    <span class="alt-text">Még ${d.aiOsszMax} darab ai-generáció</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
             } else if (d.isAdmin) {
                return `
                    <div class="kontainer">
                        <div class="grid-layout">
                            <div class="main-title card">
                                <span>Jó újra látni ${d.userName}!</span>
                            </div>
                            <div class="description card">
                               <div class="icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M664-121q-8-2-15-7l-120-70q-14-8-21.5-21.5T500-249v-141q0-16 7.5-29.5T529-441l120-70q7-5 15-7t16-2q8 0 15.5 2.5T710-511l120 70q14 8 22 21.5t8 29.5v141q0 16-8 29.5T830-198l-120 70q-7 4-14.5 6.5T680-119q-8 0-16-2ZM287-527q-47-47-47-113t47-113q47-47 113-47t113 47q47 47 47 113t-47 113q-47 47-113 47t-113-47ZM80-160v-112q0-33 17-62t47-44q51-26 115-44t141-18h14q6 0 12 2-8 18-13.5 37.5T404-360h-4q-71 0-127.5 18T180-306q-9 5-14.5 14t-5.5 20v32h252q6 21 16 41.5t22 38.5H80Zm376.5-423.5Q480-607 480-640t-23.5-56.5Q433-720 400-720t-56.5 23.5Q320-673 320-640t23.5 56.5Q367-560 400-560t56.5-23.5ZM400-640Zm12 400Zm174-166 94 55 94-55-94-54-94 54Zm124 208 90-52v-110l-90 53v109Zm-150-52 90 53v-109l-90-53v109Z"/></svg>
                                </div>
                             <span>
                             <ul>
                                <li>${d.aktualisSzerep}</li>
                                <li>${d.intezmeny}</li>
                                <li>${d.modul_leiras}</li>
                             </ul>
                              
                                        </span>
                            </div>
                            
                            <div class="card growth">
                                <div class="icon">

<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m260-520 220-360 220 360H260ZM700-80q-75 0-127.5-52.5T520-260q0-75 52.5-127.5T700-440q75 0 127.5 52.5T880-260q0 75-52.5 127.5T700-80Zm-580-20v-320h320v320H120Zm580-60q42 0 71-29t29-71q0-42-29-71t-71-29q-42 0-71 29t-29 71q0 42 29 71t71 29Zm-500-20h160v-160H200v160Zm202-420h156l-78-126-78 126Zm78 0ZM360-340Zm340 80Z"/></svg>                                
                                </div>
                                
                                <div class="card-text-container">
                                          <span class="default-text">KATEGÓRIA</span>
                                    <span class="alt-text">${d.foKategoriaCount} Főkategória</span>
                                    
                                </div>
                            </div>

                            <div class="card analysis">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M80-120v-80h800v80H80Zm40-120v-280h120v280H120Zm200 0v-480h120v480H320Zm200 0v-360h120v360H520Zm200 0v-600h120v600H720Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">Leosztás</span>
                                        <div class="alt-text" style="text-align:left">
                                                    ${d.foKategoriaCount}: Főkategória <br>   
                                                     ${d.alKategoriaCount}: Alkategória <br>
                                                   ${d.altTemaCount}: Altéma                                                              
                                        </div>                                    
                                </div>
                            </div>
                            
                            <div class="card goals">
                                <div class="icon">
                                
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m312-751-40-120 56-18 40 119-56 19Zm138-49v-120h60v120h-60Zm198 49-56-19 40-119 56 19-40 119ZM86-40l-12-79 211-32q11-2 19.5-9.5T317-179l34-106q5-14 0-27t-18-20l-33 104-76-24 88-278q2-6 2-13t-2-13L178-304q-16 29-44.5 46.5T72-240H40v-80h32q11 0 20.5-5.5T107-341l177-334 50 28q37 21 52.5 60.5T389-506l-31 98q44 17 63.5 60t5.5 88l-34 106q-11 32-36.5 54.5T297-72L86-40Zm788 0L663-72q-34-5-59.5-27.5T567-154l-34-106q-14-45 5.5-88t63.5-60l-31-98q-13-41 2.5-80.5T626-647l50-28 177 334q5 10 14.5 15.5T888-320h32v80h-32q-33 0-61.5-17.5T782-304L648-556q-2 6-2 13t2 13l88 278-76 24-33-104q-13 7-18 20t0 27l34 106q4 11 12.5 18.5T675-151l211 32-12 79ZM224-252Zm512 0Zm-76 24-58-180 58 180ZM358-408l-58 180 58-180Z"/></svg>
                                </div>
                                
                                <div class="card-text-container">
                                <span class="default-text">Feltöltők</span>
                                    <span class="alt-text">Összesen ${d.modulAdminHozzaferes} feltöltő szerepkör</span>

                                </div>
                            </div>
                            <div class="card dashboards">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M280-160v-441q0-33 24-56t57-23h439q33 0 56.5 23.5T880-600v320L680-80H360q-33 0-56.5-23.5T280-160ZM81-710q-6-33 13-59.5t52-32.5l434-77q33-6 59.5 13t32.5 52l10 54h-82l-7-40-433 77 40 226v279q-16-9-27.5-24T158-276L81-710Zm279 110v440h280l160-160v-280H360Zm220 220Zm-40 160h80v-120h120v-80H620v-120h-80v120H420v80h120v120Z"/></svg></div>
                                <div class="card-text-container">
                                      <span class="default-text">Legnagyobb kategória: ${d.legnepszerubbKategoriaNev}</span>
                                    <span class="alt-text">Összesen ${d.legnepszerubbKategoriaDarab} kéréssel</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }

        },
        lapok: (d) => {
            if (d.isSysAdmin) {
            return `
        <div class="kontainer2">
            <div class="grid-layout admin-logs-layout">
                
                <div class="description22 card">
                    <h3 style="margin-bottom: 10px; color: #ffffff; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                        <span class="material-symbols-rounded" style="vertical-align: middle;"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H160v400Zm140-40-56-56 103-104-104-104 57-56 160 160-160 160Zm180 0v-80h240v80H480Z"/></svg></span> Rendszer Események
                    </h3>
                    <div id="minden-log-container" style="overflow-y: auto; flex-grow: 1; font-family: monospace; font-size: 0.85em; white-space: pre-wrap; line-height: 1.5; color: #333;">
                        <div class="spinner"></div> Betöltés folyamatban...
                    </div>
                </div>
                
                <div class="description23 card">
                    <h3 style="margin-bottom: 10px; color: #ff6500; font-size: 1.1rem; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
                        <span class="material-symbols-rounded" style="vertical-align: middle;"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ff6500";><path d="M320-160q-33 0-56.5-23.5T240-240v-120h120v-90q-35-2-66.5-15.5T236-506v-44h-46L60-680q36-46 89-65t107-19q27 0 52.5 4t51.5 15v-55h480v520q0 50-35 85t-85 35H320Zm120-200h240v80q0 17 11.5 28.5T720-240q17 0 28.5-11.5T760-280v-440H440v24l240 240v56h-56L510-514l-8 8q-14 14-29.5 25T440-464v104ZM224-630h92v86q12 8 25 11t27 3q23 0 41.5-7t36.5-25l8-8-56-56q-29-29-65-43.5T256-684q-20 0-38 3t-36 9l42 42Zm376 350H320v40h286q-3-9-4.5-19t-1.5-21Zm-280 40v-40 40Z"/></svg></span> Felhasználói Események
                    </h3>
                    <div id="aktivitas-log-container" style="overflow-y: auto; flex-grow: 1; font-family: sans-serif; font-size: 0.85em; line-height: 1.6; color: #333;">
                        <div class="spinner"></div> Betöltés folyamatban...
                    </div>
                </div>
                
            </div>
        </div>`;
    }else if (d.isAdmin) {
                return `
                    <div class="kontainer2">
                        <div class="grid-layout">
                            <div class="description2 card">
                                <div class="narancsinfo">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z"/></svg>
                                </div>
                                <div class="feherinfo">
                                    <div class="tipp-blokk delay-1">
                                        <span class="mozog-jobbra">... A "FELTÖLTÉS" gombra kattintva a feltöltő modulba kerül! </span>
                                        <span class="mozog-balra">... Használja a sablon generátort a gyorsabb munkához! </span>
                                    </div>
                                    <div class="tipp-blokk delay-2">
                                        <span class="mozog-jobbra">... Mesterséges inteligencia beállításokat az "A.I" menüpont alatt változtathat!</span>
                                        <span class="mozog-balra">... A sablonokat utólag is szerkeszthetni, ha elvenne vagy hozzáadna!</span>
                                    </div>
                                     <div class="tipp-blokk delay-3">
                                        <span class="mozog-balra">... A feltöltésnél és sablonoknál is a zöld pipák jelentik a mentést!</span>
                                        <span class="mozog-jobbra">... A diagrammok ki-be kapcsolhatók, a diagramm menüben!</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card growth2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m424-318 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm301.5-598.5Q510-807 510-820t-8.5-21.5Q493-850 480-850t-21.5 8.5Q450-833 450-820t8.5 21.5Q467-790 480-790t21.5-8.5ZM200-200v-560 560Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">Kérdések száma:</span>
                                    <span class="alt-text">${d.osszKerdesCount}</span>

                                </div>
                            </div>
                            
                            <div class="card goals2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M580-360q33 0 56.5-23.5T660-440q0-33-23.5-56.5T580-520q-15 0-28.5 5.5T527-500l-107-54v-12l107-54q11 9 24.5 14.5T580-600q33 0 56.5-23.5T660-680q0-33-23.5-56.5T580-760q-33 0-56.5 23.5T500-680v6l-107 54q-11-9-24.5-14.5T340-640q-33 0-56.5 23.5T260-560q0 33 23.5 56.5T340-480q15 0 28.5-5.5T393-500l107 54v6q0 33 23.5 56.5T580-360ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">Sablonok</span>
                                    <span class="alt-text">Már ${d.modulSablonCount} sablon amivel könyebb a feltöltés!</span>
                                </div>
                            </div>
                            
                            <div class="card dashboards2">
                                <div class="icon">
<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M40-240q9-107 65.5-197T256-580l-74-128q-6-9-3-19t13-15q8-5 18-2t16 12l74 128q86-36 180-36t180 36l74-128q6-9 16-12t18 2q10 5 13 15t-3 19l-74 128q94 53 150.5 143T920-240H40Zm275.5-124.5Q330-379 330-400t-14.5-35.5Q301-450 280-450t-35.5 14.5Q230-421 230-400t14.5 35.5Q259-350 280-350t35.5-14.5Zm400 0Q730-379 730-400t-14.5-35.5Q701-450 680-450t-35.5 14.5Q630-421 630-400t14.5 35.5Q659-350 680-350t35.5-14.5Z"/></svg>                                </div>
                                <div class="card-text-container">
                                    <span class="default-text"> 3 AI fajta</span>
                                    <span class="alt-text">${d.cimJellemzes}, ${d.cimFejlesztes}, ${d.cimErtekeles}</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            
    } else if (d.isElemzo) {
                return `
                    <div class="kontainer2">
                        <div class="grid-layout">
                            <div class="description2 card">
                                <div class="narancsinfo">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z"/></svg>
                                </div>
                                <div class="feherinfo">
                                    <div class="tipp-blokk delay-1">
                                        <span class="mozog-jobbra">... Kollegái Értékeléseit az "INTÉZMÉNY" menüpont alatt találja! </span>
                                        <span class="mozog-balra">... A meglévő moderálásokat az "AUDIT" menüpont alatt, állapot függően találja! </span>
                                    </div>
                                    <div class="tipp-blokk delay-2">
                                        <span class="mozog-jobbra">... Auditációra kijelölhet egyénileg vagy csoportosan!</span>
                                        <span class="mozog-balra">... Jóváhagyásról és auditációról automatikus e-mailt küldünk!</span>
                                    </div>
                                     <div class="tipp-blokk delay-3">
                                        <span class="mozog-balra">... Az értékelő saját értékelésénél látja az ön utoló üzenetét!</span>
                                        <span class="mozog-jobbra">... A diagrammok ki-be kapcsolhatók, a diagramm menüben!</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card growth2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m424-318 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm301.5-598.5Q510-807 510-820t-8.5-21.5Q493-850 480-850t-21.5 8.5Q450-833 450-820t8.5 21.5Q467-790 480-790t21.5-8.5ZM200-200v-560 560Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">Összesen ${d.globalAdminCount} értékelés</span>
                                    <span class="alt-text">Összesen ${d.globalEditorCount} megosztás </span>
                                </div>
                            </div>
                            
                            <div class="card goals2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M580-360q33 0 56.5-23.5T660-440q0-33-23.5-56.5T580-520q-15 0-28.5 5.5T527-500l-107-54v-12l107-54q11 9 24.5 14.5T580-600q33 0 56.5-23.5T660-680q0-33-23.5-56.5T580-760q-33 0-56.5 23.5T500-680v6l-107 54q-11-9-24.5-14.5T340-640q-33 0-56.5 23.5T260-560q0 33 23.5 56.5T340-480q15 0 28.5-5.5T393-500l107 54v6q0 33 23.5 56.5T580-360ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">Értékelők audit</span>
                                    <span class="alt-text">${d.globalWarmUserCount} Értékelő értékelése vár jóváhagyásra, ${d.globalHataridoUserCount} Értékelőnek kiosztott határidő</span>
                                </div>
                            </div>
                            
                            <div class="card dashboards2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440t28.5-140.5q28.5-65.5 77-114t114-77Q405-800 480-800t140.5 28.5q65.5 28.5 114 77t77 114Q840-515 840-440t-28.5 140.5q-28.5 65.5-77 114t-114 77Q555-80 480-80t-140.5-28.5ZM480-440Zm112 168 56-56-128-128v-184h-80v216l152 152ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text"> Értékelések audit</span>
                                    <span class="alt-text">${d.globalHataridoEvalCount} határidő, ${d.globalWarmEvalCount} javaslat, ${d.globalAudit2Count} jóváhagyás</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            } else {
                return `
                    <div class="kontainer2">
                        <div class="grid-layout">
                            <div class="description2 card">
                                <div class="narancsinfo">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M160-120v-375l-72 55-48-64 120-92v-124h80v63l240-183 440 336-48 63-72-54v375H160Zm80-80h200v-160h80v160h200v-356L480-739 240-556v356Zm-80-560q0-50 35-85t85-35q17 0 28.5-11.5T320-920h80q0 50-35 85t-85 35q-17 0-28.5 11.5T240-760h-80Zm80 560h480-480Z"/></svg>
                                </div>
                                <div class="feherinfo">
                                    <div class="tipp-blokk delay-1">
                                        <span class="mozog-jobbra">... Meglévő Értékeléseit az "ÉRTÉKEIM" menüpont alatt találja! </span>
                                        <span class="mozog-balra">... Új értékeléseket az "ÚJ ÉRTÉKELÉS" menüpont alatt indíthat! </span>
                                    </div>
                                    <div class="tipp-blokk delay-2">
                                        <span class="mozog-jobbra">... Módosításra jelölt értékeléseit keresse a "JAVASLATOK" menü alatt!</span>
                                        <span class="mozog-balra">... Együtt könyebb! Ossza meg munkáit kollegáival!</span>
                                    </div>
                                     <div class="tipp-blokk delay-3">
                                        <span class="mozog-balra">... Figyeljen az értékeléseken a naptár ikonra! Leadási határidőt rejtenek!</span>
                                        <span class="mozog-jobbra">... A diagrammok ki-be kapcsolhatók, a diagramm menüben!</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="card growth2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="m424-318 282-282-56-56-226 226-114-114-56 56 170 170ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm301.5-598.5Q510-807 510-820t-8.5-21.5Q493-850 480-850t-21.5 8.5Q450-833 450-820t8.5 21.5Q467-790 480-790t21.5-8.5ZM200-200v-560 560Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">${d.osszert} értékelés</span>
                                    <span class="alt-text">${d.mastolKapottEditor} megosztott, ${d.sajatLetrehozasuAdmin} saját értékelés</span>
                                </div>
                            </div>
                            
                            <div class="card goals2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M580-360q33 0 56.5-23.5T660-440q0-33-23.5-56.5T580-520q-15 0-28.5 5.5T527-500l-107-54v-12l107-54q11 9 24.5 14.5T580-600q33 0 56.5-23.5T660-680q0-33-23.5-56.5T580-760q-33 0-56.5 23.5T500-680v6l-107 54q-11-9-24.5-14.5T340-640q-33 0-56.5 23.5T260-560q0 33 23.5 56.5T340-480q15 0 28.5-5.5T393-500l107 54v6q0 33 23.5 56.5T580-360ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text">${d.osszoszt} megosztás</span>
                                    <span class="alt-text">${d.mastolKapottEditor} önnel, ${d.megosztottMasokkal} ön által megosztott értékelés</span>
                                </div>
                            </div>
                            
                            <div class="card dashboards2">
                                <div class="icon"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e8eaed"><path d="M339.5-108.5q-65.5-28.5-114-77t-77-114Q120-365 120-440t28.5-140.5q28.5-65.5 77-114t114-77Q405-800 480-800t140.5 28.5q65.5 28.5 114 77t77 114Q840-515 840-440t-28.5 140.5q-28.5 65.5-77 114t-114 77Q555-80 480-80t-140.5-28.5ZM480-440Zm112 168 56-56-128-128v-184h-80v216l152 152ZM224-866l56 56-170 170-56-56 170-170Zm512 0 170 170-56 56-170-170 56-56ZM480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720q-117 0-198.5 81.5T200-440q0 117 81.5 198.5T480-160Z"/></svg></div>
                                <div class="card-text-container">
                                    <span class="default-text"> ${d.osszhatarido} határidő</span>
                                    <span class="alt-text">${d.auditHataridok} határidő, ${d.auditFigyelmeztetesek} javaslat</span>
                                </div>
                            </div>
                        </div>
                    </div>`;
            }
        }
    },
    'fiokom': {
        main: (d) => `      
            <div class="grid">
                <div class="elso">
                    <h1>${d.fullname}</h1>
                    <p> <b>Felhasználónév: </b>${d.userName}</p>
                    <p><b>Fiók státusza: </b><span style="color: #000000; font-weight: bold;">${d.licenszTipus}</span></p>
                    
                    <p><b>Értékelhető idő (licensz lejárta):</b> <br>${d.licenszLejarat} - ${d.napokInfo}</p>
                </div>
            </div>
            <div class="info-strip">
                <div class="infocard" id="changepass">Jelszó megváltoztatása</div>
                <div style ="display:none" class="infocard" id="remove">Adatvédelmi beállítások</div>
                <div class="infocard" id="plussj">Kérelem jogosultságok bővítésére</div>
                <div class="infocard" id="deleteacc">Profil Törlése</div>
            </div>`,
        lapok: (d) => `        
            <div class="info-strip">
                <div class="infocard">
                    <h3>Intézmény</h3>
                    <p><b>${d.intezmeny}</b> - ${d.intkapmail}</p>
                </div>
                <div class="infocard">
                    <h3>Szerepkör</h3>
                    <p> ${d.leiras.replace(/^(\S+)/, '<strong>$1</strong>')}</p>
                </div>
                <div class="infocard">
                    <h3>Szakmai modulok</h3>
                    <p> ${d.modulNevek}</p>
                </div>
                <div class="infocard">
                    <h3>Elérhetőség</h3>
                    <p><b>E-mail: </b>- ${d.mailname} <br> 
                    <b>Telefonszám: </b>- ${d.tel} <br></p>
                </div>
            </div>`
    },
    'hozzaj': {
        main: (d) => {
            if (d.isElemzo) {
                return `
                 <div class="audit-tab-container">
                    <div class="audit0">
                        <div class="audit-tabs">
                            <div class="audit-tab-slider-bg"></div>
                            <button class="audit-tab-btn activex" data-index="0" data-slide="0">Jóváhagyásra váró</button>
                            <button class="audit-tab-btn" data-index="1" data-slide="1">Határidős értékelések</button>
                            <button class="audit-tab-btn" data-index="2" data-slide="2">Jóváhagyott</button>
                        </div>
                        <div id="tomlo">
                            <div class="search-bar">
                                <span class="material-symbols-rounded search-icon">search</span>
                                <div class="belsosearch">
                                    <select id="kereso-tipus" class="search-select">
                                        <option value="nev">Név</option>
                                        <option value="idoszak">Időszak</option>
                                        <option value="megnevezes">Típus</option>
                                        <option value="all">Mind</option>
                                    </select>
                                    <input type="text" id="kereso" class="search-input" placeholder="Keresés...">
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="tartalom2" class="audit-content-wrapper">
                        <div class="audit-content-slider" id="auditSlider">
                            <div class="audit-slide audit-slider-panel">
                                <div class="audit-lista">
                                    <div class="audit-list-container">
                                        <div class="inner-div-notok"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="audit-slide audit-slider-panel">
                                <div class="audit-lista">
                                    <div class="audit-list-container">
                                        <div class="inner-div-hatarido"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="audit-slide audit-slider-panel">
                                <div class="audit-lista">
                                    <div class="audit-list-container">
                                        <div class="inner-div-ok"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            } else {
                return `
                <div id="tartalom2">
                    <div class="audit-slider-controls audit0">
                     <div class="audit-tabs">
                        <button class="audit-tab-btn activex" data-slide="0">Jóváhagyásra váró</button>
                        <button class="audit-tab-btn" data-slide="1">Határidős értékelések</button>
                        <button class="audit-tab-btn" data-slide="2">Jóváhagyott</button>
                     </div>
    
                        <div id="tomlo">
                        <div class="search-bar">
                            <span class="material-symbols-rounded search-icon">search</span>
                            <div class="belsosearch">
                                <select id="kereso-tipus" class="search-select">
                                    <option value="nev">Név</option>
                                    <option value="idoszak">Időszak</option>
                                    <option value="megnevezes">Típus</option>
                                    <option value="all">Mind</option>
                                </select>
                                <input type="text" id="kereso" class="search-input" placeholder="Keresés...">
                            </div>
                        </div>
                     </div>
                    </div>
    
                    <div class="audit-slider-viewport">
                        <div class="audit-slider-container" id="auditSlider">
                            <div class="audit-slider-panel">
                                <div class="audit-lista">
                                    <div class="audit-list-container outer-div">
                                        <div class="inner-div inner-div-notok"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="audit-slider-panel">
                                <div class="audit-lista">
                                    <div class="audit-list-container outer-div">
                                        <div class="inner-div inner-div-hatarido"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="audit-slider-panel">
                                <div class="audit-lista">
                                    <div class="audit-list-container outer-div">
                                        <div class="inner-div inner-div-ok"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
            }
        },
        lapok: (d) => {
            if (d.isElemzo) {
                return `
                <div class="info-strip">
                    <div class="outer-div messageouter">
                        <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő</h3>

                     <div class="calendardiv" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 8px; border: 1px solid #eee; margin-bottom: 15px;">
                    <div>
                        <span style="color: gray; font-size: 0.9em;">Jelenlegi határidő:</span><br>
                        <span id="akthat" style="font-weight: bold; font-size: 1.1em; color: #ffbd16;">Nincs megadva</span>
                    </div>
                    <div id="calendar-btn" style="cursor: pointer; padding: 8px 12px; background: rgba(255, 101, 0, 0.1); border: 1px solid #ff6500; border-radius: 6px; color: #ff6500; font-weight: bold; transition: all 0.3s; display: flex; align-items: center; gap: 5px;">
                        <span class="material-symbols-rounded" style="font-size: 1.2em;">edit_calendar</span>
                        Határidő módosítása
                    </div>
                </div>

                        <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek</h3>

                        <div class="inner-div messengerdiv">
                            <p style="text-align:center; color:gray; padding: 20px;">Válasszon ki egy értékelést a jóváhagyott, vagy jóváhagysára váró értékelések közül a hozzájuktartozó információk megtekintéséhez.</p>
                        </div>
                        
                        <div class="audit-input-area">
                            <input type="text" id="audit-msg-input" placeholder="Üzenet írása...">
                            <div>   
                                <button id="audit-msg-send">Küldés</button>
                            </div>
                        </div>
                        <div class="audit-input-area">
                            <button id="audit-approve-btn">Értékelés Jóváhagyása</button>
                        </div>
                    </div>
                </div>`;
            } else {
                return `
                 <div class="info-strip">
                    <div class="outer-div messageouter">
                        <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó határidő</h3>

                        <div class="calendardiv">
                            <div>
                                <span>Határidő:</span> 
                                <span id="akthat">Nincs megadva</span>
                            </div>
                        </div>

                        <h3 id="audit-chat-title"> <span class="ertnev">Kiválasztott</span> értékeléséhez tartozó üzenetek</h3>

                        <div class="inner-div messengerdiv">
                            <p style="text-align:center; color:gray; padding: 20px;">Válasszon ki egy értékelést a jóváhagyott, vagy jóváhagysára váró értékelések közül a hozzájuktartozó információk megtekintéséhez.</p>
                        </div>
                        
                        <div class="audit-input-area">
                            <input type="text" id="audit-msg-input" placeholder="Üzenet írása...">
                            <div>   
                                <button id="audit-msg-send2">Küldés</button>
                            </div>
                        </div>
                        <div class="audit-input-area">
                        </div>
                    </div>
                </div>`;
            }
        }
    },
    'ujany': {
        main: () => ` 
            <div id="tartalom2">
                <div id="ujinek">
                    <div class="info-strip">
                        <div class="infocard" style='font-size:small;'>
                            <h3>Teremtsünk Értékeket</h3>
            
                            <p style="font-weight:normal">Az indítás gombra kattintva van lehetősége feltölteni a saját szakmai anyagát,
                                vagy bővíteni a már meglévő anyagot.
                                </p> <br>
                            </p>
                        </div>
                    </div>
                    

                    <div class="mas">
                        <div style="margin-top:6vh" id="masik">
                            <p>Teremtsünk...</p>
                        </div>
                     
                        <button class="gobut5" style="box-shadow: #ffbd1687 0px 0px 35px 25px;">
                            <a href="../upload.html" >
                                
                                <p class="na" style="color: #4b5563;">Indítás</p>
                            </a>
                       </button>  

                        <div id="egyik" style="margin-top:3vh">
                            <p>...Értékeket</p>
                        </div>
                    </div>                            
            </div>
            <div class="info-strip">
                    <div class="infocard">
                        <p> Ha belépett a feltöltő és tesztelő felületre, hozhat létre:  </p>
                        <p style="display: flex; flex-direction:column;">  
                                    <p>- Fő-kategóriákat</p> 
                                    <p>- Al-kategóriákat</p>    
                                    <p>- Hozzá tartozó témákat</p>    
                                    <p>- Kérdéseket</p>    
                                    <p>- és hozzá tartozó alkérdéseket</p>    
                        </p>
                            <p> továbbá tesztelheti a feltöltött kérdéseket pontszámozás és diagramm megjelenítés szempontjából.</p> 
                            <br> 
                    </div>
            </div>
        </div>`,
        lapok: () => `
            <div class="info-strip">
                <div class="infocard">
                    <h3>Hogy töltök fel új anyagokat?</h3>
                    <p>                                    
                       Az "Indítás" gombra kattintva átugri a feltöltő és tesztelő felületre. 
                       Itt lesz lehetősége új anyagokat rögzíteni különböző kategóriákon belül.
                    </p>
                </div>
                <div class="infocard">
                    <h3>Hol fogom látni a létrehozott kérdésköröket?</h3>
                    <p>                                    
                        Létrehozás csak pár kattintás a szöveg és pontszámok megadása után, és mind az értékelő mind az adminisztrációs felületen megjelennek az új kategóriák dobozai vagy a kérdések.
                    </p>
                </div>
                <div class="infocard">
                    <h3>Milyen szakmai anyagot tudok feltölteni és mennyit?</h3>
                    <p>                                    
                        Korlátlanul és szabadon tölthet fel és bőívtheti a szakmai anyagát amíg a licensze érvényes. Ezeket az anyagokat ön és kollegái is látni fogják.                              
                    </p>
                </div>
                <div class="infocard">
                    <h3>Mások szakmai anyagát is láthatom?</h3>
                    <p>                                    
                     Csak ha előfizet rá és csak ha adott szakmai anyag készítői ehhez hozzájárulnak. 
                     Az ÉRTÉKEKben létre hozott anyagok alapból az ön szellemi tulajdonát képezik, más nem jogosult rájuk.   
                      </p>     
                </div>
            </div>`
    },
    'plussz': {
     main: () => `<div id="tartalom2">
                <div id="ai-beallitasok-container">
                    <h3>Mesterséges Intelligencia beállításai</h3>
                    
                    <div style="margin-bottom: 30px; padding: 15px; border: 1px solid #ccc; border-radius: 5px;">
                        <h3>Alapbeállítások</h3>
                        
                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label style="font-weight: bold;">AI Szerepköre (szerep)</label>
                            </div>
                            <span style="font-size: 0.85em; color: gray;">Milyen stílusban, kinek a nevében írjon az AI?</span><br>
                            <div style="display: flex;">
                            <input type="text" id="ai-szerep" disabled style="width: 100%; padding: 8px; background: #f4f4f4; border: 1px solid #ccc; border-radius: 4px; color: #555; transition: 0.3s;" placeholder="Szakértő pedagógiai értékelő vagy...">
                              <span class="edit-ai-field" data-target="ai-szerep" style="cursor: pointer; display: flex; align-items: center;" title="Szerkesztés">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ff6500"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                                </span>
                                </div>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <label style="font-weight: bold;">Értékelés alanya</label>
                                
                            </div>
                             <div style="display: flex; margin-top: 10px; padding-bottom: 1%; border-bottom: 1px solid grey; margin-bottom: 1%;">
                           <label style="text-align: center;font-size: small;">Készüljön egy jellemzés a:</label> 
                           <input type="text" id="ai-vizsgalt-targy" disabled style="width: 100%; padding: 8px; background: #f4f4f4; border: 1px solid #ccc; border-radius: 4px; color: #555; transition: 0.3s;" placeholder="Példa: a tanulóról">
                           <span class="edit-ai-field" data-target="ai-vizsgalt-targy" style="cursor: pointer; display: flex; align-items: center;" title="Szerkesztés">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ff6500"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                                </span> 
                           </div> 
                            <span style="font-size: 0.85em; color: gray;">Kire vagy mire vonatkozik az értékelés? Fogalmazza meg egy szóban. (Pl, készüljön egy jellemzés a: <b>tanulóról</b>, az <b>osztályról</b>, a <b>projektről</b>)</span><br>                      
                           </div>
                    </div>

                    <div style="margin-bottom: 30px; border: 1px solid #ccc; border-radius: 5px;">
                        <h3 style="margin-top:0px;">Szakmai kontextus</h3>

                        <span style="font-size: 0.85em; color: gray;">Válassza ki, hogy egy rövid kontextust, vagy egy hosszú szakmai dokumentumot vegyen alapul az AI.</span><br><br>
                        <div style="display: flex; flex-direction: column;">
                            <label style="margin-right: 20px;">
                               <div style="border-bottom: 1px solid orange;">
                                    <input type="radio" name="kontextus-tipus" value="rovid" checked>
                                    <span> Rövid kontextus </span>
                                </div>
                                <span style="font-size: small; font-style: italic;">Írja le röviden milyen szakmai irányelveket érvényesítsen a mesterséges intelligencia.</span>
                            </label>
                            <label>
                               <div style="border-bottom: 1px solid orange;">
                                    <input type="radio" name="kontextus-tipus" value="hosszu">
                                    <span>Részletes szakmai anyag</span>
                                </div>
                                <span style="font-size: small; font-style: italic;"> Írja le részletekbe menően, több oldalon keresztül a felvitt kategóriák, témák jellegzetességeit, szakmai irányelveket, fontos tudnivalókat. Bekerülési kvóta: Minimum 10 oldal.</span>
                            </label>
                        </div>
                       <div id="kontextus-rovid-div" style="margin-top: 15px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <input type="text" id="ai-kontextus" disabled style="width: 100%; padding: 8px; background: #f4f4f4; border: 1px solid #ccc; border-radius: 4px; color: #555; transition: 0.3s;" placeholder="Írjon be pár mondatot az értékelés céljáról...">
                                <span class="edit-ai-field" data-target="ai-kontextus" style="cursor: pointer; display: flex; align-items: center;" title="Szerkesztés">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ff6500"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                                </span>
                            </div>
                        </div>

                        <div id="kontextus-hosszu-div" style="margin-top: 15px; display: none;">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <textarea id="ai-szakmai-anyag" disabled rows="8" style="width: 100%; padding: 8px; background: #f4f4f4; border: 1px solid #ccc; border-radius: 4px; color: #555; transition: 0.3s;" placeholder="Ide másolhatja a hosszú szakmai irányelveket..."></textarea>
                                <span class="edit-ai-field" data-target="ai-szakmai-anyag" style="cursor: pointer; display: flex; align-items: center; margin-top: 5px;" title="Szerkesztés">
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#ff6500"><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`,
        lapok: () => `
    <div style="margin-bottom: 30px;">
                        <h3 style="margin: 0px; margin-bottom: 30px;">Generáció fajtái (Feladatok meghatározása)</h3>
                        <span style="font-size: 0.85em; color: gray;">Írja le maximum 10 mondatban, mi az, amit elvár a konkrét generálás során. A címeket és a feladatokat is a melletük lévő ceruza ikonokkal</span><br><br>

                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <div style="border: 1px solid orange; border-radius: 10px; display: flex; padding: 3px; background: #ff825729; align-items: center; gap: 10px; width: 60%;">
                                    <input type="text" id="ai-cim-jellemzes" data-is-title="true" disabled style="font-weight: bold; font-size: 1.1em; background: transparent; border: 1px solid transparent; color: #000; width: 100%; padding: 4px; transition: 0.3s; margin-left: -5px;" value="Egyéni jellemzés">
                                    <span class="edit-ai-field" data-target="ai-cim-jellemzes" style="cursor: pointer; display: flex; align-items: center;" title="Cím szerkesztése"></span>
                                </div>
                                <span class="edit-ai-field" data-target="ai-prompt-jellemzes" style="cursor: pointer; display: flex; align-items: center;" title="Feladat szerkesztése"></span>
                            </div>
                            <textarea id="ai-prompt-jellemzes" disabled rows="4" style="width: 100%; padding: 8px; background: #f4f4f4; border: 1px solid #ccc; border-radius: 4px; color: #555; transition: 0.3s;"></textarea>
                        </div>

                        <div style="margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <div style="border: 1px solid orange; border-radius: 10px; display: flex; padding: 3px; background: #ff825729; align-items: center; gap: 10px; width: 60%;">
                                    <input type="text" id="ai-cim-fejlesztes" data-is-title="true" disabled style="font-weight: bold; font-size: 1.1em; background: transparent; border: 1px solid transparent; color: #000; width: 100%; padding: 4px; transition: 0.3s; margin-left: -5px;" value="Fejlesztési terv">
                                    <span class="edit-ai-field" data-target="ai-cim-fejlesztes" style="cursor: pointer; display: flex; align-items: center;" title="Cím szerkesztése"></span>
                                </div>
                                <span class="edit-ai-field" data-target="ai-prompt-fejlesztes" style="cursor: pointer; display: flex; align-items: center;" title="Feladat szerkesztése"></span>
                            </div>
                            <textarea id="ai-prompt-fejlesztes" disabled rows="4" style="width: 100%; padding: 8px; background: #f4f4f4; border: 1px solid #ccc; border-radius: 4px; color: #555; transition: 0.3s;"></textarea>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                <div style="border: 1px solid orange; border-radius: 10px; display: flex; padding: 3px; background: #ff825729; align-items: center; gap: 10px; width: 60%;">
                                    <input type="text" id="ai-cim-ertekeles" data-is-title="true" disabled style="font-weight: bold; font-size: 1.1em; background: transparent; border: 1px solid transparent; color: #000; width: 100%; padding: 4px; transition: 0.3s; margin-left: -5px;" value="Értékelések (Eredményfókuszú)">
                                    <span class="edit-ai-field" data-target="ai-cim-ertekeles" style="cursor: pointer; display: flex; align-items: center;" title="Cím szerkesztése"></span>
                                </div>
                                <span class="edit-ai-field" data-target="ai-prompt-ertekeles" style="cursor: pointer; display: flex; align-items: center;" title="Feladat szerkesztése"></span>
                            </div>
                            <textarea id="ai-prompt-ertekeles" disabled rows="4" style="width: 100%; padding: 8px; background: #f4f4f4; border: 1px solid #ccc; border-radius: 4px; color: #555; transition: 0.3s;"></textarea>
                        </div>
                    </div>
            </div>`
    },
    'sabik': { 
        main: () => `
        <div id="tartalom2" class="sabiknak">
            <h3 style="margin-bottom:15px">Új sablonok létrehozása</h3>
            
            <div id="szerkeszto-interaktiv-terulet" style="display: flex; flex-direction: column; gap: 20px;">
            </div>
        </div>`,
        lapok: () => `
        <div id="alkerdest-szerkeszto-terulet">
            <h3 style="margin-bottom:0px">Meglévő sablonok</h3>
        </div>`
    },
     'szam': { 
        main: () => `
        <div id="tartalom2" class="sabiknak">
            <h3 style="margin-bottom:15px">Új sablonok létrehozása</h3>
            
            <div id="szerkeszto-interaktiv-terulet" style="display: flex; flex-direction: column; gap: 20px;">
            </div>
        </div>`,
        lapok: () => `
        <div id="alkerdest-szerkeszto-terulet">
            <h3 style="margin-bottom:0px">Meglévő sablonok</h3>
        </div>`
    },
     'vez': { 
        main: () => `
        <div id="tartalom2" class="sabiknak">
            <h3 style="margin-bottom:15px">Új sablonok létrehozása</h3>
            
            <div id="szerkeszto-interaktiv-terulet" style="display: flex; flex-direction: column; gap: 20px;">
            </div>
        </div>`,
        lapok: () => `
        <div id="alkerdest-szerkeszto-terulet">
            <h3 style="margin-bottom:0px">Meglévő sablonok</h3>
        </div>`
    }
};