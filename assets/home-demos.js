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

    const unitsEl = calc.querySelector('[data-calc-units]');
    const volumeEl = calc.querySelector('[data-calc-volume]');
    const volumeMiniEl = calc.querySelector('[data-calc-volume-mini]');
    const injectSubEl = calc.querySelector('[data-calc-inject-sub]');
    const drawCardEl = calc.querySelector('[data-calc-draw]');

    const sgTicksEl = calc.querySelector('[data-sg-ticks]');
    const sgFillEl = calc.querySelector('[data-sg-fill]');
    const sgMarkerEl = calc.querySelector('[data-sg-marker]');
    const sgMarkerLabelEl = calc.querySelector('[data-sg-marker-label]');

    const chipEls = Array.from(calc.querySelectorAll('[data-syringe-chip]'));
    const getSelectedChip = () =>
      chipEls.find((b) => b.classList.contains('sel') || b.getAttribute('aria-selected') === 'true') ||
      chipEls[chipEls.length - 1] ||
      null;

    const setSelectedChip = (btn) => {
      if (!btn) return;
      for (const b of chipEls) {
        const sel = b === btn;
        b.classList.toggle('sel', sel);
        b.setAttribute('aria-selected', sel ? 'true' : 'false');
      }
    };

    let userInteractingUntil = 0;
    const bumpInteract = () => {
      userInteractingUntil = Date.now() + 8000;
    };

    const fmtUnits = (u) => {
      const rounded = Math.round(u * 2) / 2;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };
    const fmtMl = (ml) => ml.toFixed(3);

    const geom = { innerX: 55, innerW: 232, tickTopY: 50, labelY: 44, markerLabelY: 106 };

    const clearSvgChildren = (el) => {
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
    };
    const svgEl = (name, attrs = {}) => {
      const el = document.createElementNS(SVG_NS, name);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
      return el;
    };

    const getCapacity = () => {
      const chip = getSelectedChip();
      const capMl = Number.parseFloat(chip?.dataset?.syringeMl || '1') || 1;
      const capUnits = Number.parseFloat(chip?.dataset?.syringeUnits || '100') || 100;
      return { capMl, capUnits };
    };

    const getTickConfig = (maxUnits) => {
      if (maxUnits === 100) return { minor: 1, mid: 5, major: 10, labelEvery: 20 };
      if (maxUnits === 50) return { minor: 1, mid: 5, major: 10, labelEvery: 10 };
      return { minor: 1, mid: 5, major: 5, labelEvery: 10 };
    };

    const markWheelSelected = () => {
      for (const key of ['vial', 'bac', 'dose']) {
        const wheel = key === 'vial' ? vial : key === 'bac' ? bac : dose;
        if (!wheel.wrap) continue;
        const items = Array.from(wheel.wrap.querySelectorAll('.wi'));
        const idx = key === 'vial' ? state.vialIdx : key === 'bac' ? state.bacIdx : state.doseIdx;
        for (let i = 0; i < items.length; i++) items[i].classList.toggle('sel', i === idx);
      }
    };

    const renderTicks = () => {
      if (!sgTicksEl) return;
      clearSvgChildren(sgTicksEl);

      const { capUnits } = getCapacity();
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

    const setWheelPos = (wheel, pos, { animMs } = {}) => {
      if (!wheel.wrap) return;
      if (Number.isFinite(animMs)) wheel.wrap.style.transitionDuration = `${Math.max(0, animMs)}ms`;
      else wheel.wrap.style.transitionDuration = '';
      wheel.wrap.style.setProperty('--pos', String(pos));
    };

    const compute = ({ vialMg, bacMl, doseMcg }) => {
      const concMcgPerMl = (vialMg * 1000) / bacMl;
      const volMl = doseMcg / concMcgPerMl;
      const units = volMl * 100;
      return { units, volMl };
    };

    const state = { vialIdx: 0, bacIdx: 0, doseIdx: 0 };
    const clampIdx = (idx, len) => Math.max(0, Math.min(idx, Math.max(0, len - 1)));
    const stepToward = (cur, target) => (cur === target ? cur : cur + Math.sign(target - cur));

    const setSyringeSvg = ({ units }) => {
      const { capUnits } = getCapacity();
      const unitsStr = fmtUnits(units);

      const over = units > capUnits + 1e-6;
      if (drawCardEl) drawCardEl.classList.toggle('sg--over', over);

      const clamped = Math.max(0, Math.min(units, capUnits));
      const frac = capUnits > 0 ? clamped / capUnits : 0;
      const fillW = geom.innerW * frac;
      const x = geom.innerX + fillW;

      if (sgFillEl) {
        sgFillEl.setAttribute('width', fillW.toFixed(2));
        sgFillEl.setAttribute('fill', over ? 'url(#sgFillOver)' : 'url(#sgFill)');
      }

      const markerStroke = over ? 'rgba(251,191,36,.92)' : 'rgba(226,232,240,.92)';
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
        sgMarkerLabelEl.setAttribute('fill', over ? 'rgba(251,191,36,.92)' : 'rgba(163,230,53,.95)');
        sgMarkerLabelEl.textContent = `${unitsStr}u`;
      }
    };

    const applyByIndex = ({ vialIdx, bacIdx, doseIdx }, { flash } = { flash: true }, { animMs } = {}) => {
      state.vialIdx = clampIdx(vialIdx, vial.options.length);
      state.bacIdx = clampIdx(bacIdx, bac.options.length);
      state.doseIdx = clampIdx(doseIdx, dose.options.length);

      setWheelPos(vial, state.vialIdx, { animMs });
      setWheelPos(bac, state.bacIdx, { animMs });
      setWheelPos(dose, state.doseIdx, { animMs });
      markWheelSelected();

      const vialMg = vial.options[state.vialIdx] ?? 0;
      const bacMl = bac.options[state.bacIdx] ?? 1;
      const doseMcg = dose.options[state.doseIdx] ?? 0;

      const { capMl, capUnits } = getCapacity();
      const { units, volMl } = compute({ vialMg, bacMl, doseMcg });

      const unitsStr = fmtUnits(units);
      const mlStr = fmtMl(volMl);

      if (unitsEl) unitsEl.textContent = unitsStr;
      if (volumeEl) volumeEl.textContent = mlStr;
      if (volumeMiniEl) volumeMiniEl.textContent = mlStr;
      if (injectSubEl) injectSubEl.textContent = `${unitsStr} units (${Number(capMl).toFixed(1)} mL (${capUnits} units))`;

      setSyringeSvg({ units });

      if (flash && !reduce) {
        calc.classList.remove('calc--flash');
        void calc.offsetHeight;
        calc.classList.add('calc--flash');
        window.setTimeout(() => calc.classList.remove('calc--flash'), 740);
      }
    };

    const setCalcState = ({ vialMg, bacMl, doseMcg }, { flash } = { flash: true }) => {
      const vialIdx = vial.options.indexOf(vialMg);
      const bacIdx = bac.options.indexOf(bacMl);
      const doseIdx = dose.options.indexOf(doseMcg);
      applyByIndex(
        {
          vialIdx: vialIdx >= 0 ? vialIdx : state.vialIdx,
          bacIdx: bacIdx >= 0 ? bacIdx : state.bacIdx,
          doseIdx: doseIdx >= 0 ? doseIdx : state.doseIdx,
        },
        { flash }
      );
    };

    const presets = [
      { vialMg: 5, bacMl: 2, doseMcg: 250, syringeUnits: 100 },
      { vialMg: 4.5, bacMl: 1.5, doseMcg: 225, syringeUnits: 50 },
      { vialMg: 5.5, bacMl: 2.5, doseMcg: 275, syringeUnits: 30 },
      { vialMg: 6, bacMl: 3, doseMcg: 300, syringeUnits: 100 },
    ];

    const idxForPreset = (p) => ({
      vialIdx: Math.max(0, vial.options.indexOf(p.vialMg)),
      bacIdx: Math.max(0, bac.options.indexOf(p.bacMl)),
      doseIdx: Math.max(0, dose.options.indexOf(p.doseMcg)),
    });

    const animateToPreset = async (preset, { tickMs = 120 } = {}) => {
      const target = idxForPreset(preset);

      if (typeof preset.syringeUnits === 'number' || typeof preset.syringeUnits === 'string') {
        const want = String(preset.syringeUnits);
        const chip = chipEls.find((b) => b.dataset.syringeUnits === want);
        if (chip) {
          setSelectedChip(chip);
          renderTicks();
          applyByIndex({ ...state }, { flash: false }, { animMs: tickMs });
          await sleep(tickMs);
        }
      }

      while (
        state.vialIdx !== target.vialIdx ||
        state.bacIdx !== target.bacIdx ||
        state.doseIdx !== target.doseIdx
      ) {
        applyByIndex(
          {
            vialIdx: stepToward(state.vialIdx, target.vialIdx),
            bacIdx: stepToward(state.bacIdx, target.bacIdx),
            doseIdx: stepToward(state.doseIdx, target.doseIdx),
          },
          { flash: false },
          { animMs: tickMs }
        );
        await sleep(tickMs);
      }

      applyByIndex(target, { flash: true });
    };

    const nudgeWheel = (key, dir) => {
      bumpInteract();
      if (key === 'vial') applyByIndex({ ...state, vialIdx: state.vialIdx + dir }, { flash: false });
      if (key === 'bac') applyByIndex({ ...state, bacIdx: state.bacIdx + dir }, { flash: false });
      if (key === 'dose') applyByIndex({ ...state, doseIdx: state.doseIdx + dir }, { flash: false });
    };

    for (const key of ['vial', 'bac', 'dose']) {
      const win = calc.querySelector(`[data-wheel="${key}"] .wheel-window`);
      if (!win) continue;

      const wheelStepPx = 28;
      let dragActive = false;
      let dragStartY = 0;
      let lastY = 0;
      let accum = 0;

      win.addEventListener(
        'wheel',
        (e) => {
          if (reduce) return;
          e.preventDefault();
          const dir = e.deltaY > 0 ? 1 : -1;
          nudgeWheel(key, dir);
        },
        { passive: false }
      );

      win.addEventListener('pointerdown', (e) => {
        if (reduce) return;
        dragActive = true;
        dragStartY = e.clientY;
        lastY = e.clientY;
        accum = 0;

        try {
          win.setPointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      });

      win.addEventListener('pointermove', (e) => {
        if (reduce || !dragActive) return;
        e.preventDefault();

        const dy = e.clientY - lastY;
        lastY = e.clientY;
        accum += dy;

        // Match a natural "picker" feel: swipe up -> next value (dir +1)
        while (accum <= -wheelStepPx) {
          nudgeWheel(key, 1);
          accum += wheelStepPx;
        }
        while (accum >= wheelStepPx) {
          nudgeWheel(key, -1);
          accum -= wheelStepPx;
        }
      });

      const endDrag = (e) => {
        if (reduce) return;
        if (!dragActive) return;
        dragActive = false;

        // If it was basically a tap, keep the old behavior: tap top/bottom nudges once.
        const moved = Math.abs((e?.clientY ?? lastY) - dragStartY);
        if (moved < 6) {
          const r = win.getBoundingClientRect();
          const y = (e?.clientY ?? lastY) - r.top;
          const dir = y > r.height / 2 ? 1 : -1;
          nudgeWheel(key, dir);
        }
      };

      win.addEventListener('pointerup', endDrag);
      win.addEventListener('pointercancel', endDrag);
      win.addEventListener('lostpointercapture', endDrag);
    }

    for (const b of chipEls) {
      b.addEventListener('click', () => {
        if (reduce) return;
        bumpInteract();
        setSelectedChip(b);
        renderTicks();
        applyByIndex({ ...state }, { flash: false });
      });
    }

    const setStaticEnd = () => {
      const chip100 = chipEls.find((b) => b.dataset.syringeUnits === '100') || chipEls[0];
      setSelectedChip(chip100);
      renderTicks();
      setCalcState({ vialMg: 5, bacMl: 2, doseMcg: 250 }, { flash: false });
    };

    startWhenVisible(calc, () => {
      setStaticEnd();
      if (reduce) return;

      (async () => {
        let i = 0;
        await sleep(900);

        while (true) {
          if (Date.now() < userInteractingUntil) {
            await sleep(500);
            continue;
          }
          i = (i + 1) % presets.length;
          await animateToPreset(presets[i]);
          await sleep(2800);
        }
      })();
    });
  }

  // ---------------- Progress|History screen carousel (marketing creative) ----------------
  const progressCarousels = Array.from(document.querySelectorAll('[data-progress-carousel]'));
  for (const wrap of progressCarousels) {
    const viewport = wrap.querySelector('[data-pc-viewport]');
    const dots = Array.from(wrap.querySelectorAll('[data-pc-dot]'));
    if (!viewport) continue;

    const setDots = (idx) => {
      for (let i = 0; i < dots.length; i++) dots[i].setAttribute('aria-current', i === idx ? 'true' : 'false');
    };

    const width = () => viewport.clientWidth || 1;
    const clampIdx = (idx) => Math.max(0, Math.min(idx, 1));

    let idx = 0;
    let pauseUntil = 0;

    const goTo = (next, { behavior = 'smooth' } = {}) => {
      idx = clampIdx(next);
      viewport.scrollTo({ left: idx * width(), behavior });
      setDots(idx);
    };

    const updateFromScroll = () => {
      const next = clampIdx(Math.round(viewport.scrollLeft / width()));
      if (next !== idx) {
        idx = next;
        setDots(idx);
      }
    };

    viewport.addEventListener('scroll', () => {
      pauseUntil = Date.now() + 8000;
      updateFromScroll();
    }, { passive: true });
    viewport.addEventListener('pointerdown', () => {
      pauseUntil = Date.now() + 8000;
    }, { passive: true });

    startWhenVisible(wrap, () => {
      goTo(0, { behavior: 'auto' });
      if (reduce) return;

      window.setInterval(() => {
        if (Date.now() < pauseUntil) return;
        goTo((idx + 1) % 2);
      }, 4200);
    });
  }
})();

