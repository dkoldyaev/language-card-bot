import { beforeEach, describe, expect, it } from 'vitest';
import { useGuidelineStore } from '../store/useGuidelineStore';

describe('useGuidelineStore', () => {
  beforeEach(() => {
    useGuidelineStore.setState({
      isActive: false,
      isCompleted: false,
      currentStep: null,
    });
  });

  it('starts guideline on step0_locale', () => {
    useGuidelineStore.getState().startGuideline();
    const state = useGuidelineStore.getState();

    expect(state.isActive).toBe(true);
    expect(state.isCompleted).toBe(false);
    expect(state.currentStep).toBe('step0_locale');
  });

  it('advances through the full sequence step by step upon user actions', () => {
    useGuidelineStore.getState().startGuideline();

    // Step 0 -> Step 3 (Language selected; the first dictionary is now created directly in a modal)
    useGuidelineStore.getState().advanceStep('step0_locale');
    expect(useGuidelineStore.getState().currentStep).toBe('step3_select_preset');

    // Step 3 -> Step 4 Nav (Preset applied, deck filled)
    useGuidelineStore.getState().advanceStep('step3_select_preset');
    expect(useGuidelineStore.getState().currentStep).toBe('step4_nav_quiz');

    // Step 4 Nav -> start quiz (Quiz nav clicked, navigated to the selected quiz URL)
    useGuidelineStore.getState().advanceStep('step4_nav_quiz');
    expect(useGuidelineStore.getState().currentStep).toBe('step4_start_quiz');

    // Start Quiz finishes the tour
    useGuidelineStore.getState().advanceStep('step4_start_quiz');
    const finalState = useGuidelineStore.getState();
    expect(finalState.currentStep).toBe('completed');
    expect(finalState.isCompleted).toBe(true);
    expect(finalState.isActive).toBe(false);
  });

  it('ignores advanceStep if fromStep does not match currentStep', () => {
    useGuidelineStore.getState().startGuideline();
    expect(useGuidelineStore.getState().currentStep).toBe('step0_locale');

    // Try advancing with wrong fromStep
    useGuidelineStore.getState().advanceStep('step3_select_preset');
    expect(useGuidelineStore.getState().currentStep).toBe('step0_locale');
  });

  it('closes guideline when user dismisses it', () => {
    useGuidelineStore.getState().startGuideline();
    useGuidelineStore.getState().closeGuideline();

    const state = useGuidelineStore.getState();
    expect(state.isActive).toBe(false);
    expect(state.isCompleted).toBe(true);
  });

  it('resets guideline correctly', () => {
    useGuidelineStore.setState({ isActive: false, isCompleted: true, currentStep: 'completed' });
    useGuidelineStore.getState().resetGuideline();

    const state = useGuidelineStore.getState();
    expect(state.isActive).toBe(true);
    expect(state.isCompleted).toBe(false);
    expect(state.currentStep).toBe('step0_locale');
  });
});
