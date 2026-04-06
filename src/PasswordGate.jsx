import { useState } from 'react'

const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD
const STORAGE_KEY = 'hearth_auth'
const OLD_STORAGE_KEY = 'organizer_auth'

export default function PasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(() => {
    // Migrate from old key if it exists
    const oldVal = localStorage.getItem(OLD_STORAGE_KEY)
    if (oldVal && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, oldVal)
      localStorage.removeItem(OLD_STORAGE_KEY)
    }
    return localStorage.getItem(STORAGE_KEY) === APP_PASSWORD
  })
  const [input, setInput] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    if (input === APP_PASSWORD) {
      localStorage.setItem(STORAGE_KEY, input)
      setAuthenticated(true)
    } else {
      setError(true)
      setTimeout(() => setError(false), 2000)
    }
  }

  if (authenticated) return children

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,400&family=Source+Sans+3:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .gate {
          min-height: 100vh;
          background: #f6f1eb;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 16px;
          font-family: 'Source Sans 3', -apple-system, sans-serif;
          color: #3d3529;
        }
        .gate-card {
          width: 100%;
          max-width: 360px;
          background: #fffcf7;
          border-radius: 20px;
          padding: 40px 28px;
          box-shadow: 0 1px 3px rgba(80,60,30,0.06), 0 8px 24px rgba(80,60,30,0.08);
          text-align: center;
        }
        .gate-title {
          font-family: 'Fraunces', serif;
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .gate-title em { font-style: italic; font-weight: 300; color: #b07d3a; }
        .gate-sub { font-size: 14px; color: #8a7d6b; margin-bottom: 28px; }
        .gate-input {
          width: 100%;
          padding: 12px 16px;
          font-family: 'Source Sans 3', sans-serif;
          font-size: 15px;
          border: 1.5px solid #e4ddd2;
          border-radius: 10px;
          background: #fffcf7;
          color: #3d3529;
          outline: none;
          transition: border-color 0.2s;
          margin-bottom: 12px;
          text-align: center;
        }
        .gate-input:focus { border-color: #b07d3a; }
        .gate-input.error { border-color: #d4644a; animation: shake 0.3s ease; }
        .gate-btn {
          width: 100%;
          padding: 12px;
          font-family: 'Source Sans 3', sans-serif;
          font-size: 15px;
          font-weight: 600;
          border: none;
          background: #b07d3a;
          color: #fffcf7;
          cursor: pointer;
          border-radius: 10px;
          transition: background 0.15s;
        }
        .gate-btn:hover { background: #9a6c2f; }
        .gate-error { color: #d4644a; font-size: 13px; margin-top: 12px; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
      `}</style>
      <div className="gate">
        <form className="gate-card" onSubmit={handleSubmit}>
          <h1 className="gate-title"><em>He</em>arth</h1>
          <p className="gate-sub">Enter the password to continue</p>
          <input
            className={`gate-input ${error ? 'error' : ''}`}
            type="password"
            placeholder="Password"
            value={input}
            onChange={e => setInput(e.target.value)}
            autoFocus
          />
          <button className="gate-btn" type="submit">Enter</button>
          {error && <p className="gate-error">Incorrect password</p>}
        </form>
      </div>
    </>
  )
}
