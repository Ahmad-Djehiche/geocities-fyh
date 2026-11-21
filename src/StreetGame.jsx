<<<<<<< HEAD
import { useEffect, useEffectEvent, useRef, useState } from 'react'
=======
import blueHouseSprite from './assets/craftpix-house-blue.png'
import greenHouseSprite from './assets/craftpix-house-green.png'
import plumHouseSprite from './assets/craftpix-house-plum.png'
import houseSprite from './assets/craftpix-house.png'
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
>>>>>>> origin/main
import playerSprite from './assets/street-player.png'
import './StreetGame.css'

const houseSprites = [houseSprite, blueHouseSprite, greenHouseSprite, plumHouseSprite]
const plots = ['west-north', 'east-north', 'west-south', 'east-south']
const directions = {
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
  w: 'up', arrowup: 'up',
  s: 'down', arrowdown: 'down',
}
const playerSpeed = 230
const interactionDistance = 110
const mailboxDistance = 36

export default function StreetGame({ houses, paused, interactionsDisabled, onVisit, onBuild }) {
  const streetRef = useRef(null)
  const mailboxDialog = useRef(null)
  const flightId = useRef(0)
  const [mailbox, setMailbox] = useState(null)
  const [flight, setFlight] = useState(null)
  const [position, setPosition] = useState({ x: null, y: null })
  const [layout, setLayout] = useState({ width: 0, height: 0, plots: [] })

  useEffect(() => {
    const street = streetRef.current
    function measure() {
      const width = street.clientWidth
      const height = street.clientHeight
      const streetRect = street.getBoundingClientRect()
      const plotPositions = Array.from(street.querySelectorAll('[data-plot]'), (plot) => {
        const rect = plot.getBoundingClientRect()
        return {
          x: rect.left - streetRect.left + rect.width / 2,
          y: rect.top - streetRect.top + rect.height / 2,
          mailboxX: rect.left - streetRect.left - street.clientLeft + rect.width / 2 + Math.min(rect.width * 0.42, 75),
          mailboxY: rect.bottom - streetRect.top - street.clientTop - 30,
        }
      })
      setLayout({ width, height, plots: plotPositions })
      setPosition((current) => current.x === null
        ? { x: width / 2, y: height * 0.06 }
        : {
            x: Math.min(width - 24, Math.max(24, current.x)),
            y: Math.min(height - 24, Math.max(24, current.y)),
          })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(street)
    return () => observer.disconnect()
  }, [])

  const playerX = position.x ?? layout.width / 2
  const playerY = layout.height - (position.y ?? layout.height * 0.06)
  const nearbyMailbox = plots.find((plot, index) => {
    const bounds = layout.plots[index]
    const hasHouse = houses.some((house) => Number(house.plot_id) === index + 1)
    return hasHouse && bounds &&
      Math.hypot(playerX - bounds.mailboxX, playerY - bounds.mailboxY) <= mailboxDistance
  })

  const openMailbox = useCallback((plot) => {
    if (plot !== nearbyMailbox) return
    const house = houses.find((candidate) => Number(candidate.plot_id) === plots.indexOf(plot) + 1)
    if (house) setMailbox({ name: house.name, plot })
  }, [houses, nearbyMailbox])

  let nearbyPlot = null
  let closestDistance = interactionDistance
  for (const [index, plot] of layout.plots.entries()) {
    const distance = Math.hypot(playerX - plot.x, playerY - plot.y)
    if (distance < closestDistance) {
      closestDistance = distance
      nearbyPlot = index
    }
  }
  const nearbyHouse = nearbyPlot === null
    ? null
    : houses.find((house) => Number(house.plot_id) === nearbyPlot + 1)
  const canInteract = !paused && !interactionsDisabled

  const interact = useEffectEvent(() => {
    if (!canInteract) return
<<<<<<< HEAD
    if (nearbyHouse) onVisit(nearbyHouse)
=======
    if (nearbyMailbox) openMailbox(nearbyMailbox)
    else if (nearbyHouse) onVisit(nearbyHouse)
>>>>>>> origin/main
    else if (nearbyPlot !== null) onBuild()
  })

  useEffect(() => {
    if (paused || mailbox) return

    const keys = new Set()
    let frame = null
    let previousTime = null

    function move(time) {
      const elapsed = previousTime === null ? 0 : Math.min((time - previousTime) / 1000, 0.05)
      previousTime = time
      const held = new Set(Array.from(keys, (key) => directions[key]))
      const dx = Number(held.has('right')) - Number(held.has('left'))
      const dy = Number(held.has('up')) - Number(held.has('down'))

      if (dx || dy) {
        const step = playerSpeed * elapsed / Math.hypot(dx, dy)
        setPosition((current) => ({
          x: Math.max(24, Math.min(layout.width - 24, (current.x ?? layout.width / 2) + dx * step)),
          y: Math.max(24, Math.min(layout.height - 24, (current.y ?? layout.height * 0.06) + dy * step)),
        }))
      }
      frame = requestAnimationFrame(move)
    }

    function stopMoving() {
      keys.clear()
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      previousTime = null
    }

    function handleKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
          event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return

      const key = event.key.toLowerCase()
      if (key === 'e' && !event.repeat) interact()
      if (!Object.hasOwn(directions, key)) return

      event.preventDefault()
      keys.add(key)
      if (frame === null) frame = requestAnimationFrame(move)
    }

    function handleKeyUp(event) {
      keys.delete(event.key.toLowerCase())
      if (keys.size === 0) stopMoving()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', stopMoving)
    return () => {
      stopMoving()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', stopMoving)
    }
<<<<<<< HEAD
  }, [paused, layout])
=======
  }, [paused, mailbox, layout])

  useEffect(() => {
    const dialog = mailboxDialog.current
    if (mailbox && !dialog.open) dialog.showModal()
  }, [mailbox])

  function sendMessage(event) {
    event.preventDefault()
    if (!mailbox) return
    flightId.current += 1
    setFlight({ plot: mailbox.plot, id: flightId.current })
    mailboxDialog.current.close()
  }
>>>>>>> origin/main

  return (
    <>
      <p className="street-controls"><kbd>WASD</kbd> or <kbd>↑ ← ↓ →</kbd> to move; <kbd>E</kbd> to interact</p>
      <section className="street-map" ref={streetRef} aria-label="Webstreet neighborhood">
        <div className="street-road" aria-hidden="true" />
        <div className="street-trees" aria-hidden="true" />
        {plots.map((plot, index) => {
          const house = houses.find((candidate) => Number(candidate.plot_id) === index + 1)
          return (
            <div className={`street-plot street-plot--${plot}`} data-plot key={plot}>
              <button
                className="street-plot-button"
                type="button"
                disabled={!canInteract}
                onClick={house ? () => onVisit(house) : onBuild}
                aria-label={house ? `Visit ${house.name}'s homepage` : `Build a house on plot ${index + 1}`}
              >
                {house ? (
                  <img className="street-house" src={houseSprites[index]} alt="" />
                ) : (
                  <span className="street-vacant-sign" aria-hidden="true">+</span>
                )}
                <span className="street-plot-label">{house ? house.name : 'Vacant lot'}</span>
              </button>
              {house && (
                <button
                  className="street-mailbox"
                  type="button"
                  aria-label={`Open mailbox for ${house.name}`}
                  aria-disabled={plot !== nearbyMailbox}
                  title={plot === nearbyMailbox ? 'Open mailbox' : 'Walk up to the mailbox to use it'}
                  onClick={() => openMailbox(plot)}
                >
                  <span aria-hidden="true" />
                </button>
              )}
              {flight?.plot === plot && (
                <span
                  className="street-pig-flight"
                  key={flight.id}
                  style={{ '--pig-rise': `-${layout.plots[index].mailboxY + 70}px` }}
                  aria-hidden="true"
                  onAnimationEnd={() => setFlight((current) => current?.id === flight.id ? null : current)}
                >
                  <span className="street-pig-wing" />
                  <span className="street-pig-body" />
                  <span className="street-pig-letter" />
                </span>
              )}
            </div>
          )
        })}
        <img
          className="street-player"
          src={playerSprite}
          alt=""
          style={{ left: position.x ?? '50%', bottom: position.y ?? '6%' }}
        />
        <div
          className="street-prompt"
          style={{ left: position.x ?? '50%', bottom: (position.y ?? layout.height * 0.06) + 54 }}
          role="status"
        >
<<<<<<< HEAD
          {canInteract && nearbyPlot !== null && (
            <span><kbd>E</kbd> {nearbyHouse ? `Visit ${nearbyHouse.name}` : 'Build here'}</span>
=======
          {canInteract && !mailbox && (nearbyMailbox || nearbyPlot !== null) && (
            <span><kbd>E</kbd> {nearbyMailbox ? 'Open mailbox' : nearbyHouse ? `Visit ${nearbyHouse.name}` : 'Build here'}</span>
>>>>>>> origin/main
          )}
        </div>
      </section>
      <dialog
        className="street-mail-dialog"
        ref={mailboxDialog}
        aria-labelledby="street-mail-title"
        onClose={() => setMailbox(null)}
      >
        <form key={mailbox?.plot} onSubmit={sendMessage}>
          <h2 id="street-mail-title">Mail for {mailbox?.name}</h2>
          <label>
            Message
            <textarea required maxLength={280} rows={4} />
          </label>
          <p>This is a local demo. Your message won?t be delivered.</p>
          <div className="street-mail-actions">
            <button type="button" onClick={() => mailboxDialog.current.close()}>Cancel</button>
            <button className="build-button" type="submit">Send</button>
          </div>
        </form>
      </dialog>
      {houses.some((house) => Number(house.plot_id) > plots.length) && (
        <ul className="street-other-homes" aria-label="More homes">
          {houses.filter((house) => Number(house.plot_id) > plots.length).map((house) => (
            <li key={house.id}>
              <button type="button" disabled={!canInteract} onClick={() => onVisit(house)}>Visit {house.name}</button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
