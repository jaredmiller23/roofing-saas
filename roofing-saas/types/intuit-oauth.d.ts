declare module 'intuit-oauth' {
  interface TokenResponse {
    token: {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      x_refresh_token_expires_in: number
    }
    getJson(): any
    getToken(): {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      x_refresh_token_expires_in: number
      realmId: string
    }
  }

  export default class OAuthClient {
    static scopes: {
      Accounting: string[]
      OpenId: string[]
      Profile: string[]
      Email: string[]
      Phone: string[]
      Address: string[]
    }

    constructor(config: {
      clientId: string
      clientSecret: string
      environment: string
      redirectUri: string
    })

    authorizeUri(params: {
      scope: string[]
      state: string
    }): string

    createToken(authorizationCode: string): Promise<TokenResponse>

    refresh(): Promise<TokenResponse>

    revoke(params: { access_token: string }): Promise<void>

    getToken(): {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      x_refresh_token_expires_in: number
    }

    setToken(token: {
      access_token: string
      refresh_token: string
      expires_in: number
      token_type: string
      x_refresh_token_expires_in?: number
      realmId?: string
    }): void

    isAccessTokenValid(): boolean

    makeApiCall(params: {
      url: string
      method?: string
      headers?: Record<string, string>
      body?: any
    }): Promise<any>
  }
}
