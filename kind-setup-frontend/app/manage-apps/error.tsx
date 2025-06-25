'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Manage Apps Error Boundary Caught:', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-lg animate-in fade-in duration-300 hover:shadow-xl transition-all">
        <CardHeader className="space-y-1 pb-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <CardTitle className="text-xl font-bold">Manage Apps Error</CardTitle>
          </div>
          <CardDescription className="text-muted-foreground">
            An error occurred while managing applications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
            <p className="text-sm text-destructive font-medium break-words">{error.message || 'An unexpected error occurred'}</p>
            {error.digest && (
              <p className="text-xs text-muted-foreground mt-2">Error ID: {error.digest}</p>
            )}
          </div>
          <Button 
            onClick={() => reset()} 
            className="w-full" 
            variant="default"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
