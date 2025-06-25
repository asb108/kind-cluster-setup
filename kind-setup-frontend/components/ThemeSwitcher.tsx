"use client";

import { useTheme } from "@/context/theme-context";
import { useState } from "react";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme as "light" | "dark" | "nord" | "solarized" | "dracula");
    setIsOpen(false);
  };

  // Theme icons
  const themeIcons = {
    light: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    ),
    dark: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
      </svg>
    ),
    system: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    )
  };

  return (
    <div className="relative">
      <button
        onClick={toggleDropdown}
        className="flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9 sm:w-10 sm:h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
        aria-label="Toggle theme"
      >
        {theme === "light" && themeIcons.light}
        {theme === "dark" && themeIcons.dark}
        {theme !== "light" && theme !== "dark" && (
          <span className="text-xs xs:text-sm font-medium">{theme.charAt(0).toUpperCase()}</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 py-2 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            Select Theme
          </div>
          <button
            onClick={() => handleThemeChange("light")}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${theme === "light" ? "text-primary font-medium" : ""}`}
          >
            {themeIcons.light}
            <span className="ml-2">Light</span>
          </button>
          <button
            onClick={() => handleThemeChange("dark")}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${theme === "dark" ? "text-primary font-medium" : ""}`}
          >
            {themeIcons.dark}
            <span className="ml-2">Dark</span>
          </button>
          <button
            onClick={() => handleThemeChange("nord")}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${theme === "nord" ? "text-primary font-medium" : ""}`}
          >
            <span className="flex items-center justify-center w-5 h-5 bg-[#5E81AC] text-white rounded-full text-xs">N</span>
            <span className="ml-2">Nord</span>
          </button>
          <button
            onClick={() => handleThemeChange("solarized")}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${theme === "solarized" ? "text-primary font-medium" : ""}`}
          >
            <span className="flex items-center justify-center w-5 h-5 bg-[#268BD2] text-white rounded-full text-xs">S</span>
            <span className="ml-2">Solarized</span>
          </button>
          <button
            onClick={() => handleThemeChange("dracula")}
            className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${theme === "dracula" ? "text-primary font-medium" : ""}`}
          >
            <span className="flex items-center justify-center w-5 h-5 bg-[#BD93F9] text-white rounded-full text-xs">D</span>
            <span className="ml-2">Dracula</span>
          </button>
        </div>
      )}
    </div>
  );
}
