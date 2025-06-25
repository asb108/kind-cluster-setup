import { render, screen } from '@testing-library/react'
import Sidebar from '../../Sidebar'
import { SidebarProvider } from '../../sidebar-context'

// Mock the Sheet component
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, open }: { children: React.ReactNode, open?: boolean }) => (
    <div data-testid="sheet" data-state={open ? "open" : "closed"}>{children}</div>
  ),
  SheetContent: ({ children, side }: { children: React.ReactNode, side?: string }) => (
    <div data-testid="sheet-content" data-side={side}>{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-title">{children}</div>
  ),
}))

// Mock the ScrollArea component
jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scroll-area">{children}</div>
  ),
}))

describe('Sidebar', () => {
  it('renders the desktop sidebar correctly', () => {
    render(
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    )

    // Check for desktop sidebar
    const desktopSidebar = document.querySelector('aside')
    expect(desktopSidebar).toBeInTheDocument()

    // Check for navigation sections
    expect(screen.getByText('Main')).toBeInTheDocument()
    expect(screen.getByText('Cluster Management')).toBeInTheDocument()
    expect(screen.getByText('Applications')).toBeInTheDocument()
    expect(screen.getByText('Resources')).toBeInTheDocument()

    // Check for navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Create Cluster')).toBeInTheDocument()
    expect(screen.getByText('Deploy App')).toBeInTheDocument()
    expect(screen.getByText('Manage Apps')).toBeInTheDocument()
  })

  it('renders the mobile sidebar sheet component', () => {
    render(
      <SidebarProvider>
        <Sidebar />
      </SidebarProvider>
    )

    // The Sheet component should be present but not visible by default
    const sheetComponent = screen.getByTestId('sheet')
    expect(sheetComponent).toHaveAttribute('data-state', 'closed')
  })
})
