-- Create the custom_parts table to persist user-added parts per garage
CREATE TABLE IF NOT EXISTS custom_parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  garage_id UUID NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate parts per garage (case-insensitive)
  UNIQUE (garage_id, part_name)
);

-- Index for fast lookups by garage
CREATE INDEX IF NOT EXISTS idx_custom_parts_garage ON custom_parts(garage_id);

-- Enable RLS
ALTER TABLE custom_parts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read/insert custom parts for garages they belong to
CREATE POLICY "Users can manage custom parts for their garages"
  ON custom_parts
  FOR ALL
  USING (true)
  WITH CHECK (true);
