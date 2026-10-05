import { renderHook } from '@testing-library/react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useStore from '../../store/useStore';
import { useMercure } from './useMercure';

vi.mock('@microsoft/fetch-event-source', () => ({
  fetchEventSource: vi.fn(),
}));

describe('useMercure', () => {
  let onMessage: ((event: { data: string }) => void) | undefined;
  let requestOptions: { signal?: AbortSignal } | undefined;

  const wrapper = ({ children }: { children: ReactNode }) => (
    createElement(MemoryRouter, null, children)
  );

  beforeEach(() => {
    useStore.getState().reset();
    useStore.setState({
      dictionaries: [{ id: 7, name: 'Spanish', targetLanguage: 'es', baseLanguage: 'en', wordCount: 0, isActive: true }],
      activeDictionaryId: 7,
      isDictionaryLoading: false,
    });
    onMessage = undefined;
    requestOptions = undefined;
    vi.mocked(fetchEventSource).mockImplementation((_url, options) => {
      onMessage = options.onmessage as unknown as (event: { data: string }) => void;
      requestOptions = options;
      return new Promise(() => {});
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not connect without both profile and Mercure token', () => {
    renderHook(() => useMercure(), { wrapper });
    expect(fetchEventSource).not.toHaveBeenCalled();

    useStore.getState().setProfile({ id: 1, username: 'testuser' });
    renderHook(() => useMercure(), { wrapper });
    expect(fetchEventSource).not.toHaveBeenCalled();
  });

  it('subscribes to the authenticated user topic and aborts on unmount', () => {
    useStore.getState().setProfile({ id: 1, username: 'testuser' });
    useStore.getState().setMercureToken('mercure-token');

    const { unmount } = renderHook(() => useMercure(), { wrapper });

    expect(fetchEventSource).toHaveBeenCalledOnce();
    const [url, options] = vi.mocked(fetchEventSource).mock.calls[0];
    expect(new URL(String(url)).searchParams.get('topic')).toBe('http://localhost/v1/users/testuser');
    expect(options.headers).toMatchObject({
      Authorization: 'Bearer mercure-token',
      Accept: 'text/event-stream',
    });

    unmount();
    expect(requestOptions?.signal?.aborted).toBe(true);
  });

  it('applies dictionary and quiz messages received from Mercure', () => {
    useStore.getState().setProfile({ id: 1, username: 'testuser' });
    useStore.getState().setMercureToken('mercure-token');
    renderHook(() => useMercure(), { wrapper });

    const publish = (payload: unknown) => onMessage?.({ data: JSON.stringify(payload) });

    publish({
      type: 'dictionary_add_processing',
      words: [{ wordId: 101, word: 'hola', presets: [{ id: 5, title: 'Spanish basics' }] }],
    });
    publish({
      type: 'dictionary_add_definitions_received',
      words: [{ wordId: 101, word: 'hola', definitions: [{ id: 201, text: 'a greeting', translation: null }] }],
    });
    publish({
      type: 'definition_translate_loaded',
      words: [{ wordId: 101, definitions: [{ id: 201, translation: 'приветствие' }] }],
    });
    publish({
      type: 'quiz_card',
      wordId: 101,
      definition: { id: 201, text: 'a greeting', translation: 'приветствие' },
    });
    publish({ type: 'quiz_answer_evaluation', result: 'SUCCESS', suggestion: 'hola' });
    publish({ type: 'quiz_definition_translation', translation: 'приветствие' });
    publish({ type: 'quiz_variants', variants: ['hola', 'adiós'] });
    publish({ type: 'state_sync', mode: 'QUIZ', activeDictionaryId: 7 });
    publish({
      type: 'dictionaries_sync',
      dictionaries: [{ id: 8, name: 'French', targetLanguage: 'fr', baseLanguage: 'en', wordCount: 2, isActive: true }],
    });

    const state = useStore.getState();
    expect(state.dictionary).toMatchObject([{
      id: 101,
      text: 'hola',
      definitions: [{ id: 201, text: 'a greeting', translation: { text: 'приветствие' } }],
    }]);
    expect(state.quizCard).toMatchObject({ wordId: 101, definition: { id: 201 } });
    expect(state.quizEvaluation).toEqual({ result: 'SUCCESS', suggestion: 'hola' });
    expect(state.quizTranslation).toBe('приветствие');
    expect(state.quizVariants).toEqual(['hola', 'adiós']);
    expect(state.appState).toMatchObject({ mode: 'QUIZ', activeDictionaryId: 7 });
    expect(state.dictionaries).toMatchObject([{ id: 8, name: 'French' }]);
  });

  it('ignores a malformed event without preventing later dictionary sync', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    useStore.getState().setProfile({ id: 1, username: 'testuser' });
    useStore.getState().setMercureToken('mercure-token');
    renderHook(() => useMercure(), { wrapper });

    onMessage?.({ data: '{not-json' });
    onMessage?.({
      data: JSON.stringify({
        type: 'dictionaries_sync',
        dictionaries: [{ id: 9, name: 'Italian', targetLanguage: 'it', baseLanguage: 'en', wordCount: 0, isActive: true }],
      }),
    });

    expect(consoleError).toHaveBeenCalledWith('Error parsing Mercure message:', expect.any(SyntaxError));
    expect(useStore.getState().dictionaries).toMatchObject([{ id: 9, name: 'Italian' }]);
  });
});
