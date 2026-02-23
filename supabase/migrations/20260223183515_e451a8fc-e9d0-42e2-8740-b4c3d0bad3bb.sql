
-- Create proposal_clients junction table for multi-client proposals
CREATE TABLE public.proposal_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  added_by uuid NOT NULL,
  invitation_token text,
  invitation_sent_at timestamp with time zone,
  invitation_viewed_at timestamp with time zone,
  invitation_expires_at timestamp with time zone,
  signed_at timestamp with time zone,
  UNIQUE(proposal_id, client_id)
);

-- Indexes for common queries
CREATE INDEX idx_proposal_clients_proposal_id ON public.proposal_clients(proposal_id);
CREATE INDEX idx_proposal_clients_client_id ON public.proposal_clients(client_id);
CREATE INDEX idx_proposal_clients_invitation_token ON public.proposal_clients(invitation_token) WHERE invitation_token IS NOT NULL;

-- Enable RLS
ALTER TABLE public.proposal_clients ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins, proposal's agent, agent's company members, the clients themselves
CREATE POLICY "Admins can view all proposal_clients"
  ON public.proposal_clients FOR SELECT
  USING (is_current_user_admin());

CREATE POLICY "Agents can view proposal_clients for their proposals"
  ON public.proposal_clients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_clients.proposal_id
    AND (p.agent_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM company_members cm1
        JOIN company_members cm2 ON cm1.company_id = cm2.company_id
        WHERE cm1.user_id = auth.uid() AND cm2.user_id = p.agent_id
        AND cm1.status = 'active' AND cm2.status = 'active'
      ))
  ));

CREATE POLICY "Clients can view own proposal_clients entries"
  ON public.proposal_clients FOR SELECT
  USING (
    client_id IN (SELECT c.id FROM clients c WHERE c.user_id = auth.uid())
  );

-- INSERT: Agent or agent's company members (only while proposal is editable)
CREATE POLICY "Agents can insert proposal_clients"
  ON public.proposal_clients FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_clients.proposal_id
      AND p.signed_at IS NULL
      AND p.status NOT IN ('approved', 'rejected', 'signed')
      AND (p.agent_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM company_members cm1
          JOIN company_members cm2 ON cm1.company_id = cm2.company_id
          WHERE cm1.user_id = auth.uid() AND cm2.user_id = p.agent_id
          AND cm1.status = 'active' AND cm2.status = 'active'
        )
        OR is_current_user_admin())
    )
  );

-- UPDATE: System/admin only (for invitation tracking)
CREATE POLICY "System can update proposal_clients"
  ON public.proposal_clients FOR UPDATE
  USING (is_current_user_admin() OR EXISTS (
    SELECT 1 FROM proposals p
    WHERE p.id = proposal_clients.proposal_id
    AND p.agent_id = auth.uid()
  ));

-- DELETE: Agent or admin (only while proposal is editable)
CREATE POLICY "Agents can delete proposal_clients"
  ON public.proposal_clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM proposals p
      WHERE p.id = proposal_clients.proposal_id
      AND p.signed_at IS NULL
      AND p.status NOT IN ('approved', 'rejected', 'signed')
      AND (p.agent_id = auth.uid()
        OR is_current_user_admin()
        OR EXISTS (
          SELECT 1 FROM company_members cm1
          JOIN company_members cm2 ON cm1.company_id = cm2.company_id
          WHERE cm1.user_id = auth.uid() AND cm2.user_id = p.agent_id
          AND cm1.status = 'active' AND cm2.status = 'active'
        ))
    )
  );
