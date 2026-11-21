import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { houseSprite } from './lib/houses'
import playerBackSprite from './assets/street-player-back.png'
import playerFrontSprite from './assets/street-player.png'
import playerLeftSprite from './assets/street-player-left.png'
import playerRightSprite from './assets/street-player-right.png'
import './StreetGame.css'

function useFullscreen(targetRef) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const toggleFullscreen = useCallback(() => {
    const target = targetRef.current
    if (!target) return
    if (document.fullscreenElement === target) {
      document.exitFullscreen()
    } else {
      target.requestFullscreen()
    }
  }, [targetRef])
  useEffect(() => {
    const target = targetRef.current
    if (!target) return
    const onChange = () => setIsFullscreen(!!target.contains(document.fullscreenElement))
    target.addEventListener('fullscreenchange', onChange)
    return () => target.removeEventListener('fullscreenchange', onChange)
  }, [targetRef])
  return [isFullscreen, toggleFullscreen]
}

const plots = ['west-north', 'east-north', 'west-south', 'east-south']
const playerSprites = {
  up: playerBackSprite,
  down: playerFrontSprite,
  left: playerLeftSprite,
  right: playerRightSprite,
}

const directions = {
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
  w: 'up', arrowup: 'up',
  s: 'down', arrowdown: 'down',
}
const playerSpeed = 230
const interactionDistance = 110
const mailboxDistance = 36
const cameraUpperLine = 0.75
const cameraLowerLine = 0.25

function followPlayer(playerHeight, cameraOffset, viewportHeight, worldHeight) {
  const upperLimit = playerHeight - viewportHeight * cameraUpperLine
  const lowerLimit = playerHeight - viewportHeight * cameraLowerLine
  const nextOffset = Math.max(upperLimit, Math.min(cameraOffset, lowerLimit))
  return Math.max(0, Math.min(worldHeight - viewportHeight, nextOffset))
}

export default function StreetGame({ houses, paused, interactionsDisabled, vacantPlotAction, onVisit, onBuild }) {
  const viewportRef = useRef(null)
  const streetRef = useRef(null)
  const mailboxDialog = useRef(null)
  const flightId = useRef(0)
  const [mailbox, setMailbox] = useState(null)
  const [flight, setFlight] = useState(null)
  const [position, setPosition] = useState({ x: null, y: null, facing: 'up', cameraOffset: 0 })
  const [layout, setLayout] = useState({ width: 0, height: 0, viewportHeight: 0, plots: [] })
  const [isFullscreen, toggleFullscreen] = useFullscreen(viewportRef)

  const housesByPlot = new Map()
  let lastPlot = 0
  for (const house of houses) {
    const plotId = Number(house.plot_id)
    if (!Number.isSafeInteger(plotId) || plotId < 1) continue
    if (!housesByPlot.has(plotId)) housesByPlot.set(plotId, house)
    lastPlot = Math.max(lastPlot, plotId)
  }
  const unlockedLevels = Math.max(0, Math.floor((housesByPlot.size - plots.length) / 2) + 1)
  const occupiedLevels = Math.ceil((lastPlot - plots.length) / 2)
  const extraLevels = Math.max(unlockedLevels, occupiedLevels)

  useEffect(() => {
    const street = streetRef.current
    const viewport = viewportRef.current
    function measure() {
      const width = street.clientWidth
      const height = street.clientHeight
      const streetRect = street.getBoundingClientRect()
      const plotPositions = Array.from(street.querySelectorAll('[data-plot]'), (plot, index) => {
        const mailboxSide = index % 2 === 0 ? 1 : -1
        const rect = plot.getBoundingClientRect()
        return {
          x: rect.left - streetRect.left + rect.width / 2,
          y: rect.top - streetRect.top + rect.height / 2,
          mailboxX: rect.left - streetRect.left - street.clientLeft + rect.width / 2 + mailboxSide * Math.min(rect.width * 0.42, 75),
          mailboxY: rect.bottom - streetRect.top - street.clientTop - 30,
        }
      })
      const viewportHeight = viewport.clientHeight
      setLayout({ width, height, viewportHeight, plots: plotPositions })
      setPosition((current) => current.x === null
        ? { ...current, x: width / 2, y: viewportHeight * 0.06 }
        : {
            ...current,
            x: Math.min(width - 24, Math.max(24, current.x)),
            y: Math.min(height - 24, Math.max(24, current.y)),
          })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(street)
    return () => observer.disconnect()
  }, [extraLevels])

  const playerX = position.x ?? layout.width / 2
  const playerHeight = position.y ?? layout.viewportHeight * 0.06
  const playerY = layout.height - playerHeight
  const cameraOffset = followPlayer(
    playerHeight, position.cameraOffset, layout.viewportHeight, layout.height,
  )
  const nearbyMailbox = layout.plots.findIndex((bounds, index) =>
    housesByPlot.has(index + 1) &&
    Math.hypot(playerX - bounds.mailboxX, playerY - bounds.mailboxY) <= mailboxDistance,
  ) + 1

  function openMailbox(plotId) {
    if (plotId !== nearbyMailbox) return
    const house = housesByPlot.get(plotId)
    if (house) setMailbox({ houseId: house.id, name: house.name, plot: plotId })
  }

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
    : housesByPlot.get(nearbyPlot + 1)
  const canInteract = !paused && !interactionsDisabled

  const interact = useEffectEvent(() => {
    if (!canInteract) return
    if (nearbyMailbox) openMailbox(nearbyMailbox)
    else if (nearbyHouse) onVisit(nearbyHouse)
    else if (nearbyPlot !== null) onBuild(nearbyPlot + 1)
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
        const facing = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'up' : 'down')
        setPosition((current) => {
          const y = Math.max(24, Math.min(layout.height - 24, (current.y ?? layout.viewportHeight * 0.06) + dy * step))
          return {
            facing,
            x: Math.max(24, Math.min(layout.width - 24, (current.x ?? layout.width / 2) + dx * step)),
            y,
            cameraOffset: followPlayer(y, current.cameraOffset, layout.viewportHeight, layout.height),
          }
        })
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
  }, [paused, mailbox, layout])

  useEffect(() => {
    const dialog = mailboxDialog.current
    if (!mailbox) return
    if (!houses.some((house) => house.id === mailbox.houseId)) {
      dialog.close()
    } else if (!dialog.open) {
      dialog.showModal()
    }
  }, [mailbox, houses])

  function sendMessage(event) {
    event.preventDefault()
    if (!mailbox) return
    flightId.current += 1
    setFlight({ plot: mailbox.plot, id: flightId.current })
    mailboxDialog.current.close()
  }

  return (
    <>
      <p className="street-controls">
        <span><kbd>WASD</kbd> or <kbd>↑ ← ↓ →</kbd> to move; <kbd>E</kbd> to interact</span>
      </p>
      <section className={`street-map${isFullscreen ? ' street-map--fullscreen' : ''}`} ref={viewportRef} aria-label="Webstreet neighborhood">
        {!isFullscreen && (
          <button className="street-fullscreen-btn" type="button" onClick={toggleFullscreen} aria-label="Enter fullscreen">
            ⛶
          </button>
        )}
        <div
          className="street-world"
          ref={streetRef}
          style={{ height: `${100 + extraLevels * 50}%`, transform: `translateY(${cameraOffset}px)` }}
        >
          <div className="street-road" aria-hidden="true" />
          <div className="street-trees" aria-hidden="true" />
          {Array.from({ length: 1 + extraLevels }, (_, level) => (
            <div className={level === 0 ? "street-level" : "street-level street-level--extension"} key={level}>
              {(level === 0 ? plots : plots.slice(0, 2)).map((plot, index) => {
                const firstPlot = level === 0 ? 1 : plots.length + (level - 1) * 2 + 1
                const plotId = firstPlot + index
                const house = housesByPlot.get(plotId)
                return (
                  <div className={`street-plot street-plot--${plot}`} data-plot key={plot}>
                    <button
                      className="street-plot-button"
                      type="button"
                      disabled={!canInteract}
                      onClick={house ? () => onVisit(house) : () => onBuild(plotId)}
                      aria-label={house ? `Visit ${house.name}'s homepage` : `${vacantPlotAction}, plot ${plotId}`}
                    >
                      {house ? (
                        <img className="street-house" src={houseSprite(house.color, index)} alt="" />
                      ) : (
                        <span className="street-vacant-sign" aria-hidden="true">+</span>
                      )}
                      <span className="street-plot-label">{house ? house.name : vacantPlotAction}</span>
                    </button>
                    {house && (
                      <button
                        className="street-mailbox"
                        type="button"
                        aria-label={`Open mailbox for ${house.name}`}
                        aria-disabled={!canInteract || plotId !== nearbyMailbox}
                        title={plotId === nearbyMailbox ? 'Open mailbox' : 'Walk up to the mailbox to use it'}
                        onClick={() => { if (canInteract) openMailbox(plotId) }}
                      >
                        <span aria-hidden="true" />
                      </button>
                    )}
                    {house && flight?.plot === plotId && (
                      <span
                        className="street-pig-flight"
                        key={flight.id}
                        style={{ '--pig-rise': `-${layout.plots[plotId - 1].mailboxY + 70}px` }}
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
            </div>
          ))}
          <img
            className="street-player"
            src={playerSprites[position.facing]}
            alt=""
            style={{ left: position.x ?? '50%', bottom: playerHeight }}
          />
          <div
            className="street-prompt"
            style={{ left: position.x ?? '50%', bottom: playerHeight + 54 }}
            role="status"
          >
            {canInteract && !mailbox && (nearbyMailbox || nearbyPlot !== null) && (
              <span><kbd>E</kbd> {nearbyMailbox ? 'Open mailbox' : nearbyHouse ? `Visit ${nearbyHouse.name}` : vacantPlotAction}</span>
            )}
          </div>
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
    </>
  )
}
