ALTER TABLE "test_attempts" DROP CONSTRAINT "test_attempts_learner_test_key";--> statement-breakpoint
ALTER TABLE "knowledge_tests" ADD COLUMN "questions_per_attempt" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "knowledge_tests" ADD COLUMN "guidance" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD COLUMN "attempt_number" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_learner_test_number_key" UNIQUE("learner_id","test_id","attempt_number");