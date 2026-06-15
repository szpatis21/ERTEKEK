// Kategóriák, kérdések, aktívvá, passzívvá tétele, elrejtése megjelenítése

import { KategoriaKezelo } from './main_quest.js';
import {
    letrehozAlkategoriaChart,
    letrehozAltTemaChart
} from './szamitasok.js';

export class Focus {

 static toggleActiveState(selectedDiv, categorySelector, onActive, onInactive) {
    const categories = Array.from(document.querySelectorAll(categorySelector));
    const isActive = selectedDiv.classList.contains('active');

    const clearReturnState = () => {
        categories.forEach(div => {
            div.classList.remove('active-returning', 'passive-returning');
            div.style.removeProperty('--return-delay');
        });
    };

    // AKTÍV ELEM VISSZAZÁRÁSA
    if (isActive) {
        clearReturnState();

        selectedDiv.classList.remove('active');
        selectedDiv.classList.add('active-returning');

        /*
          Fontos:
          Itt direkt NEM vesszük le azonnal a passive classokat.
          Ez akadályozza meg, hogy az összes többi alkategória egyszerre bevillanjon.
        */
        setTimeout(() => {
            selectedDiv.classList.remove('active-returning');

            if (!selectedDiv.classList.contains('active')) {
                onInactive();
            }

            /*
              Az onInactive nálad több helyen belső konténereket is takarít.
              Emiatt kap egy rövid időt, és csak utána engedjük vissza a passzív elemeket.
            */
            setTimeout(() => {
                categories.forEach((div, index) => {
                    div.classList.remove('passive');
                    div.classList.add('passive-returning');

                    const delay = Math.min(index * 35, 260);
                    div.style.setProperty('--return-delay', `${delay}ms`);
                });

                setTimeout(() => {
                    categories.forEach(div => {
                        div.classList.remove('passive-returning');
                        div.style.removeProperty('--return-delay');
                    });
                }, 700);
            }, 130);
        }, 190);

        return;
    }

    // ÚJ AKTÍV ELEM KIVÁLASZTÁSA
    clearReturnState();

    categories.forEach(div => {
        div.classList.remove('active', 'passive');
    });

    selectedDiv.classList.add('active');

    categories.forEach(div => {
        if (div !== selectedDiv) {
            div.classList.add('passive');
        }
    });

    onActive();
}

static szinkronizalFoPassive(selectedDiv) {
    const categories = Array.from(document.querySelectorAll('#fo_kategoriak .fo'));

    if (!selectedDiv || categories.length === 0) return;

    categories.forEach(div => {
        div.classList.remove('active-returning', 'passive-returning');
        div.style.removeProperty('--return-delay');

        if (div === selectedDiv) {
            div.classList.add('active');
            div.classList.remove('passive');
        } else {
            div.classList.remove('active');
            div.classList.add('passive');
        }
    });
}

static toggleActiveClass(selectedDiv, foKategoriaNev) {
    const tartaly = document.getElementById('fo_kategoriak');
    const categories = Array.from(document.querySelectorAll('#fo_kategoriak .fo'));
    const isActive = selectedDiv.classList.contains('active');

    /*
      Live szerveren előfordulhat, hogy ugyanaz a kattintás
      rövid időn belül kétszer fut le.
      Ilyenkor az első nyit, a második már zárna,
      és ott maradnak az alsó elemek passzív főkategória nélkül.
    */
    const most = Date.now();
    const elozoKulcs = tartaly?.dataset?.foToggleKulcs || '';
    const elozoIdo = Number(tartaly?.dataset?.foToggleIdo || 0);

    if (
        tartaly &&
        elozoKulcs === String(foKategoriaNev || '') &&
        most - elozoIdo < 220
    ) {
        return;
    }

    if (tartaly) {
        tartaly.dataset.foToggleKulcs = String(foKategoriaNev || '');
        tartaly.dataset.foToggleIdo = String(most);
    }

    /*
      FŐKATEGÓRIA BEZÁRÁSA
    */
    if (isActive) {
        if (tartaly) {
            tartaly.classList.add('fo-layout-reset');
        }

        Focus.clearSubcategories();
        Focus.elrejtiAlkategoriaDiagram();
        Focus.elrejtiAltTemaDiagram();

        categories.forEach(div => {
            div.classList.remove(
                'active',
                'passive',
                'active-returning',
                'passive-returning'
            );
            div.style.removeProperty('--return-delay');
        });

        if (tartaly) {
            tartaly.offsetHeight;

            requestAnimationFrame(() => {
                tartaly.classList.remove('fo-layout-reset');
                tartaly.classList.add('fo-returning');

                setTimeout(() => {
                    tartaly.classList.remove('fo-returning');
                }, 220);
            });
        }

        return;
    }

    /*
      FŐKATEGÓRIA NYITÁSA
      Itt direkt nem a generikus toggleActiveState-et használjuk.
      Előbb stabilan kiosztjuk az active/passive classokat,
      csak utána indulhat az alsó szintek betöltése.
    */
    categories.forEach(div => {
        div.classList.remove(
            'active',
            'passive',
            'active-returning',
            'passive-returning'
        );
        div.style.removeProperty('--return-delay');
    });

    selectedDiv.classList.add('active');
    selectedDiv.classList.remove('passive');

    categories.forEach(div => {
        if (div !== selectedDiv) {
            div.classList.remove('active');
            div.classList.add('passive');
        }
    });

    /*
      Biztonsági újraszinkron.
      Live szerveren, lassabb render / dupla event / késő DOM-módosítás esetén
      ez visszarakja a főkategória-sort a helyes állapotba.
    */
    requestAnimationFrame(() => {
        Focus.szinkronizalFoPassive(selectedDiv);
    });

    setTimeout(() => {
        Focus.szinkronizalFoPassive(selectedDiv);
    }, 120);

    setTimeout(() => {
        Focus.szinkronizalFoPassive(selectedDiv);
    }, 350);

    KategoriaKezelo.loadAlKategoriak(foKategoriaNev);
    Focus.frissitAlkategoriaDiagram(foKategoriaNev);
}

 static toggleActiveClassal(selectedDiv, alKategoriaNev) {
    const categories = document.querySelectorAll('.al');
    const isActive = selectedDiv.classList.contains('active');

    /*
      BEZÁRÁS:
      Itt nem használjuk a generikus toggleActiveState-et,
      mert az előbb visszateszi a kiválasztott elemet normál méretre,
      miközben a többi alkategória még rejtve van.
      Ez okozta a csúnya visszarántást.
    */
    if (isActive) {
        const alBlokk = selectedDiv.closest('.al-blokk');
        const direktAlKerdesTartaly = alBlokk?.querySelector('.al-direkt-kerdesek');
        const belsoAltTemaTartaly = alBlokk?.querySelector('.al-belso-alt-temak');
        const foKategoriaNev = alBlokk?.dataset.foKategoria;
        const alHozzaadasSor = alBlokk?.querySelector('.al-hozzaadas-sor');
        const tartaly = document.getElementById('al_kategoriak');

        if (tartaly) {
            tartaly.classList.add('al-layout-reset');
        }

        if (direktAlKerdesTartaly) {
            direktAlKerdesTartaly.innerHTML = '';
            direktAlKerdesTartaly.classList.add('hidden');
        }

        if (belsoAltTemaTartaly) {
            belsoAltTemaTartaly.innerHTML = '';
            belsoAltTemaTartaly.classList.add('hidden');
        }

        if (alHozzaadasSor) {
            alHozzaadasSor.remove();
        }

        Focus.alalclearSubcategories();

        /*
          Fontos:
          Előbb az összes alkategória-blokkot visszatesszük láthatóvá,
          még mielőtt az active/passive classokat levesszük.
          Így a kiválasztott alkategória nem kerül átmenetileg első helyre.
        */
        if (foKategoriaNev) {
            Focus.setFoSzintLathatosag(
                foKategoriaNev,
                true
            );
        }

        categories.forEach(div => {
            div.classList.remove('active', 'passive');
        });

        if (tartaly) {
            // Kényszerített layout-frissítés, hogy a reset állapot tényleg érvényesüljön.
            tartaly.offsetHeight;

            requestAnimationFrame(() => {
                tartaly.classList.remove('al-layout-reset');
                tartaly.classList.add('al-returning');

                setTimeout(() => {
                    tartaly.classList.remove('al-returning');
                }, 220);
            });
        }

        return;
    }

    /*
      NYITÁS:
      Ez maradhat a régi logika szerint.
    */
    Focus.toggleActiveState(
        selectedDiv,
        '.al',
        () => {
            const alBlokk = selectedDiv.closest('.al-blokk');
            const direktAlKerdesTartaly = alBlokk?.querySelector('.al-direkt-kerdesek');
            const belsoAltTemaTartaly = alBlokk?.querySelector('.al-belso-alt-temak');
            const foKategoriaNev = alBlokk?.dataset.foKategoria;

            if (foKategoriaNev) {
                Focus.setFoSzintLathatosag(
                    foKategoriaNev,
                    false,
                    {
                        selectedAlBlokk: alBlokk,
                        hideAlHozzaadasSor: false
                    }
                );
            }

            if (
                direktAlKerdesTartaly &&
                direktAlKerdesTartaly.querySelector('.kerdesmodul')
            ) {
                direktAlKerdesTartaly.classList.remove('hidden');
            }

            if (
                belsoAltTemaTartaly &&
                (
                    belsoAltTemaTartaly.querySelector('.alal') ||
                    belsoAltTemaTartaly.querySelector('.category') ||
                    belsoAltTemaTartaly.children.length > 0
                )
            ) {
                belsoAltTemaTartaly.classList.remove('hidden');
            }

            Focus.torolMasAlkategoriakBelsoAltTemait(selectedDiv);

            setTimeout(() => {
                Focus.frissitAltTemaDiagram();
            }, 200);
        },
        () => {
            // Ezt az ágat aktív alkategória bezárásakor már nem használjuk,
            // mert fent külön kezeltük.
        }
    );
}

    static toggleActiveClassalal(selectedDiv, altTemaNev) {
        Focus.toggleActiveState(
            selectedDiv,
            '.alal',
            () => {
                const utvonal = String(selectedDiv.dataset.altemaUtvonal || '');
                const [foKategoriaNev, alKategoriaNev] = utvonal.split('|');

                if (!foKategoriaNev) return;

                // Főkategória alatti közvetlen altéma
                if (!alKategoriaNev) {
                    Focus.setFoSzintLathatosag(
                        foKategoriaNev,
                        false,
                        {
                            selectedDirektAltTema: selectedDiv
                        }
                    );

                    return;
                }

                // Alkategória alatti altéma:
                // az alkategória maradjon, de a "Hozzáadás ehhez az alcsoporthoz" gomb
                // altéma-fókuszban ne maradjon látható.
                const alBlokk = selectedDiv.closest('.al-blokk');

                Focus.setFoSzintLathatosag(
                    foKategoriaNev,
                    false,
                    {
                        selectedAlBlokk: alBlokk,
                        hideAlHozzaadasSor: true
                    }
                );
            },
            () => {
                const utvonal = String(selectedDiv.dataset.altemaUtvonal || '');
                const [foKategoriaNev, alKategoriaNev] = utvonal.split('|');

                Focus.alalclearSubcategories();

                if (!foKategoriaNev) return;

                // Közvetlen főkategória alatti altéma visszazárása:
                // semmit nem renderelünk újra, csak visszamutatjuk az alap főkategória-szintet.
                if (!alKategoriaNev) {
                    Focus.setFoSzintLathatosag(
                        foKategoriaNev,
                        true
                    );

                    return;
                }

                // Alkategória alatti altéma visszazárása:
                // az alkategória fókusz marad, ilyenkor az alcsoport hozzáadás gombja újra látszódhat.
                const alBlokk = selectedDiv.closest('.al-blokk');

                Focus.setFoSzintLathatosag(
                    foKategoriaNev,
                    false,
                    {
                        selectedAlBlokk: alBlokk,
                        hideAlHozzaadasSor: false
                    }
                );
            }
        );
    }

    static setFoSzintLathatosag(foKategoriaNev, lathato, options = {}) {
        const tartaly = document.getElementById('al_kategoriak');
        if (!tartaly || !foKategoriaNev) return;

        const {
            selectedAlBlokk = null,
            selectedDirektAltTema = null,
            hideAlHozzaadasSor = false
        } = options;

        const displayValue = lathato ? '' : 'none';

        /*
          FŐKATEGÓRIA-SZINTŰ HOZZÁADÁS GOMB

          Ez volt az egyik fókuszhiba oka:
          közvetlen altéma fókuszban is látszott a "Hozzáadás ehhez a témakörhöz",
          ezért újra felajánlotta a bővebb bontást.
        */
        tartaly
            .querySelectorAll(`[data-fo-hozzaadas="${CSS.escape(foKategoriaNev)}"]`)
            .forEach(elem => {
                elem.style.display = displayValue;
            });

        /*
          Ha teljes főkategória-szintre lépünk vissza, akkor a korábbi alkategória-szintű
          hozzáadás sorokat töröljük, mert azok csak aktív alkategória mellett érvényesek.
        */
        if (lathato) {
            tartaly.querySelectorAll('.al-hozzaadas-sor').forEach(elem => {
                elem.remove();
            });
        }

        // Főkategória alatti közvetlen kérdésblokk
        const direktKerdesBlokk = tartaly.querySelector(
            `[data-fo-kozvetlen-kerdesek="${CSS.escape(foKategoriaNev)}"]`
        );

        if (direktKerdesBlokk) {
            direktKerdesBlokk.style.display = displayValue;
        }

        // Közvetlen altéma fejléc
        tartaly
            .querySelectorAll(`[data-direkt-altema-fejlec="${CSS.escape(foKategoriaNev)}"]`)
            .forEach(elem => {
                elem.style.display = displayValue;
            });

        // Alkategória blokkok
        tartaly.querySelectorAll('.al-blokk').forEach(alBlokk => {
            const alHozzaadasSor = alBlokk.querySelector('.al-hozzaadas-sor');

            if (!lathato && selectedAlBlokk && alBlokk === selectedAlBlokk) {
                alBlokk.style.display = '';

                if (alHozzaadasSor) {
                    alHozzaadasSor.style.display = hideAlHozzaadasSor ? 'none' : '';
                }

                return;
            }

            alBlokk.style.display = displayValue;

            if (alHozzaadasSor) {
                alHozzaadasSor.style.display = displayValue;
            }
        });

        // Főkategória alatti közvetlen altéma-kártyák
        tartaly.querySelectorAll('.fo-kozvetlen-altema-kartya').forEach(elem => {
            if (!lathato && selectedDirektAltTema && elem === selectedDirektAltTema) {
                elem.style.display = '';
                return;
            }

            elem.style.display = displayValue;
        });

        /*
          Közvetlen főkategória alatti altéma fókuszban nincs aktív alkategória,
          ezért sehol ne maradjon "Hozzáadás ehhez az alcsoporthoz" sor.
        */
        if (!lathato && selectedDirektAltTema) {
            tartaly.querySelectorAll('.al-hozzaadas-sor').forEach(elem => {
                elem.style.display = 'none';
            });
        }
    }

    static setFoKozvetlenSzintLathatosag(foKategoriaNev, lathato, selectedDiv = null) {
        const tartaly = document.getElementById('al_kategoriak');
        if (!tartaly || !foKategoriaNev) return;

        const displayValue = lathato ? '' : 'none';

        tartaly
            .querySelectorAll(`[data-fo-hozzaadas="${CSS.escape(foKategoriaNev)}"]`)
            .forEach(elem => {
                elem.style.display = displayValue;
            });

        if (lathato) {
            tartaly.querySelectorAll('.al-hozzaadas-sor').forEach(elem => {
                elem.remove();
            });
        } else {
            tartaly.querySelectorAll('.al-hozzaadas-sor').forEach(elem => {
                elem.style.display = 'none';
            });
        }

        const direktKerdesBlokk = tartaly.querySelector(
            `[data-fo-kozvetlen-kerdesek="${CSS.escape(foKategoriaNev)}"]`
        );

        if (direktKerdesBlokk) {
            direktKerdesBlokk.style.display = displayValue;
        }

        tartaly
            .querySelectorAll(`[data-direkt-altema-fejlec="${CSS.escape(foKategoriaNev)}"]`)
            .forEach(elem => {
                elem.style.display = displayValue;
            });

        tartaly
            .querySelectorAll('.fo-kozvetlen-altema-kartya')
            .forEach(elem => {
                if (!lathato && selectedDiv && elem === selectedDiv) {
                    elem.style.display = '';
                    return;
                }

                elem.style.display = displayValue;
            });
    }

    static torolFoKozvetlenAltemakat(foKategoriaNev) {
        const tartaly = document.getElementById('al_kategoriak');
        if (!tartaly) return;

        tartaly
            .querySelectorAll('.fo-kozvetlen-altema-kartya')
            .forEach(elem => elem.remove());

        tartaly
            .querySelectorAll(`[data-direkt-altema-fejlec="${CSS.escape(foKategoriaNev)}"]`)
            .forEach(elem => elem.remove());
    }

    static torolMasAlkategoriakBelsoAltTemait(selectedDiv) {
        document.querySelectorAll('.al-blokk').forEach(alBlokk => {
            if (alBlokk.contains(selectedDiv)) return;

            const direktAlKerdesTartaly = alBlokk.querySelector('.al-direkt-kerdesek');
            const belsoAltTemaTartaly = alBlokk.querySelector('.al-belso-alt-temak');
            const alHozzaadasSor = alBlokk.querySelector('.al-hozzaadas-sor');

            if (direktAlKerdesTartaly) {
                direktAlKerdesTartaly.innerHTML = '';
                direktAlKerdesTartaly.classList.add('hidden');
            }

            if (belsoAltTemaTartaly) {
                belsoAltTemaTartaly.innerHTML = '';
                belsoAltTemaTartaly.classList.add('hidden');
            }

            if (alHozzaadasSor) {
                alHozzaadasSor.remove();
            }
        });
    }

    static showContainer(container) {
        if (!container) return;

        container.classList.remove('hidden');
        container.classList.add('fade-in');
    }

    static hideAlKerdesek(parentId) {
        const tartaly = document.getElementById(`alkerdesek-${parentId}`);
        if (!tartaly) return;

        tartaly.innerHTML = '';
        tartaly.classList.add('hidden');
    }

    static clearElements(...elementIds) {
        elementIds.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.classList.add('hidden');
            }
        });
    }

    static clearSubcategories() {
        Focus.clearElements('al_kategoriak', 'alt_temak', 'kerdesek', 'alkerdesek');
    }

    static alclearSubcategories() {
        Focus.clearElements('alt_temak', 'kerdesek', 'alkerdesek');
    }

    static alalclearSubcategories() {
        Focus.clearElements('kerdesek', 'alkerdesek');
    }

    static frissitAlkategoriaDiagram(foKategoriaNev) {
        const foKatElem = [...document.querySelectorAll('.fo-kategoria h3')].find(
            h3 => h3.textContent.trim().startsWith(foKategoriaNev)
        );

        if (!foKatElem) return;

        const alkatDivok = [...foKatElem.parentElement.querySelectorAll('.pontF')];
        const labels = [];
        const data = [];

        alkatDivok.forEach(div => {
            const adat = div.getAttribute('data-pont-al');
            if (!adat) return;

            const [rawLabel] = adat.split(':');
            const label = rawLabel.split('/').pop().trim();
            const ertek = parseFloat(div.textContent.match(/\((\d+)%\)/)?.[1]);

            if (!isNaN(ertek)) {
                labels.push(label);
                data.push(ertek);
            }
        });

        if (labels.length && data.length) {
            window.aktivFoKategoriaNev = foKategoriaNev;
            letrehozAlkategoriaChart(labels, data);
        }
    }

    static elrejtiAlkategoriaDiagram() {
        const chartContainer = document.getElementById('alkategoriaChartContainer');

        if (chartContainer) {
            chartContainer.style.display = 'none';
        }

        window.aktivFoKategoriaNev = null;
    }

    static elrejtiAltTemaDiagram() {
        const chartContainer = document.getElementById('altTemaChartContainer');

        if (chartContainer) {
            chartContainer.style.display = 'none';
        }
    }

    static frissitAltTemaDiagram() {
        const aktivAlKatElem = document.querySelector('.al.active');

        if (!aktivAlKatElem) return;

        const cimElem = aktivAlKatElem.querySelector('.cim');
        const alKatNev = cimElem
            ? cimElem.textContent.trim()
            : aktivAlKatElem.textContent.trim();

        const trElem = [...document.querySelectorAll('tr.al-kategoria')].find(tr => {
            const td = tr.querySelector('td.al-kategoria');
            return td && td.textContent.trim() === alKatNev;
        });

        if (!trElem) return;

        const labels = [];
        const data = [];

        let nextRow = trElem.nextElementSibling;

        while (
            nextRow &&
            nextRow.classList.contains('alt-tema') &&
            !nextRow.classList.contains('fo-kozvetlen-altema')
        ) {
            const td = nextRow.querySelector('td.alt-tema');
            const pontDiv = td?.querySelector('.pontC');

            const adat = pontDiv?.getAttribute('data-pont-alt');
            const altNev = td?.childNodes[0]?.textContent.trim().replace(/:$/, '') || '';

            const ertek = parseFloat(
                pontDiv?.textContent.match(/\((\d+)%\)/)?.[1]
            );

            if (adat && altNev && !isNaN(ertek)) {
                labels.push(altNev);
                data.push(ertek);
            }

            nextRow = nextRow.nextElementSibling;
        }

        if (labels.length && data.length && window.aktivFoKategoriaNev) {
            letrehozAltTemaChart(labels, data, window.aktivFoKategoriaNev);
        } else {
            Focus.elrejtiAltTemaDiagram();
        }
    }
}