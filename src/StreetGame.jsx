import { useEffect, useRef, useState } from 'react'
import playerSprite from './assets/street-player.png'
import './StreetGame.css'

const plots = ['west-north', 'east-north', 'west-south', 'east-south']
const directions = {
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
  w: 'up', arrowup: 'up',
  s: 'down', arrowdown: 'down',
}
const playerSpeed = 230
const interactionDistance = 110

export default function StreetGame({ houses, paused, onVisit, onBuild }) {
  const streetRef = useRef(null)
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

  let nearbyPlot = null
  let closestDistance = interactionDistance
  for (const [index, plot] of layout.plots.entries()) {
    const playerY = layout.height - (position.y ?? layout.height * 0.06)
    const distance = Math.hypot((position.x ?? layout.width / 2) - plot.x, playerY - plot.y)
    if (distance < closestDistance) {
      closestDistance = distance
      nearbyPlot = index
    }
  }
  const nearbyHouse = nearbyPlot === null
    ? null
    : houses.find((house) => Number(house.plot_id) === nearbyPlot + 1)

  useEffect(() => {
    if (paused) return

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
      if (key === 'e' && !event.repeat) {
        if (nearbyHouse) onVisit(nearbyHouse)
        else if (nearbyPlot !== null) onBuild()
      }
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
  }, [paused, layout, nearbyHouse, nearbyPlot, houses.length, onVisit, onBuild])

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
                onClick={house ? () => onVisit(house) : onBuild}
                aria-label={house ? `Visit ${house.name}'s homepage` : `Build a house on plot ${index + 1}`}
              >
                {house ? (
                  <span className="street-house" style={{ '--roof-color': house.color }} aria-hidden="true">
                    <span className="street-house-roof" />
                    <span className="street-house-front">
                      <span className="street-window" />
                      <span className="street-door" />
                      <span className="street-window" />
                    </span>
                  </span>
                ) : (
                  <span className="street-vacant-sign" aria-hidden="true">+</span>
                )}
                <span className="street-plot-label">{house ? house.name : 'Vacant lot'}</span>
              </button>
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
          {!paused && nearbyPlot !== null && (
            <span><kbd>E</kbd> {nearbyHouse ? `Visit ${nearbyHouse.name}` : 'Build here'}</span>
          )}
        </div>
      </section>
      {houses.some((house) => Number(house.plot_id) > plots.length) && (
        <ul className="street-other-homes" aria-label="More homes">
          {houses.filter((house) => Number(house.plot_id) > plots.length).map((house) => (
            <li key={house.id}>
              <button type="button" onClick={() => onVisit(house)}>Visit {house.name}</button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
