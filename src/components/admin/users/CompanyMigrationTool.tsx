import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface MigrationResult {
  userId: string;
  userName: string;
  companyName: string;
  success: boolean;
  error?: string;
}

export function CompanyMigrationTool({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [usersToMigrate, setUsersToMigrate] = useState<any[]>([]);
  const [migrationResults, setMigrationResults] = useState<MigrationResult[]>([]);

  const scanLegacyUsers = async () => {
    setIsScanning(true);
    setMigrationResults([]);
    
    try {
      // Find all users with company_name but no active company_members
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          first_name,
          last_name,
          company_name,
          role,
          company_members!left(
            id,
            status,
            company_id
          )
        `)
        .not('company_name', 'is', null)
        .neq('company_name', '');

      if (error) throw error;

      // Filter to users without active company membership
      const legacy = profiles?.filter((p: any) => {
        const hasActiveMembership = p.company_members?.some((m: any) => m.status === 'active');
        return !hasActiveMembership && p.company_name;
      }) || [];

      setUsersToMigrate(legacy);
      
      toast({
        title: "Scan Complete",
        description: `Found ${legacy.length} users with legacy company data.`,
      });
    } catch (error: any) {
      console.error("Scan error:", error);
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const migrateUser = async (user: any): Promise<MigrationResult> => {
    try {
      const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email;
      
      // Check if company already exists
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id, company_name')
        .ilike('company_name', user.company_name)
        .single();

      let companyId: string;

      if (existingCompany) {
        companyId = existingCompany.id;
        
        // Create membership to existing company
        const { error: memberError } = await supabase
          .from('company_members')
          .insert({
            company_id: companyId,
            user_id: user.id,
            role: 'member', // Default to member, admin can promote later
            status: 'active',
            invited_by: user.id,
          });

        if (memberError) throw memberError;
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            company_name: user.company_name,
            email_domain: null, // Will be null for personal emails
            created_by: user.id,
          })
          .select()
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;

        // Add user as team lead of new company
        const { error: memberError } = await supabase
          .from('company_members')
          .insert({
            company_id: companyId,
            user_id: user.id,
            role: 'team_lead',
            status: 'active',
          });

        if (memberError) throw memberError;
      }

      return {
        userId: user.id,
        userName,
        companyName: user.company_name,
        success: true,
      };
    } catch (error: any) {
      return {
        userId: user.id,
        userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        companyName: user.company_name,
        success: false,
        error: error.message,
      };
    }
  };

  const executeMigration = async () => {
    if (usersToMigrate.length === 0) return;

    setIsMigrating(true);
    const results: MigrationResult[] = [];

    for (const user of usersToMigrate) {
      const result = await migrateUser(user);
      results.push(result);
      setMigrationResults([...results]);
    }

    setIsMigrating(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    toast({
      title: "Migration Complete",
      description: `Successfully migrated ${successCount} users. ${failCount} failed.`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    if (successCount > 0 && onSuccess) {
      onSuccess();
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
          scanLegacyUsers();
        }}
        variant="outline"
        className="gap-2"
      >
        <AlertTriangle className="h-4 w-4" />
        Migrate Legacy Companies
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Company Data Migration Tool</DialogTitle>
            <DialogDescription>
              Migrate users with legacy company data to the company system
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isScanning && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning for legacy users...
              </div>
            )}

            {!isScanning && usersToMigrate.length === 0 && migrationResults.length === 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  No users with legacy company data found. All users are properly linked!
                </AlertDescription>
              </Alert>
            )}

            {!isScanning && usersToMigrate.length > 0 && migrationResults.length === 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Found {usersToMigrate.length} users with legacy company data that need migration.
                </AlertDescription>
              </Alert>
            )}

            {usersToMigrate.length > 0 && migrationResults.length === 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {usersToMigrate.map((user: any) => (
                  <div key={user.id} className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                      {user.company_name}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {migrationResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                {migrationResults.map((result) => (
                  <div key={result.userId} className="p-3 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{result.userName}</div>
                      <div className="text-sm text-muted-foreground">{result.companyName}</div>
                      {result.error && (
                        <div className="text-xs text-destructive mt-1">{result.error}</div>
                      )}
                    </div>
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Close
            </Button>
            {!isScanning && usersToMigrate.length > 0 && migrationResults.length === 0 && (
              <Button onClick={executeMigration} disabled={isMigrating}>
                {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Migrate All Users
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
