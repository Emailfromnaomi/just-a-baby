# Customer.io data

Just a Baby sends people and events to the **Just a Baby** Customer.io workspace from the database, through the `cio-sync` Edge Function. Nothing runs in the browser, so ad blockers don't affect it, and logs from every caregiver are counted.

## How it flows

```
app write ─▶ Postgres trigger ─▶ public.cio_outbox ─▶ cio-sync (Edge Function) ─▶ Customer.io Track API
                                   ▲                       │
                                   └── pg_cron every 2 min retries anything unsent
```

- Every outbox row first refreshes the person's attributes, then sends its event. Attributes are always current when a campaign triggers.
- **Throttling:** routine attribute refreshes (an ordinary log) are capped at one per person per 10 minutes. Events are never throttled.
- **Retries:** a failed send is retried every couple of minutes, up to 8 times. Check `public.cio_outbox` (`last_error`) if something seems missing.
- **Deletion:** deleting an account deletes the person in Customer.io.
- **What isn't sent:** individual feeds, naps and diapers, and their details. Only counts and timestamps leave the database.

**Identifier:** `id` = the Supabase user id. `email` is set as an attribute.

## Person attributes

Use these as `{{ customer.<name> }}` in Liquid. Timestamps are Unix seconds, so Customer.io treats them as dates in segments.

| Attribute | Type | Example | Notes |
|---|---|---|---|
| `email` | string | `naomi@example.com` | |
| `created_at` | timestamp | `1790881941` | When they confirmed their email |
| `last_sign_in_at` | timestamp | | |
| `role` | string | `owner` / `caregiver` | For their first baby |
| `baby_id` | string | `f5a9…` | First baby they joined |
| `baby_name` | string | `Mia` | |
| `baby_birth_date` | string | `2026-08-10` | Not set if no birthday |
| `baby_birth_at` | timestamp | `1786320000` | Same date, for age maths and segments |
| `babies_count` | number | `1` | |
| `caregivers_count` | number | `2` | People on their first baby, including them |
| `bottle_unit` | string | `ml` / `oz` | |
| `total_logs` | number | `142` | Entries this person logged, all babies |
| `logs_last_7_days` | number | `38` | |
| `first_logged_at` | timestamp | | |
| `last_logged_at` | timestamp | | For "hasn't logged in 3 days" segments |
| `app` | string | `just-a-baby` | |

## Events

Use event data as `{{ event.<name> }}` in a campaign triggered by that event.

| Event | When | Data |
|---|---|---|
| `signed_up` | Email confirmed for the first time | none |
| `baby_created` | They add a baby (they're the owner) | `baby_id`, `baby_name`, `baby_birth_date` |
| `caregiver_invited` | They create an invite link | `baby_id`, `baby_name`, `expires_at` |
| `joined_as_caregiver` | They accept someone's invite | `baby_id`, `baby_name` |
| `caregiver_joined` | Someone accepts *their* invite (sent to the owner) | `baby_id`, `baby_name` |
| `baby_updated` | Name, birthday or units change (sent to everyone on that baby) | `baby_id`, `baby_name`, `baby_birth_date` |
| `first_log` | Their first entry | `log_type` (feed/sleep/diaper/play/bath), `baby_id`, `baby_name` |
| `log_milestone` | Their 10th, 25th, 50th, 100th, 250th, 500th, 1000th… entry | `total_logs` |

## Liquid examples

Baby's name with a fallback:

```liquid
{{ customer.baby_name | default: "your little one" }}
```

Age in weeks, or months after 13 weeks:

```liquid
{% if customer.baby_birth_at %}
  {% assign days = 'now' | date: '%s' | minus: customer.baby_birth_at | divided_by: 86400 %}
  {% if days < 91 %}
    {{ customer.baby_name }} is {{ days | divided_by: 7 }} weeks old
  {% else %}
    {{ customer.baby_name }} is {{ days | divided_by: 30 }} months old
  {% endif %}
{% endif %}
```

Nudge solo parents to invite a partner:

```liquid
{% if customer.caregivers_count == 1 and customer.role == "owner" %}
  Share the log: invite a partner from the pencil menu.
{% endif %}
```

Milestone email (triggered by `log_milestone`):

```liquid
That's {{ event.total_logs }} entries for {{ customer.baby_name }}. Nice work.
```

## Campaign ideas

- **Welcome:** trigger on `signed_up`. If no `baby_created` within a day, send "Add your baby".
- **Activation:** trigger on `baby_created`. If no `first_log` within 24 hours, send a nudge.
- **Partner invite:** owners with `caregivers_count = 1` three days after `first_log`.
- **Partner welcome:** trigger on `joined_as_caregiver`, with a short "how to read the bars".
- **Win-back:** segment where `last_logged_at` is more than 3 days ago and `total_logs > 5`.
- **Beta check-ins:** day 3 and day 14 after `signed_up`, as in [BETA-PLAN.md](BETA-PLAN.md).

## Setup (already done for justababy.ca)

1. Run [`supabase/customerio.sql`](supabase/customerio.sql) after `schema.sql`.
2. Deploy [`supabase/functions/cio-sync`](supabase/functions/cio-sync/index.ts).
3. In **Supabase → Edge Functions → Secrets**, add `CIO_SITE_ID` and `CIO_API_KEY` from **Customer.io → Workspace settings → API credentials → Track API keys**. Also add `CIO_REGION=eu` if the workspace is in the EU region.
4. Check it's working with this query; `sent_at` should fill in within seconds:

```sql
select id, kind, name, attempts, sent_at, last_error from public.cio_outbox order by id desc limit 20;
```
