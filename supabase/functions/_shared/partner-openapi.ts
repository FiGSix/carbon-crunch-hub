/**
 * Partner API OpenAPI 3.0 Specification
 * Auto-generated documentation for the Crunch Carbon Partner API v1
 */

export const OPENAPI_SPEC = {
  openapi: '3.0.3',
  info: {
    title: 'Crunch Carbon Partner API',
    description: `
# Crunch Carbon Partner API

RESTful API for third-party platform integration with Crunch Carbon's carbon credit marketplace.

## Authentication

All API requests require Bearer token authentication:

\`\`\`
Authorization: Bearer cc_live_your_api_key_here
\`\`\`

API keys are prefixed with \`cc_live_\` for production or \`cc_test_\` for sandbox environments.

## Rate Limiting

- **Burst**: 100 requests/minute
- **Daily**: 10,000 requests/day

Rate limit headers are included in all responses:
- \`X-RateLimit-Limit\`: Maximum requests per minute
- \`X-RateLimit-Remaining\`: Requests remaining in current window
- \`X-RateLimit-Reset\`: Unix timestamp when limit resets

## Idempotency

POST requests support idempotency via the \`X-Idempotency-Key\` header. 
Provide a unique key (UUID recommended) to safely retry requests without duplicating resources.

## Webhooks

Subscribe to real-time events for proposal and project lifecycle changes.
All webhook payloads are signed with HMAC-SHA256 for verification.

## Support

Contact: partners@crunchcarbon.com
    `,
    version: '1.0.0',
    contact: {
      name: 'Crunch Carbon Partner Support',
      email: 'partners@crunchcarbon.com',
      url: 'https://crunchcarbon.com/partners',
    },
    license: {
      name: 'Proprietary',
      url: 'https://crunchcarbon.com/terms',
    },
  },
  servers: [
    {
      url: 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/partner-api/v1',
      description: 'Production',
    },
  ],
  tags: [
    { name: 'Health', description: 'API health and status' },
    { name: 'Proposals', description: 'Carbon credit proposal management' },
    { name: 'Projects', description: 'Project onboarding and management' },
    { name: 'Documents', description: 'Document upload and management' },
    { name: 'Data Access', description: 'Monitoring system configuration' },
    { name: 'Clients', description: 'Client portfolio information' },
    { name: 'Webhooks', description: 'Event subscription management' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Returns API health status and version. No authentication required.',
        operationId: 'getHealth',
        security: [],
        responses: {
          '200': {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    status: { type: 'string', example: 'ok' },
                    version: { type: 'string', example: 'v1' },
                    timestamp: { type: 'string', format: 'date-time' },
                    database: { type: 'string', example: 'connected' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/proposals': {
      post: {
        tags: ['Proposals'],
        summary: 'Create proposal',
        description: 'Create a new carbon credit proposal for a solar installation.',
        operationId: 'createProposal',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'X-Idempotency-Key',
            in: 'header',
            description: 'Unique key for idempotent request (UUID recommended)',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateProposalRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Proposal created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateProposalResponse' },
              },
            },
          },
          '400': { $ref: '#/components/responses/ValidationError' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { $ref: '#/components/responses/Conflict' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
      get: {
        tags: ['Proposals'],
        summary: 'List proposals',
        description: 'List all proposals created by this partner.',
        operationId: 'listProposals',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string' }, description: 'Filter by status' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 }, description: 'Results per page' },
          { name: 'cursor', in: 'query', schema: { type: 'string' }, description: 'Pagination cursor' },
        ],
        responses: {
          '200': {
            description: 'List of proposals',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProposalListResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '429': { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/proposals/{proposalId}': {
      get: {
        tags: ['Proposals'],
        summary: 'Get proposal',
        description: 'Retrieve a specific proposal by ID.',
        operationId: 'getProposal',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'proposalId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Proposal details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProposalResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/proposals/{proposalId}/send-acceptance-link': {
      post: {
        tags: ['Proposals'],
        summary: 'Send acceptance link',
        description: 'Send or resend the proposal acceptance email to the client.',
        operationId: 'sendAcceptanceLink',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'proposalId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  redirect_url: { type: 'string', format: 'uri' },
                  expires_in_days: { type: 'integer', minimum: 1, maximum: 30, default: 10 },
                  resend: { type: 'boolean', default: false },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Acceptance link sent',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SendAcceptanceLinkResponse' },
              },
            },
          },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '404': { $ref: '#/components/responses/NotFound' },
          '409': { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/projects': {
      get: {
        tags: ['Projects'],
        summary: 'List projects',
        description: 'List all projects (signed proposals) for this partner.',
        operationId: 'listProjects',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['onboarding', 'submitted', 'validated', 'audit_ready'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'cursor', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'List of projects',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectListResponse' },
              },
            },
          },
        },
      },
    },
    '/projects/{projectId}': {
      get: {
        tags: ['Projects'],
        summary: 'Get project',
        description: 'Retrieve project details including onboarding status.',
        operationId: 'getProject',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Project details',
            headers: {
              ETag: { description: 'Version tag for optimistic concurrency', schema: { type: 'string' } },
            },
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ProjectResponse' },
              },
            },
          },
        },
      },
    },
    '/projects/{projectId}/onboarding': {
      patch: {
        tags: ['Projects'],
        summary: 'Update onboarding',
        description: 'Update project onboarding fields. Supports partial updates.',
        operationId: 'updateOnboarding',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          { name: 'If-Match', in: 'header', description: 'ETag for optimistic concurrency', schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateOnboardingRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Onboarding updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/UpdateOnboardingResponse' },
              },
            },
          },
          '412': { $ref: '#/components/responses/PreconditionFailed' },
        },
      },
    },
    '/projects/{projectId}/data-access': {
      post: {
        tags: ['Data Access'],
        summary: 'Configure data access',
        description: 'Configure monitoring system credentials for energy data access.',
        operationId: 'configureDataAccess',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'projectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ConfigureDataAccessRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Data access configured',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ConfigureDataAccessResponse' },
              },
            },
          },
        },
      },
    },
    '/webhooks': {
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        description: 'Register a new webhook subscription.',
        operationId: 'createWebhook',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWebhookRequest' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateWebhookResponse' },
              },
            },
          },
        },
      },
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        description: 'List all webhook subscriptions.',
        operationId: 'listWebhooks',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'List of webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    webhooks: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WebhookSummary' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/webhooks/{webhookId}': {
      get: {
        tags: ['Webhooks'],
        summary: 'Get webhook',
        operationId: 'getWebhook',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'webhookId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Webhook details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookDetails' },
              },
            },
          },
        },
      },
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook',
        operationId: 'deleteWebhook',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'webhookId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '204': { description: 'Webhook deleted' },
        },
      },
    },
    '/webhooks/{webhookId}/verify': {
      post: {
        tags: ['Webhooks'],
        summary: 'Verify webhook',
        description: 'Trigger verification handshake for webhook endpoint.',
        operationId: 'verifyWebhook',
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: 'webhookId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Verification result',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    verified: { type: 'boolean' },
                    webhook_id: { type: 'string', format: 'uuid' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'API key with cc_live_ or cc_test_ prefix',
      },
    },
    schemas: {
      CreateProposalRequest: {
        type: 'object',
        required: ['client', 'project', 'consent'],
        properties: {
          partner_reference_id: { type: 'string', maxLength: 255 },
          client: {
            type: 'object',
            required: ['first_name', 'last_name', 'email'],
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              email: { type: 'string', format: 'email' },
              phone: { type: 'string' },
              company_name: { type: 'string' },
            },
          },
          project: {
            type: 'object',
            required: ['address', 'country', 'system_size_kwp', 'commissioning_date'],
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              country: { type: 'string', enum: ['ZA'] },
              gps_lat: { type: 'number' },
              gps_lng: { type: 'number' },
              system_size_kwp: { type: 'number', minimum: 0.1, maximum: 15000 },
              commissioning_date: { type: 'string', format: 'date' },
              installer_company: { type: 'string' },
              installer_email: { type: 'string', format: 'email' },
            },
          },
          consent: {
            type: 'object',
            required: ['obtained', 'source'],
            properties: {
              obtained: { type: 'boolean', enum: [true] },
              source: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
            },
          },
          send_email: { type: 'boolean', default: false },
        },
      },
      CreateProposalResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          proposal_id: { type: 'string', format: 'uuid' },
          client_id: { type: 'string', format: 'uuid' },
          partner_reference_id: { type: 'string' },
          estimates: {
            type: 'object',
            properties: {
              credits_per_year: { type: 'number' },
              revenue_6yr_total: { type: 'number' },
              client_share_percentage: { type: 'integer' },
            },
          },
          acceptance_url: { type: 'string', format: 'uri' },
          expires_at: { type: 'string', format: 'date-time' },
          email_sent: { type: 'boolean' },
        },
      },
      ProposalListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          proposals: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProposalSummary' },
          },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
      },
      ProposalSummary: {
        type: 'object',
        properties: {
          proposal_id: { type: 'string', format: 'uuid' },
          partner_reference_id: { type: 'string' },
          client_email: { type: 'string' },
          status: { type: 'string' },
          created_at: { type: 'string', format: 'date-time' },
          signed_at: { type: 'string', format: 'date-time' },
          project_id: { type: 'string', format: 'uuid' },
        },
      },
      ProposalResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          proposal_id: { type: 'string', format: 'uuid' },
          partner_reference_id: { type: 'string' },
          status: { type: 'string' },
          client: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              first_name: { type: 'string' },
              last_name: { type: 'string' },
            },
          },
          project: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              address: { type: 'string' },
              system_size_kwp: { type: 'number' },
            },
          },
          estimates: { type: 'object' },
          created_at: { type: 'string', format: 'date-time' },
          signed_at: { type: 'string', format: 'date-time' },
          project_id: { type: 'string', format: 'uuid' },
        },
      },
      SendAcceptanceLinkResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          proposal_id: { type: 'string', format: 'uuid' },
          acceptance_url: { type: 'string', format: 'uri' },
          expires_at: { type: 'string', format: 'date-time' },
          email_sent: { type: 'boolean' },
          email_queued_at: { type: 'string', format: 'date-time' },
        },
      },
      ProjectListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          projects: {
            type: 'array',
            items: { $ref: '#/components/schemas/ProjectSummary' },
          },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
      },
      ProjectSummary: {
        type: 'object',
        properties: {
          project_id: { type: 'string', format: 'uuid' },
          proposal_id: { type: 'string', format: 'uuid' },
          partner_reference_id: { type: 'string' },
          title: { type: 'string' },
          client_email: { type: 'string' },
          system_size_kwp: { type: 'number' },
          status: { $ref: '#/components/schemas/ProjectStatus' },
        },
      },
      ProjectResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          project_id: { type: 'string', format: 'uuid' },
          proposal_id: { type: 'string', format: 'uuid' },
          version: { type: 'integer' },
          status: { $ref: '#/components/schemas/ProjectStatus' },
          completion: { $ref: '#/components/schemas/ProjectCompletion' },
          documents: { $ref: '#/components/schemas/ProjectDocuments' },
          data_access: { $ref: '#/components/schemas/ProjectDataAccess' },
        },
      },
      ProjectStatus: {
        type: 'object',
        properties: {
          onboarding_complete: { type: 'boolean' },
          submitted_for_review: { type: 'boolean' },
          admin_validated: { type: 'boolean' },
          audit_ready: { type: 'boolean' },
        },
      },
      ProjectCompletion: {
        type: 'object',
        properties: {
          fields_complete: { type: 'integer' },
          fields_required: { type: 'integer' },
          percentage: { type: 'number' },
          missing_fields: { type: 'array', items: { type: 'string' } },
        },
      },
      ProjectDocuments: {
        type: 'object',
        properties: {
          coc_uploaded: { type: 'boolean' },
          invoice_uploaded: { type: 'boolean' },
        },
      },
      ProjectDataAccess: {
        type: 'object',
        properties: {
          configured: { type: 'boolean' },
          provider: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'verified', 'failed'] },
        },
      },
      UpdateOnboardingRequest: {
        type: 'object',
        properties: {
          system: {
            type: 'object',
            properties: {
              inverter_brand: { type: 'string' },
              inverter_model: { type: 'string' },
              inverter_serial: { type: 'string' },
              inverter_capacity_kw: { type: 'number' },
              inverter_quantity: { type: 'integer' },
              panel_brand: { type: 'string' },
              panel_quantity: { type: 'integer' },
              panel_size_wp: { type: 'integer' },
              has_battery: { type: 'boolean' },
              battery_brand: { type: 'string' },
              battery_capacity_kwh: { type: 'number' },
            },
          },
          installation: {
            type: 'object',
            properties: {
              commissioning_date: { type: 'string', format: 'date' },
              total_capex: { type: 'number' },
              ownership_type: { type: 'string', enum: ['owned', 'ppa', 'lease'] },
            },
          },
          installer: {
            type: 'object',
            properties: {
              company_name: { type: 'string' },
              email: { type: 'string', format: 'email' },
            },
          },
          location: {
            type: 'object',
            properties: {
              address: { type: 'string' },
              gps_lat: { type: 'number' },
              gps_lng: { type: 'number' },
            },
          },
        },
      },
      UpdateOnboardingResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          project_id: { type: 'string', format: 'uuid' },
          version: { type: 'integer' },
          completion: { $ref: '#/components/schemas/ProjectCompletion' },
          updated_fields: { type: 'array', items: { type: 'string' } },
          skipped_fields: { type: 'array', items: { type: 'string' } },
        },
      },
      ConfigureDataAccessRequest: {
        type: 'object',
        required: ['provider', 'credential_method'],
        properties: {
          provider: { type: 'string', enum: ['SolarEdge', 'Huawei', 'Growatt', 'Sungrow', 'Fronius', 'Enphase', 'Other'] },
          credential_method: { type: 'string', enum: ['delegated_access', 'api_key'] },
          site_id: { type: 'string' },
          portal_url: { type: 'string', format: 'uri' },
          delegated_access: {
            type: 'object',
            properties: {
              granted_by_email: { type: 'string', format: 'email' },
              granted_by_role: { type: 'string', enum: ['owner', 'installer', 'oem_support'] },
            },
          },
          api_key: { type: 'string' },
        },
      },
      ConfigureDataAccessResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data_access_id: { type: 'string', format: 'uuid' },
          provider: { type: 'string' },
          status: { type: 'string', enum: ['pending_verification'] },
          next_steps: {
            type: 'object',
            properties: {
              delegated_email: { type: 'string', format: 'email' },
              instructions: { type: 'string' },
              instructions_url: { type: 'string', format: 'uri' },
            },
          },
          instructions_sent: { type: 'boolean' },
        },
      },
      CreateWebhookRequest: {
        type: 'object',
        required: ['url', 'events'],
        properties: {
          url: { type: 'string', format: 'uri', description: 'HTTPS endpoint to receive webhooks' },
          events: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'proposal.created',
                'proposal.viewed',
                'proposal.signed',
                'proposal.rejected',
                'proposal.expired',
                'project.onboarding_complete',
                'project.audit_ready',
                'data_access.verified',
              ],
            },
          },
        },
      },
      CreateWebhookResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          webhook_id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          secret: { type: 'string', description: 'HMAC signing secret (shown only once)' },
          verification_pending: { type: 'boolean' },
        },
      },
      WebhookSummary: {
        type: 'object',
        properties: {
          webhook_id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } },
          is_active: { type: 'boolean' },
          is_verified: { type: 'boolean' },
          consecutive_failures: { type: 'integer' },
          last_triggered_at: { type: 'string', format: 'date-time' },
        },
      },
      WebhookDetails: {
        allOf: [
          { $ref: '#/components/schemas/WebhookSummary' },
          {
            type: 'object',
            properties: {
              created_at: { type: 'string', format: 'date-time' },
              verified_at: { type: 'string', format: 'date-time' },
              disabled_at: { type: 'string', format: 'date-time' },
              disabled_reason: { type: 'string' },
            },
          },
        ],
      },
      Pagination: {
        type: 'object',
        properties: {
          has_more: { type: 'boolean' },
          next_cursor: { type: 'string' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              field: { type: 'string' },
              received: {},
            },
          },
          request_id: { type: 'string' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Invalid or missing authentication',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
            example: {
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Invalid API key' },
              request_id: 'req_abc123',
            },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      ValidationError: {
        description: 'Invalid request data',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Conflict: {
        description: 'Resource conflict (e.g., duplicate)',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      PreconditionFailed: {
        description: 'Optimistic concurrency conflict',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      RateLimited: {
        description: 'Too many requests',
        headers: {
          'Retry-After': { description: 'Seconds to wait before retrying', schema: { type: 'integer' } },
          'X-RateLimit-Limit': { schema: { type: 'integer' } },
          'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          'X-RateLimit-Reset': { schema: { type: 'integer' } },
        },
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
  security: [{ BearerAuth: [] }],
};

// SDK code examples
export const SDK_EXAMPLES = {
  javascript: `// Crunch Carbon Partner API - JavaScript/TypeScript SDK Example

const PARTNER_API_URL = 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/partner-api/v1';
const API_KEY = 'cc_live_your_api_key_here';

// Helper function for API calls
async function apiRequest(method, endpoint, body = null) {
  const response = await fetch(\`\${PARTNER_API_URL}\${endpoint}\`, {
    method,
    headers: {
      'Authorization': \`Bearer \${API_KEY}\`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': crypto.randomUUID(), // For POST requests
    },
    body: body ? JSON.stringify(body) : null,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(\`API Error: \${error.error?.message || response.statusText}\`);
  }
  
  return response.json();
}

// Create a proposal
async function createProposal() {
  return apiRequest('POST', '/proposals', {
    partner_reference_id: 'your-internal-id-123',
    client: {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+27821234567',
      company_name: 'Doe Solar Ltd',
    },
    project: {
      name: 'Cape Town Office',
      address: '123 Main Street, Cape Town, South Africa',
      country: 'ZA',
      system_size_kwp: 50,
      commissioning_date: '2025-01-15',
      installer_company: 'SunPower SA',
    },
    consent: {
      obtained: true,
      source: 'Partner Portal Registration Form',
      timestamp: new Date().toISOString(),
    },
    send_email: true,
  });
}

// List proposals
async function listProposals(status = null) {
  const query = status ? \`?status=\${status}\` : '';
  return apiRequest('GET', \`/proposals\${query}\`);
}

// Update project onboarding
async function updateOnboarding(projectId, data) {
  return apiRequest('PATCH', \`/projects/\${projectId}/onboarding\`, data);
}

// Configure monitoring access
async function configureDataAccess(projectId) {
  return apiRequest('POST', \`/projects/\${projectId}/data-access\`, {
    provider: 'SolarEdge',
    credential_method: 'delegated_access',
    site_id: 'site-123',
    portal_url: 'https://monitoring.solaredge.com/sites/site-123',
    delegated_access: {
      granted_by_email: 'installer@example.com',
      granted_by_role: 'installer',
    },
  });
}

// Webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
  const [prefix, timestamp, hash] = signature.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    acc[key] = value;
    return acc;
  }, {});
  
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expectedHash = crypto.createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return hash === expectedHash;
}

// Usage
(async () => {
  try {
    const proposal = await createProposal();
    console.log('Created proposal:', proposal.proposal_id);
    
    const proposals = await listProposals('signed');
    console.log('Signed proposals:', proposals.proposals.length);
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
`,

  python: `# Crunch Carbon Partner API - Python SDK Example

import requests
import hmac
import hashlib
import uuid
from datetime import datetime

PARTNER_API_URL = 'https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/partner-api/v1'
API_KEY = 'cc_live_your_api_key_here'


def api_request(method: str, endpoint: str, body: dict = None) -> dict:
    """Make an authenticated API request."""
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json',
        'X-Idempotency-Key': str(uuid.uuid4()),
    }
    
    response = requests.request(
        method,
        f'{PARTNER_API_URL}{endpoint}',
        headers=headers,
        json=body,
    )
    
    response.raise_for_status()
    return response.json()


def create_proposal(
    client_email: str,
    client_first_name: str,
    client_last_name: str,
    address: str,
    system_size_kwp: float,
    commissioning_date: str,
    partner_reference_id: str = None,
) -> dict:
    """Create a new carbon credit proposal."""
    return api_request('POST', '/proposals', {
        'partner_reference_id': partner_reference_id or str(uuid.uuid4()),
        'client': {
            'first_name': client_first_name,
            'last_name': client_last_name,
            'email': client_email,
        },
        'project': {
            'address': address,
            'country': 'ZA',
            'system_size_kwp': system_size_kwp,
            'commissioning_date': commissioning_date,
        },
        'consent': {
            'obtained': True,
            'source': 'Partner API Integration',
            'timestamp': datetime.utcnow().isoformat() + 'Z',
        },
        'send_email': True,
    })


def list_proposals(status: str = None, limit: int = 50) -> dict:
    """List proposals with optional filtering."""
    params = []
    if status:
        params.append(f'status={status}')
    if limit:
        params.append(f'limit={limit}')
    query = '?' + '&'.join(params) if params else ''
    return api_request('GET', f'/proposals{query}')


def get_project(project_id: str) -> dict:
    """Get project details including onboarding status."""
    return api_request('GET', f'/projects/{project_id}')


def update_onboarding(project_id: str, data: dict) -> dict:
    """Update project onboarding fields."""
    return api_request('PATCH', f'/projects/{project_id}/onboarding', data)


def configure_data_access(
    project_id: str,
    provider: str,
    site_id: str,
    granted_by_email: str = None,
) -> dict:
    """Configure monitoring system access."""
    return api_request('POST', f'/projects/{project_id}/data-access', {
        'provider': provider,
        'credential_method': 'delegated_access',
        'site_id': site_id,
        'delegated_access': {
            'granted_by_email': granted_by_email,
            'granted_by_role': 'installer',
        },
    })


def verify_webhook_signature(payload: bytes, signature: str, secret: str) -> bool:
    """Verify webhook HMAC-SHA256 signature."""
    parts = dict(p.split('=') for p in signature.split(','))
    timestamp = parts.get('t')
    hash_value = parts.get('v1')
    
    signed_payload = f'{timestamp}.{payload.decode()}'
    expected_hash = hmac.new(
        secret.encode(),
        signed_payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(hash_value, expected_hash)


# Example usage
if __name__ == '__main__':
    # Create a proposal
    result = create_proposal(
        client_email='john.doe@example.com',
        client_first_name='John',
        client_last_name='Doe',
        address='123 Main Street, Cape Town, South Africa',
        system_size_kwp=100,
        commissioning_date='2025-06-01',
    )
    print(f"Created proposal: {result['proposal_id']}")
    print(f"Estimated credits: {result['estimates']['credits_per_year']} tCO₂e/year")
    
    # List signed proposals
    proposals = list_proposals(status='signed')
    print(f"Signed proposals: {len(proposals['proposals'])}")
`,

  curl: `# Crunch Carbon Partner API - cURL Examples

# Set your API key
API_KEY="cc_live_your_api_key_here"
BASE_URL="https://uyjryuopuqgmsvayiccl.supabase.co/functions/v1/partner-api/v1"

# Health check (no auth required)
curl -X GET "$BASE_URL/health"

# Create a proposal
curl -X POST "$BASE_URL/proposals" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -H "X-Idempotency-Key: $(uuidgen)" \\
  -d '{
    "partner_reference_id": "my-ref-001",
    "client": {
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com"
    },
    "project": {
      "address": "123 Main Street, Cape Town, South Africa",
      "country": "ZA",
      "system_size_kwp": 50,
      "commissioning_date": "2025-01-15"
    },
    "consent": {
      "obtained": true,
      "source": "API Integration"
    },
    "send_email": true
  }'

# List proposals
curl -X GET "$BASE_URL/proposals?status=signed&limit=10" \\
  -H "Authorization: Bearer $API_KEY"

# Get proposal by ID
curl -X GET "$BASE_URL/proposals/PROPOSAL_ID" \\
  -H "Authorization: Bearer $API_KEY"

# Lookup proposal by reference
curl -X GET "$BASE_URL/proposals/lookup?partner_reference_id=my-ref-001" \\
  -H "Authorization: Bearer $API_KEY"

# Update project onboarding
curl -X PATCH "$BASE_URL/projects/PROJECT_ID/onboarding" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "system": {
      "inverter_brand": "SolarEdge",
      "inverter_model": "SE10K",
      "inverter_capacity_kw": 10,
      "panel_brand": "JA Solar",
      "panel_quantity": 20,
      "panel_size_wp": 500
    },
    "installation": {
      "commissioning_date": "2025-01-15",
      "ownership_type": "owned"
    }
  }'

# Configure data access
curl -X POST "$BASE_URL/projects/PROJECT_ID/data-access" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "SolarEdge",
    "credential_method": "delegated_access",
    "site_id": "site-123",
    "delegated_access": {
      "granted_by_email": "installer@example.com",
      "granted_by_role": "installer"
    }
  }'

# Create webhook
curl -X POST "$BASE_URL/webhooks" \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://your-server.com/webhooks/crunchcarbon",
    "events": ["proposal.signed", "project.onboarding_complete"]
  }'

# List webhooks
curl -X GET "$BASE_URL/webhooks" \\
  -H "Authorization: Bearer $API_KEY"
`,
};
