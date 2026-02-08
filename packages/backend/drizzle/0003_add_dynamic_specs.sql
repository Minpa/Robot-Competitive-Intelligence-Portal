-- Add Form Factor columns for robots
ALTER TABLE product_specs ADD COLUMN IF NOT EXISTS arms INTEGER;
ALTER TABLE product_specs ADD COLUMN IF NOT EXISTS hands VARCHAR(50);
ALTER TABLE product_specs ADD COLUMN IF NOT EXISTS mobility VARCHAR(50);
ALTER TABLE product_specs ADD COLUMN IF NOT EXISTS height_cm DECIMAL(10, 2);

-- Add dynamic specs JSONB column for SoC, actuators, etc.
ALTER TABLE product_specs ADD COLUMN IF NOT EXISTS dynamic_specs JSONB DEFAULT '{}';

-- Create index for dynamic specs queries
CREATE INDEX IF NOT EXISTS product_specs_dynamic_specs_idx ON product_specs USING GIN (dynamic_specs);

-- Comment for documentation
COMMENT ON COLUMN product_specs.dynamic_specs IS 'Dynamic specifications for various product types (SoC: tops, process, memory; Actuator: torque, rpm, etc.)';
