import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle, RefreshCw, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DiagnosticRecord {
  proposal_id: string;
  title: string;
  status: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  stored_name: string | null;
  name_status: 'MISSING' | 'EMPTY' | 'OK';
}

export default function DataDiagnostics() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [diagnostics, setDiagnostics] = useState<DiagnosticRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);

  useEffect(() => {
    if (userRole !== 'admin') {
      navigate('/');
      return;
    }
    loadDiagnostics();
  }, [userRole, navigate]);

  const loadDiagnostics = async () => {
    try {
      setLoading(true);

      // Fetch proposals with their client data
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select(`
          id,
          title,
          status,
          created_at,
          content,
          clients:client_reference_id (
            first_name,
            last_name,
            email
          )
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Transform data to diagnostic records
      const diagnosticRecords: DiagnosticRecord[] = (proposals || []).map(p => {
        const content = p.content as any;
        const storedName = content?.clientInfo?.name || null;
        let nameStatus: 'MISSING' | 'EMPTY' | 'OK' = 'OK';
        
        if (storedName === null || storedName === undefined) {
          nameStatus = 'MISSING';
        } else if (typeof storedName === 'string' && storedName.trim().length === 0) {
          nameStatus = 'EMPTY';
        }

        return {
          proposal_id: p.id,
          title: p.title,
          status: p.status,
          created_at: p.created_at,
          first_name: (p.clients as any)?.first_name || null,
          last_name: (p.clients as any)?.last_name || null,
          email: (p.clients as any)?.email || null,
          stored_name: storedName,
          name_status: nameStatus
        };
      });

      setDiagnostics(diagnosticRecords);
    } catch (error) {
      console.error('Error loading diagnostics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load diagnostics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFixAll = async () => {
    try {
      setFixing(true);

      const { data, error } = await supabase.functions.invoke('backfill-client-names', {
        method: 'POST',
      });

      if (error) throw error;

      toast({
        title: 'Backfill Complete',
        description: `Fixed ${data.fixed} records, skipped ${data.skipped} records${data.errors > 0 ? `, ${data.errors} errors` : ''}`,
      });

      // Reload diagnostics
      await loadDiagnostics();
    } catch (error) {
      console.error('Error running backfill:', error);
      toast({
        title: 'Error',
        description: 'Failed to run backfill process',
        variant: 'destructive',
      });
    } finally {
      setFixing(false);
    }
  };

  const affectedRecords = diagnostics.filter(d => d.name_status !== 'OK');
  const okRecords = diagnostics.filter(d => d.name_status === 'OK');

  return (
    <div className="container max-w-7xl mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Diagnostics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor and fix data quality issues
          </p>
        </div>
        <Button onClick={() => navigate('/admin')} variant="outline">
          Back to Admin
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Checked</p>
                <p className="text-2xl font-bold">{diagnostics.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">OK</p>
                <p className="text-2xl font-bold">{okRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issues Found</p>
                <p className="text-2xl font-bold">{affectedRecords.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Fix data quality issues automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={handleFixAll}
              disabled={fixing || affectedRecords.length === 0}
            >
              {fixing ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Fixing...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Fix All Missing Client Names
                </>
              )}
            </Button>
            <Button
              onClick={loadDiagnostics}
              variant="outline"
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {affectedRecords.length === 0 && !loading && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
              <p className="text-sm text-green-600 dark:text-green-400">
                ✅ All records have valid client names!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Affected Records */}
      {affectedRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Records with Missing Client Names</CardTitle>
            <CardDescription>
              These proposals have missing or empty client names in content.clientInfo.name
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {affectedRecords.map((record) => (
                <div
                  key={record.proposal_id}
                  className="p-4 rounded-lg border flex items-start justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{record.title}</p>
                      <Badge variant={record.name_status === 'MISSING' ? 'destructive' : 'secondary'}>
                        {record.name_status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Client: {record.first_name && record.last_name
                        ? `${record.first_name} ${record.last_name}`
                        : 'N/A'} ({record.email || 'No email'})
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(record.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
