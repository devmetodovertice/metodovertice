import { redirect } from 'next/navigation'
import { createSessionClient } from '@/lib/supabase/server-session'
import { createServerClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await createSessionClient()
  const { data: { user } } = await session.auth.getUser()
  if (!user) redirect('/login')

  const admin = createServerClient()
  const { data: submission } = await admin
    .from('submissions')
    .select('id, access_token, status, pdf_url, error_message')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  let pdfSignedUrl: string | null = null
  if (submission?.status === 'completed' && submission.pdf_url) {
    const { data } = await admin.storage
      .from('vertice-pdfs')
      .createSignedUrl(submission.pdf_url, 3600)
    pdfSignedUrl = data?.signedUrl ?? null
  }

  return (
    <DashboardClient
      submission={submission
        ? {
            id:           submission.id,
            accessToken:  submission.access_token,
            status:       submission.status,
            errorMessage: submission.error_message ?? null,
            pdfSignedUrl,
          }
        : null}
    />
  )
}
