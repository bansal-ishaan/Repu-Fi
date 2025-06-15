import NextAuth from "next-auth"
import GitHubProvider from "next-auth/providers/github"

const handler = NextAuth({
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.githubUsername = profile.login
        token.githubId = profile.id
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.githubUsername = token.githubUsername
        session.user.githubId = token.githubId
        session.user.accessToken = token.accessToken
      }
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  debug: true,
})

export { handler as GET, handler as POST }
