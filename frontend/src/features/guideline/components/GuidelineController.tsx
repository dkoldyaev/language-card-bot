import { type Driver, driver } from 'driver.js';
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../../../shared/i18n';
import '../guideline.css';
import { useGuidelineStore } from '../store/useGuidelineStore';
import type { GuidelineStep } from '../types';

interface StepConfig {
  selector: string;
  titleKey: string;
  descKey: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  showNextBtn?: boolean;
}

const STEP_CONFIGS: Record<GuidelineStep, StepConfig> = {
  step0_locale: {
    selector: '[data-tour="locale-switcher"]',
    titleKey: 'guideline.step0.title',
    descKey: 'guideline.step0.desc',
    side: 'left',
    align: 'start',
    showNextBtn: true,
  },
  step1_dict_selector: {
    selector: '[data-tour="dictionary-selector"]',
    titleKey: 'guideline.step1.title',
    descKey: 'guideline.step1.desc',
    side: 'bottom',
    align: 'start',
    showNextBtn: true,
  },
  step2_create_dict_menu: {
    selector: '[data-tour="dictionary-menu-paper"]',
    titleKey: 'guideline.step2.title',
    descKey: 'guideline.step2.desc',
    side: 'bottom',
    align: 'center',
    showNextBtn: false,
  },
  step2_create_dict_dialog: {
    selector: '[data-tour="create-dictionary-dialog-paper"]',
    titleKey: 'guideline.step2_dialog.title',
    descKey: 'guideline.step2_dialog.desc',
    side: 'right',
    align: 'start',
    showNextBtn: false,
  },
  step3_select_preset: {
    selector: '[data-tour="preset-apply-btn"]',
    titleKey: 'guideline.step3.title',
    descKey: 'guideline.step3.desc',
    side: 'top',
    align: 'end',
    showNextBtn: false,
  },
  step4_nav_quiz: {
    selector: '[data-tour="nav-quiz"]',
    titleKey: 'guideline.step4_nav.title',
    descKey: 'guideline.step4_nav.desc',
    side: 'right',
    align: 'center',
    showNextBtn: false,
  },
  step4_start_quiz: {
    selector: '[data-tour="start-quiz-btn"]',
    titleKey: 'guideline.step4_start.title',
    descKey: 'guideline.step4_start.desc',
    side: 'top',
    align: 'center',
    showNextBtn: false,
  },
  completed: {
    selector: 'body',
    titleKey: 'guideline.finish.title',
    descKey: 'guideline.finish.desc',
    side: 'bottom',
    align: 'center',
    showNextBtn: false,
  },
};

export default function GuidelineController() {
  const { t } = useTranslation();
  const location = useLocation();

  const isActive = useGuidelineStore((state) => state.isActive);
  const isCompleted = useGuidelineStore((state) => state.isCompleted);
  const currentStep = useGuidelineStore((state) => state.currentStep);
  const isStepDismissed = useGuidelineStore((state) => state.isStepDismissed);
  const startGuideline = useGuidelineStore((state) => state.startGuideline);
  const resetGuideline = useGuidelineStore((state) => state.resetGuideline);
  const advanceStep = useGuidelineStore((state) => state.advanceStep);
  const closeGuideline = useGuidelineStore((state) => state.closeGuideline);

  const driverInstanceRef = useRef<Driver | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Restart guideline if ?tour=1 is in URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('tour') === '1') {
      resetGuideline();
      window.history.replaceState({}, '', location.pathname);
    }
  }, [location.search, location.pathname, resetGuideline]);

  // Initialize guideline on main page if not completed
  useEffect(() => {
    if (isCompleted || isActive) return;

    // Only start on main page
    if (location.pathname !== '/') return;

    // Delay slightly for initial render and data fetch to settle
    const timer = setTimeout(() => {
      startGuideline();
    }, 700);
    return () => clearTimeout(timer);
  }, [isCompleted, isActive, location.pathname, startGuideline]);

  // Clean up driver on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (driverInstanceRef.current?.isActive()) {
        driverInstanceRef.current.destroy();
      }
    };
  }, []);

  // Update Driver.js step when currentStep or isActive changes
  useEffect(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (!isActive || !currentStep || isStepDismissed) {
      if (driverInstanceRef.current?.isActive()) {
        driverInstanceRef.current.destroy();
      }
      return;
    }

    if ((currentStep as any) === 'step4_start_quiz') {
      advanceStep('step4_start_quiz');
      return;
    }

    const config = STEP_CONFIGS[currentStep];
    if (!config) return;

    // Destroy existing overlay if step changed
    if (driverInstanceRef.current?.isActive()) {
      driverInstanceRef.current.destroy();
    }

    const driverObj = driver({
      animate: true,
      overlayColor: 'rgba(15, 23, 42, 0.65)',
      stagePadding: 6,
      stageRadius: 10,
      popoverOffset: 14,
      popoverClass: 'cardbot-tour-popover',
      allowClose: true,
      disableActiveInteraction: false,
      onCloseClick: () => {
        closeGuideline();
      },
      onDestroyStarted: () => {
        // Driver destroyed by user or ESC
      },
    });

    driverInstanceRef.current = driverObj;

    const findAndHighlight = (attemptsLeft = 20) => {
      // Check if driver is still relevant
      const currentActive = useGuidelineStore.getState().isActive;
      const stepNow = useGuidelineStore.getState().currentStep;
      if (!currentActive || stepNow !== currentStep) {
        return;
      }

      // Handle final step completion dialog
      if (currentStep === 'completed') {
        driverObj.highlight({
          popover: {
            title: t(config.titleKey),
            description: t(config.descKey),
            doneBtnText: t('guideline.buttons.finish'),
            showButtons: ['close'],
            onCloseClick: () => {
              closeGuideline();
            },
          },
        });
        return;
      }

      const getTargetEl = () => {
        if (currentStep === 'step0_locale') {
          const menuPaper = document.querySelector('[data-tour="locale-menu-paper"]');
          if (menuPaper && menuPaper instanceof HTMLElement && menuPaper.getBoundingClientRect().height > 20) {
            return menuPaper;
          }
        }
        return document.querySelector(config.selector);
      };

      const el = getTargetEl();
      if (el && el instanceof HTMLElement) {
        const rect = el.getBoundingClientRect();
        // Wait until element has rendered height (prevents measuring unmounted or zero-size nodes)
        if (rect.height < 20 && attemptsLeft > 0) {
          retryTimeoutRef.current = setTimeout(() => {
            findAndHighlight(attemptsLeft - 1);
          }, 50);
          return;
        }

        // Element found! Highlight it
        const buttonsToShow: ('next' | 'close')[] = config.showNextBtn ? ['next', 'close'] : ['close'];

        driverObj.highlight({
          element: el,
          popover: {
            title: t(config.titleKey),
            description: t(config.descKey),
            side: config.side,
            align: config.align,
            showButtons: buttonsToShow,
            nextBtnText: t('guideline.buttons.next'),
            onNextClick: () => {
              advanceStep(currentStep);
            },
            onCloseClick: () => {
              closeGuideline();
            },
          },
        });

        // Automatically sync highlight/popover geometry on any subsequent size changes
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
        const ro = new ResizeObserver(() => {
          if (driverInstanceRef.current?.isActive()) {
            driverInstanceRef.current.refresh();
          }
        });
        ro.observe(el);
        resizeObserverRef.current = ro;
      } else if (attemptsLeft > 0) {
        // Wait and retry for dynamic elements (e.g. open menu, dialog, or presets loading)
        retryTimeoutRef.current = setTimeout(() => {
          findAndHighlight(attemptsLeft - 1);
        }, 150);
      }
    };

    // Watch for language menu opening/closing during step0_locale to switch focus zone
    let localeObserver: MutationObserver | null = null;
    if (currentStep === 'step0_locale') {
      localeObserver = new MutationObserver(() => {
        const activeEl = driverInstanceRef.current?.getActiveElement();
        const menuPaper = document.querySelector('[data-tour="locale-menu-paper"]');
        const isMenuOpen = Boolean(menuPaper && menuPaper instanceof HTMLElement && menuPaper.getBoundingClientRect().height > 20);
        const desiredEl = isMenuOpen ? menuPaper : document.querySelector('[data-tour="locale-switcher"]');
        if (desiredEl && desiredEl !== activeEl) {
          findAndHighlight();
        }
      });
      localeObserver.observe(document.body, { childList: true, subtree: true });
    }

    // For step2_create_dict_dialog: automatically dismiss tour step when user interacts with or focuses on any input
    let focusCleanup: (() => void) | null = null;
    if (currentStep === 'step2_create_dict_dialog') {
      const handleInputFocus = (e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const isInputField =
          target.matches('input, select, textarea, [role="combobox"], .MuiSelect-select, .MuiInputBase-input') ||
          Boolean(target.closest('.MuiInputBase-root'));
        if (isInputField) {
          useGuidelineStore.getState().dismissCurrentStep();
        }
      };

      const timer = setTimeout(() => {
        document.addEventListener('focusin', handleInputFocus, true);
        document.addEventListener('pointerdown', handleInputFocus, true);
      }, 250);

      focusCleanup = () => {
        clearTimeout(timer);
        document.removeEventListener('focusin', handleInputFocus, true);
        document.removeEventListener('pointerdown', handleInputFocus, true);
      };
    }

    // Small delay to allow any current render / transition to mount DOM element
    const initialTimer = setTimeout(() => {
      findAndHighlight();
    }, 50);

    return () => {
      clearTimeout(initialTimer);
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      if (localeObserver) {
        localeObserver.disconnect();
      }
      if (focusCleanup) {
        focusCleanup();
      }
    };
  }, [isActive, currentStep, isStepDismissed, t, advanceStep, closeGuideline]);

  return null;
}
