-- Gives the discharge dates somewhere to land.
--
-- The assessment form records three of them -- physiotherapy, psychosocial,
-- and the older Church one -- while the API layer read and wrote a single
-- `dischargeDate`, which is not a field on Assessment at all. So the column
-- was written as undefined on every save and read back as null: a date the
-- clinician entered never survived the round trip, and the profile row for it
-- was always blank.
--
-- Safe to run: additive only, and the assessments table is empty today.
--
-- Apply in: Supabase dashboard -> SQL Editor. Independent of 0001; either
-- order works.

alter table public.assessments
  add column if not exists discharge_date_phisp  date,
  add column if not exists discharge_date_pss    date,
  add column if not exists discharge_date_church date;

-- The old single column is left in place rather than dropped. It holds no
-- data, but dropping a column is not reversible and nothing is gained by it
-- here. Remove it once you have confirmed the new three are being written.
comment on column public.assessments.discharge_date is
  'Superseded by discharge_date_phisp / _pss / _church. Never populated: the
   client wrote undefined to it. Safe to drop once the new columns are in use.';
