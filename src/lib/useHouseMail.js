import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const messageFields = 'id, house_id, sender_name, body, created_at, read_at'
const pageSize = 50

export default function useHouseMail(userId) {
  const [inbox, setInbox] = useState(null)
  const [unread, setUnread] = useState(null)
  const [selection, setSelection] = useState(null)
  const page = selection?.userId === userId ? selection?.page ?? 0 : 0
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!supabase || !userId) return
    const controller = new AbortController()
    let loading = false
    let pending = false

    async function load() {
      if (loading) {
        pending = true
        return
      }
      loading = true
      const start = page * pageSize
      const [messages, newMail] = await Promise.all([
        supabase.from('house_messages')
          .select(messageFields, { count: 'exact' })
          .eq('recipient_id', userId)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(start, start + pageSize - 1)
          .abortSignal(controller.signal),
        supabase.from('house_messages')
          .select('id, house_id', { count: 'exact' })
          .eq('recipient_id', userId)
          .is('read_at', null)
          .order('created_at', { ascending: false })
          .abortSignal(controller.signal),
      ])
      const { data, error, count } = messages
      loading = false
      if (controller.signal.aborted) return
      setInbox((current) => error && current?.userId === userId
        ? { ...current, error: true }
        : { userId, page, messages: data ?? [], count: count ?? 0, error: Boolean(error) })
      if (!newMail.error) setUnread({ userId, letters: newMail.data, count: newMail.count })
      if (pending) {
        pending = false
        load()
      }
    }

    load()
    const timer = window.setInterval(load, 5000)
    window.addEventListener('focus', load)
    return () => {
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', load)
    }
  }, [userId, page, revision])

  useEffect(() => {
    if (!supabase || !userId) return
    const channel = supabase.channel(`house-mail:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_messages', filter: `recipient_id=eq.${userId}` },
        () => setRevision((value) => value + 1))
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return {
    current: inbox?.userId === userId ? inbox : null,
    unread: unread?.userId === userId ? unread : null,
    page,
    setPage: (next) => setSelection({ userId, page: next }),
    pageSize,
    refresh: () => setRevision((value) => value + 1),
  }
}
