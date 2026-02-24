

# Knowledge Hub for Agents and Partners

## Overview

A new "Knowledge Hub" section accessible from the sidebar for agents (and admins who manage it). Agents and partners can browse, search, and download marketing materials, templates, explainers, FAQ documents, email templates, and other resources uploaded by admins.

## Architecture

### Database

**New table: `knowledge_hub_resources`**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title | text | Resource name |
| description | text | Short description |
| category | text | e.g. "marketing", "templates", "explainers", "faq", "email_templates", "other" |
| file_name | text | Original file name |
| file_url | text | Supabase storage URL |
| file_size_bytes | bigint | File size |
| mime_type | text | File type |
| tags | text[] | Searchable tags |
| is_published | boolean | Only published items visible to agents |
| uploaded_by | uuid | Admin who uploaded |
| created_at | timestamptz | Upload date |
| updated_at | timestamptz | Last modified |
| download_count | integer | Track popularity |

**RLS Policies:**
- Admins: full CRUD access
- Agents: SELECT only where `is_published = true`
- No anonymous access

**Storage bucket: `knowledge-hub`**
- Private bucket (downloads via signed URLs)
- RLS: admins can upload/delete, agents can read published resources

### New Pages and Components

**1. Agent-facing page: `/knowledge-hub`**
- Route: Protected, accessible to `agent` and `admin` roles
- Sidebar entry with `BookOpen` icon, positioned after "Quick Calc" for agents
- Features:
  - Category filter tabs (All, Marketing, Templates, Explainers, FAQ, Email Templates)
  - Search bar to filter by title, description, or tags
  - Card grid showing each resource with title, description, category badge, file type icon, and download button
  - Download triggers a signed URL from Supabase storage

**2. Admin management page: `/admin/knowledge-hub`**
- Route: Protected, admin only
- Sidebar entry with `BookOpen` icon in the admin section
- Features:
  - Upload new resources (drag-and-drop or file picker)
  - Set title, description, category, and tags
  - Toggle published/draft status
  - Delete resources
  - View download counts

### Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| New | `src/pages/KnowledgeHub.tsx` | Agent-facing browse and download page |
| New | `src/pages/admin/KnowledgeHubAdmin.tsx` | Admin upload and management page |
| New | `src/components/knowledge-hub/ResourceCard.tsx` | Resource display card with download |
| New | `src/components/knowledge-hub/ResourceUploadForm.tsx` | Admin upload form |
| New | `src/components/knowledge-hub/CategoryFilter.tsx` | Tab-based category filter |
| New | `src/hooks/useKnowledgeHub.ts` | Data fetching and mutations |
| Modify | `src/App.tsx` | Add routes for both pages |
| Modify | `src/components/layout/DashboardSidebar.tsx` | Add sidebar entries |
| Migration | SQL | Create table, bucket, and RLS policies |

### Technical Details

**Download flow:** When an agent clicks "Download", we call `supabase.storage.from('knowledge-hub').createSignedUrl(path, 60)` to generate a 60-second signed URL, then trigger the browser download.

**Upload flow (admin):** Uses the existing `useFileUpload` hook pattern (same as onboarding documents). Files are stored in the `knowledge-hub` bucket with a folder structure like `{category}/{filename}`.

**Category options:**
- Marketing Materials
- Templates
- Explainers
- FAQ / Guides
- Email Templates
- Other

### UI Design

The agent-facing page follows the existing dashboard card pattern with:
- `DashboardLayout` wrapper
- `DashboardHeader` with title "Knowledge Hub"
- Tabs for category filtering
- Responsive card grid (1 col mobile, 2 cols tablet, 3 cols desktop)
- Each card shows file type icon, title, description, category badge, file size, and a prominent download button

