import { useEffect, useState } from 'react'
import AccountDialog from './AccountDialog'
import { supabase } from './lib/supabase'
import StreetGame from './StreetGame'
import './App.css'

const starterHouses = [
  { id: '1', name: 'Maya', title: "Maya's mixtape garden", description: 'Songs for long walks and screenshots of beautiful bugs.', color: '#ff70a6', style: 'pixel', plot_id: 1 },
  { id: '2', name: 'Theo', title: 'The tiny planet', description: 'A field journal from the other side of the keyboard.', color: '#ffd166', style: 'retro', plot_id: 2 },
  { id: '3', name: 'Sam', title: "Sam's midnight arcade", description: 'High scores, fan art, and one very tiny spaceship.', color: '#06d6a0', style: 'arcade', plot_id: 3 },
]

const houseColors = ['#ff70a6', '#ffd166', '#06d6a0', '#7bdff2', '#cdb4db', '#ff9f1c']

function availablePlot(houses, preferredPlot) {
  const occupied = new Set(houses.map((house) => Number(house.plot_id)))
  if (preferredPlot && !occupied.has(preferredPlot)) return preferredPlot
  let plot = 1
  while (occupied.has(plot)) plot += 1
  return plot
}

function App() {
  const [streetHouses, setHouses] = useState(() => {
    if (supabase) return null
    try {
      return JSON.parse(localStorage.getItem('webstreet-houses')) || starterHouses
    } catch {
      return starterHouses
    }
  })
  const [selected, setSelected] = useState(null)
  const [buildRequest, setBuildRequest] = useState(null)
  const [saving, setSaving] = useState(false)
  const [buildError, setBuildError] = useState('')
  const [streetError, setStreetError] = useState(false)
  const [streetRevision, setStreetRevision] = useState(0)
  const [accountOpen, setAccountOpen] = useState(false)
  const [session, setSession] = useState(undefined)
  const houses = streetHouses ?? []
  const formOpen = buildRequest !== null

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase) return
    const controller = new AbortController()
    let loading = false

    async function loadHouses() {
      if (loading || document.hidden) return
      loading = true
      const { data, error } = await supabase
        .from('houses')
        .select('*')
        .order('plot_id', { ascending: true })
        .abortSignal(controller.signal)
      loading = false
      if (controller.signal.aborted) return
      setStreetError(Boolean(error))
      if (!error) setHouses(data)
    }

    loadHouses()
    const timer = window.setInterval(loadHouses, 5000)
    document.addEventListener('visibilitychange', loadHouses)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', loadHouses)
    }
  }, [streetRevision])

  function openBuild(plotId = null) {
    setBuildError('')
    setBuildRequest({ plotId })
  }

  function closeBuild() {
    if (!saving) setBuildRequest(null)
  }

  useEffect(() => {
    if (!supabase) {
      localStorage.setItem('webstreet-houses', JSON.stringify(houses))
    }
  }, [houses])

  async function removeHouse(houseId) {
    if (supabase) {
      const { error } = await supabase
        .from('houses')
        .delete()
        .eq('id', houseId)
      if (!error) {
        setHouses((current) => current.filter((h) => h.id !== houseId))
      }
    } else {
      setHouses((current) => current.filter((h) => h.id !== houseId))
    }
  }

  async function addHouse(event) {
    event.preventDefault()
    if (saving) return
    const data = new FormData(event.currentTarget)
    const house = {
      name: data.get('name').trim(),
      title: data.get('title').trim(),
      description: data.get('description').trim(),
      color: houseColors[houses.length % houseColors.length],
      style: 'pixel',
    }
    if (!house.name || !house.title) {
      setBuildError('Enter a name and homepage title.')
      return
    }

    setSaving(true)
    setBuildError('')
    const plotId = availablePlot(houses, buildRequest.plotId)
    if (supabase) {
      const { error } = await supabase
        .from('houses')
        .insert({ ...house, plot_id: plotId })
      if (error) {
        setBuildError('Could not save your house. Try again.')
        setSaving(false)
        return
      }
      setStreetRevision((current) => current + 1)
    } else {
      const next = {
        ...house,
        id: crypto.randomUUID(),
        plot_id: plotId,
      }
      const updated = [...houses, next]
      try {
        localStorage.setItem('webstreet-houses', JSON.stringify(updated))
      } catch {
        setBuildError('Could not save your house in this browser.')
        setSaving(false)
        return
      }
      setHouses(updated)
    }
    setBuildRequest(null)
    setSaving(false)
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">W</span> WEBSTREET</div>
        <div className="topbar-actions">
          <button type="button" className="account-button" onClick={() => setAccountOpen(true)}>
            {session ? 'Friends' : 'Sign in'}
          </button>
          <button className="build-button" disabled={!streetHouses} onClick={() => openBuild()}>
            + Build a house
          </button>
        </div>
      </header>

      <section className="intro">
        <p className="eyebrow">YOUR CORNER OF THE INTERNET</p>
        <h1>A street you build with your friends.</h1>
        <p className="pitch">Every house is someone&apos;s homepage.</p>
        {(streetError || !streetHouses) && (
          <p className="pitch" role="status">
            {streetError ? 'Could not load the shared street. Retrying…' : 'Loading the shared street…'}
          </p>
        )}
      </section>

      <StreetGame
        houses={houses}
        paused={Boolean(selected)}
        interactionsDisabled={formOpen || accountOpen || !streetHouses}
        onVisit={setSelected}
        onBuild={openBuild}
      />

      <footer>
        <span className="status"><i /> {supabase ? 'SHARED STREET' : 'LOCAL PREVIEW'}</span>
      </footer>

      {accountOpen && <AccountDialog session={session} onClose={() => setAccountOpen(false)} />}

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
        <div className="modal-backdrop" role="presentation" onMouseDown={closeBuild}>
          <form className="builder" role="dialog" aria-modal="true" onSubmit={addHouse} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="close" onClick={closeBuild} disabled={saving} aria-label="Close form">×</button>
            <p className="eyebrow">NEW HOMEPAGE</p>
            <h2>Claim your lot</h2>
            <label>Name<input name="name" required maxLength="24" placeholder="e.g. Alex" /></label>
            <label>Homepage title<input name="title" required maxLength="50" placeholder="Alex's corner" /></label>
            <label>About you<textarea name="description" maxLength="180" placeholder="What makes your little internet place yours?" /></label>
            {buildError && <p className="account-error" role="alert">{buildError}</p>}
            <button className="build-button" disabled={saving} type="submit">{saving ? 'Building…' : 'Build house'}</button>
          </form>
        </div>
      )}
    </main>
  )
}

export default App
