'use client'

import React, { useReducer, createContext, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Simple reducer for React context
type State = { theme: 'light' | 'dark' };
type Action = { type: 'TOGGLE_THEME' };

const initialState: State = { theme: 'light' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return { 
        ...state, 
        theme: state.theme === 'light' ? 'dark' : 'light' 
      };
    default:
      return state;
  }
}

// Create context with a default value factory to prevent null issues
export const ThemeContext = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>(undefined as any); // Will be properly initialized in the Provider

// Create a client-side providers wrapper component
// QueryClient is initialized inside the component to avoid SSR issues
export default function Providers({ children }: { children: React.ReactNode }) {
  // Create the query client instance inside the component
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5000,
      },
    },
  }));
  
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <ThemeContext.Provider value={{ state, dispatch }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeContext.Provider>
  )
} 