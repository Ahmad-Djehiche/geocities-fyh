import { useState } from 'react'
import Dialog from './Dialog'
import { houseColors, houseLink, houseLinkMaxLength } from './lib/houses'

export function HouseBuilder({ onClose, onSave, plotId }) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (saving) return
    const fields = new FormData(event.currentTarget)
    const name = fields.get('name').trim()
    const title = fields.get('title').trim()
    const website = fields.get('website').trim()
    const github = fields.get('github').trim()
    const websiteUrl = houseLink(website, 'website')
    const githubUrl = houseLink(github, 'github')

    if (!name || !title) {
      setError('Enter a name and homepage title.')
      return
    }
    if (website && !websiteUrl) {
      setError('Enter a personal website URL that starts with https:// or http://.')
      return
    }
    if (github && !githubUrl) {
      setError('Enter a GitHub URL such as https://github.com/username.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const saveError = await onSave({
        name,
        title,
        description: fields.get('description').trim(),
        color: fields.get('color'),
        website_url: websiteUrl,
        github_url: githubUrl,
      })
      if (saveError) setError(saveError)
    } catch {
      setError('Could not save your house. Try again.')
    } finally {
      setSaving(false)
    }
  }

  function close() {
    if (!saving) onClose()
  }

  return (
    <Dialog className="house-dialog" labelId="builder-title" onClose={close}>
      <form className="builder" onSubmit={submit}>
        <button type="button" className="close" onClick={close} disabled={saving} aria-label="Close form">×</button>
        <h2 id="builder-title">{plotId ? `Claim plot ${plotId}` : 'Build a house'}</h2>
        <label>Name<input name="name" required maxLength={24} placeholder="e.g. Alex" /></label>
        <label>Homepage title<input name="title" required maxLength={50} placeholder="Alex's corner" /></label>
        <label>About you<textarea name="description" maxLength={180} /></label>
        <fieldset className="house-colors">
          <legend>House colour</legend>
          <div className="house-color-options">
            {houseColors.map(({ name, color, sprite }, index) => (
              <label className="house-color-option" key={color}>
                <input type="radio" name="color" value={color} defaultChecked={index === 0} />
                <span>
                  <img src={sprite} alt="" />
                  {name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <label>
          Personal website (optional)
          <input name="website" type="url" maxLength={houseLinkMaxLength} placeholder="https://example.com" />
        </label>
        <label>
          GitHub (optional)
          <input name="github" type="url" maxLength={houseLinkMaxLength} placeholder="https://github.com/username" />
        </label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="build-button" disabled={saving} type="submit">{saving ? 'Building…' : 'Build house'}</button>
      </form>
    </Dialog>
  )
}

export function HouseHomepage({ house, onClose }) {
  const website = houseLink(house.website_url, 'website')
  const github = houseLink(house.github_url, 'github')

  return (
    <Dialog className="house-dialog" labelId="homepage-title" onClose={onClose}>
      <article className="homepage">
        <button className="close" onClick={onClose} aria-label="Close homepage">×</button>
        <div className="homepage-banner" style={{ backgroundColor: house.color }}>
          <span>★ {house.name.toUpperCase()}'S HOME ★</span>
        </div>
        <h2 id="homepage-title">{house.title}</h2>
        {house.description && <p>{house.description}</p>}
        {(website || github) && (
          <div className="homepage-links">
            {website && <a className="account-button" href={website} target="_blank" rel="noopener noreferrer">Personal website</a>}
            {github && <a className="account-button" href={github} target="_blank" rel="noopener noreferrer">GitHub</a>}
          </div>
        )}
        <div className="guestbook">GUESTBOOK: <strong>0 messages</strong></div>
      </article>
    </Dialog>
  )
}
