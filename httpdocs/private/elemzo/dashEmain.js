import { loadInfoAndInit } from '../info/infoLoader.js';
import { initOlvas } from '/user/dashCRUD.js';


console.log("Elemző modul aktív");

// Globális változók, amiket később más modulok is használhatnak
export let modulId, modulNev, modulLeiras, userId, userName, intezmeny, intezmeny_id;

// Betöltés indul
loadInfoAndInit();
getUserAndLoadAllKitoltesek();

async function getUserAndLoadAllKitoltesek() {
    try {
        const res = await fetch('/get-username');
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        modulId = data.modulId;
        modulNev = data.modulNev;
        modulLeiras = data.modulLeiras;
        userId = data.id;
        userName = data.username;
        intezmeny = data.intnev;
        intezmeny_id = data.int_id;

        document.querySelector("#sajatnev").innerHTML = "&nbsp;" + userName;
        document.querySelector('.holvagyok').innerHTML = modulLeiras;

        await loadAllKitoltesek();

    } catch (error) {
        console.error('Hiba az adatok betöltése során:', error);
    }
}

async function loadAllKitoltesek() {
    try {
        const url = `/api/get-kitoltesek?intezmeny_id=${intezmeny_id}&modul_id=${modulId}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        const kitoltesek = data.kitoltesek;


        if (!kitoltesek.length) {
            document.querySelector(".inner-div").innerHTML =
                '<p style="font-family: auto; color: white; font-style: italic;">' + 
                'Még nincsenek intézményi értékelések ebben a modulban.</p>';
            return;
        }

        const letrehozva = new Date().toISOString().split('T')[0];
        
      const adminKitoltesek = kitoltesek.filter(k => k.role === 'admin');
      initOlvas(adminKitoltesek, letrehozva, { groupByCreator: true });


    } catch (error) {
        console.error('Hiba az intézményi kitöltések betöltése során:', error);
    }
}
