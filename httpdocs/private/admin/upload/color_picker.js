// color_picker.js

function applyStyles(element, styles) {
    Object.assign(element.style, styles);
    return element;
}

function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);

    if (options.id) element.id = options.id;
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = String(options.text ?? '');
    if (options.type) element.type = options.type;
    if (options.value !== undefined) element.value = String(options.value ?? '');
    if (options.htmlFor) element.htmlFor = options.htmlFor;
    if (options.styles) applyStyles(element, options.styles);

    return element;
}

function normalizeHexColor(value, fallback = '#ffffff') {
    const clean = String(value || '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(clean) ? clean : fallback;
}

function normalizePreviewBackground(value, fallback = '#ffffff') {
    const clean = String(value || '').trim();

    if (/^#[0-9a-fA-F]{6}$/.test(clean)) return clean;
    if (/^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/.test(clean)) return clean;
    if (/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/.test(clean)) return clean;

    return fallback;
}

export class ColorPicker {
    // --- Színkonvertáló Helpelek (Ugyanaz a matek, mint a szamitasok.js-ben) ---
    static rgbToHex(rgbStr) {
        if (!rgbStr || rgbStr.startsWith('#')) return normalizeHexColor(rgbStr, '#ffffff');
        const match = String(rgbStr).match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return '#ffffff';
        const r = Math.max(0, Math.min(255, parseInt(match[1], 10))).toString(16).padStart(2, '0');
        const g = Math.max(0, Math.min(255, parseInt(match[2], 10))).toString(16).padStart(2, '0');
        const b = Math.max(0, Math.min(255, parseInt(match[3], 10))).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
    }

    static hexToRgb(hex) {
        let r = 0, g = 0, b = 0;
        const safeHex = normalizeHexColor(hex, '#000000');
        if (safeHex.length === 7) {
            r = parseInt(safeHex.substring(1, 3), 16);
            g = parseInt(safeHex.substring(3, 5), 16);
            b = parseInt(safeHex.substring(5, 7), 16);
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
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    static kalkulaldDiagramSzineket(hexColor, numSegments) {
        const safeHexColor = normalizeHexColor(hexColor, '#ffffff');
        const [r, g, b] = this.hexToRgb(safeHexColor);
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
            const hexSzin = normalizeHexColor(this.rgbToHex(jelenlegiHatter), '#ffffff');
            const previewBackground = normalizePreviewBackground(jelenlegiHatter, hexSzin);

            const overlay = createElement('div', { className: 'color-picker-overlay' });

            const modal = createElement('div', { className: 'color-picker-modal' });
            // Picit szélesebb modal, hogy elférjen a diagram is
            modal.style.width = 'fit-content';

            const title = createElement('h3', {
                className: 'color-picker-title',
                text: 'Témakör színének módosítása'
            });

            const previewWrapper = createElement('div', { className: 'minta' });

            const cardColumn = createElement('div', { className: 'minta_k' });
            const cardLabel = createElement('p', {
                className: 'color-picker-preview-label',
                text: 'Kártya:'
            });

            const previewCard = createElement('div', {
                id: 'live-preview-card',
                className: 'category fo color-picker-preview-card',
                styles: {
                    background: previewBackground,
                    minHeight: '100px'
                }
            });
            previewCard.dataset.id = String(kategoriaNev ?? '');

            const previewTitle = createElement('div', {
                className: 'cim',
                text: kategoriaNev || ''
            });

            const previewDescription = createElement('div', {
                className: 'leiras',
                text: leiras || '',
                styles: {
                    fontSize: '0.85em',
                    marginTop: '5px'
                }
            });

            previewCard.append(previewTitle, previewDescription);
            cardColumn.append(cardLabel, previewCard);

            const chartColumn = createElement('div', { className: 'minta_d' });
            const chartLabel = createElement('p', {
                className: 'color-picker-preview-label',
                text: 'Diagram (Árnyalatok):'
            });
            const chartBox = createElement('div', {
                styles: {
                    position: 'relative',
                    height: '120px',
                    width: '100%'
                }
            });
            const canvas = createElement('canvas', { id: 'picker-preview-chart' });
            chartBox.appendChild(canvas);
            chartColumn.append(chartLabel, chartBox);

            previewWrapper.append(cardColumn, chartColumn);

            const inputContainer = createElement('div', { className: 'color-picker-input-container' });
            const inputLabel = createElement('label', {
                className: 'color-picker-label',
                htmlFor: 'picker-input',
                text: 'Új szín kiválasztása:'
            });
            const input = createElement('input', {
                id: 'picker-input',
                className: 'color-picker-input',
                type: 'color',
                value: hexSzin
            });
            inputContainer.append(inputLabel, input);

            const buttonContainer = createElement('div', { className: 'color-picker-btn-container' });
            const btnMegse = createElement('button', {
                id: 'picker-megse',
                className: 'color-picker-btn-cancel',
                text: 'Mégse'
            });
            const btnOk = createElement('button', {
                id: 'picker-ok',
                className: 'color-picker-btn-save',
                text: 'Mentés'
            });
            buttonContainer.append(btnMegse, btnOk);

            modal.append(title, previewWrapper, inputContainer, buttonContainer);
            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // --- Chart.js Inicializálása a Modalban ---
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
                const ujHex = normalizeHexColor(e.target.value, hexSzin);

                // 1. Kártya háttérszín frissítése
                previewCard.style.background = ujHex;

                // 2. Chart árnyalatok frissítése
                previewChart.data.datasets[0].backgroundColor = this.kalkulaldDiagramSzineket(ujHex, dummyLabels.length);
                previewChart.update();
            });

            const close = (valasz) => {
                if (previewChart) previewChart.destroy(); // Memóriaszivárgás elkerülése
                if (overlay.parentElement) {
                    overlay.remove();
                }
                resolve(valasz);
            };

            btnMegse.addEventListener('click', () => close(null));
            btnOk.addEventListener('click', () => close(input.value));
        });
    }
}
