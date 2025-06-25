"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "nord" | "solarized" | "dracula";

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // Initialize theme from localStorage on client side
  useEffect(() => {
    const storedTheme = localStorage.getItem("app-theme") as Theme | null;
    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  // Update localStorage and apply theme class to document when theme changes
  useEffect(() => {
    localStorage.setItem("app-theme", theme);
    
    // Remove all theme classes
    document.documentElement.classList.remove(
      "theme-light",
      "theme-dark",
      "theme-nord",
      "theme-solarized",
      "theme-dracula"
    );
    
    // Add the current theme class
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
