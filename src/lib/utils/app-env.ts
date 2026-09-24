// NEXT_PUBLIC_APP_ENV=staging is set only on the staging (Vercel Preview) deployment, which
// runs against the staging Supabase project. The live site and local dev leave it unset.
export const isStaging = process.env.NEXT_PUBLIC_APP_ENV === "staging";
