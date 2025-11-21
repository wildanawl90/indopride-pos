-- Add dosis and expired_date columns to products table
ALTER TABLE products 
ADD COLUMN dosis TEXT,
ADD COLUMN expired_date DATE;

-- Update existing products with sample data
UPDATE products SET 
  dosis = CASE 
    WHEN name LIKE '%500mg%' THEN '3x1 tablet/hari'
    WHEN name LIKE '%1000mg%' THEN '1x1 tablet/hari'
    WHEN name LIKE '%4mg%' THEN '3x1 tablet/hari'
    WHEN category = 'Obat Batuk & Flu' THEN '3x1 sachet/hari'
    WHEN category = 'Obat Maag' THEN '3x1 tablet sebelum makan'
    WHEN category = 'Obat Sakit Kepala' THEN '3x1 tablet setelah makan'
    WHEN category = 'Vitamin & Suplemen' THEN '1x1 tablet/hari'
    WHEN category = 'Antiseptik' THEN 'Oleskan 2-3x/hari'
    WHEN category = 'Obat Luar' THEN 'Oleskan pada area yang sakit'
    ELSE '3x1 sehari'
  END,
  expired_date = CURRENT_DATE + INTERVAL '2 years';
