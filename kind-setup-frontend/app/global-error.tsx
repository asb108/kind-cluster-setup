'use client'
 
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error caught:', error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="rounded-lg border bg-card p-8 text-card-foreground shadow-lg max-w-md w-full">
            <div className="flex items-center gap-2 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-destructive">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <h2 className="text-xl font-bold">Something went wrong!</h2>
            </div>
            <p className="text-muted-foreground mb-6">A critical error occurred in the application</p>
            <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20 mb-6">
              <p className="text-sm text-destructive font-medium break-words">{error.message || 'An unexpected error occurred'}</p>
              {error.digest && (
                <p className="text-xs text-muted-foreground mt-2">Error ID: {error.digest}</p>
              )}
            </div>
            <button
              className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              onClick={() => reset()}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
