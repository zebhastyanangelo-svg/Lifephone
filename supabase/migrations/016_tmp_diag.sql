-- Diagnostic placeholder (016)
-- This migration slot was used for a one-off read-only diagnostic during incident
-- investigation of create_admin_user. It intentionally contains no statements so it
-- remains safe to replay on any environment, including fresh databases.
SELECT 1;
