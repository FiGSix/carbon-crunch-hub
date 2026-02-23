
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProposalData, ClientInformation, ProjectInformation } from '@/types/proposals';
import { calculateAnnualEnergy, calculateCarbonCredits } from '@/services/calculations/carbon/calculations';
import { toast } from 'sonner';

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
}

function extractFormData(proposal: ProposalData): ProposalEditFormData {
  const clientInfo = proposal.content?.clientInfo || {} as ClientInformation;
  const projectInfo = proposal.content?.projectInfo || {} as ProjectInformation;

  return {
    clientName: clientInfo.name || '',
    clientEmail: clientInfo.email || '',
    clientPhone: clientInfo.phone || '',
    clientCompanyName: clientInfo.companyName || '',
    projectName: projectInfo.name || '',
    projectAddress: projectInfo.address || '',
    systemSize: projectInfo.size || '',
    commissionDate: projectInfo.commissionDate || '',
    additionalNotes: projectInfo.additionalNotes || '',
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
  if (!data.systemSize.trim()) {
    errors.systemSize = 'System size is required';
  } else if (parseFloat(data.systemSize) <= 0 || isNaN(parseFloat(data.systemSize))) {
    errors.systemSize = 'System size must be a positive number';
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

  const save = async (): Promise<boolean> => {
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }

    setSaving(true);
    try {
      const newSystemSize = parseFloat(formData.systemSize);
      const oldContent = proposal.content || {} as any;

      // Build updated content JSON
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
          ...oldContent.projectInfo,
          name: formData.projectName.trim(),
          address: formData.projectAddress.trim(),
          size: formData.systemSize.trim(),
          commissionDate: formData.commissionDate,
          additionalNotes: formData.additionalNotes.trim(),
        },
      };

      // Build project_info JSON column
      const existingProjectInfo = (proposal as any).project_info;
      const updatedProjectInfo = {
        ...(typeof existingProjectInfo === 'object' && existingProjectInfo !== null ? existingProjectInfo : {}),
        name: formData.projectName.trim(),
        address: formData.projectAddress.trim(),
        size: formData.systemSize.trim(),
        commissionDate: formData.commissionDate,
      };

      // Recalculate derived fields
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

      // Also update the linked clients table record so resolveClientInfo() picks up the change
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
    save,
    resetForm,
  };
}
