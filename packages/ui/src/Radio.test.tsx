import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Radio } from './Radio'
import { RadioGroup } from './RadioGroup'

describe('Radio', () => {
  it('renders as a native radio associated with its label', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Radio name="g" value="a" label="Option A" />
        <Radio name="g" value="b" label="Option B" />
      </>,
    )
    const a = screen.getByRole('radio', { name: 'Option A' })
    const b = screen.getByRole('radio', { name: 'Option B' })
    await user.click(b)
    expect(b).toBeChecked()
    expect(a).not.toBeChecked()
  })
})

describe('RadioGroup', () => {
  it('lets users pick one value and calls onChange', async () => {
    const user = userEvent.setup()
    let selected = ''
    render(
      <RadioGroup
        label="Genre"
        options={[
          { value: 'm', label: 'Homme' },
          { value: 'f', label: 'Femme' },
        ]}
        onChange={(value) => {
          selected = value
        }}
      />,
    )
    await user.click(screen.getByRole('radio', { name: 'Femme' }))
    expect(selected).toBe('f')
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
  })

  it('disables all options when disabled', () => {
    render(<RadioGroup options={[{ value: 'a', label: 'A' }]} disabled />)
    expect(screen.getByRole('radio', { name: 'A' })).toBeDisabled()
  })
})
