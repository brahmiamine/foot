import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', margin: '20px', border: '1px solid red' }}>
          <h2>Something went wrong.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack && (
              <div>{this.state.errorInfo.componentStack}</div>
            )}
            {this.state.error && this.state.error.stack && (
              <div style={{ marginTop: '10px' }}>
                <strong>Stack Trace:</strong>
                <pre>{this.state.error.stack}</pre>
              </div>
            )}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

