import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const messageFields = 'id, house_id, sender_name, body, created_at, read_at'
const pageSize = 50

export default function useHouseMail(userId) {
  const [inbox, setInbox] = useState(null)
  const [unread, setUnread] = useState(null)
  const [live, setLive] = useState(null)
  const [selection, setSelection] = useState(null)
  const page = selection && selection.userId === userId ? selection.page : 0
  const reload = useRef(null)
  const refresh = useCallback(() => reload.current?.(), [])

  useEffect(() => {
    if (!supabase || !userId) return
    const controller = new AbortController()
    let loading = false
    let pending = false

    async function load() {
      if (controller.signal.aborted) return
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
      loading = false
      if (controller.signal.aborted) return
      const { data, error, count } = messages
      setInbox((current) => error && current?.userId === userId && current.page === page
        ? { ...current, error }
        : { userId, page, messages: data ?? [], count: count ?? 0, error })
      if (!newMail.error) setUnread({ userId, letters: newMail.data, count: newMail.count })
      if (pending) {
        pending = false
        load()
      }
    }

    reload.current = load
    load()
    const timer = window.setInterval(load, 5000)
    window.addEventListener('focus', load)
    return () => {
      reload.current = null
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('focus', load)
    }
  }, [userId, page])

  useEffect(() => {
    if (!supabase || !userId) return
    const changes = { schema: 'public', table: 'house_messages', filter: `recipient_id=eq.${userId}` }
    let active = true
    const channel = supabase.channel(`house-mail:${userId}:${crypto.randomUUID()}`)
      .on('postgres_changes', { ...changes, event: 'INSERT' }, ({ new: letter }) => {
        if (!active || letter.recipient_id !== userId) return
        setLive((current) => ({
          userId,
          letters: [
            ...(current?.userId === userId ? current.letters : []),
            { id: letter.id, house_id: letter.house_id },
          ],
        }))
        refresh()
      })
      .on('postgres_changes', { ...changes, event: 'UPDATE' }, refresh)
      .subscribe((status) => {
        if (active && status === 'SUBSCRIBED') refresh()
      })
    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  const current = inbox && inbox.userId === userId && inbox.page === page ? inbox : null
  return {
    current,
    needsSetup: ['PGRST205', '42P01'].includes(current?.error?.code),
    unread: unread?.userId === userId ? unread : null,
    liveDeliveries: live && live.userId === userId ? live.letters : null,
    acknowledgeDelivery: (id) => setLive((current) => current && current.userId === userId
      ? { ...current, letters: current.letters.filter((letter) => letter.id !== id) }
      : current),
    page,
    setPage: (next) => setSelection({ userId, page: next }),
    pageSize,
    refresh,
  }
}
