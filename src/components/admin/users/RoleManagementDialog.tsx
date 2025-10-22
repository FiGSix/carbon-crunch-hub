import { useState, useEffect } from 'react';
import { Shield, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RoleManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    role: string;
  };
  onSuccess?: () => void;
}

export function RoleManagementDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: RoleManagementDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchUserRoles();
    }
  }, [open, user.id]);

  const fetchUserRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;

      const roles = data?.map((r) => r.role) || [user.role];
      setCurrentRoles(roles);
      setSelectedRoles(roles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setCurrentRoles([user.role]);
      setSelectedRoles([user.role]);
    }
  };

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!sessionData.session) {
        throw new Error('Not authenticated');
      }

      // Find roles to add and remove
      const rolesToAdd = selectedRoles.filter((r) => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter((r) => !selectedRoles.includes(r));

      // Execute role changes
      for (const role of rolesToAdd) {
        const { data, error } = await supabase.functions.invoke('manage-user-role', {
          body: {
            userId: user.id,
            action: 'add',
            role,
          },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error(error.message || 'Failed to add role');
        }

        // Check for non-2xx responses with error in data
        if (data && typeof data === 'object' && 'error' in data) {
          console.error('Edge function returned error:', data.error);
          throw new Error(data.error);
        }
      }

      for (const role of rolesToRemove) {
        const { data, error } = await supabase.functions.invoke('manage-user-role', {
          body: {
            userId: user.id,
            action: 'remove',
            role,
          },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (error) {
          console.error('Edge function error:', error);
          throw new Error(error.message || 'Failed to remove role');
        }

        // Check for non-2xx responses with error in data
        if (data && typeof data === 'object' && 'error' in data) {
          console.error('Edge function returned error:', data.error);
          throw new Error(data.error);
        }
      }

      toast({
        title: 'Roles Updated',
        description: `Successfully updated roles for ${user.email}`,
      });

      onSuccess?.();
    } catch (error) {
      console.error('Error updating roles:', error);
      toast({
        title: 'Failed to Update Roles',
        description: error.message || 'An error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const userName = user.first_name || user.last_name
    ? `${user.first_name || ''} ${user.last_name || ''}`.trim()
    : user.email;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Manage Roles: {userName}
          </DialogTitle>
          <DialogDescription>
            Select the roles for this user. Changes will take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm font-medium mb-2">Current Roles:</p>
            <div className="flex gap-2">
              {currentRoles.length > 0 ? (
                currentRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No roles assigned</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Available Roles:</p>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-admin"
                checked={selectedRoles.includes('admin')}
                onCheckedChange={() => handleRoleToggle('admin')}
                disabled={loading}
              />
              <Label htmlFor="role-admin" className="flex items-center gap-2 cursor-pointer">
                <Shield className="h-4 w-4 text-destructive" />
                <span>Admin</span>
                <span className="text-xs text-muted-foreground">
                  (Full system access)
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-agent"
                checked={selectedRoles.includes('agent')}
                onCheckedChange={() => handleRoleToggle('agent')}
                disabled={loading}
              />
              <Label htmlFor="role-agent" className="flex items-center gap-2 cursor-pointer">
                <span>Agent</span>
                <span className="text-xs text-muted-foreground">
                  (Create proposals, manage clients)
                </span>
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="role-client"
                checked={selectedRoles.includes('client')}
                onCheckedChange={() => handleRoleToggle('client')}
                disabled={loading}
              />
              <Label htmlFor="role-client" className="flex items-center gap-2 cursor-pointer">
                <span>Client</span>
                <span className="text-xs text-muted-foreground">
                  (View own proposals)
                </span>
              </Label>
            </div>
          </div>

          {selectedRoles.length === 0 && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              ⚠️ Warning: User must have at least one role assigned
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || selectedRoles.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
