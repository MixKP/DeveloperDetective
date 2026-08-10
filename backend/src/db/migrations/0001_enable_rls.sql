-- Defence in depth against a leaked Supabase anon key.
--
-- The API is the real security boundary here: the backend connects with a privileged role,
-- so Row Level Security does not gate it and is not what protects the answer key. But
-- Supabase exposes PostgREST on the same database with the anon key, and if that key ever
-- lands in a commit or a bundle, every table would be world-readable — including
-- questions.correct_option, which is the one secret this whole architecture exists to keep.
--
-- Enabling RLS with NO policies denies everything by default for non-privileged roles.
-- Five minutes of work that turns a leaked key from a full answer-key dump into nothing.

ALTER TABLE "scenarios" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ethical_choices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "progress" ENABLE ROW LEVEL SECURITY;
