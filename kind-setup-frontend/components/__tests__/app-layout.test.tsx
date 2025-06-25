import { render, screen } from '@testing-library/react';
import LayoutWithSidebar from '../app-layout';
import { SidebarProvider } from '../sidebar-context';

// Mock the Menubar component
jest.mock('../Menubar', () => {
  return {
    __esModule: true,
    default: () => <div data-testid='menubar'>Menubar Component</div>,
  };
});

// Mock the Sidebar component
jest.mock('../Sidebar', () => {
  return {
    __esModule: true,
    default: () => <div data-testid='sidebar'>Sidebar Component</div>,
  };
});

describe('LayoutWithSidebar', () => {
  it('renders the layout with sidebar correctly', () => {
    render(
      <SidebarProvider>
        <LayoutWithSidebar>
          <div data-testid='content'>Test Content</div>
        </LayoutWithSidebar>
      </SidebarProvider>
    );

    // Check for the menubar
    expect(screen.getByTestId('menubar')).toBeInTheDocument();

    // Check for the sidebar
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();

    // Check for the content
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();

    // Check for the main content area with proper padding
    const mainContent = document.querySelector(
      '.flex-1.transition-all.duration-300.md\\:pl-64'
    );
    expect(mainContent).toBeInTheDocument();
  });
});
