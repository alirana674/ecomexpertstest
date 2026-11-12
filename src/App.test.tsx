import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { useBundleStore } from './store/bundleStore';
import { config } from './data/catalog';

beforeEach(() => {
  localStorage.clear();
  useBundleStore.getState().resetToDefaults();
});

const reviewPanel = () =>
  screen.getByRole('region', { name: 'Your security system review' });
const camerasHeader = () => screen.getByRole('button', { name: /choose your cameras/i });
const card = (name: string) => screen.getByRole('article', { name });

describe('initial render', () => {
  it('expands step 1 with the seeded selections and reference totals', () => {
    render(<App />);
    expect(camerasHeader()).toHaveAttribute('aria-expanded', 'true');
    expect(within(camerasHeader()).getByText('2 selected')).toBeInTheDocument();
    // Totals derived from seeded state must match the reference design.
    expect(within(reviewPanel()).getByText('$187.89')).toBeInTheDocument();
    expect(within(reviewPanel()).getByText('$238.81')).toBeInTheDocument();
    expect(
      within(reviewPanel()).getByText(/saving \$50\.92 on your security bundle/i),
    ).toBeInTheDocument();
  });

  it('renders review groups with seeded items and line totals', () => {
    render(<App />);
    const panel = reviewPanel();
    expect(within(panel).getByText('Wyze Cam v4')).toBeInTheDocument();
    expect(within(panel).getByText('Wyze Cam Pan v3')).toBeInTheDocument();
    expect(within(panel).getByText('$47.98')).toBeInTheDocument(); // Pan ×2
    expect(within(panel).getByText('Wyze Sense Hub (Required)')).toBeInTheDocument();
    // "FREE" appears for both the hub line and the shipping row.
    expect(within(panel).getAllByText('FREE')).toHaveLength(2);
    expect(within(panel).getByText('$9.99/mo')).toBeInTheDocument();
  });
});

describe('builder ↔ review synchronization', () => {
  it('card stepper changes update the review line and totals immediately', async () => {
    const user = userEvent.setup();
    render(<App />);
    const camCard = card('Wyze Cam v4');

    await user.click(
      within(camCard).getByRole('button', { name: /increase quantity of wyze cam v4/i }),
    );

    // Card shows 2; review line total doubles; grand total goes up by $27.98.
    expect(within(camCard).getByText('2')).toBeInTheDocument();
    expect(within(reviewPanel()).getByText('$55.96')).toBeInTheDocument();
    expect(within(reviewPanel()).getByText('$215.87')).toBeInTheDocument();
  });

  it('review stepper changes update the card quantity', async () => {
    const user = userEvent.setup();
    render(<App />);
    const panel = reviewPanel();

    await user.click(
      within(panel).getByRole('button', {
        name: /decrease quantity of wyze cam pan v3/i,
      }),
    );

    const panCard = card('Wyze Cam Pan v3');
    const panStepper = within(panCard).getByRole('group', {
      name: /quantity of wyze cam pan v3/i,
    });
    expect(within(panStepper).getByText('1')).toBeInTheDocument();
  });
});

describe('variant-independent quantities through the UI', () => {
  it('keeps per-variant quantities and lists both variants in the review', async () => {
    const user = userEvent.setup();
    render(<App />);
    const camCard = card('Wyze Cam v4');

    // Switch the card to Black: stepper must show Black's quantity (0),
    // and White's quantity must remain untouched.
    await user.click(within(camCard).getByRole('radio', { name: 'Black' }));
    const stepper = within(camCard).getByRole('group', {
      name: /quantity of wyze cam v4/i,
    });
    expect(within(stepper).getByText('0')).toBeInTheDocument();

    await user.click(
      within(camCard).getByRole('button', { name: /increase quantity of wyze cam v4/i }),
    );
    expect(within(stepper).getByText('1')).toBeInTheDocument();

    // Both variants appear independently in the review panel.
    expect(within(reviewPanel()).getByText('Wyze Cam v4 – White')).toBeInTheDocument();
    expect(within(reviewPanel()).getByText('Wyze Cam v4 – Black')).toBeInTheDocument();

    // Switching back to White restores White's quantity on the card.
    await user.click(within(camCard).getByRole('radio', { name: 'White' }));
    expect(within(stepper).getByText('1')).toBeInTheDocument();
    expect(useBundleStore.getState().quantities['wyze-cam-v4:black']).toBe(1);
  });

  it('counts distinct products, not variant lines, in the step header', async () => {
    const user = userEvent.setup();
    render(<App />);
    const camCard = card('Wyze Cam v4');

    await user.click(within(camCard).getByRole('radio', { name: 'Grey' }));
    await user.click(
      within(camCard).getByRole('button', { name: /increase quantity of wyze cam v4/i }),
    );

    // Still 2 distinct cameras selected (Cam v4 + Pan v3).
    expect(within(camerasHeader()).getByText('2 selected')).toBeInTheDocument();
  });
});

describe('required product minimum', () => {
  it('disables the Sense Hub decrease button at quantity 1', () => {
    render(<App />);
    const decrease = within(reviewPanel()).getByRole('button', {
      name: /decrease quantity of wyze sense hub/i,
    });
    expect(decrease).toBeDisabled();
  });
});

describe('accordion behavior', () => {
  it('Next advances; clicking an expanded header collapses it; one step open at a time', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Next: Choose your plan' }));
    expect(camerasHeader()).toHaveAttribute('aria-expanded', 'false');
    const planHeader = screen.getByRole('button', { name: /choose your plan/i });
    expect(planHeader).toHaveAttribute('aria-expanded', 'true');

    // Toggling the expanded step collapses it.
    await user.click(planHeader);
    expect(planHeader).toHaveAttribute('aria-expanded', 'false');

    // Selections survived the step switches.
    expect(within(reviewPanel()).getByText('$187.89')).toBeInTheDocument();
    expect(config.steps).toHaveLength(4);
  });
});

describe('save and checkout', () => {
  it('"Save my system for later" persists to storage and shows a toast', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(localStorage.getItem(config.storageKey)).toBeNull();

    await user.click(screen.getByRole('button', { name: /save my system for later/i }));

    expect(localStorage.getItem(config.storageKey)).not.toBeNull();
    expect(
      await screen.findByText(/your system has been saved for later/i),
    ).toBeInTheDocument();
  });

  it('Checkout opens a confirmation dialog with the derived total', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Checkout' }));
    const dialog = screen.getByRole('dialog', { name: 'Checkout' });
    expect(within(dialog).getByText('$187.89')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
