-- Rename the 'Flood' incident type to 'Natural Disaster' (the category now also
-- covers earthquakes, landslides, storms, etc. — see _shared/heuristics.ts).
--
-- dedup_key embeds the type ("Flood:<headline fingerprint>"), so it must be
-- rewritten too; otherwise the collector's next run would re-insert the same
-- stories under the new key and duplicate them.

-- If the collector already re-ingested a story under the new key, drop the
-- stale Flood row instead of colliding with the unique dedup_key.
delete from public.incidents f
 where f.type = 'Flood'
   and f.dedup_key like 'Flood:%'
   and exists (
     select 1 from public.incidents n
      where n.dedup_key = 'Natural Disaster' || substring(f.dedup_key from 6)
   );

update public.incidents
   set type = 'Natural Disaster',
       dedup_key = case
         when dedup_key like 'Flood:%'
         then 'Natural Disaster' || substring(dedup_key from 6)
         else dedup_key
       end,
       updated_at = now()
 where type = 'Flood';
