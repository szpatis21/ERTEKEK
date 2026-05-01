// color_picker.js

export class ColorPicker {
    // --- Színkonvertáló Helpelek (Ugyanaz a matek, mint a szamitasok.js-ben) ---
    static rgbToHex(rgbStr) {
        if (!rgbStr || rgbStr.startsWith('#')) return rgbStr || '#ffffff';
        const match = rgbStr.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return '#ffffff';
        const r = parseInt(match[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(match[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(match[3], 10).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    static hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        if (hex.length === 7) {
            r = parseInt(hex.substring(1, 3), 16);
            g = parseInt(hex.substring(3, 5), 16);
            b = parseInt(hex.substring(5, 7), 16);
        }
        return [r, g, b];
    }

    static rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return [h, s, l];
    }

    static hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) { r = g = b = l; }
        else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    static kalkulaldDiagramSzineket(hexColor, numSegments) {
        const [r, g, b] = this.hexToRgb(hexColor);
        const [h, s, l] = this.rgbToHsl(r, g, b);
        
        const backgroundColors = [];
        for (let index = 0; index < numSegments; index++) {
            // Ez pontosan az a kalkuláció, amit a szamitasok.js letrehozAlkategoriaChart csinál
            const lightnessStep = 0.4 / (numSegments || 1); 
            const newL = Math.max(0.1, Math.min(0.9, l + (index * lightnessStep) - 0.2)); 
            const [newR, newG, newB] = this.hslToRgb(h, s, newL);
            backgroundColors.push(`rgba(${newR}, ${newG}, ${newB}, 0.8)`);
        }
        return backgroundColors;
    }

    static open(kategoriaNev, leiras, jelenlegiHatter) {
        return new Promise((resolve) => {
            const hexSzin = this.rgbToHex(jelenlegiHatter);

            const overlay = document.createElement('div');
            overlay.className = 'color-picker-overlay';

            const modal = document.createElement('div');
            modal.className = 'color-picker-modal';
            // Picit szélesebb modal, hogy elférjen a diagram is
            modal.style.width = "fit-content"; 

            modal.innerHTML = `
                <h3 class="color-picker-title">
                    Témakör színének módosítása
                </h3>
                
                <div class="minta"">
                    <div class="minta_k">
                        <p class="color-picker-preview-label">Kártya:</p>
                        <div id="live-preview-card" class="category fo color-picker-preview-card" data-id="${kategoriaNev}" style="background: ${jelenlegiHatter}; min-height: 100px;">
                            <div class="cim">${kategoriaNev}</div>
                            <div class="leiras" style="font-size: 0.85em; margin-top: 5px;">${leiras}</div>
                        </div>
                    </div>
                    
                    <div class="minta_d">
                        <p class="color-picker-preview-label">Diagram (Árnyalatok):</p>
                        <div style="position: relative; height: 120px; width: 100%;">
                            <canvas id="picker-preview-chart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="color-picker-input-container">
                    <label for="picker-input" class="color-picker-label">Új szín kiválasztása:</label>
                    <input type="color" id="picker-input" class="color-picker-input" value="${hexSzin}">
                </div>

                <div class="color-picker-btn-container">
                    <button id="picker-megse" class="color-picker-btn-cancel">Mégse</button>
                    <button id="picker-ok" class="color-picker-btn-save">Mentés</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Gombok és inputok
            const input = modal.querySelector('#picker-input');
            const previewCard = modal.querySelector('#live-preview-card');
            const btnOk = modal.querySelector('#picker-ok');
            const btnMegse = modal.querySelector('#picker-megse');

            // --- Chart.js Inicializálása a Modalban ---
            const canvas = modal.querySelector('#picker-preview-chart');
            const ctx = canvas.getContext('2d');
            
            const dummyLabels = ['Alk. 1', 'Alk. 2', 'Alk. 3'];
            const dummyData = [80, 60, 95];
            
            // Létrehozunk egy minta diagramot (Alapból polarArea, mint a te rendszeredben)
            const previewChart = new Chart(ctx, {
                type: 'polarArea', // Vagy 'doughnut', ami épp a kedvenced
                data: {
                    labels: dummyLabels,
                    datasets: [{
                        data: dummyData,
                        backgroundColor: this.kalkulaldDiagramSzineket(hexSzin, dummyLabels.length),
                        borderColor: '#fff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }, // Helytakarékosság miatt elrejtjük a szövegeket
                        tooltip: { enabled: false }
                    },
                    scales: {
                        r: { ticks: { display: false } }
                    },
                    animation: { duration: 0 } // Az élő húzásnál ne ugráljon az animáció miatt
                }
            });

            // Eseményfigyelő: Szín módosítása élőben
            input.addEventListener('input', (e) => {
                const ujHex = e.target.value;
                
                // 1. Kártya háttérszín frissítése
                previewCard.style.background = ujHex;
                
                // 2. Chart árnyalatok frissítése
                previewChart.data.datasets[0].backgroundColor = this.kalkulaldDiagramSzineket(ujHex, dummyLabels.length);
                previewChart.update();
            });

            const close = (valasz) => {
                if (previewChart) previewChart.destroy(); // Memóriaszivárgás elkerülése
                document.body.removeChild(overlay);
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(null));
            btnOk.addEventListener('click', () => close(input.value));
        });
    }
}