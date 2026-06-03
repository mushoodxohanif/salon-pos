ALTER TABLE "sales" ADD COLUMN "sale_code" text;--> statement-breakpoint
WITH "numbered" AS (
  SELECT
    "id",
    'S-' || lpad(
      (row_number() OVER (PARTITION BY "branch_id" ORDER BY "created_at", "id"))::text,
      6,
      '0'
    ) AS "code"
  FROM "sales"
)
UPDATE "sales" AS "s"
SET "sale_code" = "n"."code"
FROM "numbered" AS "n"
WHERE "s"."id" = "n"."id";--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "sale_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_sale_code_unique" UNIQUE("sale_code");--> statement-breakpoint
CREATE TABLE "attendance_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"checked_in_at" timestamp with time zone NOT NULL,
	"checked_out_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance_sessions" ADD CONSTRAINT "attendance_sessions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;
