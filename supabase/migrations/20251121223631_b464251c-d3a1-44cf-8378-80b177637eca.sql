-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  tax DECIMAL(10,2) DEFAULT 0 CHECK (tax >= 0),
  discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
  paid DECIMAL(10,2) NOT NULL CHECK (paid >= 0),
  change DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Create policies (public access for demo - dapat disesuaikan dengan auth nanti)
CREATE POLICY "Allow public read access on products" 
  ON public.products FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on products" 
  ON public.products FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public update on products" 
  ON public.products FOR UPDATE 
  USING (true);

CREATE POLICY "Allow public delete on products" 
  ON public.products FOR DELETE 
  USING (true);

CREATE POLICY "Allow public read access on transactions" 
  ON public.transactions FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on transactions" 
  ON public.transactions FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow public read access on transaction_items" 
  ON public.transaction_items FOR SELECT 
  USING (true);

CREATE POLICY "Allow public insert on transaction_items" 
  ON public.transaction_items FOR INSERT 
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_product_id ON public.transaction_items(product_id);

-- Insert dummy data (10 produk)
INSERT INTO public.products (name, category, price, stock, image) VALUES
  ('Nasi Goreng Spesial', 'Makanan', 25000, 50, null),
  ('Mie Goreng', 'Makanan', 20000, 45, null),
  ('Ayam Geprek', 'Makanan', 30000, 30, null),
  ('Sate Ayam', 'Makanan', 35000, 25, null),
  ('Es Teh Manis', 'Minuman', 5000, 100, null),
  ('Es Jeruk', 'Minuman', 7000, 80, null),
  ('Kopi Susu', 'Minuman', 12000, 60, null),
  ('Jus Alpukat', 'Minuman', 15000, 40, null),
  ('Keripik Singkong', 'Snack', 10000, 70, null),
  ('Roti Bakar', 'Snack', 18000, 35, null);