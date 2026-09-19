(() => {
  const root = document.documentElement;
  if (!root.classList.contains('js')) return;

  const reduce =
    root.classList.contains('rm') ||
    (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));

  const startWhenVisible = (el, fn) => {
    if (!el) return;
    if (el.dataset.running === '1') return;

    if (reduce || !('IntersectionObserver' in window)) {
      el.dataset.running = '1';
      fn();
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          el.dataset.running = '1';
          fn();
          io.disconnect();
          break;
        }
      },
      { threshold: 0.22, rootMargin: '0px 0px -18% 0px' }
    );

    io.observe(el);
  };

  // ---------------- Protocol search → log demo ----------------
  const proto = document.querySelector('[data-demo="protocol"]');
  if (proto) {
    const qEl = proto.querySelector('[data-proto-query]');
    const itemsEl = proto.querySelector('[data-proto-items]');
    const itemEls = Array.from(proto.querySelectorAll('[data-proto-item]'));
    const target = proto.querySelector('[data-proto-item="tirz"]');

    const setQuery = (s) => {
      if (qEl) qEl.textContent = s;
    };

    const clearItemState = () => {
      proto.classList.remove('proto--logged');
      for (const it of itemEls) it.classList.remove('sel', 'logged');
      if (target) {
        const act = target.querySelector('.act');
        if (act && act.dataset.defaultHtml) act.innerHTML = act.dataset.defaultHtml;
      }
    };

    const setListYForIndex = (idx) => {
      if (!itemsEl) return;
      const first = itemEls[0];
      if (!first) {
        itemsEl.style.setProperty('--list-y', '0px');
        return;
      }

      const row = first.getBoundingClientRect().height || 54;
      const s = window.getComputedStyle(itemsEl);
      const gap =
        Number.parseFloat(s.rowGap) ||
        Number.parseFloat(s.gap) ||
        Number.parseFloat(s.gridRowGap) ||
        8;
      const step = row + gap;
      const shiftRows = Math.max(0, idx - 2);
      const y = -shiftRows * step;
      itemsEl.style.setProperty('--list-y', `${y.toFixed(1)}px`);
    };

    const showLogged = () => {
      if (!target) return;
      target.classList.add('logged');
      proto.classList.add('proto--logged');

      const act = target.querySelector('.act');
      if (act) {
        if (!act.dataset.defaultHtml) act.dataset.defaultHtml = act.innerHTML;
        act.innerHTML =
          "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.6' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M20 6L9 17l-5-5'/></svg>logged";
      }
    };

    const setStaticEnd = () => {
      setQuery('tirz');
      if (target) {
        const idx = itemEls.indexOf(target);
        if (idx >= 0) setListYForIndex(idx);
        target.classList.add('sel');
      }
      showLogged();
    };

    startWhenVisible(proto, () => {
      if (reduce) {
        setStaticEnd();
        return;
      }

      (async () => {
        while (true) {
          clearItemState();
          setQuery('');
          if (itemsEl) itemsEl.style.setProperty('--list-y', '0px');
          await sleep(820);

          for (const s of ['t', 'ti', 'tir', 'tirz']) {
            setQuery(s);
            await sleep(170);
          }
          await sleep(240);

          if (target) {
            const idx = itemEls.indexOf(target);
            if (idx >= 0) setListYForIndex(idx);
          }
          await sleep(820);

          if (target) target.classList.add('sel');
          await sleep(520);

          showLogged();
          await sleep(2800);
        }
      })();
    });
  }

  // ---------------- Calculator demo ----------------
  const calc = document.querySelector('[data-demo="calc"]');
  if (calc) {
    const SVG_NS = 'http://www.w3.org/2000/svg';

    const getOptions = (key) => {
      const wrap = calc.querySelector(`[data-wheel-items="${key}"]`);
      if (!wrap) return { wrap: null, options: [] };
      const options = Array.from(wrap.querySelectorAll('.wi')).map((el) => {
        const n = Number.parseFloat((el.textContent || '').trim());
        return Number.isFinite(n) ? n : null;
      });
      return { wrap, options };
    };

    const vial = getOptions('vial');
    const bac = getOptions('bac');
    const dose = getOptions('dose');

    const injectMlEl = calc.querySelector('[data-inject-ml]');
    const injectSubEl = calc.querySelector('[data-inject-sub]');

    const sgRoot = calc.querySelector('[data-sg]');
    const sgUnitsEl = calc.querySelector('[data-sg-units]');
    const sgMlEl = calc.querySelector('[data-sg-ml]');
    const sgTypeEl = calc.querySelector('[data-sg-type]');

    const sgTicksEl = calc.querySelector('[data-sg-ticks]');
    const sgFillEl = calc.querySelector('[data-sg-fill]');
    const sgMarkerEl = calc.querySelector('[data-sg-marker]');
    const sgMarkerLabelEl = calc.querySelector('[data-sg-marker-label]');

    const chipEls = Array.from(calc.querySelectorAll('[data-cap-chip]'));
    let capUnits = 100;
    let capMl = 1.0;

    const fmtUnits = (u) => {
      const rounded = Math.round(u * 2) / 2;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    const geom = {
      innerX: 55,
      innerY: 53,
      innerW: 232,
      innerH: 22,
      tickTopY: 50,
      labelY: 44,
      markerTopY: 46,
      markerBottomY: 82,
      markerLabelY: 106,
    };

    const clearSvgChildren = (el) => {
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
    };

    const svgEl = (name, attrs = {}) => {
      const el = document.createElementNS(SVG_NS, name);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      return el;
    };

    const getTickConfig = (max) => {
      if (max === 100) return { minor: 1, mid: 5, major: 10, labelEvery: 20 };
      if (max === 50) return { minor: 1, mid: 5, major: 10, labelEvery: 10 };
      return { minor: 1, mid: 5, major: 5, labelEvery: 10 };
    };

    const renderTicks = () => {
      if (!sgTicksEl) return;
      clearSvgChildren(sgTicksEl);

      const { minor, mid, major, labelEvery } = getTickConfig(capUnits);
      const stroke = 'rgba(226,232,240,.34)';
      const fontFill = 'rgba(196,199,218,.82)';

      for (let u = 0; u <= capUnits; u += minor) {
        const x = geom.innerX + (u / capUnits) * geom.innerW;
        const isMajor = u % major === 0;
        const isMid = !isMajor && u % mid === 0;

        const len = isMajor ? 14 : isMid ? 10 : 6;
        const w = isMajor ? 1.6 : 1.2;
        const op = isMajor ? 0.62 : isMid ? 0.46 : 0.28;

        sgTicksEl.appendChild(
          svgEl('line', {
            x1: x.toFixed(2),
            x2: x.toFixed(2),
            y1: geom.tickTopY,
            y2: geom.tickTopY + len,
            stroke,
            'stroke-width': w,
            opacity: op,
            'shape-rendering': 'crispEdges',
          })
        );

        const isLabel = u === 0 || u === capUnits || (u % labelEvery === 0 && u !== 0);
        if (isLabel) {
          sgTicksEl.appendChild(
            svgEl('text', {
              x: x.toFixed(2),
              y: geom.labelY,
              'text-anchor': 'middle',
              'font-size': 10,
              'font-weight': 900,
              fill: fontFill,
              opacity: 0.92,
            })
          ).textContent = String(u);
        }
      }
    };

    const setCapacity = (nextUnits, nextMl) => {
      const u = Number.parseInt(String(nextUnits), 10);
      const m = Number.parseFloat(String(nextMl));
      if (!Number.isFinite(u) || !Number.isFinite(m)) return;

      capUnits = u;
      capMl = m;
      for (const b of chipEls) b.setAttribute('aria-pressed', b.dataset.capChip === String(u) ? 'true' : 'false');
      renderTicks();
    };

    const setWheelPos = (wheel, pos) => {
      if (!wheel.wrap) return;
      wheel.wrap.style.setProperty('--pos', String(pos));
    };

    const compute = ({ vialMg, bacMl, doseMcg }) => {
      const concMcgPerMl = (vialMg * 1000) / bacMl;
      const volMl = doseMcg / concMcgPerMl;
      const units = volMl * 100;
      return { units, volMl };
    };

    const setSyringeGuideState = ({ units, volMl }) => {
      const unitsStr = fmtUnits(units);
      const mlStr = volMl.toFixed(3);

      if (injectMlEl) injectMlEl.textContent = mlStr;
      if (injectSubEl) injectSubEl.textContent = `${unitsStr} units (${capMl.toFixed(1)} mL (${capUnits} units))`;

      if (sgUnitsEl) sgUnitsEl.textContent = unitsStr;
      if (sgMlEl) sgMlEl.textContent = mlStr;
      if (sgTypeEl) sgTypeEl.textContent = 'U-100 syringe';

      const over = units > capUnits + 1e-6;
      if (sgRoot) sgRoot.classList.toggle('sg--over', over);

      const clamped = Math.max(0, Math.min(units, capUnits));
      const frac = capUnits > 0 ? clamped / capUnits : 0;
      const fillW = geom.innerW * frac;
      const x = geom.innerX + fillW;

      if (sgFillEl) {
        sgFillEl.setAttribute('width', fillW.toFixed(2));
        sgFillEl.setAttribute('fill', over ? 'url(#sgFillOver)' : 'url(#sgFill)');
      }

      const markerStroke = over ? 'rgba(251,191,36,.92)' : 'rgba(163,230,53,.95)';
      const markerFilter = over ? 'url(#sgGlowOver)' : 'url(#sgGlow)';

      if (sgMarkerEl) {
        sgMarkerEl.setAttribute('x1', x.toFixed(2));
        sgMarkerEl.setAttribute('x2', x.toFixed(2));
        sgMarkerEl.setAttribute('stroke', markerStroke);
        sgMarkerEl.setAttribute('filter', markerFilter);
      }

      if (sgMarkerLabelEl) {
        sgMarkerLabelEl.setAttribute('x', x.toFixed(2));
        sgMarkerLabelEl.setAttribute('y', String(geom.markerLabelY));
        sgMarkerLabelEl.setAttribute('fill', markerStroke);
        sgMarkerLabelEl.textContent = `${unitsStr}u`;
      }
    };

    const setCalcState = ({ vialMg, bacMl, doseMcg }, { flash } = { flash: true }) => {
      const vialIdx = vial.options.indexOf(vialMg);
      const bacIdx = bac.options.indexOf(bacMl);
      const doseIdx = dose.options.indexOf(doseMcg);

      if (vialIdx >= 0) setWheelPos(vial, vialIdx);
      if (bacIdx >= 0) setWheelPos(bac, bacIdx);
      if (doseIdx >= 0) setWheelPos(dose, doseIdx);

      const { units, volMl } = compute({ vialMg, bacMl, doseMcg });
      setSyringeGuideState({ units, volMl });

      if (flash && !reduce) {
        calc.classList.remove('calc--flash');
        // Force reflow so the animation restarts reliably.
        void calc.offsetHeight;
        calc.classList.add('calc--flash');
        window.setTimeout(() => calc.classList.remove('calc--flash'), 740);
      }
    };

    const presets = [
      { vialMg: 5, bacMl: 2, doseMcg: 250 },
      { vialMg: 5, bacMl: 2, doseMcg: 150 },
      { vialMg: 15, bacMl: 3, doseMcg: 300 },
      { vialMg: 10, bacMl: 1, doseMcg: 200 },
    ];

    let currentState = presets[0];
    const setStaticEnd = () => setCalcState(presets[0], { flash: false });

    startWhenVisible(calc, () => {
      // Initialize syringe capacity (defaults to the pressed chip).
      const pressed = chipEls.find((b) => b.getAttribute('aria-pressed') === 'true') || chipEls[2] || chipEls[0];
      if (pressed) setCapacity(pressed.dataset.capChip, pressed.dataset.capMl);
      for (const b of chipEls) {
        b.addEventListener('click', () => {
          setCapacity(b.dataset.capChip, b.dataset.capMl);
          // Re-apply current values against the new capacity.
          setCalcState(currentState, { flash: false });
        });
      }

      if (reduce) {
        setStaticEnd();
        return;
      }

      (async () => {
        let i = 0;
        currentState = presets[0];
        setCalcState(currentState, { flash: false });
        await sleep(900);

        while (true) {
          i = (i + 1) % presets.length;
          currentState = presets[i];
          setCalcState(currentState);
          await sleep(2800);
        }
      })();
    });
  }
})();

