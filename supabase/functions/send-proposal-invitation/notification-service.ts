
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.29.0";

export async function createClientNotification(
  clientId: string,
  projectName: string,
  proposalId: string,
  supabase: ReturnType<typeof createClient>
): Promise<void> {
  try {
    await supabase
      .from('notifications')
      .insert({
        user_id: clientId,
        title: "New Proposal Invitation",
        message: `You have been invited to review a proposal for project: ${projectName}`,
        type: "info",
        related_id: proposalId,
        related_type: "proposal",
        read: false,
        created_at: new Date().toISOString()
      });
      
    console.log("Client notification created successfully");
  } catch (notificationError) {
    console.error("Failed to create client notification:", notificationError);
    // We don't want to fail the whole request if just the notification fails
  }
}
