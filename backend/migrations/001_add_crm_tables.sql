/* Migration: 001_add_crm_tables.sql */

-- Enable extension for UUID generation (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for CRM users (salespersons and admins)
CREATE TABLE IF NOT EXISTS crm_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('sales', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Extend leads table to reference a user (assigned_to)
ALTER TABLE IF EXISTS leads
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES crm_users(id);

-- Table for opportunities (pipeline stages)
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Indexes for quick lookup
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);
