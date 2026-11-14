import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error?.message || 'Unexpected rendering error.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ZyraTech UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F6F9F7] text-[#17221B] p-6">
          <div className="max-w-md w-full rounded-2xl border border-[#DCE6DF] bg-white p-6 shadow-sm space-y-3">
            <h1 className="text-lg font-bold">ZyraTech Preview Recovery</h1>
            <p className="text-sm text-[#5C6B63]">
              A view encountered a runtime issue: {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#16A34A] text-white text-sm font-semibold hover:bg-[#15803D]"
            >
              Reload ZyraTech
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
