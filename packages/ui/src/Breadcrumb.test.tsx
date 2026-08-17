import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Breadcrumb } from './Breadcrumb'

describe('Breadcrumb', () => {
  it('marks the last item as the current page', () => {
    render(
      <Breadcrumb
        items={[{ label: 'Accueil', href: '/' }, { label: 'Clubs', href: '/clubs' }, { label: 'FOOT FC' }]}
      />,
    )
    expect(screen.getByText('FOOT FC')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/')
  })

  it('calls onClick and prevents navigation', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(
      <Breadcrumb items={[{ label: 'Accueil', onClick }, { label: 'Actuel' }]} />,
    )
    await user.click(screen.getByRole('link', { name: 'Accueil' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
