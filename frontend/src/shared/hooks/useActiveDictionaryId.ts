import { useMatch } from 'react-router-dom';

export function useActiveDictionaryId(): number | null {
  const match = useMatch('/:locale/dictionary/:dictId/*');
  
  if (match?.params.dictId && match.params.dictId !== 'new') {
    const id = parseInt(match.params.dictId, 10);
    return isNaN(id) ? null : id;
  }
  
  return null;
}
