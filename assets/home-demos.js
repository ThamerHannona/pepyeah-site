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
    const markerEl = calc.querySelector('[data-calc-marker]');
    const markerLabelEl = calc.querySelector('[data-calc-marker-label]');

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

    for (const b of chipEls) {
      b.addEventListener('click', () => {
        if (reduce) return;
        bumpInteract();
        setSelectedChip(b);
        applyByIndex({ ...state }, { flash: false });
      });
    }

    const fmtUnits = (u) => {
      const rounded = Math.round(u * 2) / 2;
      return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };

    const fmtMl = (ml) => ml.toFixed(3);

    const setWheelPos = (wheel, pos, { animMs } = {}) => {
      if (!wheel.wrap) return;
      if (Number.isFinite(animMs)) {
        wheel.wrap.style.transitionDuration = `${Math.max(0, animMs)}ms`;
      } else {
        wheel.wrap.style.transitionDuration = '';
      }
      wheel.wrap.style.setProperty('--pos', String(pos));
    };

    const compute = ({ vialMg, bacMl, doseMcg, syringeMl, syringeUnits }) => {
      // Assumptions: vial strength is in mg total, dose is in mcg, BAC is total mL added.
      // U-100 insulin syringes are 100 units per 1 mL, regardless of total syringe capacity.
      // concentration_mcg_per_mL = (vial_mg * 1000) / bac_mL
      // volume_mL = dose_mcg / concentration_mcg_per_mL
      // units = volume_mL * (syringe_units / syringe_mL)
      const concMcgPerMl = (vialMg * 1000) / bacMl;
      const volMl = doseMcg / concMcgPerMl;
      const unitsPerMl = syringeUnits / syringeMl;
      const units = volMl * unitsPerMl;
      return { units, volMl };
    };

    const state = { vialIdx: 0, bacIdx: 0, doseIdx: 0 };

    const clampIdx = (idx, len) => Math.max(0, Math.min(idx, Math.max(0, len - 1)));

    const applyByIndex = (
      { vialIdx, bacIdx, doseIdx },
      { flash } = { flash: true },
      { animMs } = {}
    ) => {
      state.vialIdx = clampIdx(vialIdx, vial.options.length);
      state.bacIdx = clampIdx(bacIdx, bac.options.length);
      state.doseIdx = clampIdx(doseIdx, dose.options.length);

      setWheelPos(vial, state.vialIdx, { animMs });
      setWheelPos(bac, state.bacIdx, { animMs });
      setWheelPos(dose, state.doseIdx, { animMs });

      const vialMg = vial.options[state.vialIdx] ?? 0;
      const bacMl = bac.options[state.bacIdx] ?? 1;
      const doseMcg = dose.options[state.doseIdx] ?? 0;

      const chip = getSelectedChip();
      const syringeMl = Number.parseFloat(chip?.dataset?.syringeMl || '1') || 1;
      const syringeUnits = Number.parseFloat(chip?.dataset?.syringeUnits || '100') || 100;

      const { units, volMl } = compute({ vialMg, bacMl, doseMcg, syringeMl, syringeUnits });
      const unitsStr = fmtUnits(units);
      const mlStr = fmtMl(volMl);

      if (unitsEl) unitsEl.textContent = unitsStr;
      if (volumeEl) volumeEl.textContent = mlStr;
      if (volumeMiniEl) volumeMiniEl.textContent = mlStr;
      if (injectSubEl) injectSubEl.textContent = `${unitsStr} units (${Number(syringeMl).toFixed(1)} mL (${syringeUnits} units))`;

      if (markerEl) {
        if (Number.isFinite(animMs)) markerEl.style.transitionDuration = `${Math.max(0, animMs)}ms`;
        else markerEl.style.transitionDuration = '';

        const pct = Math.max(0, Math.min(100, units));
        markerEl.style.setProperty('--x', pct.toFixed(2));
      }
      if (markerLabelEl) {
        markerLabelEl.textContent = unitsStr;
      }

      if (flash && !reduce) {
        calc.classList.remove('calc--flash');
        // Force reflow so the animation restarts reliably.
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

    const setStaticEnd = () => {
      // Match the screenshot default: 1mL / 100u selected.
      const chip100 = chipEls.find((b) => b.dataset.syringeUnits === '100') || chipEls[0];
      setSelectedChip(chip100);
      setCalcState({ vialMg: 5, bacMl: 2, doseMcg: 250 }, { flash: false });
    };

    const idxForPreset = (p) => ({
      vialIdx: Math.max(0, vial.options.indexOf(p.vialMg)),
      bacIdx: Math.max(0, bac.options.indexOf(p.bacMl)),
      doseIdx: Math.max(0, dose.options.indexOf(p.doseMcg)),
    });

    const stepToward = (cur, target) => (cur === target ? cur : cur + Math.sign(target - cur));

    const animateToPreset = async (preset, { tickMs = 120 } = {}) => {
      const target = idxForPreset(preset);

      if (typeof preset.syringeUnits === 'number' || typeof preset.syringeUnits === 'string') {
        const want = String(preset.syringeUnits);
        const chip = chipEls.find((b) => b.dataset.syringeUnits === want);
        if (chip) {
          setSelectedChip(chip);
          applyByIndex({ ...state }, { flash: false }, { animMs: tickMs });
          await sleep(tickMs);
        }
      }

      // Keep the wheel + fill visually in sync with each tick.
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
        const r = win.getBoundingClientRect();
        const y = e.clientY - r.top;
        const dir = y > r.height / 2 ? 1 : -1;
        nudgeWheel(key, dir);
      });
    }

    startWhenVisible(calc, () => {
      if (reduce) {
        setStaticEnd();
        return;
      }

      (async () => {
        let i = 0;
        setCalcState(presets[0], { flash: false });
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
})();

