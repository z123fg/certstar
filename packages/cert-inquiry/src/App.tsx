import { Routes, Route } from 'react-router-dom'
import SearchPage from './SearchPage.tsx'
import InquiryPage from './InquiryPage.tsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<SearchPage />} />
      <Route path="/:slug" element={<InquiryPage />} />
      <Route path="*" element={<SearchPage />} />
    </Routes>
  )
}
