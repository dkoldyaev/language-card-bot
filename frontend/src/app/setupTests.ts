import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';
import useStore from '../store/useStore';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
});
