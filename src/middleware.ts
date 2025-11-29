import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Define public routes - these don't require authentication
const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/interview/(.*)',  // Candidate interview pages are public
  '/api/interview/(.*)',  // Interview API endpoints (for candidates)
  '/api/webhooks/(.*)',  // Webhooks
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
