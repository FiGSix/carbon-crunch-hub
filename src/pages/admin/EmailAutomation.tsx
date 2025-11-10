import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailTestPanel } from "@/components/admin/email/EmailTestPanel";
import { EmailTemplateEditor } from "@/components/admin/email/EmailTemplateEditor";
import { TimingConfigPanel } from "@/components/admin/email/TimingConfigPanel";
import { ValiditySettingsPanel } from "@/components/admin/email/ValiditySettingsPanel";
import { UpdateTemplatesButton } from "@/components/admin/email/UpdateTemplatesButton";

export default function EmailAutomation() {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <DashboardHeader
          title="Email Automation"
          description="Manage proposal follow-up emails, templates, and timing configuration"
        />
        <UpdateTemplatesButton />
      </div>
      <Tabs defaultValue="test" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="test">Test Emails</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="timing">Timing</TabsTrigger>
          <TabsTrigger value="validity">Validity</TabsTrigger>
        </TabsList>

        <TabsContent value="test" className="space-y-4">
          <EmailTestPanel />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <EmailTemplateEditor />
        </TabsContent>

        <TabsContent value="timing" className="space-y-4">
          <TimingConfigPanel />
        </TabsContent>

        <TabsContent value="validity" className="space-y-4">
          <ValiditySettingsPanel />
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}
