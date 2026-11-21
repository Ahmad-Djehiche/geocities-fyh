import { useEffect, useEffectEvent, useRef, useState } from 'react'

const directions = {
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
  w: 'up', arrowup: 'up',
  s: 'down', arrowdown: 'down',
}
const playerSpeed = 230
const interactionDistance = 45
const streetEdge = 12
const curb = 92

export default function StreetGame({ houses, paused, onVisit, onBuild }) {
  const viewportRef = useRef(null)
  const streetRef = useRef(null)
  const [position, setPosition] = useState({ x: 38, y: 63 })
  const [layout, setLayout] = useState({ width: 0, plots: [] })
  const x = Math.min(position.x, Math.max(streetEdge, layout.width - streetEdge))
  const { y } = position

  let nearbyPlot = null
  let closestDistance = interactionDistance
  for (const [index, plotX] of layout.plots.entries()) {
    const distance = Math.hypot(x - plotX, y - curb)
    if (distance < closestDistance) {
      closestDistance = distance
      nearbyPlot = index
    }
  }
  const nearbyHouse = houses[nearbyPlot]

  useEffect(() => {
    const street = streetRef.current
    function measure() {
      const plots = Array.from(street.querySelectorAll('[data-plot]'), (plot) =>
        plot.offsetLeft + plot.offsetWidth / 2,
      )
      setLayout({ width: street.clientWidth, plots })
      setPosition((current) => ({
        ...current,
        x: Math.min(current.x, street.clientWidth - streetEdge),
      }))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(street)
    return () => observer.disconnect()
  }, [houses])

  useEffect(() => {
    const viewport = viewportRef.current
    const margin = 48
    if (x < viewport.scrollLeft + margin) viewport.scrollLeft = x - margin
    if (x > viewport.scrollLeft + viewport.clientWidth - margin) {
      viewport.scrollLeft = x + margin - viewport.clientWidth
    }
  }, [x])

  const interact = useEffectEvent(() => {
    if (nearbyHouse) onVisit(nearbyHouse)
    else if (nearbyPlot === houses.length) onBuild()
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
      const dy = Number(held.has('up')) - Number(held.has('down'))

      if (dx || dy) {
        const step = playerSpeed * elapsed / Math.hypot(dx, dy)
        const rightEdge = streetRef.current.clientWidth - streetEdge
        setPosition((current) => {
          const x = Math.max(streetEdge, Math.min(rightEdge, current.x + dx * step))
          const y = Math.max(streetEdge, Math.min(curb, current.y + dy * step))
          return x === current.x && y === current.y ? current : { x, y }
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
    <section aria-label="Webstreet neighborhood">
      <p className="street-controls"><kbd>WASD</kbd> or <kbd>↑ ← ↓ →</kbd> to move</p>
      <div className="street-viewport" ref={viewportRef}>
        <div className="street" ref={streetRef}>
          <div className="sky-orbit orbit-one" />
          <div className="sky-orbit orbit-two" />
          <div className="cloud cloud-one">· · ·</div>
          <div className="cloud cloud-two">· · · ·</div>
          {houses.map((house, index) => (
            <button
              className="house"
              data-plot
              key={house.id}
              onClick={() => onVisit(house)}
              aria-label={`Visit ${house.name}'s homepage`}
            >
              <span className="house-number">{String(index + 1).padStart(2, '0')}</span>
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
          <button className="empty-lot" data-plot onClick={onBuild} aria-label="Build a new house">
            <span>+</span>
            <b>YOUR LOT</b>
          </button>
          <div className="street-player" style={{ left: x, bottom: y }} aria-hidden="true" />
          <div className="street-prompt" style={{ left: x, bottom: y + 30 }} role="status">
            {!paused && nearbyPlot !== null && (
              <span><kbd>E</kbd> {nearbyHouse ? `Visit ${nearbyHouse.name}` : 'Build here'}</span>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
