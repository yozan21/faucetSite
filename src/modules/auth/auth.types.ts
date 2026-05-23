export interface RegisterInput {
  username: string;
  email?: string | undefined;
  password: string;
  referralCode?: string | undefined;
}

export interface LoginInput {
  identifier: string;
  password: string;
  captchaToken?: string | undefined;
}

export interface JwtPayload {
  userId: string;
  username: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
