import { createServerClient } from '@/lib/supabase/server'
import AdminClient from './AdminClient'

export default async function AdminPage() {
  const supabase = createServerClient()

  const { data: submissions } = await supabase
    .from('submissions')
    .select('*, submission_data(*), adjustments(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  return <AdminClient submissions={submissions ?? []} />
}
