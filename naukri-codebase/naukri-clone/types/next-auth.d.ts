declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      githubUsername?: string
      githubId?: string
      accessToken?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubUsername?: string
    githubId?: string
    accessToken?: string
  }
}
