import { render, screen } from '@testing-library/react'
import { PageHeader } from '../page-header'

// Mock the getBreadcrumbs function
jest.mock('../../Sidebar', () => ({
  getBreadcrumbs: () => [
    { href: '/', label: 'Home' },
    { href: '/test', label: 'Test Page' }
  ]
}))

describe('PageHeader', () => {
  it('renders the page header with title correctly', () => {
    render(
      <PageHeader 
        title="Test Title" 
        description="Test description"
      />
    )
    
    // Check for the title
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    
    // Check for the description
    expect(screen.getByText('Test description')).toBeInTheDocument()
    
    // Check for breadcrumbs
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Test Page')).toBeInTheDocument()
  })
  
  it('renders actions when provided', () => {
    render(
      <PageHeader 
        title="Test Title" 
        actions={<button>Test Action</button>}
      />
    )
    
    // Check for the action button
    expect(screen.getByRole('button', { name: 'Test Action' })).toBeInTheDocument()
  })
  
  it('hides breadcrumbs when showBreadcrumbs is false', () => {
    render(
      <PageHeader 
        title="Test Title" 
        showBreadcrumbs={false}
      />
    )
    
    // Breadcrumbs should not be visible
    expect(screen.queryByText('Home')).not.toBeInTheDocument()
    expect(screen.queryByText('Test Page')).not.toBeInTheDocument()
  })
})
