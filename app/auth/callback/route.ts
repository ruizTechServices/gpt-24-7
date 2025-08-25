import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') ?? '/dashboard'

  // Prepare response early so we can attach cookies to it
  const response = NextResponse.redirect(new URL(next, url.origin))

  if (!code) return NextResponse.redirect(new URL('/login', url.origin))

  // Read incoming request cookies and write any updated cookies to the response
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (anon || publishable)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login', url.origin))
  }

  return response
}
