import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import FeaturesPage from './FeaturesPage'

function renderWithRouter(initialEntries: string[]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<FeaturesPage />} />
      </Routes>
    </MemoryRouter>
  )
}

it('highlights matches for search query', async () => {
  renderWithRouter(['/?q=return'])
  const marks = await screen.findAllByText(/return/i, { selector: 'mark' })
  expect(marks.length).toBeGreaterThan(0)
})
