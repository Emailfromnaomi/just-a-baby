# Setting up accounts (Supabase)

This takes about 20 minutes. When you're done, anyone with the link can create an account, add their baby and invite a partner.

You'll need:
- a free [Supabase](https://supabase.com) account
- an email-sending service (see step 4)
- this repo

## 1. Create the Supabase project

1. In Supabase, click **New project**.
2. Name it `just-a-baby`.
3. Set a strong database password and save it in your password manager. The app never uses it.
4. Pick the region **Canada (Central)**, or whatever region is closest to your testers. Their data is stored there, and the privacy notice should say so.
5. Wait for the project to finish provisioning.

## 2. Create the database

1. Open **SQL Editor → New query**.
2. Paste the whole contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Click **Run**. You should see "Success. No rows returned".

This creates the tables (`babies`, `baby_members`, `events`, `invites`) and the access rules that keep each family's data private. It also creates three functions the app calls: create a baby, accept an invite, and delete my account. It's safe to run again after changes.

## 3. Point sign-in at your site

Go to **Authentication → URL Configuration**.

- **Site URL:** `https://justababy.ca`
- **Redirect URLs:** add all of these:
  - `https://justababy.ca/**`
  - `https://www.justababy.ca/**`
  - `http://localhost:8000/**` (for testing on your own computer)

The email sign-in link only works for URLs on this list.

## 4. Set up sign-in emails

Supabase's built-in email sender is for trying things out. It only sends a handful of emails per hour, which isn't enough for a beta.

1. Under **Project Settings → Authentication → SMTP Settings**, turn on custom SMTP.
2. Enter details from an email provider. Resend, Postmark and Amazon SES all work, as does any transactional ESP you already use.
3. Use a sender like `hello@yourdomain`, and set up SPF and DKIM for it so the emails don't land in spam.

Then add the 6-digit code to the emails. It's a big help on iPhone, where tapping a link in Mail opens Safari instead of the home-screen app. Under **Authentication → Email Templates**, edit both **Confirm signup** and **Magic Link** so they include the code. For example:

```html
<h2>Sign in to Just a Baby</h2>
<p><a href="{{ .ConfirmationURL }}">Tap here to sign in</a></p>
<p>Or type this code in the app: <b style="font-size:20px;letter-spacing:4px">{{ .Token }}</b></p>
<p>If you didn't ask for this, you can ignore it.</p>
```

## 5. Connect the app

1. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
2. Paste them into [`config.js`](config.js):

```js
window.JAB_CONFIG = {
  supabaseUrl: "https://abcd1234.supabase.co",
  supabaseAnonKey: "eyJhbGciOi..."
};
```

The anon key is designed to be public. The access rules from step 2 are what protect the data.

**Never** put the `service_role` key anywhere in this repo.

## 6. Publish with GitHub Pages

1. In the GitHub repo, open **Settings → Pages**.
2. Set **Source** to **Deploy from a branch**, the branch to `main`, and the folder to `/ (root)`.
3. Save. The site is served at `https://justababy.ca` (set by the `CNAME` file in this repo).
4. In the same screen, turn on **Enforce HTTPS** once GitHub has issued the certificate. This can take up to a few hours after DNS is set.

### DNS records at GoDaddy (justababy.ca)

| Type | Name | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | emailfromnaomi.github.io |

Remove GoDaddy's default "Parked" A record for `@`, and any existing `www` record, first.

## 7. Test it with two people

1. Open the site on your phone, sign in with your email, and add a baby.
2. Log a feed.
3. Go to **pencil → Caregivers → Create an invite link**, and send the link to a second email address you control, or to your sister.
4. Open the link on another device or browser and sign in. That person should see the baby and the feed.
5. Log a diaper change from the second device. It should appear on the first one within a second or two.
6. On the second device, turn on airplane mode and log something. You'll see "Saved on this phone". Turn airplane mode off, and it syncs.
7. Try **Download CSV**. Then, on a throwaway account, try **Delete my account and data**.

## Before inviting testers

- **Fill in the privacy notice.** Complete the bracketed parts of [`privacy.html`](privacy.html) and have someone familiar with PIPA and PIPEDA review it.
- **Check the free plan.** Supabase's free plan pauses a project after about a week with no activity, and its limits change over time. Check current pricing and consider the paid plan for the beta so testers never find it asleep.
- **Review the sign-in rate limits.** Under **Authentication → Rate Limits**, raise the email limit to match your SMTP plan.

## For developers: running the access-rule tests

`supabase/tests/` has a plain-Postgres check of the row-level security. It covers strangers, invites, caregivers, expiry and account deletion.

```sh
# any throwaway Postgres 15+ (not your Supabase project)
psql -f supabase/tests/supabase_shim.sql     # fake auth schema and roles
psql -f supabase/schema.sql
psql -f supabase/tests/rls_test.sql          # every line should say PASS
```
