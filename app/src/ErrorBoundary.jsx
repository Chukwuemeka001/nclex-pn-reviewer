import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isDev = import.meta.env.DEV;
    return (
      <main className="fatal-error">
        <div>
          <p className="eyebrow">App error</p>
          <h1>Something crashed instead of rendering.</h1>
          <p>{this.state.error.message}</p>
          {isDev && (
            <pre>{this.state.error.stack}{this.state.info?.componentStack}</pre>
          )}
          <p>Suggested action: check the browser console, then reload after fixing the component error.</p>
        </div>
      </main>
    );
  }
}
