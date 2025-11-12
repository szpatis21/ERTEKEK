//Előre bekészített blokkok   
   

    //Generáció 1 - a már kitöltött divekből
    export function generateAlkerdesHTML(alk) {
    return `
    <div id="parent_from">
        <input type="hidden" id="parentId" name="parentId" value="${alk.id || ''}" readonly>
    </div>
    <div id="alkerdesek">
        <div class="alize">
            <label for="valasz_ag">Megjelenés, ha:</label>
            <select name="valasz_ag">
                <option value="igen" ${alk.valasz_ag === "igen" ? "selected" : ""}>Igen</option>
                <option value="nem" ${alk.valasz_ag === "nem" ? "selected" : ""}>Nem</option>
            </select>
            <span class="material-symbols-rounded kuka">delete</span>
        </div>
        <div class="alize rows">
            <label for="al_kerdesSzoveg">Alkérdés szövege:</label>
            <textarea name="al_kerdesSzoveg" class="al_kerdesSzoveg">${alk.kerdes_szoveg || ''}</textarea>
        </div>
        <div id="al_negaltkerdesdiv" class="alize rows">
            <label for="al_negaltKerdesSzoveg">Alkérdés tagadása:</label>
            <textarea name="al_negaltKerdesSzoveg" class="al_negaltKerdesSzoveg">${alk.negalt_kerdes_szoveg || ''}</textarea>
        </div>
        <div>
            <div class="alize">
                <label for="al_ertek">Pontszáma:</label>
                <textarea name="al_ertek" class="al_ertek">${alk.ertek || ''}</textarea>
            </div>
            <div class="alize">
                <label for="al_kindex">Sorszáma:</label>
                <textarea name="al_kindex" class="al_kindex">${alk.kindex || ''}</textarea>
            </div>
        </div>
        <div>
            <div class="alize">
                <label for="al_szoveges">Szerkeszthető?</label>
                <input id="al_szoveges" type="checkbox" name="al_szoveges" ${alk.szoveges ? 'checked' : ''}>
            </div>
            <div class="alize">
                <label for="al_maxi">Maximalizál?</label>
                <input id="al_maxi" type="checkbox" name="al_maxi" ${alk.maximalis_szint ? 'checked' : ''}>
            </div>
        </div>
        
    </div>`;
    }
    //Generáció vol 2 - Sima üres hozzáad
    export const alhozzadinnerHTML=`
                                <div id="parent_from">
                                    <input type="hidden" id="parentId" name="parentId">
                                </div>
                                <div id="alkerdesek">
                                    <div class="alize">
                                        <label for="valasz_ag">Megjelenés, ha:</label>
                                        <select name="valasz_ag">
                                            <option value="igen">Igen</option>
                                            <option value="nem">Nem</option>
                                        </select>
                                        <span class="material-symbols-rounded kuka2">delete</span>
                                    </div>
                                    
                                    <div class="alize rows" >
                                        <label for="al_kerdesSzoveg">Alkérdés szövege:</label>
                                        <textarea name="al_kerdesSzoveg" class="al_kerdesSzoveg"></textarea>
                                    </div>
                                    <div id="al_negaltkerdesdiv" class="alize rows">
                                        <label for="al_negaltKerdesSzoveg">Alkérdés tagadása:</label>
                                        <textarea name="al_negaltKerdesSzoveg" class="al_negaltKerdesSzoveg"></textarea>
                                    </div>
                                    <div>
                                    <div class="alize">
                                        <label for="al_ertek">Pontszáma:</label>
                                        <input type="number" class="al_ertek" name="al_ertek">
                                    </div>
                                    <div class="alize">
                                        <label for="al_kindex">Sorszám:</label>
                                        <input type="number" class="al_kindex" name="al_kindex">
                                    </div>
                                </div>
                                <div>
                                                <div class="alize">
                                                    <label for="al_szoveges">Szerkeszthető?</label>
                                                    <input id="al_szoveges" type="checkbox" name="al_szoveges">
                                                </div>
                                                <div class="alize">
                                                    <label for="al_maxi">Maximalizál?</label>
                                                    <input id="al_maxi" type="checkbox" name="al_maxi">
                                                </div>
                                            </div>
                                </div>
                `;
            
    //Generáció 3 - Sablonokhoz
                export function alkerdesBlokk({ szoveg, ertek, valasz_ag, szoveges, sorszam }) {
                const div = document.createElement('div');
                div.classList.add('alok');
                
                div.innerHTML = `
                    <div id="parent_from">
                    <input type="hidden" name="parentId">
                    </div>
                
                    <div id="alkerdesek">
                    <div class="alize">
                        <label>Megjelenés, ha:</label>
                        <select name="valasz_ag">
                        <option value="igen" ${valasz_ag === 'igen' ? 'selected' : ''}>Igen</option>
                        <option value="nem"  ${valasz_ag === 'nem'  ? 'selected' : ''}>Nem</option>
                        </select>
                        <span class="material-symbols-rounded kuka2">delete</span>

                    </div>
                
                    <div class="alize rows">
                        <label>Alkérdés szövege:</label>
                        <textarea name="al_kerdesSzoveg" class="al_kerdesSzoveg">${szoveg}</textarea>
                    </div>
                
                    <div class="alize rows" id="al_negaltkerdesdiv">
                        <label>Alkérdés tagadása:</label>
                        <textarea name="al_negaltKerdesSzoveg" class="al_negaltKerdesSzoveg"></textarea>
                    </div>
                
                    <div>
                        <div class="alize">
                        <label>Pontszáma:</label>
                        <input type="number" class="al_ertek" name="al_ertek" value="${ertek}">
                        </div>
                
                        <div class="alize">
                        <label>Sorszám:</label>
                        <input type="number" class="al_kindex" name="al_kindex" value="${sorszam}">
                        </div>
                    </div>
                <div>
                    <div class="alize">
                        <label>Szerkeszthető?</label>
                        <input type="checkbox" name="al_szoveges" ${szoveges ? 'checked' : ''}>
                    </div>
                
                    <div class="alize">
                        <label>Maximalizál?</label>
                        <input type="checkbox" name="al_maxi">
                    </div>
                </div>
                    </div>`;
                return div;
                }