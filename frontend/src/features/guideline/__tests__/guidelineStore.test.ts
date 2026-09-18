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

    // Step 0 -> Step 1 (Language selected or Next clicked)
    useGuidelineStore.getState().advanceStep('step0_locale');
    expect(useGuidelineStore.getState().currentStep).toBe('step1_dict_selector');

    // Step 1 -> Step 2 Menu (Dictionary selector clicked, menu opened)
    useGuidelineStore.getState().advanceStep('step1_dict_selector');
    expect(useGuidelineStore.getState().currentStep).toBe('step2_create_dict_menu');

    // Step 2 Menu -> Step 2 Dialog (Create deck clicked, dialog opened)
    useGuidelineStore.getState().advanceStep('step2_create_dict_menu');
    expect(useGuidelineStore.getState().currentStep).toBe('step2_create_dict_dialog');

    // Step 2 Dialog -> Step 3 (Dictionary created, navigated to dictionary page)
    useGuidelineStore.getState().advanceStep('step2_create_dict_dialog');
    expect(useGuidelineStore.getState().currentStep).toBe('step3_select_preset');

    // Step 3 -> Step 4 Nav (Preset applied, deck filled)
    useGuidelineStore.getState().advanceStep('step3_select_preset');
    expect(useGuidelineStore.getState().currentStep).toBe('step4_nav_quiz');

    // Step 4 Nav -> Completed (Quiz nav clicked, navigated to /quiz)
    useGuidelineStore.getState().advanceStep('step4_nav_quiz');
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
