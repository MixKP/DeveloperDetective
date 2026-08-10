CREATE TYPE "public"."ethical_quality" AS ENUM('good', 'neutral', 'bad');--> statement-breakpoint
CREATE TYPE "public"."question_kind" AS ENUM('locate', 'explain', 'solve');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('Critical', 'High', 'Medium');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ethical_choices" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"text" text NOT NULL,
	"quality" "ethical_quality" NOT NULL,
	"outcome" text NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "ethical_choices_scenario_order_key" UNIQUE("scenario_id","order_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"path" text NOT NULL,
	"code" text NOT NULL,
	"language" text NOT NULL,
	"vulnerable_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recently_changed" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "files_scenario_path_key" UNIQUE("scenario_id","path")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"scenario_id" integer NOT NULL,
	"kind" "question_kind" NOT NULL,
	"prompt" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_option" text NOT NULL,
	"explanation" text NOT NULL,
	"hints" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "questions_scenario_order_key" UNIQUE("scenario_id","order_index")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"severity" "severity" NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"estimated_minutes" integer NOT NULL,
	"language" text NOT NULL,
	"brief_sender" text NOT NULL,
	"brief_sender_role" text NOT NULL,
	"brief_subject" text NOT NULL,
	"brief_received_at" text NOT NULL,
	"brief_body" text NOT NULL,
	"brief_objectives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"root_cause" text NOT NULL,
	"business_impact" text NOT NULL,
	"remediation" text NOT NULL,
	CONSTRAINT "scenarios_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"learner_id" uuid NOT NULL,
	"scenario_id" integer NOT NULL,
	"wrong_attempts" integer DEFAULT 0 NOT NULL,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"solved_question_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"revealed_hints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"vulnerable_lines_unlocked" boolean DEFAULT false NOT NULL,
	"ethical_choice_id" integer,
	"completed" boolean DEFAULT false NOT NULL,
	"score" integer DEFAULT 100 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "progress_learner_scenario_key" UNIQUE("learner_id","scenario_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ethical_choices" ADD CONSTRAINT "ethical_choices_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "files" ADD CONSTRAINT "files_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questions" ADD CONSTRAINT "questions_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "progress_learner_idx" ON "progress" USING btree ("learner_id");