import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  const isPublicPath = nextUrl.pathname === '/login'
  const isApiRoute = nextUrl.pathname.startsWith('/api/')
  const isStaticFile = nextUrl.pathname.startsWith('/_next') ||
                       nextUrl.pathname.startsWith('/favicon.ico')

  // 정적 파일과 API는 통과
  if (isStaticFile || isApiRoute) {
    return NextResponse.next()
  }

  // 로그인되지 않았고 공개 경로가 아니면 로그인 페이지로
  if (!isLoggedIn && !isPublicPath) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 로그인했는데 로그인 페이지 접근 시 홈으로
  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
