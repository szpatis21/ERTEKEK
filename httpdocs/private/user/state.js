   export async function getUserAndLoadKitoltesek() {

        try {
            const response = await fetch('/get-username', {
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
            });
            const data = await response.json();
    
            if (data.success) {
                sajtnev.innerHTML = "&nbsp;" + data.username;

                userId = data.id; 
                fullname = data.vez;
                mailname = data.mail;
                fizetve = data.fizetve;
                int_fin = data.intfin;
                userName = data.username; 
                leiras = data.leiras;
                role = data.role;
                tel = data.tel;
                intezmeny = data.intnev; 
                intezmeny_id = data.int_id;
                modulId      = data.modulId;      // pl. 1
                modulNev     = data.modulNev;     // pl. "Fejlesztő"
                modulLeiras  = data.modulLeiras;
                 hozzaferhetoModulok = data.hozzaferesModulok || [];



                const holis = document.querySelector('.holvagyok')
                holis.innerHTML = modulLeiras;

              await betoltKategoriakChartSzinek(modulId);


                await loadKitoltesek();
            } else {console.error('Hiba:', data.message);}
        } catch (error) {console.error('Fetch hiba:', error);
        }
    }