
import { supabase } from "@/integrations/supabase/client";
import { EligibilityCriteria, ClientInformation, ProjectInformation } from "@/types/proposals";

export interface CreateProposalResult {
  success: boolean;
  proposalId?: string;
  error?: string;
}

export const createProposal = async (
  eligibility: EligibilityCriteria,
  clientInfo: ClientInformation,
  projectInfo: ProjectInformation,
  agentId: string,
  selectedClientId?: string
): Promise<CreateProposalResult> => {
  try {
    console.log("🚀 Creating proposal with auto PDF generation...");
    
    // Calculate carbon credits and revenue
    const annualEnergy = parseFloat(projectInfo.size) * 1500; // kWh per year (simplified calculation)
    const carbonCredits = annualEnergy * 0.0007; // tCO2 per kWh (simplified factor)
    
    // Prepare proposal data
    const proposalData = {
      title: projectInfo.name,
      status: 'pending',
      content: {
        eligibility,
        clientInfo,
        projectInfo
      },
      eligibility_criteria: eligibility,
      project_info: projectInfo,
      agent_id: agentId,
      client_id: selectedClientId || null,
      client_reference_id: selectedClientId || null,
      annual_energy: annualEnergy,
      carbon_credits: carbonCredits,
      client_share_percentage: 70,
      agent_commission_percentage: 15,
      pdf_generation_status: 'pending'
    };

    console.log("📋 Proposal data prepared:", {
      title: proposalData.title,
      agentId,
      clientId: selectedClientId,
      annualEnergy,
      carbonCredits
    });

    // Insert the proposal
    const { data: proposal, error: insertError } = await supabase
      .from('proposals')
      .insert([proposalData])
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error inserting proposal:", insertError);
      return { success: false, error: insertError.message };
    }

    console.log("✅ Proposal created successfully:", proposal.id);

    // Automatically trigger PDF generation
    console.log("📄 Triggering automatic PDF generation...");
    
    try {
      const { data: pdfData, error: pdfError } = await supabase.functions.invoke('generate-proposal-pdf', {
        body: JSON.stringify({ proposalId: proposal.id })
      });

      if (pdfError) {
        console.error("⚠️ PDF generation failed, but proposal was created:", pdfError);
        // Don't fail the entire proposal creation if PDF generation fails
        // The PDF can be regenerated later
      } else {
        console.log("✅ PDF generation triggered successfully");
      }
    } catch (pdfGenerationError) {
      console.error("⚠️ PDF generation error (non-blocking):", pdfGenerationError);
      // PDF generation failure is non-blocking
    }

    return { 
      success: true, 
      proposalId: proposal.id 
    };

  } catch (error) {
    console.error("❌ Unexpected error in createProposal:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "An unexpected error occurred" 
    };
  }
};
