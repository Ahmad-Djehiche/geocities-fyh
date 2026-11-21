import { useEffect, useState } from 'react'
import Dialog from './Dialog'
import { supabase } from './lib/supabase'

const usernamePattern = '[a-z0-9_]{3,24}'
const usernameHelp = 'Use 3–24 lowercase letters, numbers, or underscores.'

function AuthForm({ building }) {
  const [creating, setCreating] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(event) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    const credentials = { email: fields.get('email').trim(), password: fields.get('password') }
    setBusy(true)
    setError('')
    setNotice('')
    const result = creating
      ? await supabase.auth.signUp({
          ...credentials,
          options: { emailRedirectTo: window.location.origin + window.location.pathname },
        })
      : await supabase.auth.signInWithPassword(credentials)
    setBusy(false)
    if (result.error) setError(result.error.message)
    else if (creating && !result.data.session) {
      setCreating(false)
      setNotice('Check your email for a confirmation link, then sign in.')
    }
  }

  return (
    <>
      <h2 id="account-title">{creating ? 'Create an account' : 'Sign in to Webstreet'}</h2>
      {building && <p>Use your account to claim a plot and build your house.</p>}
      <form className="account-form" onSubmit={submit}>
        <label>Email<input name="email" type="email" autoComplete="email" required /></label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={creating ? 'new-password' : 'current-password'}
            minLength={creating ? 8 : undefined}
            required
          />
        </label>
        <button type="submit" className="build-button" disabled={busy}>
          {creating ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <button
        type="button"
        className="account-button"
        disabled={busy}
        onClick={() => {
          setCreating(!creating)
          setError('')
          setNotice('')
        }}
      >
        {creating ? 'I already have an account' : 'Create an account'}
      </button>
      {notice && <p role="status">{notice}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
    </>
  )
}

function AccountDetails({ userId, addFriend, onFriendshipChange }) {
  const [profile, setProfile] = useState(undefined)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    async function loadProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle()
      if (controller.signal.aborted) return
      if (error) setError('Could not load your profile. Reopen Friends to try again.')
      else setProfile(data)
    }
    loadProfile()
    return () => controller.abort()
  }, [userId])

  async function saveProfile(event) {
    event.preventDefault()
    const username = new FormData(event.currentTarget).get('username')
    setBusy(true)
    setError('')
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: userId, username })
      .select('username')
      .single()
    setBusy(false)
    if (error) {
      if (error.code === '23505') {
        // Another tab may have created this account's profile.
        const { data: existing } = await supabase.from('profiles').select('username').eq('id', userId).maybeSingle()
        if (existing) setProfile(existing)
        else setError('That username is taken.')
      } else {
        setError('Could not save your username. Try again.')
      }
    } else {
      setProfile(data)
    }
  }

  async function signOut() {
    setBusy(true)
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      setError(error.message)
      setBusy(false)
    }
  }

  const title = addFriend ? 'Add a friend' : profile === null ? 'Choose a username' : 'Friends'

  return (
    <>
      <h2 id="account-title">{title}</h2>
      {profile === undefined && !error && <p role="status">Loading your profile…</p>}
      {profile === null && (
        <form className="account-form" onSubmit={saveProfile}>
          {addFriend && <p>Choose a username to start sending friend requests.</p>}
          <label>
            Username
            <input name="username" autoCapitalize="none" autoComplete="username" pattern={usernamePattern} aria-describedby="username-help" required />
          </label>
          <p id="username-help">{usernameHelp}</p>
          <button type="submit" className="build-button" disabled={busy}>Save username</button>
        </form>
      )}
      {profile && addFriend && <p>You already have a house. Add a friend so they can claim a plot of their own.</p>}
      {profile && <FriendList userId={userId} username={profile.username} onFriendshipChange={onFriendshipChange} />}
      {error && <p className="account-error" role="alert">{error}</p>}
      <button type="button" className="account-button account-signout" disabled={busy} onClick={signOut}>
        Sign out
      </button>
    </>
  )
}

const friendColumns = `
  id, sender_id, recipient_id, status,
  sender:profiles!friend_requests_sender_id_fkey(username),
  recipient:profiles!friend_requests_recipient_id_fkey(username)
`

function FriendList({ userId, username, onFriendshipChange }) {
  const [requests, setRequests] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    let loading = false

    async function load() {
      if (loading || document.hidden) return
      loading = true
      const { data, error } = await supabase
        .from('friend_requests')
        .select(friendColumns)
        .abortSignal(controller.signal)
      loading = false
      if (controller.signal.aborted) return
      setLoadError(error ? 'Could not load friends. Retrying…' : '')
      if (!error) setRequests(data)
    }

    load()
    const timer = window.setInterval(load, 5000)
    document.addEventListener('visibilitychange', load)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', load)
    }
  }, [refresh])

  async function sendRequest(event) {
    event.preventDefault()
    const form = event.currentTarget
    const handle = new FormData(form).get('friend').trim().replace(/^@/, '').toLowerCase()
    if (!new RegExp(`^${usernamePattern}$`).test(handle)) {
      setMessage(usernameHelp)
      return
    }
    if (handle === username) {
      setMessage('Enter another player’s username.')
      return
    }
    setBusy(true)
    setMessage('')
    const { data: recipient, error: lookupError } = await supabase.from('profiles').select('id').eq('username', handle).maybeSingle()
    if (lookupError) {
      setMessage('Could not look up that username. Try again.')
    } else if (!recipient) {
      setMessage(`No player found for @${handle}.`)
    } else {
      const { error } = await supabase.from('friend_requests').insert({ sender_id: userId, recipient_id: recipient.id })
      if (error?.code === '23505') setMessage(`You already have a request or friendship with @${handle}.`)
      else if (error) setMessage('Could not send the request. Try again.')
      else {
        form.reset()
        setMessage(`Request sent to @${handle}.`)
      }
      setRefresh((current) => current + 1)
    }
    setBusy(false)
  }

  async function changeRequest(request, accept) {
    setBusy(true)
    setMessage('')
    const operation = accept
      ? supabase.from('friend_requests').update({ status: 'accepted' })
      : supabase.from('friend_requests').delete()
    const { data, error } = await operation.eq('id', request.id).eq('status', request.status).select('id').maybeSingle()
    if (error) setMessage('Could not update this request. Try again.')
    else if (!data) setMessage('This request has already changed.')
    if (!error && (accept || request.status === 'accepted')) {
      const friendId = request.sender_id === userId ? request.recipient_id : request.sender_id
      onFriendshipChange(data && !accept ? friendId : null)
    }
    setRefresh((current) => current + 1)
    setBusy(false)
  }

  return (
    <>
      <p>Your username is <strong>@{username}</strong>. Share it with friends so they can add you.</p>
      <form className="account-form account-search" onSubmit={sendRequest}>
        <label>
          Friend’s username
          <input name="friend" placeholder="@username" autoCapitalize="none" autoComplete="off" maxLength={25} required />
        </label>
        <button type="submit" className="build-button" disabled={busy}>Send request</button>
      </form>
      {message && <p role="status">{message}</p>}
      {loadError && <p className="account-error" role="alert">{loadError}</p>}
      {!requests && !loadError && <p role="status">Loading friends…</p>}
      {requests && (
        <>
          <RequestGroup title="Incoming requests" empty="No incoming requests."
            requests={requests.filter((request) => request.status === 'pending' && request.recipient_id === userId)}
            userId={userId} busy={busy} onChange={changeRequest} removeLabel="Decline" canAccept />
          <RequestGroup title="Sent requests" empty="No sent requests."
            requests={requests.filter((request) => request.status === 'pending' && request.sender_id === userId)}
            userId={userId} busy={busy} onChange={changeRequest} removeLabel="Cancel" />
          <RequestGroup title="Your friends" empty="Your friends will appear here."
            requests={requests.filter((request) => request.status === 'accepted')}
            userId={userId} busy={busy} onChange={changeRequest} removeLabel="Remove" />
        </>
      )}
    </>
  )
}

function RequestGroup({ title, empty, requests, userId, busy, onChange, removeLabel, canAccept }) {
  return (
    <section className="account-requests">
      <h3>{title}</h3>
      {requests.length === 0 ? <p>{empty}</p> : (
        <ul>
          {requests.map((request) => {
            const other = request.sender_id === userId ? request.recipient : request.sender
            return (
              <li key={request.id}>
                <strong>@{other.username}</strong>
                <div className="account-actions">
                  {canAccept && (
                    <button type="button" className="account-button" disabled={busy}
                      aria-label={`Accept @${other.username}`} onClick={() => onChange(request, true)}>Accept</button>
                  )}
                  <button type="button" className="account-button" disabled={busy}
                    aria-label={`${removeLabel} @${other.username}`} onClick={() => onChange(request, false)}>{removeLabel}</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default function AccountDialog({ session, onClose, addFriend, building, onFriendshipChange }) {
  return (
    <Dialog className="account-dialog" labelId="account-title" onClose={onClose}>
      <button type="button" className="close" onClick={onClose} aria-label="Close account panel">×</button>
      {!supabase ? (
        <>
          <h2 id="account-title">{addFriend ? 'Add a friend' : 'Accounts and friends'}</h2>
          <p>Accounts and friend requests are available on a shared street configured with Supabase.</p>
        </>
      ) : session === undefined ? (
        <h2 id="account-title">Loading account…</h2>
      ) : session ? (
        <AccountDetails key={session.user.id} userId={session.user.id} addFriend={addFriend} onFriendshipChange={onFriendshipChange} />
      ) : (
        <AuthForm building={building} />
      )}
    </Dialog>
  )
}
