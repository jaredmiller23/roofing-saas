-- Migration: Add decline_reason to quote_proposals
-- Supports customer decline flow with optional reason capture
-- Rollback: ALTER TABLE quote_proposals DROP COLUMN decline_reason;

ALTER TABLE quote_proposals ADD COLUMN IF NOT EXISTS decline_reason TEXT;
