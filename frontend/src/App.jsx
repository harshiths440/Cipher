import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'

function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-brand-bg)] text-gray-100">
      <Navbar />
      <main className="flex-grow flex flex-col">
        <Routes>
          <Route path="/"                element={<Home />} />
          <Route path="/dashboard/:cin"  element={<Dashboard />} />
          <Route path="/calendar/:cin"   element={<Calendar />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
