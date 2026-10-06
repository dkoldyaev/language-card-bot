export type GuidelineStep =
  | 'step0_locale'
  | 'step3_select_preset'
  | 'step4_nav_quiz'
  | 'step4_start_quiz'
  | 'completed';

export interface GuidelineState {
  isActive: boolean;
  isCompleted: boolean;
  currentStep: GuidelineStep | null;
  isStepDismissed: boolean;
  startGuideline: () => void;
  setStep: (step: GuidelineStep | null) => void;
  advanceStep: (fromStep?: GuidelineStep) => void;
  dismissCurrentStep: () => void;
  closeGuideline: () => void;
  resetGuideline: () => void;
}
