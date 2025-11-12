export function hexToRgba(hex, a = 0.5) {
  if (!hex || !/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return `rgba(0,0,0,${a})`;
  // #RGB → #RRGGBB
  if (hex.length === 4) hex = '#' + hex[1]+hex[1] + hex[2]+hex[2] + hex[3]+hex[3];
  const h = hex.slice(1,7);
  const r = parseInt(h.slice(0,2), 16);
  const g = parseInt(h.slice(2,4), 16);
  const b = parseInt(h.slice(4,6), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

 export function anyColorToHex(color) {
   if (!color) return '#666666';
   if (color.startsWith('#')) {
     if (color.length === 4) return '#' + color[1]+color[1]+color[2]+color[2]+color[3]+color[3];
     return color.slice(0, 7);
   }
   const m = color.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
   if (!m) return '#666666';
   const [r,g,b] = [m[1],m[2],m[3]].map(Number);
   return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join('');
 }

export function bindNewColorPickers(root = document) {
  const colorInput = root.querySelector('#nf_szin');      // Egyetlen színválasztó
  const prev = root.querySelector('#nf_szin_preview'); // Előnézeti div
  const card = root.querySelector('#ujakbelso .fo-mini');
  const chartInput = root.querySelector('#fm_chart_color');
  const chartPrev  = root.querySelector('#nf_chart_preview');

  // A diagram színének kezelése változatlan maradhat
  if (chartInput && chartPrev) {
    const updateChart = () => chartPrev.style.background = chartInput.value;
    updateChart();
    ['input','change'].forEach(e => chartInput.addEventListener(e, updateChart));
  }

  // Ha a fő színválasztó vagy az előnézet nem létezik, ne csináljunk semmit
  if (!colorInput || !prev) return;

  // Az új, egyszerűsített "apply" függvény
  const apply = () => {
    const color = colorInput.value; // A színválasztó aktuális értéke
    prev.style.background = color;  // Az előnézet hátterének beállítása
    if (card) card.style.background = color; // Az új kártya hátterének élő frissítése
    prev.dataset.color = color;     // A szín elmentése a datasetbe a későbbi feldolgozáshoz
  };

  apply(); // Azonnali alkalmazás a kezdeti értékkel
  ['input', 'change'].forEach(evt => {
    colorInput.addEventListener(evt, apply);
  });
}