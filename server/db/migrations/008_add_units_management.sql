-- Migration: Add units management system
-- This allows admins to manage measurement units for test parameters

-- Create units table
CREATE TABLE IF NOT EXISTS units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    symbol VARCHAR(20) NOT NULL,
    category VARCHAR(50), -- e.g., 'Volume', 'Mass', 'Concentration', 'Count', 'Time', 'Ratio'
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_units_is_active ON units(is_active);
CREATE INDEX IF NOT EXISTS idx_units_category ON units(category);

-- Insert common laboratory units
INSERT INTO units (name, symbol, category, description) VALUES
-- Concentration units
('Milligrams per deciliter', 'mg/dL', 'Concentration', 'Common unit for blood glucose, cholesterol'),
('Grams per deciliter', 'g/dL', 'Concentration', 'Common unit for hemoglobin, protein'),
('Micrograms per deciliter', 'µg/dL', 'Concentration', 'Common unit for vitamin levels'),
('Milligrams per liter', 'mg/L', 'Concentration', 'Alternative concentration unit'),
('Grams per liter', 'g/L', 'Concentration', 'Alternative concentration unit'),
('Micrograms per liter', 'µg/L', 'Concentration', 'Alternative concentration unit'),
('Nanograms per milliliter', 'ng/mL', 'Concentration', 'Common for hormones, tumor markers'),
('Picograms per milliliter', 'pg/mL', 'Concentration', 'Common for very low concentrations'),
('Millimoles per liter', 'mmol/L', 'Concentration', 'SI unit for electrolytes, glucose'),
('Micromoles per liter', 'µmol/L', 'Concentration', 'SI unit for bilirubin, creatinine'),
('Nanomoles per liter', 'nmol/L', 'Concentration', 'SI unit for hormones'),

-- Count units
('Cells per microliter', 'cells/µL', 'Count', 'Common for blood cell counts'),
('Cells per cubic millimeter', 'cells/mm³', 'Count', 'Alternative for blood cell counts'),
('Thousand per microliter', '10³/µL', 'Count', 'Common for WBC, platelet counts'),
('Million per microliter', '10⁶/µL', 'Count', 'Common for RBC counts'),
('Lakhs per cubic millimeter', 'lakhs/mm³', 'Count', 'Indian notation for cell counts'),

-- Volume units
('Milliliters', 'mL', 'Volume', 'Common volume unit'),
('Liters', 'L', 'Volume', 'Common volume unit'),
('Microliters', 'µL', 'Volume', 'Small volume unit'),
('Femtoliters', 'fL', 'Volume', 'Common for MCV (mean corpuscular volume)'),

-- Mass units
('Grams', 'g', 'Mass', 'Common mass unit'),
('Milligrams', 'mg', 'Mass', 'Common mass unit'),
('Micrograms', 'µg', 'Mass', 'Small mass unit'),
('Picograms', 'pg', 'Mass', 'Very small mass unit, used for MCH'),

-- Ratio/Percentage units
('Percentage', '%', 'Ratio', 'Common for hematocrit, saturation'),
('Ratio', 'ratio', 'Ratio', 'Dimensionless ratio'),

-- Time units
('Seconds', 'sec', 'Time', 'Common for clotting times'),
('Minutes', 'min', 'Time', 'Common for clotting times'),
('Hours', 'hr', 'Time', 'Time unit'),

-- Enzyme activity units
('Units per liter', 'U/L', 'Enzyme Activity', 'Common for enzyme levels'),
('International units per liter', 'IU/L', 'Enzyme Activity', 'International standard for enzymes'),
('International units per milliliter', 'IU/mL', 'Enzyme Activity', 'Alternative enzyme unit'),

-- Special units
('Millimeters per hour', 'mm/hr', 'Rate', 'ESR (Erythrocyte Sedimentation Rate)'),
('Colony forming units per milliliter', 'CFU/mL', 'Count', 'Microbiology culture counts'),
('pH units', 'pH', 'Acidity', 'Measure of acidity/alkalinity'),
('Milliosmoles per kilogram', 'mOsm/kg', 'Osmolality', 'Osmolality measurement'),

-- Dimensionless
('No unit', '', 'Dimensionless', 'For qualitative or dimensionless results')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE units IS 'Measurement units for laboratory test parameters';

