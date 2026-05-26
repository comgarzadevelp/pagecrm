/* Migration: 002_add_quotes_table.sql */

-- Table for storing B2B Quotes
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_num TEXT NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES crm_users(id) ON DELETE CASCADE,
    agreement TEXT NOT NULL,
    items JSONB NOT NULL,
    notes TEXT,
    subtotal NUMERIC NOT NULL,
    iva NUMERIC NOT NULL,
    total NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for performance optimization on relational queries
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_id ON quotes(seller_id);

-- Disable RLS for B2B Quotes since API is authenticated internally via Node JWT
ALTER TABLE quotes DISABLE ROW LEVEL SECURITY;

