import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

export function useSupabase(table) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('saved')

  // Initial fetch
  useEffect(() => {
    supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setItems(data)
        setLoading(false)
      })
  }, [table])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => prev.some(i => i.id === payload.new.id) ? prev : [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table])

  const addItem = useCallback(async (fields) => {
    setSaveStatus('saving')
    const { data, error } = await supabase.from(table).insert(fields).select().single()
    if (!error && data) setItems(prev => [data, ...prev])
    setTimeout(() => setSaveStatus('saved'), 500)
    return { data, error }
  }, [table])

  const updateItem = useCallback(async (id, fields) => {
    setSaveStatus('saving')
    const { data, error } = await supabase.from(table).update(fields).eq('id', id).select().single()
    if (!error && data) setItems(prev => prev.map(i => i.id === id ? data : i))
    setTimeout(() => setSaveStatus('saved'), 500)
    return { data, error }
  }, [table])

  const deleteItem = useCallback(async (id) => {
    setSaveStatus('saving')
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (!error) setItems(prev => prev.filter(i => i.id !== id))
    setTimeout(() => setSaveStatus('saved'), 500)
    return { error }
  }, [table])

  const deleteWhere = useCallback(async (field, value) => {
    setSaveStatus('saving')
    const { error } = await supabase.from(table).delete().eq(field, value)
    if (!error) setItems(prev => prev.filter(i => i[field] !== value))
    setTimeout(() => setSaveStatus('saved'), 500)
    return { error }
  }, [table])

  return { items, loading, saveStatus, addItem, updateItem, deleteItem, deleteWhere }
}
