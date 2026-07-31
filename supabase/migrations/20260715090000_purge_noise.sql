-- One-time cleanup: remove collected news/social rows that are really
-- politics/court/sports coverage, not incidents. Mirrors the isNoise() veto
-- added to _shared/heuristics.ts (keyword matching previously classified e.g.
-- "Court dismisses suit ... ruling overturned" as an Accident via "overturn").
-- Citizen reports are never touched.

delete from public.incidents
 where source_kind in ('news', 'social')
   -- looks like politics / courts / sports / ceremonies…
   and (summary || ' ' || description) ~* '\m(election\w*|electoral|politic\w*|democracy|party|apc|pdp|inec|senat\w*|assembly|lawmaker|minister|governor(ship)?|commissioner|campaign|2027|tribunal|court|suit|lawsuit|litigation|judge?ment|verdict|appeal|acquit\w*|impeach\w*|budget|economy|investment|revenue|football|league|match|tournament|award\w*|celebrat\w*|anniversary|appoint\w*|inaugurat\w*|swearing?.?in|summit|conference|workshop|empower\w*)\M'
   -- …with no hard evidence that something physically happened
   and (summary || ' ' || description) !~* '\m(kill(ed|s|ing)?|dead|death|die[ds]?|injur\w*|wound(ed|s)?|victim|crash|collid\w*|collision|raze[ds]?|inferno|blaze|explos\w*|explod\w*|gunmen|gunshot|shoot(ing|out)?|kidnap\w*|abduct\w*|robbery|robbers|arson|flood(ed|ing|s)?|collaps\w*|spill|drown\w*|rescue[ds]?|evacuat\w*|derail\w*|capsiz\w*|stampede|outbreak|epidemic|cholera)\M';
