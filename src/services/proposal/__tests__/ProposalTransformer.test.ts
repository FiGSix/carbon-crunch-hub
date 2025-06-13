
import { ProposalTransformer } from '../ProposalTransformer';

describe('ProposalTransformer', () => {
  describe('transformToProposalListItem', () => {
    const mockRawProposal = {
      id: 'proposal-123',
      title: 'Test Proposal',
      created_at: '2023-01-01T00:00:00Z',
      system_size_kwp: 100,
      status: 'draft',
      signed_at: null,
      archived_at: null,
      review_later_until: null,
      client_id: 'client-123',
      client_reference_id: null,
      agent_id: 'agent-123',
      annual_energy: 120000,
      carbon_credits: 50,
      client_share_percentage: 80,
      agent_commission_percentage: 10,
      invitation_sent_at: null,
      invitation_viewed_at: null,
      invitation_expires_at: null,
      content: {},
      client: {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com'
      },
      agent: {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com'
      }
    };

    it('should transform raw proposal data correctly', () => {
      const result = ProposalTransformer.transformToProposalListItem(mockRawProposal);

      expect(result).toMatchObject({
        id: 'proposal-123',
        name: 'Test Proposal',
        title: 'Test Proposal',
        client: 'John Doe',
        client_name: 'John Doe',
        client_email: 'john@example.com',
        agent: 'Jane Smith',
        agent_name: 'Jane Smith',
        date: '2023-01-01T00:00:00Z',
        created_at: '2023-01-01T00:00:00Z',
        size: 100,
        system_size_kwp: 100,
        status: 'draft',
        carbon_credits: 50,
        client_share_percentage: 80,
        agent_commission_percentage: 10
      });
    });

    it('should calculate revenue correctly', () => {
      const result = ProposalTransformer.transformToProposalListItem(mockRawProposal);
      
      // Revenue = carbon_credits * 25 * (client_share_percentage / 100)
      // Revenue = 50 * 25 * (80 / 100) = 1000
      expect(result.revenue).toBe(1000);
    });

    it('should handle missing client names gracefully', () => {
      const proposalWithoutClient = {
        ...mockRawProposal,
        client: null,
        client_contact: null
      };

      const result = ProposalTransformer.transformToProposalListItem(proposalWithoutClient);

      expect(result.client).toBe('Unknown Client');
      expect(result.client_name).toBe('Unknown Client');
      expect(result.client_email).toBe('No email');
    });

    it('should handle missing agent names gracefully', () => {
      const proposalWithoutAgent = {
        ...mockRawProposal,
        agent: null
      };

      const result = ProposalTransformer.transformToProposalListItem(proposalWithoutAgent);

      expect(result.agent).toBe('Unknown Agent');
      expect(result.agent_name).toBe('Unknown Agent');
    });

    it('should handle missing financial data gracefully', () => {
      const proposalWithoutFinancials = {
        ...mockRawProposal,
        carbon_credits: null,
        client_share_percentage: null
      };

      const result = ProposalTransformer.transformToProposalListItem(proposalWithoutFinancials);

      expect(result.revenue).toBe(0);
      expect(result.carbon_credits).toBeNull();
      expect(result.client_share_percentage).toBeNull();
    });

    it('should use client_contact when client is not available', () => {
      const proposalWithClientContact = {
        ...mockRawProposal,
        client: null,
        client_contact: {
          first_name: 'Bob',
          last_name: 'Johnson',
          email: 'bob@example.com'
        }
      };

      const result = ProposalTransformer.transformToProposalListItem(proposalWithClientContact);

      expect(result.client).toBe('Bob Johnson');
      expect(result.client_name).toBe('Bob Johnson');
      expect(result.client_email).toBe('bob@example.com');
    });

    it('should generate default title when missing', () => {
      const proposalWithoutTitle = {
        ...mockRawProposal,
        title: null
      };

      const result = ProposalTransformer.transformToProposalListItem(proposalWithoutTitle);

      expect(result.name).toBe('Project proposal-123');
      expect(result.title).toBe('Project proposal-123');
    });
  });

  describe('transformBatch', () => {
    it('should transform multiple proposals', () => {
      const rawProposals = [
        { id: '1', title: 'Proposal 1', status: 'draft' },
        { id: '2', title: 'Proposal 2', status: 'submitted' }
      ];

      const result = ProposalTransformer.transformBatch(rawProposals);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should handle empty array', () => {
      const result = ProposalTransformer.transformBatch([]);
      expect(result).toEqual([]);
    });
  });
});
