import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useStore from '../../store/useStore';
import api from '../api/client';
import { useOfflineSync } from './useOfflineSync';

describe('useOfflineSync', () => {
  beforeEach(() => {
    useStore.setState({
      syncQueue: [],
      isOffline: false,
    });
    vi.restoreAllMocks();
  });

  afterEach(() => {
    useStore.setState({
      syncQueue: [],
      isOffline: false,
    });
    vi.restoreAllMocks();
  });

  it('syncs DELETE_WORD, DELETE_DEFINITION, and EDIT_TRANSLATION to the correct endpoints and removes them', async () => {
    const deleteSpy = vi.spyOn(api, 'delete').mockResolvedValue({ data: { success: true } });
    const putSpy = vi.spyOn(api, 'put').mockResolvedValue({ data: { success: true } });

    useStore.setState({
      syncQueue: [
        { id: 'action-1', type: 'DELETE_WORD', wordId: 101, timestamp: 1 },
        { id: 'action-2', type: 'DELETE_DEFINITION', wordId: 101, definitionId: 202, timestamp: 2 },
        { id: 'action-3', type: 'EDIT_TRANSLATION', wordId: 101, definitionId: 203, text: 'hola', timestamp: 3 },
      ],
    });

    renderHook(() => useOfflineSync());

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(deleteSpy).toHaveBeenCalledWith('/word_delete/101');
    expect(deleteSpy).toHaveBeenCalledWith('/definition_delete/202');
    expect(putSpy).toHaveBeenCalledWith('/definition_translate_edit/203', { text: 'hola' });

    expect(useStore.getState().syncQueue).toEqual([]);
  });

  it('discards action when backend returns 404 or 409', async () => {
    vi.spyOn(api, 'delete').mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    useStore.setState({
      syncQueue: [
        { id: 'action-1', type: 'DELETE_WORD', wordId: 999, timestamp: 1 },
      ],
    });

    renderHook(() => useOfflineSync());

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(useStore.getState().syncQueue).toEqual([]);
  });

  it('halts sync and retains remaining items on network or 500 error', async () => {
    const deleteSpy = vi.spyOn(api, 'delete')
      .mockResolvedValueOnce({ data: { success: true } })
      .mockRejectedValueOnce({
        isAxiosError: true,
        response: { status: 500 },
      });

    useStore.setState({
      syncQueue: [
        { id: 'action-1', type: 'DELETE_WORD', wordId: 101, timestamp: 1 },
        { id: 'action-2', type: 'DELETE_WORD', wordId: 102, timestamp: 2 },
        { id: 'action-3', type: 'DELETE_WORD', wordId: 103, timestamp: 3 },
      ],
    });

    renderHook(() => useOfflineSync());

    await act(async () => {
      window.dispatchEvent(new Event('online'));
    });

    expect(deleteSpy).toHaveBeenCalledTimes(2);
    const remainingQueue = useStore.getState().syncQueue;
    expect(remainingQueue.map((a) => a.id)).toEqual(['action-2', 'action-3']);
  });
});
