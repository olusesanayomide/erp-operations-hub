import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SignupPage from './SignupPage';
import { signupTenant } from '@/shared/lib/erp-api';
import { ApiError } from '@/shared/lib/api';

const SIGNUP_EMAIL_EXISTS_MESSAGE =
  'An account already exists for this email. Please sign in or reset your password.';

vi.mock('@/shared/lib/erp-api', () => ({
  signupTenant: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function fillSignupForm() {
  fireEvent.change(screen.getByLabelText(/company name/i), {
    target: { value: 'Acme Incorporated' },
  });
  fireEvent.change(screen.getByLabelText(/admin name/i), {
    target: { value: 'Jane Founder' },
  });
  fireEvent.change(screen.getByLabelText(/admin email/i), {
    target: { value: 'jane@example.com' },
  });
  fireEvent.change(screen.getByLabelText(/admin password/i), {
    target: { value: 'StrongPassword123!' },
  });
}

describe('SignupPage', () => {
  beforeEach(() => {
    vi.mocked(signupTenant).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('guides duplicate signup attempts to sign in or reset password', async () => {
    vi.mocked(signupTenant).mockRejectedValue(
      new ApiError(SIGNUP_EMAIL_EXISTS_MESSAGE, 400),
    );

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    fillSignupForm();
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(await screen.findByText(SIGNUP_EMAIL_EXISTS_MESSAGE)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /sign in with this email/i }),
    ).toHaveAttribute('href', '/login');
    expect(
      screen.getByRole('link', { name: /reset password/i }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('shows a still-working notice while tenant signup is taking longer', async () => {
    vi.useFakeTimers();
    vi.mocked(signupTenant).mockImplementation(
      () => new Promise(() => {}),
    );

    render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>,
    );

    fillSignupForm();
    fireEvent.click(screen.getByRole('button', { name: /create workspace/i }));

    expect(screen.getByText(/creating workspace/i)).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(8000);
    });

    expect(screen.getByText(/still creating your workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/still creating workspace/i)).toBeInTheDocument();
  });
});
