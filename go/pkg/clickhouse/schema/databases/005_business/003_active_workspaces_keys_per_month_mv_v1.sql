CREATE MATERIALIZED VIEW IF NOT EXISTS business.active_workspaces_keys_per_month_mv_v1
TO business.active_workspaces_per_month_v1
AS
SELECT
  workspace_id, toDate(time) as time
FROM verifications.key_verifications_per_month_v2
;
