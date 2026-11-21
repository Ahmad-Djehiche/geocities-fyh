import { useEffect, useEffectEvent, useRef, useState } from 'react'
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
const interactionDistance = 36

function getSpawn(width, height) {
  return { x: width / 2, y: height * 0.92 }
}

function clampPosition(x, y, width, height) {
  const margin = Math.min(12, width * 0.07)
  return {
    x: Math.max(width * 0.39 + margin, Math.min(width * 0.61 - margin, x)),
    y: Math.max(44, Math.min(height - 15, y)),
  }
}

export default function StreetGame({ houses, paused, onVisit, onBuild }) {
  const streetRef = useRef(null)
  const [position, setPosition] = useState(null)
  const [layout, setLayout] = useState({ width: 0, height: 0, entrances: [] })
  const { width, height, entrances } = layout
  const { x, y } = position ? clampPosition(position.x, position.y, width, height) : getSpawn(width, height)

  let nearbyPlot = null
  let closestDistance = interactionDistance
  for (const [index, entrance] of entrances.entries()) {
    const distance = Math.hypot(x - entrance.x, y - entrance.y)
    if (distance < closestDistance) {
      closestDistance = distance
      nearbyPlot = index
    }
  }
  const nearbyHouse = houses[nearbyPlot]

  useEffect(() => {
    const street = streetRef.current
    function measure() {
      const entrances = Array.from(street.querySelectorAll('[data-plot]'), (plot, index) => ({
        x: street.clientWidth * (index % 2 === 0 ? 0.39 : 0.61),
        y: plot.offsetTop + plot.offsetHeight - 27,
      }))
      setLayout({ width: street.clientWidth, height: street.clientHeight, entrances })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(street)
    return () => observer.disconnect()
  }, [])

  const interact = useEffectEvent(() => {
    if (nearbyHouse) onVisit(nearbyHouse)
    else if (nearbyPlot !== null) onBuild()
  })

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
      const dy = Number(held.has('down')) - Number(held.has('up'))

      if (dx || dy) {
        const step = playerSpeed * elapsed / Math.hypot(dx, dy)
        const street = streetRef.current
        setPosition((current) => {
          const start = current ?? getSpawn(street.clientWidth, street.clientHeight)
          const next = clampPosition(start.x + dx * step, start.y + dy * step, street.clientWidth, street.clientHeight)
          return next.x === start.x && next.y === start.y ? start : next
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
  }, [paused])

  return (
    <>
      <p className="street-controls"><kbd>WASD</kbd> or <kbd>? ? ? ?</kbd> to move</p>
      <section className="street-map" ref={streetRef} aria-label="Webstreet neighborhood">
        <div className="street-road" aria-hidden="true" />
        <div className="street-trees" aria-hidden="true" />
        {plots.map((plot, index) => {
          const house = houses[index]
          return (
            <div className={`street-plot street-plot--${plot}`} key={plot} data-plot>
              <button
                className="street-plot-button"
                type="button"
                onClick={house ? () => onVisit(house) : onBuild}
                aria-label={house ? `Visit ${house.name}'s homepage` : `Build a house on plot ${index + 1}`}
              >
                {house ? (
                  <span className="street-house" style={{ '--roof-color': house.color }} aria-hidden="true">
                    <span className="street-house-roof">
                      <span className="street-dormer" />
                    </span>
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
        <img className="street-player" src={playerSprite} alt="" style={{ left: x, top: y }} />
        <div className="street-prompt" style={{ left: x, top: y - 42 }} role="status">
          {!paused && nearbyPlot !== null && (
            <span><kbd>E</kbd> {nearbyHouse ? `Visit ${nearbyHouse.name}` : 'Build here'}</span>
          )}
        </div>
      </section>
      {houses.length > plots.length && (
        <ul className="street-other-homes" aria-label="More homes">
          {houses.slice(plots.length).map((house) => (
            <li key={house.id}>
              <button type="button" onClick={() => onVisit(house)}>Visit {house.name}</button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
