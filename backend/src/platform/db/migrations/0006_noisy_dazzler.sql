CREATE TYPE "public"."ethics_principle" AS ENUM('public', 'client-and-employer', 'product', 'judgement', 'management', 'profession', 'colleagues', 'self');--> statement-breakpoint
CREATE TYPE "public"."test_variant" AS ENUM('pre', 'post');--> statement-breakpoint
CREATE TABLE "knowledge_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"test_id" integer NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_option" text NOT NULL,
	"principle" "ethics_principle" NOT NULL,
	"clause" text NOT NULL,
	"explanation" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "knowledge_questions_test_order_key" UNIQUE("test_id","order_index")
);
--> statement-breakpoint
CREATE TABLE "knowledge_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"variant" "test_variant" NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "knowledge_tests_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "test_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"learner_id" uuid NOT NULL,
	"test_id" integer NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_attempts_learner_test_key" UNIQUE("learner_id","test_id")
);
--> statement-breakpoint
CREATE TABLE "test_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"attempt_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"selected_option" text NOT NULL,
	"correct" boolean NOT NULL,
	CONSTRAINT "test_responses_attempt_question_key" UNIQUE("attempt_id","question_id")
);
--> statement-breakpoint
ALTER TABLE "knowledge_questions" ADD CONSTRAINT "knowledge_questions_test_id_knowledge_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."knowledge_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_attempts" ADD CONSTRAINT "test_attempts_test_id_knowledge_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."knowledge_tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_responses" ADD CONSTRAINT "test_responses_attempt_id_test_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."test_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_responses" ADD CONSTRAINT "test_responses_question_id_knowledge_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."knowledge_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "test_attempts_test_idx" ON "test_attempts" USING btree ("test_id");--> statement-breakpoint
ALTER TABLE "knowledge_tests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "knowledge_questions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "test_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "test_responses" ENABLE ROW LEVEL SECURITY;
