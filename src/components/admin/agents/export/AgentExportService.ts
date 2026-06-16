import { supabase } from '@/integrations/supabase/client';
import { AgentData } from '../types';

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeFields: string[];
  statusFilter?: string;
  searchTerm?: string;
  accessLevelFilter?: string;
  commissionFilter?: string;
  onboardingFilter?: string;
  joinDateFilter?: { from?: Date; to?: Date } | null;
}

class AgentExportService {
  async fetchAllAgents(filters: Partial<ExportOptions>): Promise<AgentData[]> {
    const { data, error } = await supabase.rpc('get_agents_management_data', {
      status_filter: filters.statusFilter === 'all' ? null : filters.statusFilter,
      search_term: filters.searchTerm || null,
      limit_param: 10000, // Large limit to get all data
      offset_param: 0
    });

    if (error) throw error;
    
    let filteredData = data as AgentData[];

    // Apply additional filters
    if (filters.accessLevelFilter && filters.accessLevelFilter !== 'all') {
      filteredData = filteredData.filter(agent => agent.access_level === filters.accessLevelFilter);
    }

    if (filters.commissionFilter && filters.commissionFilter !== 'all') {
      if (filters.commissionFilter === 'default') {
        filteredData = filteredData.filter(agent => !agent.commission_override);
      } else if (filters.commissionFilter === 'override') {
        filteredData = filteredData.filter(agent => agent.commission_override);
      }
    }

    if (filters.onboardingFilter && filters.onboardingFilter !== 'all') {
      if (filters.onboardingFilter === 'completed') {
        filteredData = filteredData.filter(agent => agent.onboarding_completed);
      } else if (filters.onboardingFilter === 'pending') {
        filteredData = filteredData.filter(agent => !agent.onboarding_completed);
      }
    }

    if (filters.joinDateFilter?.from || filters.joinDateFilter?.to) {
      filteredData = filteredData.filter(agent => {
        if (!agent.join_date) return false;
        const joinDate = new Date(agent.join_date);
        
        if (filters.joinDateFilter?.from && joinDate < filters.joinDateFilter.from) {
          return false;
        }
        if (filters.joinDateFilter?.to && joinDate > filters.joinDateFilter.to) {
          return false;
        }
        return true;
      });
    }

    return filteredData;
  }

  async exportToCSV(options: ExportOptions): Promise<void> {
    const agents = await this.fetchAllAgents(options);
    
    const fieldMapping: Record<string, keyof AgentData> = {
      'name': 'agent_name',
      'email': 'agent_email',
      'company': 'company_name',
      'status': 'agent_status',
      'accessLevel': 'access_level',
      'commission': 'commission_override',
      'lastActive': 'last_active_at',
      'totalProposals': 'total_proposals',
      'activeProposals': 'active_proposals',
      'signedProposals': 'signed_proposals',
      'totalCommission': 'total_commission',
      'joinDate': 'join_date',
      'onboarding': 'onboarding_completed'
    };

    const headers = options.includeFields.map(field => {
      const headerNames: Record<string, string> = {
        'name': 'Name',
        'email': 'Email',
        'company': 'Company',
        'status': 'Status',
        'accessLevel': 'Access Level',
        'commission': 'Commission Override (%)',
        'lastActive': 'Last Active',
        'totalProposals': 'Total Proposals',
        'activeProposals': 'Active Proposals',
        'signedProposals': 'Signed Proposals',
        'totalCommission': 'Total Commission ($)',
        'joinDate': 'Join Date',
        'onboarding': 'Onboarding Completed'
      };
      return headerNames[field] || field;
    });

    const csvContent = [
      headers.join(','),
      ...agents.map(agent => 
        options.includeFields.map(field => {
          const value = agent[fieldMapping[field]];
          if (value === null || value === undefined) return '';
          
          // Format specific fields
          if (field === 'commission') {
            return value ? value.toString() : 'Default';
          }
          if (field === 'totalCommission') {
            return typeof value === 'number' ? value.toFixed(2) : '0.00';
          }
          if (field === 'onboarding') {
            return value ? 'Yes' : 'No';
          }
          if (field === 'lastActive' || field === 'joinDate') {
            return value ? new Date(value as string).toLocaleDateString() : 'Never';
          }
          
          // Escape commas and quotes in CSV
          const strValue = value.toString();
          if (strValue.includes(',') || strValue.includes('"')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        }).join(',')
      )
    ].join('\n');

    this.downloadFile(csvContent, `agents-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
  }

  private downloadFile(content: string, filename: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const agentExportService = new AgentExportService();