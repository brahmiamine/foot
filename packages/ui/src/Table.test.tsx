import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table'

describe('Table', () => {
  it('renders headers and rows', () => {
    render(
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Nom</TableHeaderCell>
            <TableHeaderCell>Club</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>Amine</TableCell>
            <TableCell>FOOT FC</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    expect(screen.getByRole('columnheader', { name: 'Nom' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Amine' })).toBeInTheDocument()
  })
})
