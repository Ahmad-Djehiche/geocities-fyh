import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import './App.css'

const starterHouses = [
  { id: '1', name: 'Maya', title: "Maya's mixtape garden", description: 'Songs for long walks and screenshots of beautiful bugs.', color: '#ff70a6', style: 'pixel', plot_id: 1 },
  { id: '2', name: 'Theo', title: 'The tiny planet', description: 'A field journal from the other side of the keyboard.', color: '#ffd166', style: 'retro', plot_id: 2 },
  { id: '3', name: 'Sam', title: "Sam's midnight arcade", description: 'High scores, fan art, and one very tiny spaceship.', color: '#06d6a0', style: 'arcade', plot_id: 3 },
]

const houseColors = ['#ff70a6', '#ffd166', '#06d6a0', '#7bdff2', '#cdb4db', '#ff9f1c']

function App() {
  const [houses, setHouses] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('webstreet-houses')) || starterHouses
    } catch {
      return starterHouses
    }
  })
  const [selected, setSelected] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadHouses() {
      if (!supabase) return
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('plot_id', { ascending: true })
      if (!error && data) setHouses(data)
    }
    loadHouses()
  }, [])

  async function addHouse(event) {
    event.preventDefault()
    setSaving(true)
    const data = new FormData(event.currentTarget)
    const nextPlotId = (houses.length > 0 ? Math.max(...houses.map(h => h.plot_id)) : 0) + 1
    const house = {
      name: data.get('name').trim(),
      title: data.get('title').trim(),
      description: data.get('description').trim(),
      color: houseColors[houses.length % houseColors.length],
      style: 'pixel',
      plot_id: nextPlotId,
    }
    if (!house.name || !house.title) {
      setSaving(false)
      return
    }

    if (supabase) {
      const { data: created, error } = await supabase
        .from('houses')
        .insert(house)
        .select()
        .single()
      if (!error && created) {
        setHouses((current) => [...current, created])
      }
    } else {
      const next = { ...house, id: crypto.randomUUID() }
      const updated = [...houses, next]
      setHouses(updated)
      localStorage.setItem('webstreet-houses', JSON.stringify(updated))
    }
    event.currentTarget.reset()
    setFormOpen(false)
    setSaving(false)
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">W</span> WEBSTREET</div>
        <button className="build-button" onClick={() => setFormOpen(true)}>+ Build a house</button>
      </header>

      <section className="intro">
        <p className="eyebrow">YOUR CORNER OF THE INTERNET</p>
        <h1>A street you build with your friends.</h1>
        <p className="pitch">Every house is someone&apos;s homepage.</p>
      </section>

      <section className="street" aria-label="Webstreet neighborhood">
        <div className="sky-orbit orbit-one" />
        <div className="sky-orbit orbit-two" />
        <div className="cloud cloud-one">· · ·</div>
        <div className="cloud cloud-two">· · · ·</div>
        {houses.map((house) => (
          <button
            className="house"
            key={house.id}
            onClick={() => setSelected(house)}
            aria-label={`Visit ${house.name}'s homepage`}
          >
            <span className="house-number">{String(house.plot_id).padStart(2, '0')}</span>
            <span className="roof" style={{ '--house-color': house.color }} />
            <span className="chimney" style={{ '--house-color': house.color }} />
            <span className="walls" style={{ '--house-color': house.color }}>
              <span className="window window-left" />
              <span className="window window-right" />
              <span className="door" />
              <span className="owner">{house.name}</span>
            </span>
          </button>
        ))}
        <button className="empty-lot" onClick={() => setFormOpen(true)} aria-label="Build a new house">
          <span>+</span>
          <b>YOUR LOT</b>
        </button>
      </section>

      <footer>
        <span>{houses.length} homes online</span>
        <span className="status"><i /> {supabase ? 'SHARED STREET' : 'LOCAL PREVIEW'}</span>
      </footer>

      {selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <article className="homepage" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)} aria-label="Close homepage">×</button>
            <div className="homepage-banner" style={{ background: selected.color }}>
              <span>★ {selected.name.toUpperCase()}'S HOME ★</span>
            </div>
            <h2>{selected.title}</h2>
            <p>{selected.description}</p>
            <div className="guestbook">GUESTBOOK: <strong>0 messages</strong></div>
          </article>
        </div>
      )}

      {formOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setFormOpen(false)}>
          <form className="builder" role="dialog" aria-modal="true" onSubmit={addHouse} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="close" onClick={() => setFormOpen(false)} aria-label="Close form">×</button>
            <p className="eyebrow">NEW HOMEPAGE</p>
            <h2>Claim your lot</h2>
            <label>Name<input name="name" required maxLength="24" placeholder="e.g. Alex" /></label>
            <label>Homepage title<input name="title" required maxLength="50" placeholder="Alex's corner" /></label>
            <label>About you<textarea name="description" maxLength="180" placeholder="What makes your little internet place yours?" /></label>
            <button className="build-button" disabled={saving} type="submit">{saving ? 'Building…' : 'Build house'}</button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
