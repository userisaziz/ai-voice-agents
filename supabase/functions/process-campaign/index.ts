// Supabase Edge Function: process-campaign
// Processes scheduled outbound campaigns and initiates calls to pending leads
//
// Deploy with: supabase functions deploy process-campaign
// Schedule with pg_cron (see schema.sql for instructions)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface Campaign {
  id: string
  business_id: string
  name: string
  status: string
  caller_number_id: string | null
  agent_id: string | null
  max_concurrent_calls: number
  call_delay_seconds: number
  total_leads: number
  completed_leads: number
}

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
}

interface PhoneNumber {
  id: string
  number: string
  provider_id: string
}

interface Provider {
  id: string
  provider_type: string
  credentials: Record<string, unknown>
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appBaseUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://your-app.vercel.app'

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get scheduled/running campaigns
    const { data: campaigns, error: campaignError } = await supabase
      .from('outbound_campaigns')
      .select('*')
      .in('status', ['scheduled', 'running'])
      .not('cron_expression', 'is', null)

    if (campaignError) {
      throw new Error(`Failed to fetch campaigns: ${campaignError.message}`)
    }

    if (!campaigns || campaigns.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No active campaigns' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results: Array<{
      campaignId: string
      campaignName: string
      callsInitiated: number
      callsFailed: number
    }> = []

    for (const campaign of campaigns as Campaign[]) {
      try {
        // Check if campaign should run now based on cron expression
        // For simplicity, we'll process all active campaigns
        // In production, you'd want to evaluate the cron expression

        if (!campaign.caller_number_id) {
          console.log(`Campaign ${campaign.id}: No caller number configured`)
          continue
        }

        // Get phone number
        const { data: phoneNumber } = await supabase
          .from('phone_numbers')
          .select('*')
          .eq('id', campaign.caller_number_id)
          .eq('is_active', true)
          .single()

        if (!phoneNumber) {
          console.log(`Campaign ${campaign.id}: Phone number not found`)
          continue
        }

        // Get provider
        const { data: provider } = await supabase
          .from('telephony_providers')
          .select('*')
          .eq('id', (phoneNumber as PhoneNumber).provider_id)
          .eq('is_active', true)
          .single()

        if (!provider) {
          console.log(`Campaign ${campaign.id}: Provider not found`)
          continue
        }

        // Get pending leads
        const { data: pendingLeads } = await supabase
          .from('campaign_leads')
          .select('*')
          .eq('campaign_id', campaign.id)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })
          .limit(campaign.max_concurrent_calls)

        if (!pendingLeads || pendingLeads.length === 0) {
          // Check if campaign is complete
          const { count: totalLeads } = await supabase
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)

          const { count: completedLeads } = await supabase
            .from('campaign_leads')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id)
            .in('status', ['completed', 'failed', 'skipped'])

          if (totalLeads && completedLeads && completedLeads >= totalLeads) {
            await supabase
              .from('outbound_campaigns')
              .update({ status: 'completed', completed_at: new Date().toISOString() })
              .eq('id', campaign.id)
          }
          continue
        }

        // Update campaign status to running if scheduled
        if (campaign.status === 'scheduled') {
          await supabase
            .from('outbound_campaigns')
            .update({ status: 'running', started_at: new Date().toISOString() })
            .eq('id', campaign.id)
        }

        let callsInitiated = 0
        let callsFailed = 0

        // Process each lead
        for (const lead of pendingLeads as Lead[]) {
          try {
            // Update lead status
            await supabase
              .from('campaign_leads')
              .update({
                status: 'calling',
                last_attempt_at: new Date().toISOString(),
                call_attempts: (await supabase
                  .from('campaign_leads')
                  .select('call_attempts')
                  .eq('id', lead.id)
                  .single()
                  .then(r => (r.data?.call_attempts || 0) + 1))
              })
              .eq('id', lead.id)

            // Create call log
            const { data: callLog } = await supabase
              .from('call_logs')
              .insert({
                business_id: campaign.business_id,
                campaign_id: campaign.id,
                lead_id: lead.id,
                phone_number_id: (phoneNumber as PhoneNumber).id,
                direction: 'outbound',
                from_number: (phoneNumber as PhoneNumber).number,
                to_number: lead.phone,
                status: 'initiated',
                provider_type: (provider as Provider).provider_type,
                started_at: new Date().toISOString(),
              })
              .select()
              .single()

            // Make the call via the API endpoint
            const callResponse = await fetch(`${appBaseUrl}/api/telephony/outbound/call`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                campaignId: campaign.id,
                leadId: lead.id,
                callLogId: callLog?.id,
                provider: provider,
                phoneNumber: phoneNumber,
              }),
            })

            if (callResponse.ok) {
              callsInitiated++
            } else {
              callsFailed++
              await supabase
                .from('campaign_leads')
                .update({ status: 'failed' })
                .eq('id', lead.id)
            }

            // Delay between calls
            if (campaign.call_delay_seconds > 0) {
              await new Promise(resolve =>
                setTimeout(resolve, campaign.call_delay_seconds * 1000)
              )
            }
          } catch (leadError) {
            console.error(`Error processing lead ${lead.id}:`, leadError)
            callsFailed++
            await supabase
              .from('campaign_leads')
              .update({ status: 'failed' })
              .eq('id', lead.id)
          }
        }

        // Update campaign counts
        const { count: totalLeads } = await supabase
          .from('campaign_leads')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)

        const { count: completedLeads } = await supabase
          .from('campaign_leads')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)
          .in('status', ['completed', 'failed', 'skipped'])

        await supabase
          .from('outbound_campaigns')
          .update({
            total_leads: totalLeads || 0,
            completed_leads: completedLeads || 0,
          })
          .eq('id', campaign.id)

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          callsInitiated,
          callsFailed,
        })
      } catch (campaignError) {
        console.error(`Error processing campaign ${campaign.id}:`, campaignError)
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          callsInitiated: 0,
          callsFailed: -1,
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        campaignsProcessed: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Process campaign error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
