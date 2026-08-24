# CSV export of projects in onboarding

Add an "Export CSV" button on the Project Onboarding list page (admin only) that exports every project currently matching the active search/status filter, with one row per project and the columns below.

## Everything we hold per project in this section

Copy-paste list of available headings, grouped by source.

### Project / identity (proposals + project_onboarding)
```text
Project Name (proposal title)
Client Name
Client Email
Client Company
Site Address
Partner / Agent Name
Partner / Agent Email
Proposal Status
Signed Date
Created Date
Last Updated
Last Activity At
Version
```

### Progress & workflow flags (project_onboarding)
```text
Overall Status (Not Started / In Progress / Awaiting Review / Under Review / Audit Ready)
Onboarding Complete
Onboarding Completed At
Data Access Verified
Data Access Verified At
Audit Ready
Audit Ready Marked At
Audit Ready Marked By
Submitted For Review
Submitted For Review At
Submitted By
Admin Validated
Admin Validated At
Admin Validated By
Assigned EPC
Last Modified By
```

### System details (onboarding_fields)
```text
System Name
System Address
GPS Latitude
GPS Longitude
Commissioning Date
Ownership Type
Connection Type
Alternative Power Source
Inverter Brand
Inverter Model
Inverter Capacity (kW)
Inverter Quantity
Inverter Serial
Inverter Cost
Panel Brand
Panel Size (Wp)
Panel Quantity
Panel Total (kWp)
Panel Cost
Has Battery
Battery Brand
Battery Model
Battery Capacity (kWh)
Battery Serial
Battery Cost
Data Collector Present
Data Collector Serial
Meter Type
Meter Serial
Phases (JSON summary)
Total CAPEX
Labour Cost
Has Maintenance Agreement
Maintenance Term (years)
Maintenance Cost (annual)
Installer Company
Installer Email
Fields Validated At
Fields Validated By
```

### Data access configuration (data_access_config)
```text
Provider
Site ID
Portal URL
Credential Method
Delegated Email
Granted By Email
Granted By Role
Last Test Status
Last Test At
Last Test Error
First Data Ingested At
```

### Documents (onboarding_documents) — summarised per project
```text
Documents Uploaded (count)
Documents Validated (count)
Document Categories Present
Missing Required Categories
```

### Audit / vintage (vintage_audit_status)
```text
Minimum Vintage Year
Audit Status
Audit Notes Count
```

## Technical notes

- New hook builds one server-side query joining `project_onboarding` → `proposals`, `onboarding_fields`, `data_access_config`, plus aggregate counts from `onboarding_documents`; reuses the existing role filters from `ProjectOnboardingList` and the archived/deleted exclusions.
- CSV generated client-side (no new edge function): proper quoting/escaping, UTF-8 BOM for Excel, dates as YYYY-MM-DD, booleans as Yes/No, filename `project-onboarding-YYYY-MM-DD.csv`.
- Sensitive values excluded: `api_key_encrypted` and any credential secrets are never exported; portal URL and delegated email are included only for admins.
- Export respects the currently applied search term and status filter, and is capped/paginated internally so it is not limited to the 1000-row default.

## Open choice

If you want a leaner sheet, the export can default to a "Summary" column set (identity + progress + key system specs) with a toggle for "All fields". Say which you prefer and I will set the default accordingly.
