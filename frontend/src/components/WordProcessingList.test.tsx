import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import WordProcessingList from './WordProcessingList';
import useStore from '../store/useStore';

describe('WordProcessingList', () => {
  beforeEach(() => {
    useStore.setState({ wordProcessing: [] });
  });

  it('renders nothing when empty', () => {
    const { container } = render(<WordProcessingList />);
    expect(container.firstChild).toBeNull();
  });

  it('renders processing status', () => {
    useStore.setState({
      wordProcessing: [
        { word: 'apple', status: 'processing' },
        { word: 'banana', status: 'duplicate', definitionsCount: 2 }
      ]
    });
    render(<WordProcessingList />);

    expect(screen.getByText('Processing Status')).toBeInTheDocument();
    
    expect(screen.getByText('apple')).toBeInTheDocument();
    expect(screen.getByText('Fetching definitions...')).toBeInTheDocument();
    
    expect(screen.getByText('banana')).toBeInTheDocument();
    expect(screen.getByText('Word already exists (2 definitions).')).toBeInTheDocument();
  });
});
