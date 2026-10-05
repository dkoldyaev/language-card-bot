import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GuidelineState, GuidelineStep } from '../types';

const STEP_SEQUENCE: GuidelineStep[] = [
  'step0_locale',
  'step1_dict_selector',
  'step2_create_dict_menu',
  'step2_create_dict_dialog',
  'step3_select_preset',
  'step4_nav_quiz',
  'step4_start_quiz',
  'completed',
];

export const useGuidelineStore = create<GuidelineState>()(
  persist(
    (set, get) => ({
      isActive: false,
      isCompleted: false,
      currentStep: null,
      isStepDismissed: false,

      startGuideline: () => {
        set({
          isActive: true,
          isCompleted: false,
          currentStep: 'step0_locale',
          isStepDismissed: false,
        });
      },

      setStep: (step) => {
        if (step === 'completed') {
          set({ currentStep: 'completed', isCompleted: true, isActive: false, isStepDismissed: false });
        } else {
          set({ currentStep: step, isActive: step !== null, isStepDismissed: false });
        }
      },

      advanceStep: (fromStep) => {
        const { currentStep, isActive } = get();
        if (!isActive && currentStep !== 'completed') return;

        // If fromStep is provided, only advance if we are actually at that step
        if (fromStep && currentStep !== fromStep) return;

        const currentIndex = currentStep ? STEP_SEQUENCE.indexOf(currentStep) : -1;
        if (currentIndex >= 0 && currentIndex < STEP_SEQUENCE.length - 1) {
          const next = STEP_SEQUENCE[currentIndex + 1];
          if (next === 'completed') {
            set({ currentStep: 'completed', isCompleted: true, isActive: false, isStepDismissed: false });
          } else {
            set({ currentStep: next, isActive: true, isStepDismissed: false });
          }
        }
      },

      dismissCurrentStep: () => {
        set({ isStepDismissed: true });
      },

      closeGuideline: () => {
        set({ isActive: false, isCompleted: true, isStepDismissed: false });
      },

      resetGuideline: () => {
        set({
          isActive: true,
          isCompleted: false,
          currentStep: 'step0_locale',
          isStepDismissed: false,
        });
      },
    }),
    {
      name: 'cardbot-guideline-storage',
      partialize: (state) => ({
        isCompleted: state.isCompleted,
      }),
    }
  )
);
