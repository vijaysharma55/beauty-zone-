import React from 'react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
  /** When this value changes (e.g. the route pathname) a previously caught error is cleared. */
  resetKey?: string;
  /** Label used in console logs so errors are easy to trace. */
  name?: string;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

const RELOAD_STAMP_KEY = 'beautyzone.chunk-reload-at';
const RELOAD_COOLDOWN_MS = 30_000;

/**
 * True for the errors a browser raises when a lazily loaded route chunk can't be fetched,
 * which typically happens when a tab still runs a previous deployment's HTML after a redeploy.
 */
export const isChunkLoadError = (error: unknown): boolean => {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error ?? '');
  return /ChunkLoadError|Loading chunk .+ failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
    text
  );
};

/** Reloads at most once per cooldown window so a genuinely broken deployment can't loop. */
const reloadOnceForFreshBuild = (): boolean => {
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_STAMP_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return false;
    window.sessionStorage.setItem(RELOAD_STAMP_KEY, String(Date.now()));
  } catch {
    // Storage can be blocked (private mode). Without a guard we must not reload automatically.
    return false;
  }
  window.location.reload();
  return true;
};

/**
 * Catches render and lazy-chunk errors for the whole subtree so a single failure shows a
 * recoverable message instead of unmounting the app and leaving a blank white screen.
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[AppErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info.componentStack);
    if (isChunkLoadError(error)) reloadOnceForFreshBuild();
  }

  componentDidUpdate(prevProps: AppErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const stale = isChunkLoadError(error);

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#FAF5E5',
          color: '#0F172A',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            textAlign: 'center',
            background: '#fff',
            border: '1px solid rgba(15, 23, 42, 0.15)',
            borderRadius: 16,
            padding: 28,
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
          }}
        >
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 22, margin: '0 0 8px' }}>
            {stale ? 'A new version is available' : 'Something went wrong'}
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: '#4A4A4A', margin: '0 0 20px' }}>
            {stale
              ? 'This page is out of date. Reload to get the latest version.'
              : "We couldn't load this page. Please reload, or head back to the homepage."}
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 18px',
                background: '#0F172A',
                color: '#fff',
                border: 0,
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload page
            </button>
            {/* A plain anchor: this boundary can sit above the router, so <Link> is not available. */}
            <a
              href="/"
              style={{
                padding: '10px 18px',
                background: '#fff',
                color: '#0F172A',
                border: '1px solid rgba(15, 23, 42, 0.25)',
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Go to homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
}
