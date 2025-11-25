import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import Kakao from 'next-auth/providers/kakao'
import Naver from 'next-auth/providers/naver'
import Credentials from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@auth/mongodb-adapter'
import clientPromise from '@/lib/mongodb'
import { compare } from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    Kakao({
      clientId: process.env.KAKAO_CLIENT_ID || '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
    }),
    Naver({
      clientId: process.env.NAVER_CLIENT_ID || '',
      clientSecret: process.env.NAVER_CLIENT_SECRET || '',
    }),
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

        try {
          const client = await clientPromise
          const db = client.db('youtube-search')
          const usersCollection = db.collection('users')

          const user = await usersCollection.findOne({
            email: (credentials.email as string).toLowerCase(),
          })

          if (!user) {
            throw new Error('등록되지 않은 이메일입니다')
          }

          if (!user.password) {
            throw new Error('소셜 로그인만 가능한 계정입니다')
          }

          const isPasswordValid = await compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            throw new Error('비밀번호가 올바르지 않습니다')
          }

          return {
            id: user.email,
            email: user.email,
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          throw error
        }
      },
    }),
  ],
  session: {
    strategy: 'database',
    maxAge: 7 * 24 * 60 * 60, // 7일
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // user.id는 email (Primary Key)
        session.user.id = user.id
      }
      return session
    },
    async jwt({ token, user, account }) {
      // user가 있으면 (로그인 시) token.sub에 user.id 저장
      if (user) {
        token.sub = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/login',
  },
})
