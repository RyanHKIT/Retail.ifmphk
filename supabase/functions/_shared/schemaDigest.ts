// Schema and metric digest handed to the Q&A model.
//
// This is the entire factual context the chat receives. It describes structure
// and definitions. It contains no rows, no counts, no names — so the model
// cannot report a figure it was not given, and cannot be used to extract data.
//
// Kept as a checked-in string rather than generated at runtime: it is small,
// it changes only when the schema changes, and a reviewable diff is worth more
// than introspective freshness for a document a model reasons over.

export const SCHEMA_DIGEST = `
# IFMP Retail — data model

A single-branch retail footfall and roster platform. One row per branch per
hour/day. All measurement tables are read-only to clients; data arrives by ETL.

## Measurement tables

public.branches
  id, name_zh, name_en, address, is_active
  The store. 零售分店.

public.entrances                              -- 出入口
  id, branch_id, name_zh, name_en, sort_order
  A physical door/counter. Traffic is recorded per entrance.

public.footfall_hourly                        -- 當日分時
  branch_id, hour_start (timestamptz), in_count, out_count,
  passersby_count, unique_visitors
  UNIQUE (branch_id, hour_start). One row per hour.
  - in_count  : people entering the store in that hour
  - out_count : people leaving in that hour
  - passersby_count : people walking past who did NOT enter. This is the
    denominator for conversion context, NOT store traffic.
  - unique_visitors : deduplicated headcount within the hour

public.footfall_daily                         -- 當月每日
  branch_id, day (date), in_count, out_count, passersby_count, unique_visitors
  UNIQUE (branch_id, day).
  IMPORTANT: unique_visitors here is the day's deduplicated visitor count.
  It is not 回頭客 (returning customers) and not a repeat-visit rate.

public.entrance_hourly                        -- 出入口 per gate
  entrance_id, hour_start, in_count, out_count
  UNIQUE (entrance_id, hour_start). Same shape as footfall_hourly but split by
  entrance rather than by branch.

public.audience_daily                         -- 客群畫像
  branch_id, day, gender, age_group, visitor_count
  UNIQUE (branch_id, day, gender, age_group).
  gender is one of: male, female, unknown
  age_group is one of: 0-17, 18-24, 25-34, 35-44, 45-54, 55+
  Rows where age_group answers a gender question are keyed with
  gender = 'unknown', and vice versa. Do not sum across both dimensions: the
  same visitor is counted in more than one row.

public.calendar_days                          -- 節假日
  day (primary key), is_holiday, name_zh, name_en
  Hong Kong public holidays. is_holiday marks the day.

public.zones                                  -- 動線熱力 geometry
  branch_id, zone_key, name_zh, name_en, zone_type,
  anchor_x, anchor_y, anchor_r
  zone_type is one of: entrance, shelf, fitting_room, cashier
  anchor_x / anchor_y are PERCENTAGES of floorplan width/height (0-100).
  anchor_r is the kernel radius as a percentage.
  A zone is a point with a radius, not a polygon, so heat is drawn as a field
  and clipped to the shop outline.

public.heatmap_daily                          -- 動線熱力 intensity
  zone_id, day, visit_count, avg_dwell_sec, intensity
  UNIQUE (zone_id, day).
  - avg_dwell_sec : average seconds spent in the zone
  - intensity : normalised 0-1 within the day, NOT an absolute count. It is
    comparable across zones on the same day, not across days.

public.devices                                -- 設備
  branch_id, name, status (online | offline | degraded), last_seen_at

public.alerts
  branch_id, severity (info | warning | critical), ...

## Roster tables

public.profiles          id, email, display_name, role
  role is one of: owner, branch_manager, staff
public.branch_managers   profile_id, branch_id
public.employees         id, branch_id, profile_id, name_zh, name_en, station,
                         employment_type, min_hours_per_week,
                         max_hours_per_week, is_active
  station is one of 樓面 | 試衣 | 收銀
public.shift_templates   branch_id, name, start_time, end_time, station,
                         headcount_target, color, is_active
  An overnight shift is expressed as end_time <= start_time, meaning +1 day.
public.roster_weeks      branch_id, week_start (Monday), status (draft|published)
public.assignments       roster_week_id, employee_id, shift_template_id,
                         day, ...
public.swap_requests     requester_employee_id, target_employee_id,
                         is_open_bid, reason, status (pending|approved|rejected),
                         reviewed_at, review_notes
  is_open_bid = true means the request is open to any colleague, not aimed at a
  named person.
public.hour_policies     branch_id, ...   weekly hour rules
public.availability_notes employee_id, ... unavailability
public.audit_logs        actor, action, table_name, ...

## Navigation surface

/flow               主控台    Overview — today's numbers, hourly curve, mix
/flow/journey       動線熱力  Heatmap of zone dwell
/flow/entrances     出入口    Traffic by gate
/flow/audience      客群畫像  Age and gender composition
/flow/compare       同期對比  Selected period vs last week vs year-on-year
/flow/holidays      節假日    Holiday vs normal-day comparison
/flow/roster        排班      Week board
/flow/roster/staff  員工名冊  Employee registry
/flow/roster/templates 更表模板 Shift templates
/flow/roster/policies  工時政策 Hour policies
/flow/roster/swaps  調更審批  Swap approvals
/flow/roster/audit  審計      Audit log
/flow/devices       設備      Device status
/flow/settings      設定      Theme, language, branch info

## Definitions that are easy to get wrong

- "客流" / traffic normally means in_count, not passersby_count.
- unique_visitors is a count of distinct people, so it is always lower than
  in_count over the same period. A ratio above 1 is a data error.
- 同期對比 (compare) compares the same weekday, not the same calendar date.
- intensity is normalised per day, so two days' intensities are not
  directly comparable in magnitude.
`.trim()

/** Short glossary used to steer the analysis prompts. */
export const METRIC_GLOSSARY = `
in_count = people entering. out_count = people leaving. passersby_count =
people who passed without entering (not traffic). unique_visitors =
deduplicated distinct visitors. intensity = normalised 0-1 within a day,
comparable across zones within one day only. avg_dwell_sec = mean seconds in a
zone. lift = holiday in_count relative to the matched normal weekday.
`.trim()
