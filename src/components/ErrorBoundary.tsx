import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback UI. Receives a reset callback. */
  fallback?: (reset: () => void) => React.ReactNode;
  /** Called after the user clicks "Try again" (e.g. close the modal / clear state). */
  onReset?: () => void;
  /** Label used in console logs so errors are easy to trace. */
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors in its subtree so one broken widget (e.g. the compare modal)
 * can never unmount the whole app and leave the visitor on a white screen.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback(this.reset);

    return (
      <div
        role="alert"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      >
        <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl border border-[#0F172A]/15">
          <h2
            className="text-lg font-bold text-[#0F172A] mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Something went wrong
          </h2>
          <p className="text-xs text-[#4A4A4A] mb-4">
            We couldn&apos;t load this section. Please try again.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="px-4 py-2 bg-[#0F172A] hover:bg-[#D09A40] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
