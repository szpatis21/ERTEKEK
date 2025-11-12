import './tesztGraph.js'; 
import './tesztKerdes.js';
if (document.querySelector('#szerkeszto')) {
    // Dinamikus import
    import('../upload/updateFletch.js')
        .then(module => {
            console.log('tesztKerdes.js sikeresen betöltve.');
            // Itt hivatkozhatsz az importált modul funkcióira, ha szükséges
        })
        .catch(error => {
            console.error('Hiba a tesztKerdes.js betöltése során:', error);
        });
}


// kerdesValaszok.js
export const kerdesValaszok ={};
export const leirasok = {
    "Általános jellemzők": "Vizsgált személyek alapadatai, szociális jellemzői, egyedi jellemzői",
    "Kommunikáció és beszéd": "Készségek és képességek, kommunikáció személyekkel, családtagokkal, csoport társakkal.",
    "Reggeli és búcsúkör": "Kötött foglalkozás alatti (napkezdő és befejező) viselkedés, képességek.",
    "Szűkebb-tágabb környezet": "Van ami szűk, van ami tág",
    "Játék és szórakozás": "Kötetlen tevényenység alatti viselkedés, képességek.",
    "Mozgás nevelés": "Ez a kategória a mozgásfejlesztési tevékenységekre és gyakorlatokra összpontosít.",
    "Önkiszolgálásra nevelés": "Ez a kategória az önkiszolgálási képességek fejlesztésére koncentrál.",
}; // Itt vannak a főkategóriák alatt leírások
export const kategoriakSzinek = 
{
   "Általános jellemzők": "linear-gradient(0deg, rgba(255, 153, 0, 0) 0%, rgb(255, 193, 7) 100%)",
"Kommunikáció és beszéd": "linear-gradient(0deg, rgba(255, 135, 126, 0) 0%, rgb(255, 17, 0) 100%)",
"Reggeli és búcsúkör": "linear-gradient(0deg, rgba(234, 112, 255, 0) 0%, rgb(156, 39, 176) 100%)",
"Szűkebb-tágabb környezet": "linear-gradient(0deg, rgba(255, 124, 170, 0) 0%, rgb(233, 30, 99) 100%)",
"Játék és szórakozás": "linear-gradient(0deg, rgba(166, 118, 255, 0.42) 0%, rgb(92, 0, 255) 100%)",
"Mozgás nevelés": "linear-gradient(0deg, rgba(145, 206, 255, 0) 0%, rgb(33, 150, 243) 100%)",
"Önkiszolgálásra nevelés": "linear-gradient(0deg, rgba(139, 195, 74, 0.51) 0%, rgba(24, 157, 0, 0.89) 100%)"

}; 
export const szovegesValaszok = {}; 