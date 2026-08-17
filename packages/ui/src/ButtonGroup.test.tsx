import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ButtonGroup } from './ButtonGroup'
import { Button } from './Button'

describe('ButtonGroup', () => {
  it('renders as a group role by default', () => {
    render(
      <ButtonGroup>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    )
    expect(screen.getByRole('group')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument()
  })

  it('supports vertical orientation and attached mode', () => {
    render(
      <ButtonGroup orientation="vertical" attached>
        <Button>A</Button>
        <Button>B</Button>
      </ButtonGroup>,
    )
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
