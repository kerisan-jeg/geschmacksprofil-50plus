// Neue Supabase-Schlüssel sind keine JWTs und dürfen nicht als Bearer-Token gesendet werden.
// Alte anon-/service_role-JWTs und andere PostgREST-Anbindungen behalten beide Header.
export function apiHeaders(key) {
  return key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')
    ? { apikey: key }
    : { apikey: key, Authorization: `Bearer ${key}` };
}
