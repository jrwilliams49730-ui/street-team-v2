import { useState } from 'react'
import './App.css'

const tabs = [
  {
    id: 'discover',
    label: 'Discover',
    heading: 'Discover the live scene',
    text: 'Find performers, producers, and venues worth following.',
  },
  {
    id: 'performers',
    label: 'Performers',
    heading: 'Performers',
    text: 'Comedians, bands, DJs, and entertainers will live here.',
  },
  {
    id: 'producers',
    label: 'Producers',
    heading: 'Producers',
    text: 'Follow the people and teams creating the shows.',
  },
  {
    id: 'venues',
    label: 'Venues',
    heading: 'Venues',
    text: 'Keep up with the places hosting live events near you.',
  },
] as const

type TabId = (typeof tabs)[number]['id']

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('discover')
  const activePanel = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <h1>Street Team</h1>
          <p>Live entertainment, powered by the crowd.</p>
        </header>

        <nav
          className="tab-nav"
          role="tablist"
          aria-label="Creator and fan network"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab

            return (
              <button
                key={tab.id}
                id={`${tab.id}-tab`}
                type="button"
                role="tab"
                aria-controls={`${tab.id}-panel`}
                aria-selected={isActive}
                className={`tab-button ${isActive ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>

        <section
          id={`${activePanel.id}-panel`}
          className="content-card"
          role="tabpanel"
          aria-labelledby={`${activePanel.id}-tab`}
        >
          <h2>{activePanel.heading}</h2>
          <p>{activePanel.text}</p>
        </section>
      </div>
    </main>
  )
}

export default App
