import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Pagination } from './Pagination'

const meta: Meta<typeof Pagination> = {
  title: 'Navigation/Pagination',
  component: Pagination,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Pagination>

function ControlledPagination(props: { pageCount: number; siblingCount?: number }) {
  const [page, setPage] = useState(1)
  return <Pagination page={page} pageCount={props.pageCount} siblingCount={props.siblingCount} onPageChange={setPage} />
}

export const Default: Story = {
  render: () => <ControlledPagination pageCount={12} />,
}

export const FewPages: Story = {
  render: () => <ControlledPagination pageCount={4} />,
}

export const ManyPagesWithSiblings: Story = {
  render: () => <ControlledPagination pageCount={40} siblingCount={2} />,
}
