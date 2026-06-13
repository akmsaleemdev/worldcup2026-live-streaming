/**
 * NextAuth App Router route handler (Req 5.1, 5.4).
 *
 * Uses the shared `authOptions` from `@/lib/auth/options` and exports the
 * NextAuth handler as both GET and POST per the NextAuth v4 App Router pattern.
 */
import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth/options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
