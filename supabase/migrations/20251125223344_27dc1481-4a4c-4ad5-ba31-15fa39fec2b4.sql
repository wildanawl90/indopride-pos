-- Add barcode field to products table
ALTER TABLE products ADD COLUMN barcode TEXT;

-- Create index for faster barcode lookups
CREATE INDEX idx_products_barcode ON products(barcode);