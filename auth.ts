import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('이메일과 비밀번호를 입력해주세요')
        }

        const email = (credentials.email as string).trim().toLowerCase()
        const password = (credentials.password as string).trim()

        // 하드코딩된 관리자 계정 (환경변수 문제 우회)
        const admins = [
          {
            email: 'insm007@naver.com',
            hashedPassword: '$2b$10$y4yRUQfYRwMOslZbZNe/I.G3p1s2cQiq6LaeN0TNmFSsPOtKdYblO'
          },
          {
            email: 'aiyumisejong@gmail.com',
            hashedPassword: '$2b$10$uVjCPjJGKQ2249Qkloeqz./DXsHU2VzGt6zuIzZHCT4/ZRZy7fTEm'
          },
        ]

        console.log('🔍 로그인 시도:', { email })

        for (const admin of admins) {
          if (admin.email === email) {
            console.log('✅ 이메일 매칭됨:', email)
            const isValid = await compare(password, admin.hashedPassword)
            console.log('🔐 비밀번호 검증:', { isValid })

            if (isValid) {
              console.log('🎉 로그인 성공!')
              return {
                id: email,
                email: email,
                name: email.split('@')[0],
                role: 'admin',
              }
            } else {
              console.log('❌ 비밀번호 불일치')
              throw new Error('비밀번호가 틀렸습니다')
            }
          }
        }

        throw new Error('등록되지 않은 관리자 이메일입니다')
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24시간
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = 'admin'
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = token.role as string
        session.user.email = token.email as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})
