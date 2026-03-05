
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
  const clientInfo = proposal.content?.clientInfo || {} as ClientInformation;
  const projectInfo = proposal.content?.projectInfo || {} as ProjectInformation;
  const phases = extractPhases(projectInfo);
  const isMultiPhase = phases.length > 1;

  return {
    clientName: clientInfo.name
      || [(clientInfo as any).firstName, (clientInfo as any).lastName]
          .filter((n: any) => n && n !== 'null')
          .join(' ')
      || '',
    clientEmail: clientInfo.email || '',
    clientPhone: clientInfo.phone || '',
    clientCompanyName: clientInfo.companyName || '',
    primaryClientId: proposal.client_reference_id || null,
    additionalClients: (proposal.content?.additionalClients || []).map(c => ({ ...c })),
    projectName: projectInfo.name || '',
    projectAddress: projectInfo.address || '',
    systemSize: projectInfo.size
      || ((projectInfo as any).totalSystemSize ? String((projectInfo as any).totalSystemSize) : '')
      || (proposal.system_size_kwp ? String(proposal.system_size_kwp) : ''),
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
    if (!data.systemSize.trim()) {
      errors.systemSize = 'System size is required';
    } else if (parseFloat(data.systemSize) <= 0 || isNaN(parseFloat(data.systemSize))) {
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

  const makePrimary = (index: number) => {
    setFormData(prev => {
      const target = prev.additionalClients[index];
      if (!target) return prev;

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
        clientName: target.name,
        clientEmail: target.email,
        clientPhone: target.phone || '',
        clientCompanyName: target.companyName || '',
        primaryClientId: target.clientId || null,
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
          size: formData.isMultiPhase ? '' : formData.systemSize.trim(),
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
        size: formData.isMultiPhase ? String(newSystemSize) : formData.systemSize.trim(),
        commissionDate: formData.isMultiPhase ? '' : formData.commissionDate,
      };

      const annualEnergy = calculateAnnualEnergy(newSystemSize);
      const carbonCredits = calculateCarbonCredits(newSystemSize);

      const { error } = await supabase
        .from('proposals')
        .update({
          title: formData.projectName.trim(),
          content: updatedContent as any,
          project_info: updatedProjectInfo as any,
          system_size_kwp: newSystemSize,
          annual_energy: annualEnergy,
          carbon_credits: carbonCredits,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proposal.id);

      if (error) {
        console.error('Error updating proposal:', error);
        toast.error('Failed to update proposal: ' + error.message);
        return false;
      }

      // Resolve the primary client record
      const primaryChanged = formData.primaryClientId !== proposal.client_reference_id;
      let resolvedPrimaryClientId = formData.primaryClientId;

      if (primaryChanged && !resolvedPrimaryClientId) {
        // New primary client has no clientId — find or create
        const { data: { user } } = await supabase.auth.getUser();
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('email', formData.clientEmail.trim())
          .maybeSingle();

        if (existing) {
          resolvedPrimaryClientId = existing.id;
        } else if (user) {
          const nameParts = formData.clientName.trim().split(/\s+/);
          const ln = nameParts.length > 1 ? nameParts.pop()! : '';
          const fn = nameParts.join(' ');
          const { data: newClient } = await supabase
            .from('clients')
            .insert({
              first_name: fn,
              last_name: ln,
              email: formData.clientEmail.trim(),
              phone: formData.clientPhone.trim() || null,
              company_name: formData.clientCompanyName.trim() || null,
              created_by: user.id,
            })
            .select('id')
            .single();
          if (newClient) resolvedPrimaryClientId = newClient.id;
        }
      }

      // Update client_reference_id on proposals if primary changed
      if (primaryChanged && resolvedPrimaryClientId) {
        const { error: refError } = await supabase
          .from('proposals')
          .update({ client_reference_id: resolvedPrimaryClientId })
          .eq('id', proposal.id);
        if (refError) console.warn('Failed to update client_reference_id:', refError.message);
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
              console.warn('Failed to sync profile:', profileError.message);
            }
          }
        } catch (clientErr) {
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
