/**
 * EMI PRO - Core JavaScript Engine & UI Controller
 * Vanilla HTML5, CSS3, ES6+ JavaScript.
 */

(function (root, factory) {
  if (typeof exports === 'object' && typeof module !== 'undefined') {
    module.exports = factory();
  } else {
    root.EMIPro = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // --- 1. CORE CALCULATION ENGINE (PURE FUNCTIONS) ---
  const calc = {
    isFiniteNumber(val) {
      return typeof val === 'number' && Number.isFinite(val);
    },

    convertTenureToMonths(value, unit) {
      const num = parseFloat(value);
      if (!calc.isFiniteNumber(num) || num <= 0) return 0;
      if (unit === 'years') {
        return Math.round(num * 12);
      }
      return Math.round(num);
    },

    parseInputValue(str) {
      if (typeof str === 'number') return str;
      if (typeof str !== 'string') return NaN;
      const clean = str.replace(/[\s,]/g, '');
      if (clean === '') return NaN;
      return Number(clean);
    },

    validateLoanInputs(amount, rate, tenure, tenureUnit = 'years') {
      const errors = {};
      const numAmount = calc.parseInputValue(amount);
      const numRate = calc.parseInputValue(rate);
      const rawTenure = calc.parseInputValue(tenure);
      const totalMonths = calc.convertTenureToMonths(rawTenure, tenureUnit);

      if (!calc.isFiniteNumber(numAmount)) {
        errors.amount = 'Please enter a valid loan amount.';
      } else if (numAmount < 10000) {
        errors.amount = 'Minimum loan amount is ₹10,000.';
      } else if (numAmount > 10000000) {
        errors.amount = 'Maximum loan amount is ₹1,00,00,000 (₹1 Crore).';
      } else if (Math.round(numAmount * 100) !== numAmount * 100) {
        errors.amount = 'Amount can have at most 2 decimal places.';
      }

      if (!calc.isFiniteNumber(numRate)) {
        errors.rate = 'Please enter a valid annual interest rate.';
      } else if (numRate < 0) {
        errors.rate = 'Interest rate cannot be negative.';
      } else if (numRate > 30) {
        errors.rate = 'Maximum interest rate allowed is 30%.';
      } else if (Math.round(numRate * 100) !== numRate * 100) {
        errors.rate = 'Interest rate can have at most 2 decimal places.';
      }

      if (!calc.isFiniteNumber(rawTenure) || rawTenure <= 0) {
        errors.tenure = 'Please enter a valid loan tenure.';
      } else if (tenureUnit === 'years' && (rawTenure < 1 / 12 || rawTenure > 40)) {
        errors.tenure = 'Tenure must be between 1 month (0.08 yrs) and 40 years.';
      } else if (tenureUnit === 'months' && (rawTenure < 1 || rawTenure > 480)) {
        errors.tenure = 'Tenure must be between 1 and 480 months.';
      } else if (totalMonths < 1 || totalMonths > 480) {
        errors.tenure = 'Total tenure must be between 1 and 480 months.';
      }

      const isValid = Object.keys(errors).length === 0;

      return {
        isValid,
        errors,
        cleanValues: isValid
          ? {
              amount: numAmount,
              rate: numRate,
              tenure: rawTenure,
              tenureUnit,
              totalMonths
            }
          : null
      };
    },

    calculateMonthlyEMI(amount, annualRate, totalMonths) {
      if (
        !calc.isFiniteNumber(amount) ||
        !calc.isFiniteNumber(annualRate) ||
        !calc.isFiniteNumber(totalMonths) ||
        amount <= 0 ||
        annualRate < 0 ||
        totalMonths <= 0
      ) {
        return NaN;
      }

      if (annualRate === 0) {
        return amount / totalMonths;
      }

      const R = annualRate / 12 / 100;
      const N = totalMonths;
      const factor = Math.pow(1 + R, N);
      const emi = (amount * R * factor) / (factor - 1);
      return emi;
    },

    calculateTotalRepayment(emi, totalMonths) {
      if (!calc.isFiniteNumber(emi) || !calc.isFiniteNumber(totalMonths)) return NaN;
      return emi * totalMonths;
    },

    calculateTotalInterest(totalRepayment, amount) {
      if (!calc.isFiniteNumber(totalRepayment) || !calc.isFiniteNumber(amount)) return NaN;
      return Math.max(0, totalRepayment - amount);
    },

    calculateLoanSummary(amount, rate, tenure, tenureUnit = 'years') {
      const validation = calc.validateLoanInputs(amount, rate, tenure, tenureUnit);
      if (!validation.isValid) {
        return { isValid: false, errors: validation.errors };
      }

      const P = validation.cleanValues.amount;
      const R_annual = validation.cleanValues.rate;
      const N = validation.cleanValues.totalMonths;

      const emi = calc.calculateMonthlyEMI(P, R_annual, N);
      const totalRepayment = calc.calculateTotalRepayment(emi, N);
      const totalInterest = calc.calculateTotalInterest(totalRepayment, P);

      const interestPercentage = totalRepayment > 0 ? (totalInterest / totalRepayment) * 100 : 0;
      const principalPercentage = totalRepayment > 0 ? (P / totalRepayment) * 100 : 0;
      const interestToPrincipalRatio = P > 0 ? totalInterest / P : 0;

      return {
        isValid: true,
        amount: P,
        rate: R_annual,
        totalMonths: N,
        emi,
        totalRepayment,
        totalInterest,
        interestPercentage,
        principalPercentage,
        interestToPrincipalRatio
      };
    },

    generateAmortizationSchedule(amount, annualRate, totalMonths, startDateStr) {
      const summary = calc.calculateLoanSummary(amount, annualRate, totalMonths, 'months');
      if (!summary.isValid) return null;

      const P = summary.amount;
      const R_annual = summary.rate;
      const N = summary.totalMonths;
      const baseEMI = summary.emi;
      const R = R_annual / 12 / 100;

      let startDate = new Date();
      if (startDateStr) {
        const parts = startDateStr.split('-');
        if (parts.length === 2) {
          startDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        }
      } else {
        startDate.setMonth(startDate.getMonth() + 1);
        startDate.setDate(1);
      }

      const schedule = [];
      let openingBalance = P;
      let totalInterestPaid = 0;
      let totalPrincipalPaid = 0;

      for (let i = 1; i <= N; i++) {
        const currentDate = new Date(startDate.getFullYear(), startDate.getMonth() + (i - 1), 1);
        const monthStr = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        const interest = R === 0 ? 0 : openingBalance * R;
        let principal = baseEMI - interest;
        let rowEMI = baseEMI;
        let closingBalance = openingBalance - principal;

        if (i === N || closingBalance <= 0.0001 || principal >= openingBalance) {
          principal = openingBalance;
          rowEMI = principal + interest;
          closingBalance = 0;
        }

        totalInterestPaid += interest;
        totalPrincipalPaid += principal;

        schedule.push({
          paymentNo: i,
          monthStr,
          openingBalance,
          emi: rowEMI,
          principalPaid: principal,
          interestPaid: interest,
          closingBalance: Math.max(0, closingBalance)
        });

        openingBalance = closingBalance;
        if (openingBalance <= 0) break;
      }

      return {
        schedule,
        totalMonths: schedule.length,
        principal: P,
        totalPrincipalPaid,
        totalInterestPaid,
        totalRepayment: totalPrincipalPaid + totalInterestPaid,
        baseEMI
      };
    },

    simulatePrepayment(amount, annualRate, totalMonths, extraMonthly = 0, oneTimeAmount = 0, oneTimeMonth = 1, mode = 'reduce_tenure') {
      const baseSummary = calc.calculateLoanSummary(amount, annualRate, totalMonths, 'months');
      if (!baseSummary.isValid) return null;

      const P = baseSummary.amount;
      const R_annual = baseSummary.rate;
      const N = baseSummary.totalMonths;
      const R = R_annual / 12 / 100;

      const extraM = calc.isFiniteNumber(extraMonthly) && extraMonthly > 0 ? extraMonthly : 0;
      const oneTimeA = calc.isFiniteNumber(oneTimeAmount) && oneTimeAmount > 0 ? oneTimeAmount : 0;
      const oneTimeM = calc.isFiniteNumber(oneTimeMonth) && oneTimeMonth >= 1 ? Math.min(oneTimeMonth, N) : 1;

      let balance = P;
      let currentEMI = baseSummary.emi;
      let month = 0;
      let totalInterestPaid = 0;
      let totalPrincipalPaid = 0;
      const schedule = [];

      if (mode === 'reduce_tenure') {
        while (balance > 0.001 && month < 1200) {
          month++;
          const interest = R === 0 ? 0 : balance * R;
          let schedP = Math.min(currentEMI - interest, balance);
          if (currentEMI <= interest) schedP = Math.min(currentEMI, balance);

          let remAfterSched = Math.max(0, balance - schedP);
          let extraP = Math.min(extraM, remAfterSched);
          let remAfterExtra = Math.max(0, remAfterSched - extraP);

          let lumpSum = (month === oneTimeM) ? Math.min(oneTimeA, remAfterExtra) : 0;
          let totalP = schedP + extraP + lumpSum;

          totalInterestPaid += interest;
          totalPrincipalPaid += totalP;

          const closing = Math.max(0, balance - totalP);
          schedule.push({
            month,
            opening: balance,
            interest,
            principal: totalP,
            closing
          });

          balance = closing;
          if (balance <= 0) break;
        }

        const newTenureMonths = month;
        const interestSaved = Math.max(0, baseSummary.totalInterest - totalInterestPaid);
        const monthsSaved = Math.max(0, N - newTenureMonths);
        const totalRepayment = totalPrincipalPaid + totalInterestPaid;

        return {
          mode,
          originalMonths: N,
          newMonths: newTenureMonths,
          monthsSaved,
          originalInterest: baseSummary.totalInterest,
          newInterest: totalInterestPaid,
          interestSaved,
          originalRepayment: baseSummary.totalRepayment,
          newTotalRepayment: totalRepayment,
          newEMI: currentEMI,
          schedule
        };
      } else {
        for (let m = 1; m <= N; m++) {
          if (balance <= 0.001) break;
          month = m;

          const interest = R === 0 ? 0 : balance * R;
          let schedP = Math.min(currentEMI - interest, balance);
          if (currentEMI <= interest) schedP = Math.min(currentEMI, balance);

          let remAfterSched = Math.max(0, balance - schedP);
          let extraP = Math.min(extraM, remAfterSched);
          let remAfterExtra = Math.max(0, remAfterSched - extraP);

          let lumpSum = (m === oneTimeM) ? Math.min(oneTimeA, remAfterExtra) : 0;
          let totalP = schedP + extraP + lumpSum;

          totalInterestPaid += interest;
          totalPrincipalPaid += totalP;

          const closing = Math.max(0, balance - totalP);
          schedule.push({
            month: m,
            opening: balance,
            interest,
            principal: totalP,
            closing
          });

          balance = closing;

          if (m === oneTimeM && balance > 0.001 && m < N) {
            const remMonths = N - m;
            currentEMI = calc.calculateMonthlyEMI(balance, R_annual, remMonths);
          }
        }

        const interestSaved = Math.max(0, baseSummary.totalInterest - totalInterestPaid);
        const totalRepayment = totalPrincipalPaid + totalInterestPaid;

        return {
          mode,
          originalMonths: N,
          newMonths: month,
          monthsSaved: 0,
          originalInterest: baseSummary.totalInterest,
          newInterest: totalInterestPaid,
          interestSaved,
          originalRepayment: baseSummary.totalRepayment,
          newTotalRepayment: totalRepayment,
          newEMI: currentEMI,
          schedule
        };
      }
    },

    compareLoanScenarios(summaryA, summaryB) {
      if (!summaryA || !summaryA.isValid || !summaryB || !summaryB.isValid) {
        return null;
      }

      const emiDiff = summaryB.emi - summaryA.emi;
      const interestDiff = summaryB.totalInterest - summaryA.totalInterest;
      const repaymentDiff = summaryB.totalRepayment - summaryA.totalRepayment;
      const lowerRepaymentScenario = summaryA.totalRepayment <= summaryB.totalRepayment ? 'A' : 'B';
      const potentialSavings = Math.abs(repaymentDiff);

      return {
        summaryA,
        summaryB,
        emiDiff,
        interestDiff,
        repaymentDiff,
        lowerRepaymentScenario,
        potentialSavings
      };
    },

    formatCurrency(val, formatType = 'indian') {
      if (!calc.isFiniteNumber(val)) return '—';
      const roundVal = Math.round(val * 100) / 100;
      const locale = formatType === 'international' ? 'en-US' : 'en-IN';
      const formatted = new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(roundVal);
      return '₹' + formatted;
    },

    formatCompactCurrency(val) {
      if (!calc.isFiniteNumber(val)) return '—';
      if (val >= 10000000) {
        return '₹' + (val / 10000000).toFixed(2) + ' Cr';
      }
      if (val >= 100000) {
        return '₹' + (val / 100000).toFixed(2) + ' L';
      }
      if (val >= 1000) {
        return '₹' + (val / 1000).toFixed(1) + ' k';
      }
      return '₹' + val.toFixed(0);
    },

    formatPercentage(val, decimals = 2) {
      if (!calc.isFiniteNumber(val)) return '—';
      return val.toFixed(decimals) + '%';
    },

    escapeHTML(str) {
      if (typeof str !== 'string') return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  };


  // --- 2. DOM CONTROLLER & STATE MANAGEMENT ---
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const STORAGE_KEY_SCENARIOS = 'emipro.scenarios.v1';
    const STORAGE_KEY_SETTINGS = 'emipro.settings.v1';

    // Application Central State
    const state = {
      amount: 1000000,
      rate: 8.5,
      tenure: 20,
      tenureUnit: 'years',
      preset: 'home',
      startDate: '',
      scenarioB: {
        amount: 1000000,
        rate: 9.5,
        tenure: 15,
        tenureUnit: 'years'
      },
      prepayment: {
        extraMonthly: 0,
        lumpSum: 0,
        lumpSumMonth: 12,
        mode: 'reduce_tenure'
      },
      savedScenarios: [],
      settings: {
        theme: 'system',
        format: 'indian',
        defaultPreset: 'home'
      },
      scheduleView: {
        type: 'monthly',
        page: 1,
        rowsPerPage: 24
      },
      whatIf: {
        rateDelta: 0
      },
      activeRenameId: null
    };

    let politeDebounceTimer = null;

    document.addEventListener('DOMContentLoaded', () => {
      initApp();
    });

    function initApp() {
      loadSettings();
      loadSavedScenarios();
      initDefaultDates();
      bindEvents();
      updateCalculatorUI();
      updateComparisonUI();
      updatePrepaymentUI();
      renderSavedScenariosUI();
      initTheme();
    }

    // --- LOCAL STORAGE HELPERS ---
    function loadSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            state.settings = { ...state.settings, ...parsed };
          }
        }
      } catch (e) {
        console.warn('LocalStorage settings load failed:', e);
      }
    }

    function saveSettings() {
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(state.settings));
      } catch (e) {
        console.warn('LocalStorage settings save failed:', e);
      }
    }

    function loadSavedScenarios() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SCENARIOS);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.version === 1 && Array.isArray(parsed.items)) {
            state.savedScenarios = parsed.items.filter(item => 
              item && item.id && item.name && calc.isFiniteNumber(item.amount) && calc.isFiniteNumber(item.rate)
            ).slice(0, 50);
          }
        }
      } catch (e) {
        console.warn('LocalStorage scenarios load failed:', e);
      }
    }

    function saveSavedScenarios() {
      try {
        const data = { version: 1, items: state.savedScenarios };
        localStorage.setItem(STORAGE_KEY_SCENARIOS, JSON.stringify(data));
      } catch (e) {
        console.warn('LocalStorage scenarios save failed:', e);
      }
    }

    function initDefaultDates() {
      const now = new Date();
      now.setMonth(now.getMonth() + 1);
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      state.startDate = `${yyyy}-${mm}`;
      const startDateInput = document.getElementById('start-date-input');
      if (startDateInput) startDateInput.value = state.startDate;

      const printDateEl = document.getElementById('print-date');
      if (printDateEl) printDateEl.textContent = new Date().toLocaleDateString();
    }

    // --- THEME MANAGEMENT ---
    function initTheme() {
      applyTheme(state.settings.theme);

      // Listen for OS changes if set to system
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (state.settings.theme === 'system') {
          applyTheme('system');
        }
      });
    }

    function applyTheme(themeMode) {
      let isDark = false;
      if (themeMode === 'dark') {
        isDark = true;
      } else if (themeMode === 'light') {
        isDark = false;
      } else {
        isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      drawDoughnutChart();
      drawComparisonBarChart();
    }

    // --- BIND ALL EVENT LISTENERS ---
    function bindEvents() {
      // Calculator Inputs & Sliders
      const amtInput = document.getElementById('amount-input');
      const amtSlider = document.getElementById('amount-slider');
      const rateInput = document.getElementById('rate-input');
      const rateSlider = document.getElementById('rate-slider');
      const tenureInput = document.getElementById('tenure-input');
      const tenureSlider = document.getElementById('tenure-slider');

      if (amtInput && amtSlider) {
        amtInput.addEventListener('input', () => handleAmountInput(amtInput.value, false));
        amtInput.addEventListener('blur', () => formatInputOnBlur(amtInput, 'amount'));
        amtInput.addEventListener('focus', () => stripFormattingOnFocus(amtInput));
        amtSlider.addEventListener('input', () => {
          amtInput.value = calc.formatCurrency(amtSlider.value, state.settings.format).replace('₹', '');
          handleAmountInput(amtSlider.value, true);
        });
      }

      if (rateInput && rateSlider) {
        rateInput.addEventListener('input', () => handleRateInput(rateInput.value, false));
        rateSlider.addEventListener('input', () => {
          rateInput.value = rateSlider.value;
          handleRateInput(rateSlider.value, true);
        });
      }

      if (tenureInput && tenureSlider) {
        tenureInput.addEventListener('input', () => handleTenureInput(tenureInput.value, false));
        tenureSlider.addEventListener('input', () => {
          tenureInput.value = tenureSlider.value;
          handleTenureInput(tenureSlider.value, true);
        });
      }

      // Unit Toggle Buttons
      const unitYearsBtn = document.getElementById('unit-years-btn');
      const unitMonthsBtn = document.getElementById('unit-months-btn');
      if (unitYearsBtn && unitMonthsBtn) {
        unitYearsBtn.addEventListener('click', () => switchTenureUnit('years'));
        unitMonthsBtn.addEventListener('click', () => switchTenureUnit('months'));
      }

      // Preset Buttons
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
      });

      const undoPresetBtn = document.getElementById('undo-preset-btn');
      if (undoPresetBtn) undoPresetBtn.addEventListener('click', undoPreset);

      // Start Date Input
      const startDateInput = document.getElementById('start-date-input');
      if (startDateInput) {
        startDateInput.addEventListener('change', e => {
          state.startDate = e.target.value;
          updateCalculatorUI();
        });
      }

      // Buttons
      document.getElementById('calc-btn')?.addEventListener('click', handleCalculateClick);
      document.getElementById('reset-btn')?.addEventListener('click', handleResetClick);
      document.getElementById('save-scenario-btn')?.addEventListener('click', openSaveModal);

      // Scenario B Inputs
      const scenBAmt = document.getElementById('scen-b-amount');
      const scenBRate = document.getElementById('scen-b-rate');
      const scenBTenure = document.getElementById('scen-b-tenure');
      if (scenBAmt) scenBAmt.addEventListener('input', () => updateComparisonUI());
      if (scenBRate) scenBRate.addEventListener('input', () => updateComparisonUI());
      if (scenBTenure) scenBTenure.addEventListener('input', () => updateComparisonUI());
      document.getElementById('scen-b-unit-years')?.addEventListener('click', () => switchScenBUnit('years'));
      document.getElementById('scen-b-unit-months')?.addEventListener('click', () => switchScenBUnit('months'));

      document.getElementById('swap-scenarios-btn')?.addEventListener('click', handleSwapScenarios);
      document.getElementById('copy-b-to-calc-btn')?.addEventListener('click', handleCopyBToCalc);
      document.getElementById('reset-comparison-btn')?.addEventListener('click', handleResetComparison);
      document.getElementById('load-saved-b-select')?.addEventListener('change', handleLoadSavedToB);

      // Schedule Controls & Tabs
      document.getElementById('tab-monthly')?.addEventListener('click', () => switchScheduleTab('monthly'));
      document.getElementById('tab-yearly')?.addEventListener('click', () => switchScheduleTab('yearly'));
      document.getElementById('rows-per-page-select')?.addEventListener('change', e => {
        state.scheduleView.rowsPerPage = parseInt(e.target.value, 10);
        state.scheduleView.page = 1;
        renderScheduleUI();
      });
      document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        if (state.scheduleView.page > 1) {
          state.scheduleView.page--;
          renderScheduleUI();
        }
      });
      document.getElementById('next-page-btn')?.addEventListener('click', () => {
        state.scheduleView.page++;
        renderScheduleUI();
      });
      document.getElementById('download-csv-btn')?.addEventListener('click', exportScheduleCSV);
      document.getElementById('print-report-btn')?.addEventListener('click', () => window.print());

      // Prepayment Simulator Inputs
      const extraMInput = document.getElementById('extra-monthly-input');
      const lumpInput = document.getElementById('lump-sum-input');
      const lumpMonthInput = document.getElementById('lump-sum-month-input');
      if (extraMInput) extraMInput.addEventListener('input', () => updatePrepaymentUI());
      if (lumpInput) {
        lumpInput.addEventListener('input', () => {
          const val = calc.parseInputValue(lumpInput.value);
          if (lumpMonthInput) lumpMonthInput.disabled = !calc.isFiniteNumber(val) || val <= 0;
          updatePrepaymentUI();
        });
      }
      if (lumpMonthInput) lumpMonthInput.addEventListener('input', () => updatePrepaymentUI());
      document.getElementById('prep-mode-tenure')?.addEventListener('click', () => switchPrepMode('reduce_tenure'));
      document.getElementById('prep-mode-emi')?.addEventListener('click', () => switchPrepMode('reduce_emi'));
      document.getElementById('reset-sim-btn')?.addEventListener('click', handleResetSim);

      // What-If Slider
      const whatIfSlider = document.getElementById('whatif-rate-slider');
      if (whatIfSlider) {
        whatIfSlider.addEventListener('input', e => {
          state.whatIf.rateDelta = parseFloat(e.target.value);
          updateWhatIfUI();
        });
      }

      // Theme Toggle & Settings Modals
      document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleQuickTheme);
      document.getElementById('settings-btn')?.addEventListener('click', openSettingsModal);

      // Modal Close Buttons
      document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
      });

      document.getElementById('confirm-save-btn')?.addEventListener('click', handleConfirmSaveScenario);
      document.getElementById('confirm-rename-btn')?.addEventListener('click', handleConfirmRenameScenario);
      document.getElementById('confirm-clear-btn')?.addEventListener('click', handleConfirmClearAll);

      // Settings selections
      document.getElementById('setting-theme-select')?.addEventListener('change', e => {
        state.settings.theme = e.target.value;
        saveSettings();
        applyTheme(state.settings.theme);
      });
      document.getElementById('setting-format-select')?.addEventListener('change', e => {
        state.settings.format = e.target.value;
        saveSettings();
        updateCalculatorUI();
        updateComparisonUI();
      });

      // FAQ Accordion
      document.querySelectorAll('.faq-button').forEach(btn => {
        btn.addEventListener('click', () => {
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', !expanded);
          const panel = document.getElementById(btn.getAttribute('aria-controls'));
          if (panel) panel.classList.toggle('open', !expanded);
        });
      });

      // Mobile Menu
      const mobileBtn = document.getElementById('mobile-menu-btn');
      const mobileNav = document.getElementById('mobile-nav');
      if (mobileBtn && mobileNav) {
        mobileBtn.addEventListener('click', () => {
          const open = mobileNav.classList.toggle('open');
          mobileBtn.setAttribute('aria-expanded', open);
        });
      }

      // ESC key to close modals
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeAllModals();
      });
    }

    // --- HANDLERS & INPUT VALIDATION ---
    function handleAmountInput(valStr, isFromSlider) {
      const parsed = calc.parseInputValue(valStr);
      const validation = calc.validateLoanInputs(parsed, state.rate, state.tenure, state.tenureUnit);
      const errorEl = document.getElementById('amount-error');
      const inputEl = document.getElementById('amount-input');
      const sliderEl = document.getElementById('amount-slider');
      const badgeEl = document.getElementById('amount-formatted');

      if (!validation.isValid && validation.errors.amount) {
        errorEl.textContent = validation.errors.amount;
        errorEl.style.display = 'flex';
        inputEl.classList.add('is-invalid');
        inputEl.setAttribute('aria-invalid', 'true');
        renderInvalidState();
      } else {
        errorEl.style.display = 'none';
        inputEl.classList.remove('is-invalid');
        inputEl.removeAttribute('aria-invalid');
        state.amount = parsed;
        if (!isFromSlider && sliderEl) sliderEl.value = Math.min(10000000, Math.max(10000, parsed));
        if (badgeEl) badgeEl.textContent = calc.formatCurrency(parsed, state.settings.format);
        markPresetCustom();
        updateCalculatorUI();
      }
    }

    function handleRateInput(valStr, isFromSlider) {
      const parsed = calc.parseInputValue(valStr);
      const validation = calc.validateLoanInputs(state.amount, parsed, state.tenure, state.tenureUnit);
      const errorEl = document.getElementById('rate-error');
      const inputEl = document.getElementById('rate-input');
      const sliderEl = document.getElementById('rate-slider');
      const badgeEl = document.getElementById('rate-formatted');

      if (!validation.isValid && validation.errors.rate) {
        errorEl.textContent = validation.errors.rate;
        errorEl.style.display = 'flex';
        inputEl.classList.add('is-invalid');
        inputEl.setAttribute('aria-invalid', 'true');
        renderInvalidState();
      } else {
        errorEl.style.display = 'none';
        inputEl.classList.remove('is-invalid');
        inputEl.removeAttribute('aria-invalid');
        state.rate = parsed;
        if (!isFromSlider && sliderEl) sliderEl.value = Math.min(30, Math.max(0, parsed));
        if (badgeEl) badgeEl.textContent = calc.formatPercentage(parsed);
        markPresetCustom();
        updateCalculatorUI();
      }
    }

    function handleTenureInput(valStr, isFromSlider) {
      const parsed = calc.parseInputValue(valStr);
      const validation = calc.validateLoanInputs(state.amount, state.rate, parsed, state.tenureUnit);
      const errorEl = document.getElementById('tenure-error');
      const inputEl = document.getElementById('tenure-input');
      const sliderEl = document.getElementById('tenure-slider');

      if (!validation.isValid && validation.errors.tenure) {
        errorEl.textContent = validation.errors.tenure;
        errorEl.style.display = 'flex';
        inputEl.classList.add('is-invalid');
        inputEl.setAttribute('aria-invalid', 'true');
        renderInvalidState();
      } else {
        errorEl.style.display = 'none';
        inputEl.classList.remove('is-invalid');
        inputEl.removeAttribute('aria-invalid');
        state.tenure = parsed;
        if (!isFromSlider && sliderEl) sliderEl.value = parsed;
        markPresetCustom();
        updateCalculatorUI();
      }
    }

    function formatInputOnBlur(inputEl, fieldType) {
      const val = calc.parseInputValue(inputEl.value);
      if (calc.isFiniteNumber(val)) {
        if (fieldType === 'amount') {
          inputEl.value = calc.formatCurrency(val, state.settings.format).replace('₹', '');
        }
      }
    }

    function stripFormattingOnFocus(inputEl) {
      const val = calc.parseInputValue(inputEl.value);
      if (calc.isFiniteNumber(val)) {
        inputEl.value = val;
      }
    }

    function switchTenureUnit(unit) {
      if (state.tenureUnit === unit) return;
      state.tenureUnit = unit;

      document.getElementById('unit-years-btn').classList.toggle('active', unit === 'years');
      document.getElementById('unit-months-btn').classList.toggle('active', unit === 'months');
      document.getElementById('tenure-unit-label').textContent = unit === 'years' ? 'Years' : 'Months';

      const sliderEl = document.getElementById('tenure-slider');
      const minLabel = document.getElementById('slider-min-label');
      const maxLabel = document.getElementById('slider-max-label');

      if (unit === 'years') {
        const yrs = Math.max(1, Math.round((state.tenure / 12) * 100) / 100);
        state.tenure = yrs;
        document.getElementById('tenure-input').value = yrs;
        if (sliderEl) { sliderEl.min = 1; sliderEl.max = 40; sliderEl.step = 1; sliderEl.value = yrs; }
        if (minLabel) minLabel.textContent = '1 Year';
        if (maxLabel) maxLabel.textContent = '40 Years';
      } else {
        const mths = Math.min(480, Math.max(1, calc.convertTenureToMonths(state.tenure, 'years')));
        state.tenure = mths;
        document.getElementById('tenure-input').value = mths;
        if (sliderEl) { sliderEl.min = 1; sliderEl.max = 480; sliderEl.step = 1; sliderEl.value = mths; }
        if (minLabel) minLabel.textContent = '1 Month';
        if (maxLabel) maxLabel.textContent = '480 Months';
      }

      updateCalculatorUI();
    }

    function applyPreset(presetKey) {
      state.preset = presetKey;
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === presetKey);
      });

      const noticeEl = document.getElementById('preset-applied-notice');
      const noticeText = document.getElementById('preset-notice-text');

      if (presetKey === 'home') {
        setCalcValues(1000000, 8.5, 20, 'years');
        if (noticeEl) { noticeEl.style.display = 'flex'; if (noticeText) noticeText.textContent = 'Home Loan (8.5%, 20y)'; }
      } else if (presetKey === 'car') {
        setCalcValues(500000, 9.0, 5, 'years');
        if (noticeEl) { noticeEl.style.display = 'flex'; if (noticeText) noticeText.textContent = 'Car Loan (9.0%, 5y)'; }
      } else if (presetKey === 'personal') {
        setCalcValues(300000, 12.0, 3, 'years');
        if (noticeEl) { noticeEl.style.display = 'flex'; if (noticeText) noticeText.textContent = 'Personal Loan (12.0%, 3y)'; }
      } else if (presetKey === 'education') {
        setCalcValues(800000, 9.5, 7, 'years');
        if (noticeEl) { noticeEl.style.display = 'flex'; if (noticeText) noticeText.textContent = 'Education Loan (9.5%, 7y)'; }
      } else {
        if (noticeEl) noticeEl.style.display = 'none';
      }
    }

    function setCalcValues(amt, rate, tenure, unit) {
      state.amount = amt;
      state.rate = rate;
      state.tenureUnit = unit;
      state.tenure = tenure;

      const amtInput = document.getElementById('amount-input');
      const amtSlider = document.getElementById('amount-slider');
      const rateInput = document.getElementById('rate-input');
      const rateSlider = document.getElementById('rate-slider');
      const tenureInput = document.getElementById('tenure-input');
      const tenureSlider = document.getElementById('tenure-slider');

      if (amtInput) amtInput.value = calc.formatCurrency(amt, state.settings.format).replace('₹', '');
      if (amtSlider) amtSlider.value = amt;
      if (rateInput) rateInput.value = rate;
      if (rateSlider) rateSlider.value = rate;
      if (tenureInput) tenureInput.value = tenure;
      if (tenureSlider) tenureSlider.value = tenure;

      document.getElementById('amount-formatted').textContent = calc.formatCurrency(amt, state.settings.format);
      document.getElementById('rate-formatted').textContent = calc.formatPercentage(rate);

      updateCalculatorUI();
    }

    function undoPreset() {
      applyPreset('home');
    }

    function markPresetCustom() {
      state.preset = 'custom';
      document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === 'custom');
      });
      const noticeEl = document.getElementById('preset-applied-notice');
      if (noticeEl) noticeEl.style.display = 'none';
    }

    function handleCalculateClick() {
      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) {
        const summaryErrEl = document.getElementById('form-error-summary');
        if (summaryErrEl) {
          summaryErrEl.textContent = 'Please fix the highlighted errors before calculating.';
          summaryErrEl.style.display = 'block';
        }
        return;
      }
      document.getElementById('form-error-summary').style.display = 'none';
      const resultsEl = document.getElementById('results-dashboard');
      if (resultsEl) resultsEl.scrollIntoView({ behavior: 'smooth' });

      announceLiveRegion(`Calculation updated: Monthly EMI is ${calc.formatCurrency(summary.emi, state.settings.format)}.`);
    }

    function handleResetClick() {
      applyPreset(state.settings.defaultPreset || 'home');
      state.whatIf.rateDelta = 0;
      const slider = document.getElementById('whatif-rate-slider');
      if (slider) slider.value = 0;
      announceLiveRegion('Calculator reset to default parameters.');
    }

    // --- CALCULATOR UI UPDATE ---
    function updateCalculatorUI() {
      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) {
        renderInvalidState();
        return;
      }

      // Update Dashboard Cards
      document.getElementById('res-emi-val').textContent = calc.formatCurrency(summary.emi, state.settings.format);
      document.getElementById('res-interest-val').textContent = calc.formatCurrency(summary.totalInterest, state.settings.format);
      document.getElementById('res-interest-pct').textContent = `${summary.interestPercentage.toFixed(1)}% of total repayment`;
      document.getElementById('res-repayment-val').textContent = calc.formatCurrency(summary.totalRepayment, state.settings.format);
      document.getElementById('res-principal-val').textContent = calc.formatCurrency(summary.amount, state.settings.format);
      document.getElementById('res-principal-pct').textContent = `${summary.principalPercentage.toFixed(1)}% of total repayment`;

      // Legend & Composition Bar
      document.getElementById('legend-principal-val').textContent = calc.formatCurrency(summary.amount, state.settings.format);
      document.getElementById('legend-interest-val').textContent = calc.formatCurrency(summary.totalInterest, state.settings.format);
      document.getElementById('comp-bar-principal').style.width = `${summary.principalPercentage.toFixed(1)}%`;
      document.getElementById('comp-bar-interest').style.width = `${summary.interestPercentage.toFixed(1)}%`;
      document.getElementById('comp-label-principal').textContent = `Principal: ${summary.principalPercentage.toFixed(1)}%`;
      document.getElementById('comp-label-interest').textContent = `Interest: ${summary.interestPercentage.toFixed(1)}%`;

      drawDoughnutChart();
      updateComparisonUI();
      renderScheduleUI();
      updatePrepaymentUI();
      updateInsightsUI();
      updateWorkedExampleUI();
      debouncedPoliteAnnouncement(`Monthly EMI is ${calc.formatCurrency(summary.emi, state.settings.format)}`);
    }

    function renderInvalidState() {
      document.getElementById('res-emi-val').textContent = '—';
      document.getElementById('res-interest-val').textContent = '—';
      document.getElementById('res-repayment-val').textContent = '—';
      document.getElementById('res-principal-val').textContent = '—';
      drawDoughnutChart(true);
    }

    function debouncedPoliteAnnouncement(msg) {
      clearTimeout(politeDebounceTimer);
      politeDebounceTimer = setTimeout(() => {
        announceLiveRegion(msg);
      }, 600);
    }

    function announceLiveRegion(msg) {
      const liveEl = document.getElementById('polite-live-region');
      if (liveEl) liveEl.textContent = msg;
    }

    // --- CANVAS DOUGHNUT CHART ---
    function drawDoughnutChart(isInvalid = false) {
      const canvas = document.getElementById('doughnut-chart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = (rect.width || 300) * dpr;
      canvas.height = (rect.height || 300) * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width || 300;
      const height = rect.height || 300;
      const centerX = width / 2;
      const centerY = height / 2;
      const outerRadius = Math.min(width, height) / 2 - 10;
      const innerRadius = outerRadius * 0.65;

      ctx.clearRect(0, 0, width, height);

      if (isInvalid) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, 0, 2 * Math.PI);
        ctx.arc(centerX, centerY, innerRadius, 2 * Math.PI, 0, true);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#e2e8f0';
        ctx.fill();
        return;
      }

      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) return;

      const principalAngle = (summary.principalPercentage / 100) * 2 * Math.PI;
      const interestAngle = (summary.interestPercentage / 100) * 2 * Math.PI;

      const colorPrincipal = getComputedStyle(document.documentElement).getPropertyValue('--chart-principal').trim() || '#E43D12';
      const colorInterest = getComputedStyle(document.documentElement).getPropertyValue('--chart-interest').trim() || '#D6536D';

      // Principal Arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, -Math.PI / 2, -Math.PI / 2 + principalAngle);
      ctx.arc(centerX, centerY, innerRadius, -Math.PI / 2 + principalAngle, -Math.PI / 2, true);
      ctx.fillStyle = colorPrincipal;
      ctx.fill();

      // Interest Arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, -Math.PI / 2 + principalAngle, -Math.PI / 2 + principalAngle + interestAngle);
      ctx.arc(centerX, centerY, innerRadius, -Math.PI / 2 + principalAngle + interestAngle, -Math.PI / 2 + principalAngle, true);
      ctx.fillStyle = colorInterest;
      ctx.fill();

      // Center Text
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#172033';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Total Repayment', centerX, centerY - 12);

      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.fillText(calc.formatCompactCurrency(summary.totalRepayment), centerX, centerY + 12);
    }

    // --- LOAN COMPARISON UI & GROUPED BAR CHART ---
    function updateComparisonUI() {
      const summaryA = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (summaryA.isValid) {
        document.getElementById('scen-a-amount').textContent = calc.formatCurrency(summaryA.amount, state.settings.format);
        document.getElementById('scen-a-rate').textContent = `${summaryA.rate}% p.a.`;
        document.getElementById('scen-a-tenure').textContent = `${state.tenure} ${state.tenureUnit} (${summaryA.totalMonths} months)`;
        document.getElementById('scen-a-emi').textContent = calc.formatCurrency(summaryA.emi, state.settings.format);
        document.getElementById('scen-a-interest').textContent = calc.formatCurrency(summaryA.totalInterest, state.settings.format);
        document.getElementById('scen-a-repayment').textContent = calc.formatCurrency(summaryA.totalRepayment, state.settings.format);
      }

      // Scenario B Inputs
      const bAmtStr = document.getElementById('scen-b-amount')?.value;
      const bRateStr = document.getElementById('scen-b-rate')?.value;
      const bTenureStr = document.getElementById('scen-b-tenure')?.value;

      const summaryB = calc.calculateLoanSummary(bAmtStr, bRateStr, bTenureStr, state.scenarioB.tenureUnit);
      if (!summaryB.isValid) return;

      const comp = calc.compareLoanScenarios(summaryA, summaryB);
      if (!comp) return;

      const diffEmiEl = document.getElementById('diff-emi-val');
      const diffIntEl = document.getElementById('diff-interest-val');
      const diffSavEl = document.getElementById('diff-savings-val');
      const analysisTextEl = document.getElementById('comparison-analysis-text');

      if (diffEmiEl) {
        const emiDiffStr = (comp.emiDiff >= 0 ? '+' : '') + calc.formatCurrency(comp.emiDiff, state.settings.format);
        diffEmiEl.textContent = emiDiffStr;
        diffEmiEl.className = 'diff-val ' + (comp.emiDiff > 0 ? 'positive' : 'negative');
      }

      if (diffIntEl) {
        const intDiffStr = (comp.interestDiff >= 0 ? '+' : '') + calc.formatCurrency(comp.interestDiff, state.settings.format);
        diffIntEl.textContent = intDiffStr;
        diffIntEl.className = 'diff-val ' + (comp.interestDiff > 0 ? 'positive' : 'negative');
      }

      if (diffSavEl) {
        diffSavEl.textContent = `${calc.formatCurrency(comp.potentialSavings, state.settings.format)} (Scenario ${comp.lowerRepaymentScenario})`;
      }

      if (analysisTextEl) {
        if (summaryA.amount !== summaryB.amount) {
          analysisTextEl.textContent = `Note: Principal amounts differ (${calc.formatCompactCurrency(summaryA.amount)} vs ${calc.formatCompactCurrency(summaryB.amount)}). Overall totals are not strictly like-for-like.`;
        } else if (comp.lowerRepaymentScenario === 'B') {
          analysisTextEl.textContent = `Scenario B yields a total repayment savings of ${calc.formatCurrency(comp.potentialSavings, state.settings.format)}.`;
        } else {
          analysisTextEl.textContent = `Scenario A yields a total repayment savings of ${calc.formatCurrency(comp.potentialSavings, state.settings.format)}.`;
        }
      }

      drawComparisonBarChart(summaryA, summaryB);
    }

    function switchScenBUnit(unit) {
      state.scenarioB.tenureUnit = unit;
      document.getElementById('scen-b-unit-years')?.classList.toggle('active', unit === 'years');
      document.getElementById('scen-b-unit-months')?.classList.toggle('active', unit === 'months');
      updateComparisonUI();
    }

    function handleSwapScenarios() {
      const bAmt = document.getElementById('scen-b-amount')?.value;
      const bRate = document.getElementById('scen-b-rate')?.value;
      const bTenure = document.getElementById('scen-b-tenure')?.value;

      // Copy Scenario A values to B
      document.getElementById('scen-b-amount').value = calc.formatCurrency(state.amount, state.settings.format).replace('₹', '');
      document.getElementById('scen-b-rate').value = state.rate;
      document.getElementById('scen-b-tenure').value = state.tenure;

      // Set Calculator to old B
      setCalcValues(calc.parseInputValue(bAmt), calc.parseInputValue(bRate), calc.parseInputValue(bTenure), state.scenarioB.tenureUnit);
      announceLiveRegion('Scenarios swapped.');
    }

    function handleCopyBToCalc() {
      const bAmt = document.getElementById('scen-b-amount')?.value;
      const bRate = document.getElementById('scen-b-rate')?.value;
      const bTenure = document.getElementById('scen-b-tenure')?.value;

      setCalcValues(calc.parseInputValue(bAmt), calc.parseInputValue(bRate), calc.parseInputValue(bTenure), state.scenarioB.tenureUnit);
      announceLiveRegion('Scenario B copied to main calculator.');
    }

    function handleResetComparison() {
      document.getElementById('scen-b-amount').value = '10,00,000';
      document.getElementById('scen-b-rate').value = '9.5';
      document.getElementById('scen-b-tenure').value = '15';
      switchScenBUnit('years');
      updateComparisonUI();
    }

    function handleLoadSavedToB(e) {
      const id = e.target.value;
      if (!id) return;
      const item = state.savedScenarios.find(s => s.id === id);
      if (item) {
        document.getElementById('scen-b-amount').value = calc.formatCurrency(item.amount, state.settings.format).replace('₹', '');
        document.getElementById('scen-b-rate').value = item.rate;
        document.getElementById('scen-b-tenure').value = item.tenureMonths;
        switchScenBUnit('months');
        updateComparisonUI();
      }
    }

    function drawComparisonBarChart(sumA, sumB) {
      const canvas = document.getElementById('comparison-bar-chart');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = (rect.width || 500) * dpr;
      canvas.height = (rect.height || 220) * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width || 500;
      const height = rect.height || 220;

      ctx.clearRect(0, 0, width, height);
      if (!sumA || !sumB) return;

      const maxVal = Math.max(sumA.totalRepayment, sumB.totalRepayment) * 1.15;
      const barWidth = 35;
      const gap = 15;
      const groupWidth = barWidth * 2 + gap;

      const categories = ['EMI', 'Total Interest', 'Total Repayment'];
      const dataA = [sumA.emi, sumA.totalInterest, sumA.totalRepayment];
      const dataB = [sumB.emi, sumB.totalInterest, sumB.totalRepayment];

      const startX = 60;
      const chartHeight = height - 40;

      const colorA = getComputedStyle(document.documentElement).getPropertyValue('--chart-principal').trim() || '#E43D12';
      const colorB = getComputedStyle(document.documentElement).getPropertyValue('--chart-interest').trim() || '#D6536D';

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#64748b';

      for (let i = 0; i < categories.length; i++) {
        const x = startX + i * ((width - startX) / 3) + 20;

        // Bar A
        const hA = (dataA[i] / maxVal) * chartHeight;
        ctx.fillStyle = colorA;
        ctx.fillRect(x, height - 25 - hA, barWidth, hA);

        // Bar B
        const hB = (dataB[i] / maxVal) * chartHeight;
        ctx.fillStyle = colorB;
        ctx.fillRect(x + barWidth + gap, height - 25 - hB, barWidth, hB);

        // Label
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#172033';
        ctx.textAlign = 'center';
        ctx.fillText(categories[i], x + barWidth + gap / 2, height - 8);
      }
    }

    // --- AMORTIZATION SCHEDULE UI & LAZY GENERATION ---
    function renderScheduleUI() {
      const tbody = document.getElementById('schedule-tbody');
      const tfoot = document.getElementById('schedule-tfoot');
      const pageInfo = document.getElementById('page-info');
      const prevBtn = document.getElementById('prev-page-btn');
      const nextBtn = document.getElementById('next-page-btn');
      if (!tbody) return;

      const data = calc.generateAmortizationSchedule(state.amount, state.rate, state.tenureUnit === 'years' ? state.tenure * 12 : state.tenure, state.startDate);
      if (!data) return;

      tbody.innerHTML = '';
      tfoot.innerHTML = '';

      if (state.scheduleView.type === 'monthly') {
        const totalRows = data.schedule.length;
        const totalPages = Math.ceil(totalRows / state.scheduleView.rowsPerPage);
        state.scheduleView.page = Math.min(state.scheduleView.page, totalPages);

        const startIdx = (state.scheduleView.page - 1) * state.scheduleView.rowsPerPage;
        const endIdx = Math.min(startIdx + state.scheduleView.rowsPerPage, totalRows);
        const pageRows = data.schedule.slice(startIdx, endIdx);

        pageRows.forEach(row => {
          const tr = document.createElement('tr');
          if (row.paymentNo === totalRows) tr.className = 'final-row';
          tr.innerHTML = `
            <td>${row.paymentNo} ${row.paymentNo === totalRows ? '<span class="badge" style="background:var(--primary);color:white;font-size:0.7rem;margin-left:4px;">Final</span>' : ''}</td>
            <td>${row.monthStr}</td>
            <td>${calc.formatCurrency(row.openingBalance, state.settings.format)}</td>
            <td>${calc.formatCurrency(row.emi, state.settings.format)}</td>
            <td>${calc.formatCurrency(row.principalPaid, state.settings.format)}</td>
            <td>${calc.formatCurrency(row.interestPaid, state.settings.format)}</td>
            <td>${calc.formatCurrency(row.closingBalance, state.settings.format)}</td>
          `;
          tbody.appendChild(tr);
        });

        if (pageInfo) pageInfo.textContent = `Page ${state.scheduleView.page} of ${totalPages} (${totalRows} payments)`;
        if (prevBtn) prevBtn.disabled = state.scheduleView.page <= 1;
        if (nextBtn) nextBtn.disabled = state.scheduleView.page >= totalPages;

      } else {
        // Yearly Summary View
        const yearlyGroups = {};
        data.schedule.forEach(row => {
          const year = row.monthStr.split(' ')[1] || 'Year';
          if (!yearlyGroups[year]) {
            yearlyGroups[year] = { year, opening: row.openingBalance, emi: 0, principal: 0, interest: 0, closing: 0 };
          }
          yearlyGroups[year].emi += row.emi;
          yearlyGroups[year].principal += row.principalPaid;
          yearlyGroups[year].interest += row.interestPaid;
          yearlyGroups[year].closing = row.closingBalance;
        });

        Object.values(yearlyGroups).forEach((yr, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>Year ${idx + 1}</td>
            <td>${yr.year}</td>
            <td>${calc.formatCurrency(yr.opening, state.settings.format)}</td>
            <td>${calc.formatCurrency(yr.emi, state.settings.format)}</td>
            <td>${calc.formatCurrency(yr.principal, state.settings.format)}</td>
            <td>${calc.formatCurrency(yr.interest, state.settings.format)}</td>
            <td>${calc.formatCurrency(yr.closing, state.settings.format)}</td>
          `;
          tbody.appendChild(tr);
        });

        if (pageInfo) pageInfo.textContent = `Yearly Summary (${Object.keys(yearlyGroups).length} Years)`;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
      }

      // Reconciled Totals Row
      const footTr = document.createElement('tr');
      footTr.className = 'total-row';
      footTr.innerHTML = `
        <td colspan="3" style="text-align:left;">TOTAL RECONCILIATION</td>
        <td>${calc.formatCurrency(data.totalRepayment, state.settings.format)}</td>
        <td>${calc.formatCurrency(data.totalPrincipalPaid, state.settings.format)}</td>
        <td>${calc.formatCurrency(data.totalInterestPaid, state.settings.format)}</td>
        <td>₹0.00</td>
      `;
      tfoot.appendChild(footTr);
    }

    function switchScheduleTab(tabType) {
      state.scheduleView.type = tabType;
      document.getElementById('tab-monthly')?.classList.toggle('active', tabType === 'monthly');
      document.getElementById('tab-yearly')?.classList.toggle('active', tabType === 'yearly');
      state.scheduleView.page = 1;
      renderScheduleUI();
    }

    // --- PREPAYMENT SIMULATOR UI ---
    function updatePrepaymentUI() {
      const extraMStr = document.getElementById('extra-monthly-input')?.value;
      const lumpStr = document.getElementById('lump-sum-input')?.value;
      const lumpMonthStr = document.getElementById('lump-sum-month-input')?.value;

      const extraM = calc.parseInputValue(extraMStr) || 0;
      const lump = calc.parseInputValue(lumpStr) || 0;
      const lumpMonth = parseInt(lumpMonthStr, 10) || 12;

      const totalMonths = state.tenureUnit === 'years' ? state.tenure * 12 : state.tenure;
      const simRes = calc.simulatePrepayment(state.amount, state.rate, totalMonths, extraM, lump, lumpMonth, state.prepayment.mode);
      if (!simRes) return;

      const newTenureEl = document.getElementById('sim-new-tenure');
      const timeSavedEl = document.getElementById('sim-time-saved');
      const intSavedEl = document.getElementById('sim-interest-saved');
      const newRepayEl = document.getElementById('sim-new-repayment');

      if (newTenureEl) {
        if (state.prepayment.mode === 'reduce_tenure') {
          const yrs = Math.floor(simRes.newMonths / 12);
          const mos = simRes.newMonths % 12;
          newTenureEl.textContent = `${yrs} yrs ${mos} mos`;
        } else {
          newTenureEl.textContent = `${(totalMonths / 12).toFixed(1)} yrs (EMI: ${calc.formatCurrency(simRes.newEMI, state.settings.format)})`;
        }
      }

      if (timeSavedEl) {
        const yrsSaved = Math.floor(simRes.monthsSaved / 12);
        const mosSaved = simRes.monthsSaved % 12;
        timeSavedEl.textContent = simRes.monthsSaved > 0 ? `${yrsSaved} yrs ${mosSaved} mos` : '0 Months';
      }

      if (intSavedEl) intSavedEl.textContent = calc.formatCurrency(simRes.interestSaved, state.settings.format);
      if (newRepayEl) newRepayEl.textContent = calc.formatCurrency(simRes.newTotalRepayment, state.settings.format);
    }

    function switchPrepMode(mode) {
      state.prepayment.mode = mode;
      document.getElementById('prep-mode-tenure')?.classList.toggle('active', mode === 'reduce_tenure');
      document.getElementById('prep-mode-emi')?.classList.toggle('active', mode === 'reduce_emi');
      updatePrepaymentUI();
    }

    function handleResetSim() {
      document.getElementById('extra-monthly-input').value = '0';
      document.getElementById('lump-sum-input').value = '0';
      const monthInput = document.getElementById('lump-sum-month-input');
      if (monthInput) { monthInput.value = '12'; monthInput.disabled = true; }
      switchPrepMode('reduce_tenure');
    }

    // --- INSIGHTS & WHAT-IF SLIDER ---
    function updateInsightsUI() {
      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) return;

      const ratioEl = document.getElementById('insight-ratio-text');
      if (ratioEl) {
        ratioEl.textContent = `You are paying ${calc.formatCurrency(summary.interestToPrincipalRatio, state.settings.format).replace('.00', '')} in interest for every ₹1.00 borrowed.`;
      }

      // 50% Principal Milestone
      const schedData = calc.generateAmortizationSchedule(state.amount, state.rate, summary.totalMonths, state.startDate);
      if (schedData) {
        const halfP = summary.amount / 2;
        const row50 = schedData.schedule.find(r => (summary.amount - r.closingBalance) >= halfP);
        const milestoneEl = document.getElementById('insight-milestone-text');
        if (milestoneEl && row50) {
          milestoneEl.textContent = `50% of loan principal will be repaid by Payment #${row50.paymentNo} (${row50.monthStr}).`;
        }
      }

      // Rate Sensitivity (+1%)
      const plusOneSummary = calc.calculateLoanSummary(state.amount, state.rate + 1, state.tenure, state.tenureUnit);
      const rateImpactEl = document.getElementById('insight-rate-impact-text');
      if (rateImpactEl && plusOneSummary.isValid) {
        const emiDiff = plusOneSummary.emi - summary.emi;
        const intDiff = plusOneSummary.totalInterest - summary.totalInterest;
        rateImpactEl.textContent = `A +1% rate hike increases EMI by ${calc.formatCurrency(emiDiff, state.settings.format)}/mo and total interest by ${calc.formatCompactCurrency(intDiff)}.`;
      }

      updateWhatIfUI();
    }

    function updateWhatIfUI() {
      const effectiveRate = Math.max(0, state.rate + state.whatIf.rateDelta);
      const summary = calc.calculateLoanSummary(state.amount, effectiveRate, state.tenure, state.tenureUnit);
      if (!summary.isValid) return;

      const valBadge = document.getElementById('whatif-rate-val');
      if (valBadge) {
        const sign = state.whatIf.rateDelta > 0 ? '+' : '';
        valBadge.textContent = `${sign}${state.whatIf.rateDelta.toFixed(2)}% change (${effectiveRate.toFixed(2)}%)`;
      }

      document.getElementById('whatif-emi-val').textContent = calc.formatCurrency(summary.emi, state.settings.format);
      document.getElementById('whatif-interest-val').textContent = calc.formatCurrency(summary.totalInterest, state.settings.format);
    }

    function updateWorkedExampleUI() {
      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) return;

      const R = summary.rate / 12 / 100;
      const month1Interest = summary.amount * R;
      const month1Principal = summary.emi - month1Interest;

      const textEl = document.getElementById('worked-example-text');
      if (textEl) {
        textEl.textContent = `For your current input of ${calc.formatCurrency(summary.amount, state.settings.format)} at ${summary.rate}% p.a. for ${summary.totalMonths} months: R = ${R.toFixed(6)}, EMI = ${calc.formatCurrency(summary.emi, state.settings.format)}. In Month 1, ${calc.formatCurrency(month1Interest, state.settings.format)} goes toward interest and ${calc.formatCurrency(month1Principal, state.settings.format)} toward principal reduction.`;
      }
    }

    // --- SAVED CALCULATIONS MANAGEMENT ---
    function openSaveModal() {
      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) return;

      const input = document.getElementById('save-scenario-name');
      if (input) input.value = `Scenario – ${calc.formatCompactCurrency(summary.amount)}`;
      openModal('save-modal');
    }

    function handleConfirmSaveScenario() {
      const nameInput = document.getElementById('save-scenario-name');
      const name = nameInput ? nameInput.value.trim() : 'Loan Scenario';
      if (!name) return;

      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) return;

      const newScenario = {
        id: 'scen_' + Date.now(),
        name,
        amount: summary.amount,
        rate: summary.rate,
        tenureMonths: summary.totalMonths,
        emi: summary.emi,
        totalInterest: summary.totalInterest,
        totalRepayment: summary.totalRepayment,
        savedAt: new Date().toISOString().split('T')[0]
      };

      state.savedScenarios.unshift(newScenario);
      if (state.savedScenarios.length > 50) state.savedScenarios.pop();

      saveSavedScenarios();
      renderSavedScenariosUI();
      closeAllModals();
      announceLiveRegion(`Saved scenario "${name}".`);
    }

    function renderSavedScenariosUI() {
      const listEl = document.getElementById('saved-scenarios-list');
      const selectBEl = document.getElementById('load-saved-b-select');
      if (!listEl) return;

      listEl.innerHTML = '';
      if (selectBEl) {
        selectBEl.innerHTML = '<option value="">Load Saved Scenario into B...</option>';
      }

      if (state.savedScenarios.length === 0) {
        listEl.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1;">No saved calculations found. Click "Save Scenario" above to keep your calculations.</p>';
        return;
      }

      state.savedScenarios.forEach(item => {
        const card = document.createElement('div');
        card.className = 'saved-card';
        card.innerHTML = `
          <div>
            <div class="saved-title-row">
              <span class="saved-title">${calc.escapeHTML(item.name)}</span>
              <span class="saved-date">${item.savedAt}</span>
            </div>
            <div class="saved-details">
              ${calc.formatCurrency(item.amount, state.settings.format)} @ ${item.rate}% for ${item.tenureMonths} mos<br>
              <strong>EMI: ${calc.formatCurrency(item.emi, state.settings.format)}</strong>
            </div>
          </div>
          <div class="saved-actions">
            <button type="button" class="btn btn-primary btn-sm load-scen-btn" data-id="${item.id}">Load</button>
            <button type="button" class="btn btn-secondary btn-sm rename-scen-btn" data-id="${item.id}">Rename</button>
            <button type="button" class="btn btn-danger btn-sm del-scen-btn" data-id="${item.id}">Delete</button>
          </div>
        `;
        listEl.appendChild(card);

        if (selectBEl) {
          const opt = document.createElement('option');
          opt.value = item.id;
          opt.textContent = item.name;
          selectBEl.appendChild(opt);
        }
      });

      // Bind dynamic actions
      listEl.querySelectorAll('.load-scen-btn').forEach(b => {
        b.addEventListener('click', () => {
          const item = state.savedScenarios.find(s => s.id === b.dataset.id);
          if (item) setCalcValues(item.amount, item.rate, item.tenureMonths, 'months');
        });
      });

      listEl.querySelectorAll('.rename-scen-btn').forEach(b => {
        b.addEventListener('click', () => {
          state.activeRenameId = b.dataset.id;
          const item = state.savedScenarios.find(s => s.id === b.dataset.id);
          const renameInput = document.getElementById('rename-scenario-name');
          if (item && renameInput) renameInput.value = item.name;
          openModal('rename-modal');
        });
      });

      listEl.querySelectorAll('.del-scen-btn').forEach(b => {
        b.addEventListener('click', () => {
          state.savedScenarios = state.savedScenarios.filter(s => s.id !== b.dataset.id);
          saveSavedScenarios();
          renderSavedScenariosUI();
        });
      });
    }

    function handleConfirmRenameScenario() {
      if (!state.activeRenameId) return;
      const renameInput = document.getElementById('rename-scenario-name');
      const newName = renameInput ? renameInput.value.trim() : '';
      if (!newName) return;

      const item = state.savedScenarios.find(s => s.id === state.activeRenameId);
      if (item) {
        item.name = newName;
        saveSavedScenarios();
        renderSavedScenariosUI();
      }
      closeAllModals();
    }

    function handleConfirmClearAll() {
      state.savedScenarios = [];
      saveSavedScenarios();
      renderSavedScenariosUI();
      closeAllModals();
      announceLiveRegion('All saved scenarios cleared.');
    }

    // --- CSV EXPORTER (UTF-8 BOM) ---
    function exportScheduleCSV() {
      const summary = calc.calculateLoanSummary(state.amount, state.rate, state.tenure, state.tenureUnit);
      if (!summary.isValid) {
        alert('Cannot export CSV with invalid loan inputs.');
        return;
      }

      const totalMonths = summary.totalMonths;
      const schedData = calc.generateAmortizationSchedule(summary.amount, summary.rate, totalMonths, state.startDate);
      if (!schedData) return;

      let csv = '\uFEFF'; // UTF-8 BOM
      csv += `EMI Pro Loan Amortization Schedule\n`;
      csv += `Generated Date,${new Date().toISOString().split('T')[0]}\n`;
      csv += `Principal Amount,${summary.amount}\n`;
      csv += `Annual Interest Rate,${summary.rate}%\n`;
      csv += `Tenure (Months),${totalMonths}\n`;
      csv += `Monthly EMI,${summary.emi.toFixed(2)}\n`;
      csv += `Total Interest,${summary.totalInterest.toFixed(2)}\n`;
      csv += `Total Repayment,${summary.totalRepayment.toFixed(2)}\n\n`;

      csv += `Payment No,Payment Month,Opening Balance,EMI,Principal Paid,Interest Paid,Closing Balance\n`;

      schedData.schedule.forEach(r => {
        csv += `${r.paymentNo},"${r.monthStr}",${r.openingBalance.toFixed(2)},${r.emi.toFixed(2)},${r.principalPaid.toFixed(2)},${r.interestPaid.toFixed(2)},${r.closingBalance.toFixed(2)}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `emi-pro-schedule-${summary.amount}-${summary.rate}pct-${totalMonths}m.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    // --- MODAL DIALOG MANAGEMENT ---
    function openModal(modalId) {
      const modal = document.getElementById(modalId);
      if (modal) {
        modal.classList.add('active');
        const firstInput = modal.querySelector('input, button');
        if (firstInput) firstInput.focus();
      }
    }

    function closeAllModals() {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    }

    function openSettingsModal() {
      document.getElementById('setting-theme-select').value = state.settings.theme;
      document.getElementById('setting-format-select').value = state.settings.format;
      document.getElementById('setting-preset-select').value = state.settings.defaultPreset;
      openModal('settings-modal');
    }

    function toggleQuickTheme() {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      state.settings.theme = next;
      saveSettings();
      applyTheme(next);
    }
  }

  return {
    calc
  };
});
