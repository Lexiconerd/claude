import React from 'react'
import ReactDOM from 'react-dom/client'
import Organizer from './App'
import PasswordGate from './PasswordGate'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PasswordGate>
      <Organizer />
    </PasswordGate>
  </React.StrictMode>
)
