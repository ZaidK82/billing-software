import { useState } from 'react'
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto flex min-h-[80vh] max-w-md items-center justify-center">
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-600">
              Billing Software
            </p>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Project Foundation
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              React frontend is running successfully.
            </p>
          </div>

          <div className="rounded-xl bg-slate-100 p-4">
            <p className="text-sm font-medium text-slate-800">
              Version 1
            </p>

            <p className="mt-1 text-sm text-slate-600">
              Invoice creation, preview and PDF generation will be added
              incrementally.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;