// resources/js/lib/AppErrorBoundary.jsx
// Wraps each app route. An uncaught render error in one app is caught here, so
// that app's panel shows a fallback while the shell and every other app keep
// working. This is the piece that gives you blast-radius isolation at runtime.
import React from 'react';

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`[${this.props.appName}] crashed:`, error, info);
  }

  // Reset when the active route changes, so navigating away from a crashed app
  // and back gives it a fresh mount.
  componentDidUpdate(prevProps) {
    if (prevProps.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          padding: 40, fontFamily: 'Poppins, system-ui, sans-serif',
          color: '#1B120B',
        }}>
          <h2 style={{ color: '#E73835', marginBottom: 8 }}>
            {this.props.appName} hit an error
          </h2>
          <p style={{ color: '#555', maxWidth: 520 }}>
            This panel failed to render, but the rest of the hub is unaffected.
            Switch to another app from the side panel, or reload to try again.
          </p>
          <pre style={{
            marginTop: 16, padding: 12, background: '#f4f4f6', borderRadius: 8,
            fontSize: 12, overflow: 'auto', maxWidth: 720,
          }}>{String(this.state.error?.message || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
