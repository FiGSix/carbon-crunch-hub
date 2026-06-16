
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProposalData, ClientInformation, ProjectInformation, AdditionalClient } from '@/types/proposals';
import { calculateAnnualEnergy, calculateCarbonCredits } from '@/services/calculations/carbon/calculations';
import { toast } from 'sonner';

export interface PhaseFormData {
  phaseName: string;
  sizeKWp: string;
  commissionDate: string;
}

export interface ProposalEditFormData {
  // Client info
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientCompanyName: string;
  primaryClientId: string | null;
  // Additional clients
  additionalClients: AdditionalClient[];
  // Project info
  projectName: string;
  projectAddress: string;
  systemSize: string;
  commissionDate: string;
  additionalNotes: string;
  // Multi-phase
  phases: PhaseFormData[];
  isMultiPhase: boolean;
}

function extractPhases(projectInfo: any): PhaseFormData[] {
  const phases = projectInfo?.phases;
  if (!Array.isArray(phases) || phases.length <= 1) return [];
  return phases.map((p: any, i: number) => ({
    phaseName: p.phaseName || p.name || `Phase ${i + 1}`,
    sizeKWp: p.sizeKWp != null ? String(p.sizeKWp) : '',
    commissionDate: p.commissionDate || '',
  }));
}

function extractFormData(proposal: ProposalData): ProposalEditFormData {
  const snapshotClientInfo = proposal.content?.clientInfo || {} as ClientInformation;
  const projectInfo = proposal.content?.projectInfo || {} as ProjectInformation;
  const phases = extractPhases(projectInfo);
  const isMultiPhase = phases.length > 1;
  const liveClient = proposal.client;

  // Prioritize live client data (from client_reference_id join) over snapshot
  let clientName = snapshotClientInfo.name
    || [(snapshotClientInfo as any).firstName, (snapshotClientInfo as any).lastName]
        .filter((n: any) => n && n !== 'null')
        .join(' ')
    || '';
  let clientEmail = snapshotClientInfo.email || '';
  let clientPhone = snapshotClientInfo.phone || '';
  let clientCompanyName = snapshotClientInfo.companyName || '';

  if (liveClient && proposal.client_reference_id) {
    const liveName = [liveClient.first_name, liveClient.last_name].filter(Boolean).join(' ').trim();
    if (liveName) clientName = liveName;
    if (liveClient.email) clientEmail = liveClient.email;
    if (liveClient.phone) clientPhone = liveClient.phone;
    if (liveClient.company_name) clientCompanyName = liveClient.company_name;
  }

  return {
    clientName,
    clientEmail,
    clientPhone,
    clientCompanyName,
    primaryClientId: proposal.client_reference_id || null,
    additionalClients: (proposal.content?.additionalClients || []).map(c => ({ ...c })),
    projectName: projectInfo.name || '',
    projectAddress: projectInfo.address || '',
    systemSize: String(
      projectInfo.size
      || (projectInfo as any).totalSystemSize
      || proposal.system_size_kwp
      || ''
    ),
    commissionDate: projectInfo.commissionDate || '',
    additionalNotes: projectInfo.additionalNotes || '',
    phases,
    isMultiPhase,
  };
}

interface ValidationErrors {
  [key: string]: string;
}

function validate(data: ProposalEditFormData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!data.clientName.trim()) errors.clientName = 'Client name is required';
  if (!data.clientEmail.trim()) {
    errors.clientEmail = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.clientEmail)) {
    errors.clientEmail = 'Invalid email format';
  }
  if (!data.projectName.trim()) errors.projectName = 'Project name is required';

  // Validate additional clients
  data.additionalClients.forEach((client, i) => {
    if (!client.name.trim()) errors[`addClient_${i}_name`] = 'Name is required';
    if (!client.email.trim()) {
      errors[`addClient_${i}_email`] = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) {
      errors[`addClient_${i}_email`] = 'Invalid email format';
    }
  });

  if (data.isMultiPhase) {
    data.phases.forEach((phase, i) => {
      if (!phase.sizeKWp.trim()) {
        errors[`phase_${i}_size`] = `${phase.phaseName} size is required`;
      } else if (parseFloat(phase.sizeKWp) <= 0 || isNaN(parseFloat(phase.sizeKWp))) {
        errors[`phase_${i}_size`] = `${phase.phaseName} size must be a positive number`;
      }
    });
  } else {
    const sizeStr = String(data.systemSize || '');
    if (!sizeStr.trim()) {
      errors.systemSize = 'System size is required';
    } else if (parseFloat(sizeStr) <= 0 || isNaN(parseFloat(sizeStr))) {
      errors.systemSize = 'System size must be a positive number';
    }
  }
  return errors;
}
async function syncAdditionalClientsJunction(proposalId: string, additionalClients: AdditionalClient[]) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete existing non-primary proposal_clients rows
    // We keep the primary client (from proposals.client_reference_id) and replace additional ones
    await supabase
      .from('proposal_clients')
      .delete()
      .eq('proposal_id', proposalId);

    if (additionalClients.length === 0) return;

    // Resolve or create client records for each additional client
    const rows = [];
    for (const client of additionalClients) {
      let clientId = client.clientId;

      if (!clientId) {
        // Search by email first
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('email', client.email.trim())
          .maybeSingle();

        if (existing) {
          clientId = existing.id;
        } else {
          // Create new client record
          const nameParts = client.name.trim().split(/\s+/);
          const lastName = nameParts.length > 1 ? nameParts.pop()! : '';
          const firstName = nameParts.join(' ');

          const { data: newClient } = await supabase
            .from('clients')
            .insert({
              first_name: firstName,
              last_name: lastName,
              email: client.email.trim(),
              phone: client.phone?.trim() || null,
              company_name: client.companyName?.trim() || null,
              created_by: user.id,
            })
            .select('id')
            .single();

          if (newClient) clientId = newClient.id;
        }
      }

      if (clientId) {
        rows.push({
          proposal_id: proposalId,
          client_id: clientId,
          added_by: user.id,
        });
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from('proposal_clients').insert(rows);
      if (error) console.warn('Failed to sync proposal_clients:', error.message);
    }
  } catch (err) {
    console.warn('Exception syncing additional clients junction:', err);
  }
}

export function useProposalEdit(proposal: ProposalData, onSuccess?: () => void) {
  const [formData, setFormData] = useState<ProposalEditFormData>(() => extractFormData(proposal));
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData(extractFormData(proposal));
    setErrors({});
  };

  const updateField = (field: keyof ProposalEditFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updatePhase = (index: number, field: keyof PhaseFormData, value: string) => {
    setFormData(prev => {
      const newPhases = [...prev.phases];
      newPhases[index] = { ...newPhases[index], [field]: value };
      return { ...prev, phases: newPhases };
    });
    const errorKey = `phase_${index}_size`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[errorKey];
        return next;
      });
    }
  };

  const addAdditionalClient = () => {
    setFormData(prev => ({
      ...prev,
      additionalClients: [...prev.additionalClients, { name: '', email: '', phone: '', companyName: '' }],
    }));
  };

  const updateAdditionalClient = (index: number, client: AdditionalClient) => {
    setFormData(prev => {
      const updated = [...prev.additionalClients];
      updated[index] = client;
      return { ...prev, additionalClients: updated };
    });
    setErrors(prev => {
      const next = { ...prev };
      delete next[`addClient_${index}_name`];
      delete next[`addClient_${index}_email`];
      return next;
    });
  };

  const removeAdditionalClient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalClients: prev.additionalClients.filter((_, i) => i !== index),
    }));
  };

  const makePrimary = async (index: number) => {
    const target = formData.additionalClients[index];
    if (!target) return;

    // If the target has a linked clientId, fetch live data to avoid stale snapshot corruption
    let liveTarget = target;
    if (target.clientId) {
      try {
        const { data: liveClient } = await supabase
          .from('clients')
          .select('first_name, last_name, email, phone, company_name')
          .eq('id', target.clientId)
          .single();

        if (liveClient) {
          const liveName = [liveClient.first_name, liveClient.last_name].filter(Boolean).join(' ').trim();
          liveTarget = {
            ...target,
            name: liveName || target.name,
            email: liveClient.email || target.email,
            phone: liveClient.phone || target.phone || '',
            companyName: liveClient.company_name || target.companyName || '',
          };
        }
      } catch (err) {
        console.warn('Failed to fetch live client data for makePrimary, using form data', err);
      }
    }

    setFormData(prev => {
      // Move current primary into additional clients list
      const demotedPrimary: AdditionalClient = {
        name: prev.clientName,
        email: prev.clientEmail,
        phone: prev.clientPhone,
        companyName: prev.clientCompanyName,
        clientId: prev.primaryClientId || undefined,
      };

      const newAdditional = prev.additionalClients.filter((_, i) => i !== index);
      newAdditional.push(demotedPrimary);

      return {
        ...prev,
        clientName: liveTarget.name,
        clientEmail: liveTarget.email,
        clientPhone: liveTarget.phone || '',
        clientCompanyName: liveTarget.companyName || '',
        primaryClientId: liveTarget.clientId || null,
        additionalClients: newAdditional,
      };
    });
  };

  const computedTotalSize = (): number => {
    if (!formData.isMultiPhase) return parseFloat(formData.systemSize) || 0;
    return formData.phases.reduce((sum, p) => sum + (parseFloat(p.sizeKWp) || 0), 0);
  };

  const save = async (): Promise<boolean> => {
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast.error('Please fix the highlighted fields before saving.');
      return false;
    }

    setSaving(true);
    try {
      const newSystemSize = computedTotalSize();
      const oldContent = proposal.content || {} as any;
      const oldProjectInfo = oldContent.projectInfo || {};

      // Build updated phases if multi-phase
      let updatedPhases = oldProjectInfo.phases;
      if (formData.isMultiPhase && Array.isArray(oldProjectInfo.phases)) {
        updatedPhases = oldProjectInfo.phases.map((p: any, i: number) => {
          const edited = formData.phases[i];
          if (!edited) return p;
          return {
            ...p,
            sizeKWp: parseFloat(edited.sizeKWp),
            commissionDate: edited.commissionDate,
            phaseName: edited.phaseName,
          };
        });
      }

      const updatedContent = {
        ...oldContent,
        clientInfo: {
          ...oldContent.clientInfo,
          name: formData.clientName.trim(),
          firstName: formData.clientName.trim().split(/\s+/).slice(0, -1).join(' ') || formData.clientName.trim(),
          lastName: formData.clientName.trim().split(/\s+/).pop() || '',
          email: formData.clientEmail.trim(),
          phone: formData.clientPhone.trim(),
          companyName: formData.clientCompanyName.trim(),
        },
        additionalClients: formData.additionalClients.map(c => ({
          name: c.name.trim(),
          email: c.email.trim(),
          phone: c.phone?.trim() || '',
          companyName: c.companyName?.trim() || '',
          clientId: c.clientId,
        })),
        projectInfo: {
          ...oldProjectInfo,
          name: formData.projectName.trim(),
          address: formData.projectAddress.trim(),
          size: formData.isMultiPhase ? '' : String(formData.systemSize || '').trim(),
          totalSystemSize: formData.isMultiPhase ? newSystemSize : undefined,
          commissionDate: formData.isMultiPhase ? oldProjectInfo.commissionDate : formData.commissionDate,
          additionalNotes: formData.additionalNotes.trim(),
          ...(updatedPhases ? { phases: updatedPhases } : {}),
        },
      };

      const existingProjectInfo = (proposal as any).project_info;
      const updatedProjectInfo = {
        ...(typeof existingProjectInfo === 'object' && existingProjectInfo !== null ? existingProjectInfo : {}),
        name: formData.projectName.trim(),
        address: formData.projectAddress.trim(),
        size: formData.isMultiPhase ? String(newSystemSize) : String(formData.systemSize || '').trim(),
        commissionDate: formData.isMultiPhase ? '' : formData.commissionDate,
      };

      const annualEnergy = calculateAnnualEnergy(newSystemSize);
      const carbonCredits = calculateCarbonCredits(newSystemSize);

      // Resolve primary client BEFORE the proposal update so we can include client_reference_id atomically
      const primaryChanged = formData.primaryClientId !== proposal.client_reference_id;
      let resolvedPrimaryClientId = formData.primaryClientId;

      if (primaryChanged && !resolvedPrimaryClientId) {
        // Use RPC that bypasses RLS to find or create client atomically
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('You must be logged in to save changes.');
          setSaving(false);
          return false;
        }

        const nameParts = formData.clientName.trim().split(/\s+/);
        const ln = nameParts.length > 1 ? nameParts.pop()! : '';
        const fn = nameParts.join(' ');

        const { data: clientId, error: rpcError } = await supabase.rpc('find_or_create_client_by_email', {
          p_email: formData.clientEmail.trim(),
          p_first_name: fn,
          p_last_name: ln,
          p_phone: formData.clientPhone.trim() || null,
          p_company_name: formData.clientCompanyName.trim() || null,
          p_created_by: user.id,
        });

        if (rpcError) {
          console.error('Failed to resolve client:', rpcError);
          toast.error(`Could not resolve client: ${rpcError.message}`);
          setSaving(false);
          return false;
        }

        resolvedPrimaryClientId = clientId;
      }

      // Build the single atomic update payload
      const updatePayload: Record<string, any> = {
        title: formData.projectName.trim(),
        content: updatedContent as any,
        project_info: updatedProjectInfo as any,
        system_size_kwp: newSystemSize,
        annual_energy: annualEnergy,
        carbon_credits: carbonCredits,
        updated_at: new Date().toISOString(),
      };

      // Include client_reference_id in the same update if primary changed
      if (primaryChanged && resolvedPrimaryClientId) {
        updatePayload.client_reference_id = resolvedPrimaryClientId;
      }

      const { error } = await supabase
        .from('proposals')
        .update(updatePayload)
        .eq('id', proposal.id);

      if (error) {
        console.error('Error updating proposal:', error);
        toast.error('Failed to update proposal: ' + error.message);
        return false;
      }

      // Sync primary client's record in the clients table
      const clientIdToUpdate = resolvedPrimaryClientId || proposal.client_reference_id;
      if (clientIdToUpdate) {
        try {
          const nameParts = formData.clientName.trim().split(/\s+/);
          const lastName = nameParts.length > 1 ? nameParts.pop()! : '';
          const firstName = nameParts.join(' ');

          const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .update({
              first_name: firstName,
              last_name: lastName,
              email: formData.clientEmail.trim(),
              phone: formData.clientPhone.trim(),
              company_name: formData.clientCompanyName.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', clientIdToUpdate)
            .select('user_id')
            .single();

          if (clientError) {
            toast.warning('Client record update may not have saved — check My Clients for accuracy.');
            console.warn('Failed to update linked client record:', clientError.message);
          }

          if (clientData?.user_id) {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                first_name: firstName,
                last_name: lastName,
                phone: formData.clientPhone.trim(),
                company_name: formData.clientCompanyName.trim(),
              })
              .eq('id', clientData.user_id);

            if (profileError) {
              toast.warning('User profile sync failed — User Management may show outdated info.');
              console.warn('Failed to sync profile:', profileError.message);
            }
          }
        } catch (clientErr) {
          toast.warning('Client record sync encountered an error.');
          console.warn('Exception updating linked client record:', clientErr);
        }
      }

      // Sync additional clients to proposal_clients junction table
      await syncAdditionalClientsJunction(proposal.id, formData.additionalClients);

      toast.success('Proposal updated successfully');
      onSuccess?.();
      return true;
    } catch (err) {
      console.error('Exception updating proposal:', err);
      toast.error('An unexpected error occurred');
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    formData,
    errors,
    saving,
    updateField,
    updatePhase,
    addAdditionalClient,
    updateAdditionalClient,
    removeAdditionalClient,
    makePrimary,
    computedTotalSize,
    save,
    resetForm,
  };
}
