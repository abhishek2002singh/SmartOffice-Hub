import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // In production, send to Sentry / error tracking here
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div
          className="rounded-2xl p-8 text-center max-w-md w-full border"
          style={{ backgroundColor: '#112044', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
          >
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 mb-6">
            {this.props.fallbackMessage || 'An unexpected error occurred in this section.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white mx-auto transition-colors"
            style={{ backgroundColor: '#1E6FD9' }}
          >
            <RefreshCw size={14} />
            Try again
          </button>
          {import.meta.env.DEV && this.state.error && (
            <details className="mt-4 text-left">
              <summary className="text-xs text-gray-600 cursor-pointer">Error details (dev only)</summary>
              <pre className="mt-2 text-xs text-red-400 overflow-auto max-h-40 rounded p-2" style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
