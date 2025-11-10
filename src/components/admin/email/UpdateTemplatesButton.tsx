import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function UpdateTemplatesButton() {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-email-templates");

      if (error) throw error;

      toast.success("Email templates updated successfully", {
        description: "All 7 templates now have the new yellow-branded design with enhanced CTA buttons",
      });

      // Reload the page to show updated templates
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating templates:", error);
      toast.error("Failed to update templates", {
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Update All Templates to New Design
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update All Email Templates?</AlertDialogTitle>
          <AlertDialogDescription>
            This will update all 7 automation email templates with:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>New yellow-branded design matching the Crunch Carbon identity</li>
              <li>Enhanced CTA buttons (larger, bolder, more visible)</li>
              <li>Improved layout and professional styling</li>
              <li>Consistent footer and header across all emails</li>
            </ul>
            <p className="mt-3 font-semibold">
              This will overwrite all current template content in the database.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? "Updating..." : "Update Templates"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
