import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AppButton,
  AppCard,
  AppChip,
  AppSearchInput,
  ConfirmDialog,
  EmptyState,
  PageContainer,
  PageHeader,
  StatCard,
} from '../index';

describe('shared/ui component library', () => {
  it('renders PageContainer with children and custom size', () => {
    render(<PageContainer size="narrow"><div>Page Content</div></PageContainer>);
    expect(screen.getByText('Page Content')).toBeInTheDocument();
  });

  it('renders PageHeader with overline, title and subtitle', () => {
    render(
      <PageHeader
        overline="Overview"
        title="Word Studio"
        subtitle="Learn new words daily"
      />
    );
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Word Studio')).toBeInTheDocument();
    expect(screen.getByText('Learn new words daily')).toBeInTheDocument();
  });

  it('renders AppCard in hero and surface variants', () => {
    const { rerender } = render(<AppCard variant="surface">Surface Card</AppCard>);
    expect(screen.getByText('Surface Card')).toBeInTheDocument();

    rerender(<AppCard variant="hero">Hero Card</AppCard>);
    expect(screen.getByText('Hero Card')).toBeInTheDocument();
  });

  it('renders AppButton with loading indicator and handles clicks', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const { rerender } = render(
      <AppButton variant="primary" onClick={handleClick}>
        Save Changes
      </AppButton>
    );

    const btn = screen.getByRole('button', { name: 'Save Changes' });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);

    rerender(
      <AppButton variant="primary" loading onClick={handleClick}>
        Save Changes
      </AppButton>
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(btn).toBeDisabled();
  });

  it('renders AppSearchInput and handles clear', async () => {
    const user = userEvent.setup();
    const handleClear = vi.fn();
    render(
      <AppSearchInput
        value="test search"
        onChange={() => {}}
        onClear={handleClear}
      />
    );

    const clearBtn = screen.getByLabelText('Clear search');
    expect(clearBtn).toBeInTheDocument();
    await user.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders EmptyState with action', () => {
    render(
      <EmptyState
        title="No items found"
        description="Try adding some words"
        action={<AppButton>Add Word</AppButton>}
      />
    );
    expect(screen.getByText('No items found')).toBeInTheDocument();
    expect(screen.getByText('Try adding some words')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Word' })).toBeInTheDocument();
  });

  it('renders StatCard with value and title', () => {
    render(
      <StatCard
        icon={<span>🔥</span>}
        iconBg="rgba(255,0,0,0.1)"
        title="Current Streak"
        value="5 Days"
        subtitle="Keep going"
      />
    );
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('5 Days')).toBeInTheDocument();
    expect(screen.getByText('Keep going')).toBeInTheDocument();
  });

  it('renders AppChip with variants', () => {
    render(<AppChip variant="lang" label="EN → RU" />);
    expect(screen.getByText('EN → RU')).toBeInTheDocument();
  });

  it('renders ConfirmDialog and triggers confirm / cancel', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        title="Delete Item"
        message="Are you sure you want to delete?"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );

    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
