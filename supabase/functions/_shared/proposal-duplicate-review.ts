type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: any; error: any }> };

export async function queueDuplicateReview(client: RpcClient, input: {
  agentId: string;
  clientId: string;
  title: string;
  address?: string | null;
  systemSizeKwp?: number | null;
  commissioningDate?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  payload?: Record<string, unknown>;
}) {
  const { data, error } = await client.rpc('queue_proposal_duplicate_review', {
    p_agent_id: input.agentId,
    p_client_id: input.clientId,
    p_title: input.title,
    p_address: input.address ?? null,
    p_system_size_kwp: input.systemSizeKwp ?? null,
    p_commissioning_date: input.commissioningDate || null,
    p_latitude: input.latitude ?? null,
    p_longitude: input.longitude ?? null,
    p_payload: input.payload ?? {},
  });
  if (error) throw new Error(`Duplicate validation failed: ${error.message}`);
  return (data ?? { blocked: false }) as { blocked: boolean; review_id?: string; approved_review_id?: string };
}
