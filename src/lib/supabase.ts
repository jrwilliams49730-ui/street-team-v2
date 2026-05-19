import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (import.meta.env.DEV) {
  const missingVariables = [
    ['VITE_SUPABASE_URL', supabaseUrl],
    ['VITE_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing Supabase environment variables: ${missingVariables.join(', ')}`,
    )
  }
}

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

export const publicSupabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
})
