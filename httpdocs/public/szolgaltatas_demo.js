(() => {
  const demoRoot = document.getElementById('szolgaltatasValodiDemo');
  if (!demoRoot) return;

  let chartInstance = null;
  let chartType = 'polarArea';
  let pdfMode = 'show';
  let groupRadarInstance = null;

  const kategoriakChartSzinek = {
    'Kommunikáció': 'rgba(255, 101, 0, 0.55)',
    'Önállóság': 'rgba(255, 189, 22, 0.58)',
    'Figyelem': 'rgba(70, 138, 70, 0.52)'
  };

  const kerdesValaszok = {
    100: 'ures',
    101: 'ures',
    102: 'ures',
    103: 'ures',
    200: 'ures',
    201: 'ures',
    202: 'ures',
    300: 'ures',
    301: 'ures',
    302: 'ures'
  };

  const kerdesek = [
    {
      id: 100,
      parentId: null,
      foKategoria: 'Kommunikáció',
      alKategoria: 'Kapcsolatfelvétel',
      altTema: 'Kezdeményezés',
      szoveg: 'Képes önállóan kapcsolatot kezdeményezni?',
      negaltKerdesSzoveg: 'Nem kezdeményez önállóan kapcsolatot.',
      ertek: 10,
      negalt_ertek: 2,
      igenAg: [101, 102],
      nemAg: [103],
      maximalis_szint: 0
    },
    {
      id: 101,
      parentId: 100,
      valaszAg: 'igen',
      foKategoria: 'Kommunikáció',
      alKategoria: 'Kapcsolatfelvétel',
      altTema: 'Kezdeményezés',
      szoveg: 'Megszólítja a társait vagy a felnőttet.',
      ertek: 5,
      negalt_ertek: 0,
      ossz_ertek: 50,
      igenAg: [],
      nemAg: [],
      maximalis_szint: 0
    },
    {
      id: 102,
      parentId: 100,
      valaszAg: 'igen',
      foKategoria: 'Kommunikáció',
      alKategoria: 'Kapcsolatfelvétel',
      altTema: 'Kezdeményezés',
      szoveg: 'A helyzethez illeszkedő választ ad.',
      ertek: 10,
      negalt_ertek: 0,
      ossz_ertek: 100,
      igenAg: [],
      nemAg: [],
      maximalis_szint: 1
    },
    {
      id: 103,
      parentId: 100,
      valaszAg: 'nem',
      foKategoria: 'Kommunikáció',
      alKategoria: 'Kapcsolatfelvétel',
      altTema: 'Kezdeményezés',
      szoveg: 'Csak közvetlen felszólításra reagál.',
      ertek: 4,
      negalt_ertek: 0,
      ossz_ertek: 35,
      igenAg: [],
      nemAg: [],
      maximalis_szint: 0
    },
    {
      id: 200,
      parentId: null,
      foKategoria: 'Önállóság',
      alKategoria: 'Feladatvégzés',
      altTema: 'Indítás és kitartás',
      szoveg: 'A tanuló önállóan megkezdi a feladatot?',
      negaltKerdesSzoveg: 'A tanuló nem kezdi meg önállóan a feladatot.',
      ertek: 10,
      negalt_ertek: 2,
      igenAg: [201, 202],
      nemAg: [],
      maximalis_szint: 0
    },
    {
      id: 201,
      parentId: 200,
      valaszAg: 'igen',
      foKategoria: 'Önállóság',
      alKategoria: 'Feladatvégzés',
      altTema: 'Indítás és kitartás',
      szoveg: 'Rövid instrukció után munkába kezd.',
      ertek: 5,
      negalt_ertek: 0,
      ossz_ertek: 50,
      igenAg: [],
      nemAg: [],
      maximalis_szint: 0
    },
    {
      id: 202,
      parentId: 200,
      valaszAg: 'igen',
      foKategoria: 'Önállóság',
      alKategoria: 'Feladatvégzés',
      altTema: 'Indítás és kitartás',
      szoveg: 'A megkezdett feladatot segítség nélkül folytatja.',
      ertek: 10,
      negalt_ertek: 0,
      ossz_ertek: 100,
      igenAg: [],
      nemAg: [],
      maximalis_szint: 0
    },
    {
      id: 300,
      parentId: null,
      foKategoria: 'Figyelem',
      alKategoria: 'Feladathelyzet',
      altTema: 'Tartósság',
      szoveg: 'Tartósan a feladathelyzetben marad?',
      negaltKerdesSzoveg: 'Gyakran kilép a feladathelyzetből.',
      ertek: 10,
      negalt_ertek: 3,
      igenAg: [301, 302],
      nemAg: [],
      maximalis_szint: 0
    },
    {
      id: 301,
      parentId: 300,
      valaszAg: 'igen',
      foKategoria: 'Figyelem',
      alKategoria: 'Feladathelyzet',
      altTema: 'Tartósság',
      szoveg: 'Legalább rövid ideig önállóan fenntartja a figyelmet.',
      ertek: 4,
      negalt_ertek: 0,
      ossz_ertek: 40,
      igenAg: [],
      nemAg: [],
      maximalis_szint: 0
    },
    {
      id: 302,
      parentId: 300,
      valaszAg: 'igen',
      foKategoria: 'Figyelem',
      alKategoria: 'Feladathelyzet',
      altTema: 'Tartósság',
      szoveg: 'Figyelme több lépéses feladatnál is fenntartható.',
      ertek: 10,
      negalt_ertek: 0,
      ossz_ertek: 100,
      igenAg: [],
      nemAg: [],
      maximalis_szint: 0
    }
  ];

  function kerdesById(id) {
    return kerdesek.find(k => Number(k.id) === Number(id));
  }

  function biztonsagosPont(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function clampSzazalek(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function szamoljFokerdesOsszErtek(parentKerdes) {
    const valasz = kerdesValaszok[parentKerdes.id];
    if (!valasz || valasz === 'ures') return null;

    const igenAg = parentKerdes.igenAg || [];
    const nemAg = parentKerdes.nemAg || [];
    const aktivAg = valasz === 'igen' ? igenAg : valasz === 'nem' ? nemAg : [];

    const hasMaxSzint = aktivAg.some(alkId => {
      const alk = kerdesById(alkId);
      return alk?.maximalis_szint == 1 && kerdesValaszok[alkId] === 'igen';
    });

    if (hasMaxSzint) return 100;

    const hasChildrenOnAktiv = aktivAg.length > 0;
    const anySelectedOnAktiv = aktivAg
      .map(kerdesById)
      .filter(Boolean)
      .some(k => kerdesValaszok[k.id] === 'igen' || kerdesValaszok[k.id] === 'nem');

    if (hasChildrenOnAktiv && !anySelectedOnAktiv) return 0;

    if (valasz === 'igen') {
      const vals = aktivAg
        .map(kerdesById)
        .filter(k => k && (kerdesValaszok[k.id] === 'igen' || kerdesValaszok[k.id] === 'nem'))
        .map(k => {
          if (kerdesValaszok[k.id] === 'igen') return Number(k.ossz_ertek);
          return (Number(k.ertek) > 0) ? (Number(k.negalt_ertek) / Number(k.ertek)) * Number(k.ossz_ertek) : 0;
        })
        .filter(Number.isFinite);

      if (vals.length) return clampSzazalek(vals.reduce((a, b) => a + b, 0) / vals.length);

      const e = Number(parentKerdes.ertek) || 0;
      const fokerdesErtekek = kerdesek
        .filter(k => !k.parentId && k.alKategoria === parentKerdes.alKategoria)
        .map(k => Number(k.ertek) || 0);
      const maxE = fokerdesErtekek.length > 1 ? Math.max(...fokerdesErtekek) : (e || 1);
      return clampSzazalek((e / maxE) * 100);
    }

    if (valasz === 'nem') {
      const igenMax = Math.max(
        0,
        ...igenAg.map(kerdesById).filter(Boolean).map(k => Number(k.ertek) || 0)
      );
      const ref = igenAg.length > 0 ? igenMax : (Number(parentKerdes.ertek) || 0);
      if (!(ref > 0)) return 0;

      const selectedNemVals = nemAg
        .map(kerdesById)
        .filter(k => k && (kerdesValaszok[k.id] === 'igen' || kerdesValaszok[k.id] === 'nem'))
        .map(k => {
          if (kerdesValaszok[k.id] === 'igen') return (Number(k.ertek) || 0) / ref * 100;
          return (Number(k.negalt_ertek) || 0) / ref * 100;
        });

      if (selectedNemVals.length) {
        return clampSzazalek(selectedNemVals.reduce((a, b) => a + b, 0) / selectedNemVals.length);
      }

      const ne = Number(parentKerdes.negalt_ertek) || 0;
      return clampSzazalek((ne / ref) * 100);
    }

    return 0;
  }

  function showGlobalTooltip(targetElement, text) {
    let tooltip = document.getElementById('global-tooltip');

    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'global-tooltip';
      tooltip.className = 'global-tooltip hidden';
      document.body.appendChild(tooltip);
    }

    tooltip.textContent = text;
    tooltip.classList.remove('hidden');

    const rect = targetElement.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
    tooltip.style.top = `${rect.top - 10}px`;
  }

  function hideGlobalTooltip() {
    document.getElementById('global-tooltip')?.classList.add('hidden');
  }

  function createIcon(name, className) {
    const icon = document.createElement('div');
    icon.className = `material-symbols-rounded ${className}`;
    icon.textContent = name;
    return icon;
  }

  function createRadioLabel({ question, value, inputClass, labelClass, iconClass, iconName, tooltipText }) {
    const label = document.createElement('label');
    label.className = labelClass;

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = `szolg-demo-valasz-${question.id}`;
    input.value = value;
    input.className = inputClass;
    input.checked = kerdesValaszok[question.id] === value;
    input.addEventListener('change', (event) => handleValaszChange(question, event.target.value, event));

    const icon = createIcon(iconName, iconClass);
    icon.addEventListener('mouseenter', () => showGlobalTooltip(icon, tooltipText));
    icon.addEventListener('mouseleave', hideGlobalTooltip);

    label.appendChild(input);
    label.appendChild(icon);
    return label;
  }

  function renderQuestion(question, target, { isChild = false } = {}) {
    const kerdesmodul = document.createElement('div');
    kerdesmodul.className = 'kerdesmodul';

    const div = document.createElement('div');
    div.className = `question${isChild ? ' szolg-demo-alkerdes' : ''}`;
    div.dataset.id = String(question.id);
    div.dataset.value = String(question.ertek || 0);

    const questionBelso = document.createElement('div');
    questionBelso.className = 'question-belso';

    const questionSzoveg = document.createElement('div');
    questionSzoveg.className = 'question-szoveg';
    questionSzoveg.textContent = question.szoveg;

    const questionCsuszka = document.createElement('div');
    questionCsuszka.className = 'question-csuszka';

    const csuszka = document.createElement('div');
    const hasNem = Boolean(question.negaltKerdesSzoveg || (question.nemAg && question.nemAg.length));
    csuszka.className = hasNem ? 'csuszka2' : 'csuszka';

    if (hasNem) {
      csuszka.appendChild(createRadioLabel({
        question,
        value: 'nem',
        inputClass: 'nem',
        labelClass: 'labelnem',
        iconClass: 'nemszoveg',
        iconName: 'close',
        tooltipText: `Nem, ${question.negaltKerdesSzoveg || question.szoveg}`
      }));
    }

    csuszka.appendChild(createRadioLabel({
      question,
      value: 'ures',
      inputClass: hasNem ? 'ures2' : 'ures',
      labelClass: hasNem ? 'labelures2' : 'labelures',
      iconClass: 'uresszoveg',
      iconName: 'settings_ethernet',
      tooltipText: 'Válasz elvetése'
    }));

    csuszka.appendChild(createRadioLabel({
      question,
      value: 'igen',
      inputClass: hasNem ? 'igen2' : 'igen',
      labelClass: hasNem ? 'labeligen2' : 'labeligen',
      iconClass: 'igenszoveg',
      iconName: 'check',
      tooltipText: `Igen, ${question.szoveg}`
    }));

    const gomboc = document.createElement('div');
    gomboc.className = 'gomboc';
    csuszka.appendChild(gomboc);

    questionCsuszka.appendChild(csuszka);
    questionBelso.appendChild(questionSzoveg);
    questionBelso.appendChild(questionCsuszka);
    div.appendChild(questionBelso);

    if (!isChild) {
      const alkerdesekContainer = document.createElement('div');
      alkerdesekContainer.className = 'alkerdeskont question-container hidden';
      alkerdesekContainer.id = `szolg-demo-alkerdesek-${question.id}`;
      div.appendChild(alkerdesekContainer);
    }

    kerdesmodul.appendChild(div);
    target.appendChild(kerdesmodul);

    updateQuestionVisual(question.id);
    return div;
  }

  function renderTextQuestion(target) {
    const wrap = document.createElement('div');
    wrap.className = 'kerdesmodul';

    const div = document.createElement('div');
    div.className = 'question szoveges-demo-question';

    const belso = document.createElement('div');
    belso.className = 'question-belso';

    const szoveg = document.createElement('div');
    szoveg.className = 'question-szoveg';
    szoveg.textContent = 'Szöveges megjegyzés';

    const textarea = document.createElement('textarea');
    textarea.className = 'service-demo-note-input';
    textarea.value = '';
    textarea.addEventListener('input', updateDemo);

    belso.appendChild(szoveg);
    belso.appendChild(textarea);
    div.appendChild(belso);
    wrap.appendChild(div);
    target.appendChild(wrap);
  }

  function updateQuestionVisual(questionId) {
    const questionElem = demoRoot.querySelector(`.question[data-id="${questionId}"]`);
    const question = kerdesById(questionId);
    if (!questionElem || !question) return;

    const valasz = kerdesValaszok[questionId] || 'ures';
    const hasNem = Boolean(question.negaltKerdesSzoveg || (question.nemAg && question.nemAg.length));
    const gomboc = questionElem.querySelector(':scope > .question-belso .gomboc');
    const kerdessav = questionElem;
    const igenszoveg = questionElem.querySelector(':scope > .question-belso .igenszoveg');
    const nemszoveg = questionElem.querySelector(':scope > .question-belso .nemszoveg');
    const uresszoveg = questionElem.querySelector(':scope > .question-belso .uresszoveg');

    questionElem.querySelectorAll(':scope > .question-belso input[type="radio"]').forEach(input => {
      input.checked = input.value === valasz;
    });

    if (hasNem) {
      if (valasz === 'ures') {
        if (gomboc) {
          gomboc.style.boxShadow = 'inset 0px 0px 3px 1px grey';
          gomboc.style.background = 'transparent';
          gomboc.style.transform = 'translate(0px, 0px) rotate(45deg)';
        }
        kerdessav.style.boxShadow = 'none';
        kerdessav.style.background = '';
        if (igenszoveg) igenszoveg.style.color = 'grey';
        if (nemszoveg) nemszoveg.style.color = 'grey';
        if (uresszoveg) uresszoveg.style.color = 'black';
      } else if (valasz === 'nem') {
        if (gomboc) {
          gomboc.style.boxShadow = 'inset 0px 0px 3px 1px red';
          gomboc.style.background = '#ff0000';
          gomboc.style.transform = 'translate(-38px, 0px) rotate(135deg)';
        }
        kerdessav.style.boxShadow = 'inset 6px 0px 1px 1px #e2000033';
        kerdessav.style.background = 'rgb(255 0 0 / 6%)';
        if (igenszoveg) igenszoveg.style.color = 'grey';
        if (nemszoveg) nemszoveg.style.color = 'white';
        if (uresszoveg) uresszoveg.style.color = 'grey';
      } else {
        if (gomboc) {
          gomboc.style.boxShadow = 'inset 0px 0px 3px 1px #88ca00';
          gomboc.style.background = 'rgb(145 204 0)';
          gomboc.style.transform = 'translate(42px, 0px) rotate(-135deg)';
        }
        kerdessav.style.boxShadow = 'inset 6px 0px 1px 1px #0d8200a3';
        kerdessav.style.background = 'rgb(48 255 0 / 8%)';
        if (igenszoveg) igenszoveg.style.color = 'white';
        if (nemszoveg) nemszoveg.style.color = 'grey';
        if (uresszoveg) uresszoveg.style.color = 'grey';
      }
    } else {
      if (valasz === 'igen') {
        if (gomboc) {
          gomboc.style.boxShadow = 'inset 0px 0px 3px 1px #88ca00';
          gomboc.style.background = 'rgb(145 204 0)';
          gomboc.style.transform = 'translate(28px, 0px) rotate(135deg)';
        }
        kerdessav.style.boxShadow = 'inset 6px 0px 1px 1px #0d8200a3';
        kerdessav.style.background = 'rgb(48 255 0 / 8%)';
        if (igenszoveg) igenszoveg.style.color = 'white';
        if (uresszoveg) uresszoveg.style.color = 'grey';
      } else {
        if (gomboc) {
          gomboc.style.boxShadow = 'inset 0px 0px 3px 1px grey';
          gomboc.style.background = 'transparent';
          gomboc.style.transform = 'translate(-20px, 0px) rotate(45deg)';
        }
        kerdessav.style.boxShadow = 'none';
        kerdessav.style.background = '';
        if (igenszoveg) igenszoveg.style.color = 'grey';
        if (uresszoveg) uresszoveg.style.color = 'black';
      }
    }
  }

  function clearBranch(parentQuestion, branch) {
    const ids = branch === 'igen'
      ? parentQuestion.nemAg || []
      : branch === 'nem'
        ? parentQuestion.igenAg || []
        : [...(parentQuestion.igenAg || []), ...(parentQuestion.nemAg || [])];

    ids.forEach(id => {
      kerdesValaszok[id] = 'ures';
      updateQuestionVisual(id);
    });
  }

  function updateChildVisibility(parentQuestion) {
    const container = document.getElementById(`szolg-demo-alkerdesek-${parentQuestion.id}`);
    if (!container) return;

    const valasz = kerdesValaszok[parentQuestion.id];
    const activeIds = valasz === 'igen'
      ? parentQuestion.igenAg || []
      : valasz === 'nem'
        ? parentQuestion.nemAg || []
        : [];

    container.replaceChildren();

    if (!activeIds.length) {
      container.classList.add('hidden');
      return;
    }

    activeIds.map(kerdesById).filter(Boolean).forEach(child => renderQuestion(child, container, { isChild: true }));
    container.classList.remove('hidden');
  }

  function handleValaszChange(question, valasz, event) {
    if (event?.isTrusted === false) return;

    kerdesValaszok[question.id] = valasz;
    updateQuestionVisual(question.id);

    if (!question.parentId) {
      clearBranch(question, valasz);
      updateChildVisibility(question);
    }

    updateDemo();
  }

  function categoryScores() {
    const foMap = new Map();

    kerdesek.filter(k => !k.parentId).forEach(parent => {
      const ertek = szamoljFokerdesOsszErtek(parent);
      const nev = parent.foKategoria || 'Kategória nélkül';
      if (!foMap.has(nev)) foMap.set(nev, []);
      foMap.get(nev).push(ertek === null ? 0 : ertek);
    });

    return [...foMap.entries()].map(([label, values]) => {
      const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      return { label, value: avg };
    });
  }

  function getChartOptions(type) {
    const isRadial = type === 'polarArea' || type === 'radar';
    const isCircular = type === 'doughnut' || type === 'pie';
    const fontConfig = { size: 9, family: 'system-ui' };

    const options = {
      devicePixelRatio: 4,
      responsive: true,
      maintainAspectRatio: false,
      layout: { padding: 2 },
      animation: {
        duration: 900,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: fontConfig,
            boxWidth: 8,
            padding: 8,
            usePointStyle: true
          }
        },
        tooltip: {
          callbacks: {
            label: context => `${context.label}: ${Math.round(context.raw)}%`
          }
        }
      },
      scales: {}
    };

    if (isRadial) {
      options.scales = {
        r: {
          beginAtZero: true,
          min: 0,
          max: 100,
          ticks: { display: true, backdropColor: 'transparent', z: 10 },
          pointLabels: { display: false },
          grid: { color: 'rgba(0,0,0,0.1)' }
        }
      };
    } else if (isCircular) {
      delete options.scales;
      options.cutout = type === 'doughnut' ? '60%' : 0;
    } else {
      options.scales = {
        y: {
          beginAtZero: true,
          min: 0,
          max: 100,
          title: { display: true, text: '%' },
          grid: { color: 'rgba(0,0,0,0.05)' }
        },
        x: {
          ticks: { display: false },
          grid: { display: false }
        }
      };
    }

    return options;
  }

  function updateChart(scores) {
    const canvas = document.getElementById('szolgaltatasDemoChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = scores.map(item => item.label);
    const data = scores.map(item => item.value);
    const colors = labels.map(label => kategoriakChartSzinek[label] || 'rgba(128, 128, 128, 0.5)');
    const ctx = canvas.getContext('2d');

    const existingChart = Chart.getChart(canvas);

    if (existingChart && existingChart.config.type === chartType) {
      existingChart.data.labels = labels;
      existingChart.data.datasets[0].data = data;
      existingChart.data.datasets[0].backgroundColor = colors;
      existingChart.options = getChartOptions(chartType);
      existingChart.update();
      chartInstance = existingChart;
      return;
    }

    if (existingChart) existingChart.destroy();

    chartInstance = new Chart(ctx, {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: 'Teljesítmény',
          data,
          backgroundColor: colors,
          borderColor: '#fff',
          borderWidth: 2,
          hoverOffset: 10
        }]
      },
      options: getChartOptions(chartType)
    });
  }

  function updateScoreRows() {
    // A korábbi narancs sávos összesítő helyét a mini PDF-előnézet vette át.
  }

  function valaszFelirat(valasz) {
    if (valasz === 'igen') return 'IGEN';
    if (valasz === 'nem') return 'NEM';
    return '';
  }

  function getKerdesMegjelenoSzoveg(question, valasz) {
    if (valasz === 'nem') return question.negaltKerdesSzoveg || `Nem teljesül: ${question.szoveg}`;
    return question.szoveg || '';
  }

  function getDemoNoteText() {
    return document.querySelector('.service-demo-note-input')?.value?.trim() || '';
  }

  function gyujtPdfSorok() {
    const csoportok = [];

    kerdesek.filter(k => !k.parentId).forEach(parent => {
      const parentValasz = kerdesValaszok[parent.id];
      if (parentValasz !== 'igen' && parentValasz !== 'nem') return;

      const aktivAg = parentValasz === 'igen' ? parent.igenAg || [] : parent.nemAg || [];
      const alkerdesek = aktivAg
        .map(kerdesById)
        .filter(Boolean)
        .map(child => {
          const childValasz = kerdesValaszok[child.id];
          if (childValasz !== 'igen' && childValasz !== 'nem') return null;

          return {
            szoveg: getKerdesMegjelenoSzoveg(child, childValasz)
          };
        })
        .filter(Boolean);

      csoportok.push({
        szoveg: getKerdesMegjelenoSzoveg(parent, parentValasz),
        vanAktivAlkerdesAg: aktivAg.length > 0,
        alkerdesek
      });
    });

    return csoportok;
  }

  function pdfKerdesCim(szoveg) {
    const clean = String(szoveg || '').trim().replace(/[?!\.]+$/, '');
    return clean ? `${clean}:` : '';
  }

  function renderPdfValaszCsoport(sor) {
    const item = document.createElement('div');
    item.className = 'service-pdf-row service-pdf-row-selected';

    const inline = document.createElement('div');
    inline.className = 'service-pdf-answer-line';

    const title = document.createElement('strong');
    title.className = 'service-pdf-answer-main';
    title.textContent = pdfKerdesCim(sor.szoveg);
    inline.appendChild(title);

    if (Array.isArray(sor.alkerdesek) && sor.alkerdesek.length > 0) {
      const childText = document.createElement('span');
      childText.className = 'service-pdf-answer-child';
      childText.textContent = sor.alkerdesek.map(alkerdes => alkerdes.szoveg).join(' · ');
      inline.appendChild(childText);
    } else if (sor.vanAktivAlkerdesAg) {
      const warning = document.createElement('span');
      warning.className = 'service-pdf-child-warning';
      warning.textContent = 'Ehhez a válaszhoz tartozik alkérdés — húzza be a kapcsolódó választ.';
      inline.appendChild(warning);
    }

    item.appendChild(inline);
    return item;
  }

  function updatePdfPreview() {
    const preview = document.getElementById('szolgaltatasPdfPreview');
    if (!preview) return;

    const sorok = gyujtPdfSorok();
    const note = getDemoNoteText();

    preview.replaceChildren();

    const meta = document.createElement('div');
    meta.className = 'service-pdf-meta';
    meta.innerHTML = '<strong>Készülő értékelés</strong>';
    preview.appendChild(meta);

    if (pdfMode === 'hide') {
      const hidden = document.createElement('div');
      hidden.className = 'service-pdf-hidden-note';
      hidden.textContent = 'A válaszok ebben a nézetben el vannak rejtve.';
      preview.appendChild(hidden);
    } else if (sorok.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'service-pdf-empty';
      empty.textContent = 'Még nincs behúzott válasz. Mozdítsa el valamelyik csúszkát.';
      preview.appendChild(empty);
    } else {
      sorok.forEach(sor => {
        preview.appendChild(renderPdfValaszCsoport(sor));
      });
    }

    if (note) {
      const textBlock = document.createElement('div');
      textBlock.className = 'service-pdf-text-block';
      textBlock.innerHTML = '<strong>Szöveges megjegyzés</strong>';

      const text = document.createElement('p');
      text.textContent = note;
      textBlock.appendChild(text);
      preview.appendChild(textBlock);
    }
  }

  function bindPdfToolbar() {
    document.querySelectorAll('[data-pdf-mode]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-pdf-mode]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        pdfMode = button.dataset.pdfMode === 'hide' ? 'hide' : 'show';
        updateDemo();
      });
    });
  }

  function updateSummary(scores = categoryScores()) {
    const total = scores.length
      ? Math.round(scores.reduce((sum, item) => sum + item.value, 0) / scores.length)
      : 0;

    const summary = document.getElementById('szolgaltatasDemoSummary');
    if (!summary) return;

    const selectedCount = Object.values(kerdesValaszok).filter(v => v === 'igen' || v === 'nem').length;
    const note = document.querySelector('.service-demo-note-input')?.value?.trim() || '';

    summary.innerHTML = `<strong>Aktuális összesített mintaérték:</strong> ${total}%. `
      + `Rögzített válaszok száma: ${selectedCount}. `
      + (note ? 'A szöveges megjegyzés külön szakmai információként kapcsolódik az eredményhez.' : 'Szöveges megjegyzés jelenleg nincs kitöltve.');
  }

  function updateDemo() {
    const scores = categoryScores();
    updateChart(scores);
    updateScoreRows(scores);
    updateSummary(scores);
    updatePdfPreview(scores);
  }

  const groupRadarLabels = ['Kommunikáció', 'Önállóság', 'Figyelem', 'Feladatvégzés', 'Szociális részvétel'];

  const groupEvaluations = [
    {
      id: 'ev-1',
      title: 'Őszi állapot',
      subtitle: 'Időszakos értékelés',
      color: 'rgba(255, 101, 0, 1)',
      fill: 'rgba(255, 101, 0, 0.16)',
      checked: true,
      values: [64, 58, 52, 61, 55]
    },
    {
      id: 'ev-2',
      title: 'Téli kontroll',
      subtitle: 'Időszakos értékelés',
      color: 'rgba(70, 138, 70, 1)',
      fill: 'rgba(70, 138, 70, 0.16)',
      checked: true,
      values: [72, 66, 63, 70, 62]
    },
    {
      id: 'ev-3',
      title: 'Tavaszi mérés',
      subtitle: 'Időszakos értékelés',
      color: 'rgba(37, 99, 235, 1)',
      fill: 'rgba(37, 99, 235, 0.14)',
      checked: false,
      values: [81, 74, 77, 78, 70]
    },
    {
      id: 'ev-4',
      title: 'Nyári fejlesztés',
      subtitle: 'Időszakos értékelés',
      color: 'rgba(168, 85, 247, 1)',
      fill: 'rgba(168, 85, 247, 0.14)',
      checked: false,
      values: [56, 69, 60, 73, 66]
    }
  ];

  function selectedGroupEvaluations() {
    return groupEvaluations.filter(item => {
      const input = document.querySelector(`[data-group-eval="${item.id}"]`);
      return input?.checked;
    });
  }

  function renderGroupTiles() {
    const container = document.getElementById('groupEvaluationTiles');
    if (!container) return;

    container.replaceChildren();

    groupEvaluations.forEach(item => {
      const label = document.createElement('label');
      label.className = 'group-evaluation-tile';
      label.style.setProperty('--tile-color', item.color);

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.groupEval = item.id;
      input.checked = item.checked;

      const title = document.createElement('strong');
      title.textContent = item.title;

      const subtitle = document.createElement('span');
      subtitle.textContent = item.subtitle;

      const avg = document.createElement('em');
      const avgValue = Math.round(item.values.reduce((sum, value) => sum + value, 0) / item.values.length);
      avg.textContent = `${avgValue}% átlag`;

      label.append(input, title, subtitle, avg);
      container.appendChild(label);
    });

    container.addEventListener('change', event => {
      if (!event.target?.matches?.('[data-group-eval]')) return;
      updateGroupRadar();
    });
  }

  function groupRadarOptions() {
    return {
      devicePixelRatio: 4,
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 700, easing: 'easeOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 10,
            font: { size: 10, family: 'system-ui' }
          }
        },
        tooltip: {
          callbacks: {
            label: context => `${context.dataset.label}: ${Math.round(context.raw)}%`
          }
        }
      },
      scales: {
        r: {
          min: 0,
          max: 100,
          beginAtZero: true,
          ticks: {
            stepSize: 20,
            backdropColor: 'transparent'
          },
          pointLabels: {
            display: true,
            font: { size: 10, family: 'system-ui' }
          },
          grid: { color: 'rgba(0,0,0,0.10)' },
          angleLines: { color: 'rgba(0,0,0,0.10)' }
        }
      }
    };
  }

  function updateGroupRadar() {
    const canvas = document.getElementById('szolgaltatasGroupRadar');
    if (!canvas || typeof Chart === 'undefined') return;

    const kijeloltek = selectedGroupEvaluations();
    const summary = document.getElementById('groupRadarSummary');

    const datasets = kijeloltek.map(item => ({
      label: item.title,
      data: item.values,
      borderColor: item.color,
      backgroundColor: item.fill,
      pointBackgroundColor: item.color,
      pointBorderColor: '#fff',
      pointRadius: 3,
      borderWidth: 2,
      fill: true,
      tension: 0.25
    }));

    const existingChart = Chart.getChart(canvas);
    if (existingChart && existingChart.config.type === 'radar') {
      existingChart.data.labels = groupRadarLabels;
      existingChart.data.datasets = datasets;
      existingChart.update();
      groupRadarInstance = existingChart;
    } else {
      if (existingChart) existingChart.destroy();
      groupRadarInstance = new Chart(canvas.getContext('2d'), {
        type: 'radar',
        data: { labels: groupRadarLabels, datasets },
        options: groupRadarOptions()
      });
    }

    if (summary) {
      if (!kijeloltek.length) {
        summary.textContent = 'Nincs kijelölt értékelés. Jelöljön be legalább egy csempét.';
      } else {
        const names = kijeloltek.map(item => item.title).join(', ');
        summary.textContent = `A diagramon jelenleg ${kijeloltek.length} kijelölt réteg látszik: ${names}.`;
      }
    }
  }

  function initGroupRadarDemo() {
    renderGroupTiles();
    updateGroupRadar();
  }

  function renderDemo() {
    const target = document.getElementById('szolgaltatasDemoKerdesek');
    if (!target) return;

    kerdesek.filter(k => !k.parentId).forEach(question => {
      renderQuestion(question, target);
      updateChildVisibility(question);
    });

    renderTextQuestion(target);
    bindPdfToolbar();

    document.querySelectorAll('[data-demo-chart-type]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-demo-chart-type]').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        chartType = button.dataset.demoChartType || 'polarArea';
        updateDemo();
      });
    });

    updateDemo();
    initGroupRadarDemo();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderDemo, { once: true });
  } else {
    renderDemo();
  }
})();
