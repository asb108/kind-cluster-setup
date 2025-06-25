import { render, screen } from '@testing-library/react'
import Menubar from '../Menubar'
import { SidebarProvider } from '../sidebar-context'

// Mock ThemeSwitcher component
jest.mock('../ThemeSwitcher', () => {
  return {
    __esModule: true,
    default: () => <div data-testid="theme-switcher">Theme Switcher</div>
  }
})

describe('Menubar', () => {
  it('renders the menubar correctly', () => {
    render(
      <SidebarProvider>
        <Menubar />
      </SidebarProvider>
    )

    // Check for the Kind Setup title
    expect(screen.getByText('Kind Setup')).toBeInTheDocument()

    // Check for the theme switcher
    expect(screen.getByTestId('theme-switcher')).toBeInTheDocument()

    // Check for the mobile menu button
    const menuButton = screen.getByRole('button', { name: /open sidebar menu/i })
    expect(menuButton).toBeInTheDocument()

    // Check for the search input
    const searchInput = screen.getByPlaceholderText('Search...')
    expect(searchInput).toBeInTheDocument()

    // Check for the notification button
    const notificationButton = screen.getByRole('button', { name: '' })
    expect(notificationButton).toBeInTheDocument()
  })

  it('renders breadcrumbs correctly', () => {
    render(
      <SidebarProvider>
        <Menubar />
      </SidebarProvider>
    )

    // Check for Home breadcrumb
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
