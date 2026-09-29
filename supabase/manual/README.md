# Manual Storage repair (not a migration)

Files in this folder are **not** applied by `supabase db push`. Run them in the hosted project's SQL Editor when a repair is needed.

| File | Purpose |
| --- | --- |
| `repair_report_image_storage.sql` | Idempotent repair of private `report-images`, public `reporter-avatars`, and Storage RLS |
