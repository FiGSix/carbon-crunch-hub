
export async function fetchProposalData(supabaseClient: any, proposalId: string) {
  // Fetch comprehensive proposal data
  const { data: proposal, error: proposalError } = await supabaseClient
    .from('proposals')
    .select(`
      id, title, status, content, agent_id, client_id, client_reference_id,
      created_at, annual_energy, carbon_credits, client_share_percentage,
      agent_commission_percentage, project_info, eligibility_criteria
    `)
    .eq('id', proposalId)
    .single()

  if (proposalError || !proposal) {
    throw new Error('Proposal not found')
  }

  return proposal
}

export async function fetchAgentInfo(supabaseClient: any, agentId: string | null) {
  if (!agentId) {
    return null
  }

  const { data: agent } = await supabaseClient
    .from('profiles')
    .select('first_name, last_name, email, company_name, phone')
    .eq('id', agentId)
    .single()
  
  return agent
}
