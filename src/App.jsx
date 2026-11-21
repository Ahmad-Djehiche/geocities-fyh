import { useEffect, useRef, useState } from 'react'
import AccountDialog from './AccountDialog'
import { HouseBuilder, HouseEditor, HouseHomepage } from './HouseDialogs'
import { supabase } from './lib/supabase'
import StreetGame from './StreetGame'
import './App.css'

const starterHouses = [
  { id: '1', name: 'Maya', title: "Maya's mixtape garden", description: 'Songs for long walks and screenshots of beautiful bugs.', color: '#ff70a6', style: 'pixel', plot_id: 1 },
  { id: '2', name: 'Theo', title: 'The tiny planet', description: 'A field journal from the other side of the keyboard.', color: '#ffd166', style: 'retro', plot_id: 2 },
  { id: '3', name: 'Sam', title: "Sam's midnight arcade", description: 'High scores, fan art, and one very tiny spaceship.', color: '#06d6a0', style: 'arcade', plot_id: 3 },
]

const emptyHouses = []
const previewStorageKey = 'webstreet-houses'

function loadPreviewHouses() {
  try {
    const saved = JSON.parse(localStorage.getItem(previewStorageKey))
    return Array.isArray(saved) ? saved : starterHouses
  } catch {
    return starterHouses
  }
}

function hasPreviewHouse(houses) {
  return houses.some((house) => !starterHouses.some((starter) => starter.id === house.id))
}

function availablePlot(houses, preferredPlot) {
  const occupied = new Set(houses.map((house) => Number(house.plot_id)))
  if (preferredPlot && !occupied.has(preferredPlot)) return preferredPlot
  let plot = 1
  while (occupied.has(plot)) plot += 1
  return plot
}

function App() {
  const [previewHouses, setPreviewHouses] = useState(() => supabase ? null : loadPreviewHouses())
  const [sharedStreet, setSharedStreet] = useState(null)
  const streetLoad = useRef(null)
  const [dialog, setDialog] = useState(null)
  const [streetError, setStreetError] = useState(false)
  const [streetRevision, setStreetRevision] = useState(0)
  const [session, setSession] = useState(undefined)
  const [ownership, setOwnership] = useState(null)
  const userId = session?.user.id
  const authReady = session !== undefined
  const streetHouses = supabase
    ? (sharedStreet?.userId === userId ? sharedStreet?.houses : null)
    : previewHouses
  const houses = streetHouses ?? emptyHouses
  const checkingOwnership = Boolean(userId && ownership?.userId !== userId)
  const ownsHouse = supabase
    ? Boolean(userId && ownership?.userId === userId && ownership.hasHouse)
    : hasPreviewHouse(houses)
  const buildRequest = dialog?.type === 'build' ? dialog : null
  const editRequest = dialog?.type === 'edit' ? houses.find((house) => house.id === dialog.houseId) : null
  const showBuilder = Boolean(buildRequest && !ownsHouse && !checkingOwnership && (!supabase || userId))
  const showAccount = dialog?.type === 'account' || Boolean(buildRequest && !showBuilder)
  const selected = dialog?.type === 'visit' ? houses.find((house) => house.id === dialog.houseId) : null

  function closeMissingHomepage(visibleHouses) {
    setDialog((current) => {
      if (current?.type === 'visit' && !visibleHouses.some((house) => house.id === current.houseId)) return null
      return current
    })
  }

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (supabase) return
    function syncPreview(event) {
      if (event.key !== previewStorageKey && event.key !== null) return
      const updated = loadPreviewHouses()
      setPreviewHouses(updated)
      closeMissingHomepage(updated)
    }
    window.addEventListener('storage', syncPreview)
    return () => window.removeEventListener('storage', syncPreview)
  }, [])

  useEffect(() => {
    if (!supabase || !authReady) return
    const controller = new AbortController()
    streetLoad.current = controller
    let loading = false

    async function loadHouses() {
      if (loading || document.hidden) return
      loading = true
      const [street, owned] = await Promise.all([
        supabase.from(userId ? 'visible_street_houses' : 'houses')
          .select('*').order('plot_id', { ascending: true }).abortSignal(controller.signal),
        userId
          ? supabase.from('houses').select('id').eq('owner_id', userId).abortSignal(controller.signal).maybeSingle()
          : null,
      ])
      loading = false
      if (controller.signal.aborted) return
      setStreetError(Boolean(street.error))
      if (!street.error) {
        setSharedStreet({ userId, houses: street.data })
        closeMissingHomepage(street.data)
      }
      if (owned) {
        setOwnership((current) => owned.error && current?.userId === userId
          ? current
          : { userId, hasHouse: Boolean(owned.data) })
      }
    }

    loadHouses()
    const timer = window.setInterval(loadHouses, 5000)
    document.addEventListener('visibilitychange', loadHouses)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', loadHouses)
    }
  }, [streetRevision, userId, authReady])

  function refreshStreet() {
    streetLoad.current?.abort()
    setStreetRevision((current) => current + 1)
  }

  function handleFriendshipChange(removedFriendId) {
    if (removedFriendId) {
      setSharedStreet((current) => current && current.userId === userId
        ? { ...current, houses: current.houses.filter((house) => house.owner_id !== removedFriendId) }
        : current)
    }
    refreshStreet()
  }

  function openBuild(plotId = null) {
    setDialog({ type: 'build', plotId })
  }

  function closeDialog() {
    setDialog(null)
  }

  async function addHouse(details) {
    const house = { ...details, style: 'pixel' }
    if (supabase) {
      const { data: created, error } = await supabase
        .from('houses')
        .insert({ ...house, owner_id: userId, plot_id: buildRequest.plotId })
        .select()
        .single()
      if (error?.code === '23505' && error.message.includes('houses_one_per_account')) {
        setOwnership({ userId, hasHouse: true })
        refreshStreet()
        return
      }
      if (error) return 'Could not save your house. Try again.'

      setDialog((current) => current === buildRequest ? null : current)
      setOwnership({ userId, hasHouse: true })
      setSharedStreet((current) => current && current.userId === userId
        ? { ...current, houses: [...current.houses.filter((home) => home.id !== created.id), created] }
        : current)
      refreshStreet()
    } else {
      const previewHouses = loadPreviewHouses()
      if (hasPreviewHouse(previewHouses)) {
        setPreviewHouses(previewHouses)
        return
      }
      const next = {
        ...house,
        id: crypto.randomUUID(),
        plot_id: availablePlot(previewHouses, buildRequest.plotId),
      }
      const updated = [...previewHouses, next]
      try {
        localStorage.setItem(previewStorageKey, JSON.stringify(updated))
      } catch {
        return 'Could not save your house in this browser.'
      }
      closeDialog()
      setPreviewHouses(updated)
    }
  }

  async function updateHouse(details) {
    if (!editRequest) return 'No house selected for editing.'
    if (supabase) {
      const { error } = await supabase
        .from('houses')
        .update(details)
        .eq('id', editRequest.id)
        .eq('owner_id', userId)
      if (error) return 'Could not update your house. Try again.'
      closeDialog()
      setSharedStreet((current) => current && current.userId === userId
        ? { ...current, houses: current.houses.map((h) => h.id === editRequest.id ? { ...h, ...details } : h) }
        : current)
      refreshStreet()
    } else {
      const updated = houses.map((h) => h.id === editRequest.id ? { ...h, ...details } : h)
      try {
        localStorage.setItem(previewStorageKey, JSON.stringify(updated))
      } catch {
        return 'Could not save your house in this browser.'
      }
      closeDialog()
      setPreviewHouses(updated)
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="brand-mark">W</span> WEBSTREET</div>
        <div className="topbar-actions">
          <button type="button" className="account-button" onClick={() => setDialog({ type: 'account' })}>
            {session ? 'Friends' : 'Sign in'}
          </button>
          <button className="build-button" disabled={!streetHouses} onClick={() => openBuild()}>
            {ownsHouse ? '+ Add a friend' : '+ Build a house'}
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
        userId={userId}
        paused={Boolean(selected || editRequest)}
        interactionsDisabled={Boolean(dialog) || !streetHouses}
        vacantPlotAction={ownsHouse ? 'Add a friend' : 'Claim a plot'}
        onVisit={(house) => setDialog({ type: 'visit', houseId: house.id })}
        onEdit={(house) => setDialog({ type: 'edit', houseId: house.id })}
        onBuild={openBuild}
      />

      <footer>
        <span className="status"><i /> {supabase ? 'SHARED STREET' : 'LOCAL PREVIEW'}</span>
      </footer>

      {showAccount && (
        <AccountDialog
          session={buildRequest && checkingOwnership ? undefined : session}
          addFriend={Boolean(buildRequest && ownsHouse)}
          building={Boolean(buildRequest)}
          onFriendshipChange={handleFriendshipChange}
          onClose={closeDialog}
        />
      )}
      {selected && <HouseHomepage house={selected} onClose={closeDialog} />}
      {showBuilder && (
        <HouseBuilder key={userId} plotId={buildRequest.plotId} onClose={closeDialog} onSave={addHouse} />
      )}
      {editRequest && (
        <HouseEditor key={editRequest.id} house={editRequest} onClose={closeDialog} onSave={updateHouse} />
      )}
    </main>
  )
}

export default App
