// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.38/deno-dom-wasm.ts"

console.log("Hello from Functions!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

interface SwimmerData {
  id: string
  name: string
  team: string
  best_times: Record<string, { time: string; seconds: number }>
  profile_image?: string
  twitter?: string
  instagram?: string
}

async function fetchSwimmerData(swimmerId: string): Promise<SwimmerData> {
  const url = `https://www.swimcloud.com/swimmer/${swimmerId}/`
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch swimmer data: ${response.status}`)
  }

  const html = await response.text()
  
  // Create a new DOMParser using deno-dom
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  if (!doc) {
    throw new Error('Failed to parse HTML')
  }

  // Get basic info - updated selectors for new HTML structure
  const nameElement = doc.querySelector('h1')
  if (!nameElement?.textContent) {
    throw new Error('Could not find swimmer name')
  }
  const name = nameElement.textContent.trim()

  // Get team info from the location text
  const locationElement = doc.querySelector('h1 + div')
  let team = 'Unknown Team'
  if (locationElement?.textContent) {
    const locationText = locationElement.textContent.trim()
    const parts = locationText.split('\n').map(part => part.trim()).filter(Boolean)
    if (parts.length >= 2) {
      team = parts[1] // Second line is usually the team name
    }
  }

  // Get profile image
  const profileImage = doc.querySelector('img[alt*="profile image"]')?.getAttribute('src')

  // Get best times from the table
  const bestTimes: Record<string, { time: string; seconds: number }> = {}
  const rows = doc.querySelectorAll('table tr')
  
  rows.forEach(row => {
    const cells = row.querySelectorAll('td')
    if (cells.length >= 2) {
      const eventLink = cells[0]?.querySelector('a')
      const timeLink = cells[1]?.querySelector('a')
      
      if (eventLink && timeLink) {
        const event = eventLink.textContent?.trim()
        const time = timeLink.textContent?.trim()
        
        if (event && time) {
          // Only process if it's a valid event (contains Y or L for yards/long course)
          if (event.includes('Y') || event.includes('L')) {
            const eventParts = event.split(' ')
            if (eventParts.length >= 2) {
              const distance = eventParts[0]
              const course = eventParts[1] // Y or L
              const stroke = eventParts.slice(2).join(' ').toUpperCase()
              const formattedEvent = `${distance} ${course} ${stroke}`
              
              const seconds = convertTimeToSeconds(time)
              if (seconds > 0) {
                // Only update if it's a faster time or if we don't have this event yet
                if (!bestTimes[formattedEvent] || seconds < bestTimes[formattedEvent].seconds) {
                  bestTimes[formattedEvent] = {
                    time,
                    seconds
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  // Get social media links
  const socialLinks = doc.querySelectorAll('a[href*="instagram.com"], a[href*="twitter.com"], a[href*="x.com"]')
  let twitter: string | undefined
  let instagram: string | undefined
  
  socialLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href) {
      if (href.includes('twitter.com') || href.includes('x.com')) {
        twitter = href
      } else if (href.includes('instagram.com')) {
        instagram = href
      }
    }
  })

  return {
    id: swimmerId,
    name,
    team,
    best_times: bestTimes,
    profile_image: profileImage,
    twitter,
    instagram
  }
}

function convertTimeToSeconds(time: string): number {
  try {
    const parts = time.trim().split(':')
    if (parts.length === 2) {
      const [minutes, seconds] = parts
      return parseFloat(minutes) * 60 + parseFloat(seconds)
    }
    return parseFloat(time)
  } catch {
    return 0
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { swimmerId } = await req.json()

    if (!swimmerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Swimmer ID is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Fetch swimmer data
    const swimmerData = await fetchSwimmerData(swimmerId)

    // Create Supabase client
    const supabaseAdmin = createClient(
      // Get environment variables
      Deno.env.get('URL') ?? '',
      // Use service role key for admin access
      Deno.env.get('SERVICE_ROLE_KEY') ?? ''
    )

    // Update Supabase
    const { error: supabaseError } = await supabaseAdmin
      .from('swimmer_ratings')
      .upsert({
        id: swimmerData.id,
        name: swimmerData.name,
        team: swimmerData.team,
        elo: 1500, // Default ELO
        ratings_count: 0,
        best_times: swimmerData.best_times,
        profile_image: swimmerData.profile_image,
        twitter: swimmerData.twitter,
        instagram: swimmerData.instagram
      })

    if (supabaseError) {
      console.error('Supabase error:', supabaseError)
      throw supabaseError
    }

    return new Response(
      JSON.stringify({ success: true, data: swimmerData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/add-swimmer' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
