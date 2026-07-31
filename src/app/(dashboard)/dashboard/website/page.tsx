import { createClient } from '@/lib/supabase/server'
import { getBusinessForOwner } from '@/services/businesses'
import { getWebsiteForBusiness } from '@/services/websites'
import { WebsiteEditor } from '@/components/WebsiteEditor'

export default async function WebsitePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const business = await getBusinessForOwner(supabase, user!.id)
  if (!business) return null

  const website = await getWebsiteForBusiness(supabase, business.id)

  return (
    <div>
      <div className="mb-4">
        <h1 className="font-semibold text-lg">Website</h1>
        <p className="text-sm text-[var(--text-3)]">
          Your public site at /sites/{business.slug} — published listings show automatically.
        </p>
      </div>
      <WebsiteEditor business={business} initialWebsite={website} />
    </div>
  )
}
