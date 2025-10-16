-- Add new fields to project_onboarding table for submission and admin review workflow
ALTER TABLE project_onboarding 
ADD COLUMN submitted_for_review BOOLEAN DEFAULT FALSE,
ADD COLUMN submitted_for_review_at TIMESTAMPTZ,
ADD COLUMN submitted_by UUID REFERENCES auth.users(id),
ADD COLUMN admin_validated BOOLEAN DEFAULT FALSE,
ADD COLUMN admin_validated_at TIMESTAMPTZ,
ADD COLUMN admin_validated_by UUID REFERENCES auth.users(id);