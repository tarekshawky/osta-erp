-- Calendar protection at the database level. Safe to run more than once.
-- Run:  npx prisma db execute --file prisma/calendar-constraints.sql
--
-- Two active periods of the SAME team may never overlap (a period runs from the start of the visit to the end of the visit plus the team's
-- travel time), whatever channel creates them and even when two requests arrive at the same moment. Periods an authorised admin booked
-- on purpose past a conflict ("override") are the only exception. Cancelled periods never block.
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF to_regclass('"CalendarEntry"') IS NULL THEN
    RAISE EXCEPTION 'Run "npx prisma db push" first: the CalendarEntry table does not exist yet.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEntry_valid_period') THEN
    ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_valid_period" CHECK ("endsAt" > "startsAt" AND "busyUntil" >= "endsAt");
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CalendarEntry_no_overlap') THEN
    ALTER TABLE "CalendarEntry" ADD CONSTRAINT "CalendarEntry_no_overlap"
      EXCLUDE USING gist ("teamId" WITH =, tsrange("startsAt", "busyUntil") WITH &&)
      WHERE ("state" = 'ACTIVE' AND NOT "override");
  END IF;
END
$$;
