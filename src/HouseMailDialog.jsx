import { useRef, useState } from 'react'
import { supabase } from './lib/supabase'

export default function HouseMailDialog({ mailbox, userId, inbox, onSend, onClose }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [opened, setOpened] = useState(null)
  const pending = useRef(false)
  const draft = useRef(null)
  const current = inbox.current
  const ownMailbox = Boolean(userId && mailbox.house?.owner_id === userId)
  const canSend = Boolean(supabase && userId && mailbox.house?.owner_id && !ownMailbox && !inbox.needsSetup)

  async function send(event) {
    event.preventDefault()
    if (!canSend || pending.current) return
    const body = new FormData(event.currentTarget).get('message').trim()
    if (!body) {
      setError('Write a message before sending.')
      return
    }

    if (draft.current?.body !== body) draft.current = { id: crypto.randomUUID(), body }
    pending.current = true
    setBusy(true)
    setError('')
    const { error: sendError } = await supabase.rpc('send_house_message', {
      message_id: draft.current.id,
      target_house_id: mailbox.house.id,
      message_body: body,
    })
    pending.current = false
    setBusy(false)
    if (sendError) {
      if (sendError.code === '22023') setError('You cannot send mail to yourself.')
      else if (sendError.code === 'PGRST202') setError('The shared mailbox database has not been set up yet.')
      else setError('Could not send your message. Try again.')
      return
    }
    onSend(mailbox.plot)
  }

  async function read(message) {
    setOpened(message)
    setError('')
    if (message.read_at) return
    const { error: readError } = await supabase.rpc('read_house_message', { message_id: message.id })
    if (readError) {
      setError('Could not mark this message as read.')
      return
    }
    inbox.refresh()
  }

  if (mailbox.mode === 'inbox') {
    const first = inbox.page * inbox.pageSize
    return (
      <>
        <h2 id="street-mail-title">Your inbox</h2>
        {opened ? (
          <article className="street-mail-message">
            <h3>From {opened.sender_name}</h3>
            <time dateTime={opened.created_at}>{new Date(opened.created_at).toLocaleString()}</time>
            <div className="street-mail-body">{opened.body}</div>
            <button type="button" onClick={() => setOpened(null)}>Back to inbox</button>
          </article>
        ) : (
          <>
            {!current && <p role="status">Loading your mail…</p>}
            {current?.error && (
              <p role="alert">
                {inbox.needsSetup ? 'The shared mailbox database has not been set up yet.' : 'Could not refresh your inbox.'}
                {' '}<button type="button" onClick={inbox.refresh}>Retry</button>
              </p>
            )}
            {current && !current.error && !current.count && <p>Your mailbox is empty.</p>}
            <ul className="street-mail-list">
              {current?.messages.map((message) => (
                <li key={message.id}>
                  <button type="button" onClick={() => read(message)}>
                    <strong>{message.sender_name}</strong>
                    {!message.read_at && <span>New</span>}
                    <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleDateString()}</time>
                  </button>
                </li>
              ))}
            </ul>
            {current && (inbox.page > 0 || current.count > inbox.pageSize) && (
              <div className="street-mail-actions">
                <button type="button" disabled={inbox.page === 0} onClick={() => inbox.setPage(inbox.page - 1)}>Previous</button>
                <button type="button" disabled={first + inbox.pageSize >= current.count} onClick={() => inbox.setPage(inbox.page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
        {error && <p role="alert">{error}</p>}
        <button type="button" onClick={onClose}>Close</button>
      </>
    )
  }

  return (
    <form onSubmit={send} aria-busy={busy}>
      <h2 id="street-mail-title">Mail for {mailbox.house.name}</h2>
      {canSend ? (
        <label>
          Message
          <textarea name="message" required maxLength={280} rows={4} disabled={busy} />
        </label>
      ) : (
        <p>{!supabase ? 'Mail is available on the shared street.'
          : !userId ? 'Sign in to send a message.'
          : ownMailbox ? 'You cannot send mail to yourself.'
          : inbox.needsSetup ? 'The shared mailbox database has not been set up yet.'
          : 'This house does not have an account owner.'}</p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="street-mail-actions">
        <button type="button" onClick={onClose} disabled={busy}>{canSend ? 'Cancel' : 'Close'}</button>
        {canSend && <button className="build-button" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Send'}</button>}
      </div>
    </form>
  )
}
