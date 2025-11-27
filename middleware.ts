import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const pathname = req.nextUrl.pathname
  const isLoggedIn = !!req.auth

  const isPublicPath = pathname === '/login'
  const isApiRoute = pathname.startsWith('/api/')
  const isStaticFile = pathname.startsWith('/_next') ||
                       pathname.startsWith('/favicon.ico')

  // 정적 파일과 API는 통과
  if (isStaticFile || isApiRoute) {
    return NextResponse.next()
  }

  // 로그인되지 않았고 공개 경로가 아니면 로그인 페이지로
  if (!isLoggedIn && !isPublicPath) {
    const loginPath = `/login?callbackUrl=${encodeURIComponent(pathname)}`
    return NextResponse.redirect(loginPath, { status: 307 })
  }

  // 로그인했는데 로그인 페이지 접근 시 홈으로
  if (isLoggedIn && isPublicPath) {
    return NextResponse.redirect('/', { status: 307 })
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
