import React from 'react'
import ReactDOM from 'react-dom/client'
import Hearth from './App'
import PasswordGate from './PasswordGate'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PasswordGate>
      <Hearth />
    </PasswordGate>
  </React.StrictMode>
)
