import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

type AppRole = "ADMIN" | "USER";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
      role: AppRole;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    role: AppRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id?: string;
    role?: AppRole;
    active?: boolean;
  }
}
