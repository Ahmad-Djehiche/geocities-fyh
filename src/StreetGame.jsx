import playerSprite from './assets/street-player.png'
import './StreetGame.css'

const plots = ['west-north', 'east-north', 'west-south', 'east-south']

export default function StreetGame({ houses, onVisit, onBuild }) {
  return (
    <>
      <section className="street-map" aria-label="Webstreet neighborhood">
        <div className="street-road" aria-hidden="true" />
        <div className="street-trees" aria-hidden="true" />
        {plots.map((plot, index) => {
          const house = houses[index]
          return (
            <div className={`street-plot street-plot--${plot}`} key={plot}>
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
        <img className="street-player" src={playerSprite} alt="" />
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
