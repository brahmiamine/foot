import type { Meta, StoryObj } from '@storybook/react'
import { Badge } from './Badge'
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from './Table'

const rows = [
  { club: 'AS Monaco', league: 'Ligue 1', licencies: 18500, status: 'Actif' as const },
  { club: 'Olympique de Marseille', league: 'Ligue 1', licencies: 24000, status: 'Actif' as const },
  { club: 'FC Nantes', league: 'Ligue 2', licencies: 12300, status: 'En attente' as const },
  { club: 'US Boulogne', league: 'National', licencies: 4200, status: 'Suspendu' as const },
]

const statusVariant = {
  Actif: 'success',
  'En attente': 'warning',
  Suspendu: 'danger',
} as const

const meta: Meta<typeof Table> = {
  title: 'Data Display/Table',
  component: Table,
  tags: ['autodocs'],
  args: {
    striped: false,
    compact: false,
  },
}

export default meta
type Story = StoryObj<typeof Table>

function Rows() {
  return (
    <TableBody>
      {rows.map((row) => (
        <TableRow key={row.club}>
          <TableCell>{row.club}</TableCell>
          <TableCell>{row.league}</TableCell>
          <TableCell>{row.licencies.toLocaleString('fr-FR')}</TableCell>
          <TableCell>
            <Badge variant={statusVariant[row.status]}>{row.status}</Badge>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  )
}

export const Default: Story = {
  render: (args) => (
    <Table {...args}>
      <TableHead>
        <TableRow>
          <TableHeaderCell>Club</TableHeaderCell>
          <TableHeaderCell>Championnat</TableHeaderCell>
          <TableHeaderCell>Licenciés</TableHeaderCell>
          <TableHeaderCell>Statut</TableHeaderCell>
        </TableRow>
      </TableHead>
      <Rows />
    </Table>
  ),
}

export const Striped: Story = {
  args: { striped: true },
  render: Default.render,
}

export const Compact: Story = {
  args: { compact: true },
  render: Default.render,
}
