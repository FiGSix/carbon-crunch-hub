-- Add 'legacy_import' to signature_type enum
ALTER TYPE signature_type ADD VALUE IF NOT EXISTS 'legacy_import';