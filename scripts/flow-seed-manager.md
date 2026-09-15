# Flow pilot — seed branch manager (manual, one-time)

> **No passwords in this repo.** Do the auth user in Supabase Dashboard; store the password only in your password manager.

## Prerequisites

1. Migrations pushed (`npx supabase db push`) — `branches`, `profiles`, `branch_managers` must exist **before** creating the user (signup trigger writes into `profiles`).
2. Branch row exists: seed migration inserts `I.T. Causeway Bay` / `I.T. 銅鑼灣` with id `a0000000-0000-4000-8000-000000000001`.

## Steps

1. **Dashboard → Authentication → Users → Add user** (email + password).
   - Suggest email: `manager.cwb@ifmphk.com` (any value works).
2. Confirm trigger created `profiles` row (role defaults to `staff`):
   ```sql
   select id, email, role from public.profiles where id = '<auth-user-uuid>';
   ```
3. Promote to branch manager:
   ```sql
   update public.profiles set role = 'branch_manager' where id = '<auth-user-uuid>';
   ```
4. Link to branch:
   ```sql
   insert into public.branch_managers (profile_id, branch_id)
   values ('<auth-user-uuid>', 'a0000000-0000-4000-8000-000000000001');
   ```
5. Record the profile UUID here (no password):

   - Manager profile UUID: `<fill-in>`
   - Created by: `<name>` · Date: `<date>`

6. Verify from the app: `/flow/login` → sign in → land `/flow`.

## Rollback / reseed notes

- Delete the auth user in Dashboard → `profiles` row cascades.
- `branch_managers` row must be removed manually if you re-link a different profile.
