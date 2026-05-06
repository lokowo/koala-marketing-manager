-- Koala PhD -- Merge duplicate university names
-- Run this manually in Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- Execute BEFORE running the OpenAlex import script

UPDATE professors SET university = 'University of Sydney'
  WHERE university = 'The University of Sydney';

UPDATE professors SET university = 'Queensland University of Technology'
  WHERE university = 'Queensland University of Technology (QUT)';

UPDATE professors SET university = 'UNSW Sydney'
  WHERE university = 'UNSW Sydney (University of New South Wales)';
