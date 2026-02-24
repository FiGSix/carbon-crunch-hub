
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProposalData, ClientInformation, ProjectInformation } from '@/types/proposals';
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
    clientName: clientInfo.name || '',
    clientEmail: clientInfo.email || '',
    clientPhone: clientInfo.phone || '',
    clientCompanyName: clientInfo.companyName || '',
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
          email: formData.clientEmail.trim(),
          phone: formData.clientPhone.trim(),
          companyName: formData.clientCompanyName.trim(),
        },
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

      if (proposal.client_reference_id) {
        try {
          const nameParts = formData.clientName.trim().split(/\s+/);
          const lastName = nameParts.length > 1 ? nameParts.pop()! : '';
          const firstName = nameParts.join(' ');

          const { error: clientError } = await supabase
            .from('clients')
            .update({
              first_name: firstName,
              last_name: lastName,
              email: formData.clientEmail.trim(),
              phone: formData.clientPhone.trim(),
              company_name: formData.clientCompanyName.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', proposal.client_reference_id);

          if (clientError) {
            console.warn('Failed to update linked client record:', clientError.message);
          }
        } catch (clientErr) {
          console.warn('Exception updating linked client record:', clientErr);
        }
      }

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
    computedTotalSize,
    save,
    resetForm,
  };
}
