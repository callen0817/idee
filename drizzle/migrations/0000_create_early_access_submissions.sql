CREATE TABLE public.early_access_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  audience TEXT NOT NULL CHECK (audience IN ('consumer', 'founders', 'business', 'events', 'creator', 'partner')),
  full_name TEXT NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 120),
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 5 AND 320),
  organization TEXT CHECK (organization IS NULL OR char_length(organization) <= 160),
  city TEXT CHECK (city IS NULL OR char_length(city) <= 120),
  interest TEXT CHECK (interest IS NULL OR char_length(interest) <= 2000),
  source TEXT CHECK (source IS NULL OR char_length(source) <= 200),
  referral TEXT CHECK (referral IS NULL OR char_length(referral) <= 200),
  campaign TEXT CHECK (campaign IS NULL OR char_length(campaign) <= 200),
  consent BOOLEAN NOT NULL DEFAULT FALSE CHECK (consent = TRUE),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.early_access_submissions TO anon, authenticated;
GRANT ALL ON public.early_access_submissions TO service_role;

ALTER TABLE public.early_access_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit early access interest"
ON public.early_access_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  consent = TRUE
  AND (user_id IS NULL OR user_id = auth.uid())
);

CREATE INDEX early_access_submissions_created_at_idx
ON public.early_access_submissions (created_at DESC);

CREATE INDEX early_access_submissions_audience_idx
ON public.early_access_submissions (audience);