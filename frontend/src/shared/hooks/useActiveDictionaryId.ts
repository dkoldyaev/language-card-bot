import { useMatch } from 'react-router-dom';
import useStore from '../../store/useStore';

export function useActiveDictionaryId(): number | null {
  const dictMatch = useMatch('/:locale/dictionary/:dictId/*');
  const quizMatch = useMatch('/:locale/quiz/:dictId/*');
  const storeActiveId = useStore((state) => state.activeDictionaryId);
  const profile = useStore((state) => state.profile);
  const dictionaries = useStore((state) => state.dictionaries);
  
  const match = dictMatch || quizMatch;
  if (match?.params.dictId && match.params.dictId !== 'new') {
    const id = parseInt(match.params.dictId, 10);
    if (!Number.isNaN(id)) return id;
  }
  
  return storeActiveId || profile?.active_dictionary_id || dictionaries[0]?.id || null;
}
