import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        readable = `Database access notice (${parsed.operationType || 'operation'} on ${
          parsed.path || 'record'
        }): ${parsed.error}`;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: readable };
  }

  componentDidCatch(error: Error) {
    console.error('Portal ErrorBoundary caught:', error);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E2E8F0] rounded-xl p-8">
            <div className="w-10 h-10 rounded-lg bg-[#0A192F] text-[#C5A059] flex items-center justify-center mb-5">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-semibold text-[#0A192F] font-display">
              Something Interrupted Your Session
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{this.state.message}</p>
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#0A192F] hover:bg-[#112240] rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-[#E2E8F0] hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
