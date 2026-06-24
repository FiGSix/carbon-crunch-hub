
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Loader2, UserPlus } from 'lucide-react';
import { ProposalData, GenerationInputMode } from '@/types/proposals';
import { useProposalEdit } from '@/hooks/proposals/view/useProposalEdit';
import { AdditionalClientForm } from '@/components/proposals/client-info/AdditionalClientForm';
import { AnnualKwhGrid } from '@/components/proposals/project-info/AnnualKwhGrid';

interface ProposalEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: ProposalData;
  onSaved: () => void;
}

export function ProposalEditDialog({ open, onOpenChange, proposal, onSaved }: ProposalEditDialogProps) {
  const {
    formData,
    errors,
    saving,
    updateField,
    updateMode,
    updateAnnualKwh,
    updatePhase,
    updatePhaseAnnualKwh,
    addAdditionalClient,
    updateAdditionalClient,
    removeAdditionalClient,
    makePrimary,
    computedTotalSize,
    save,
    resetForm,
  } = useProposalEdit(proposal, () => {
    onSaved();
    onOpenChange(false);
  });

  const isKwh = formData.generationInputMode === 'kwh';

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  };

  const handleSave = async () => {
    await save();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Proposal</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Client Information */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Client Information</h3>
              <Badge variant="secondary" className="text-xs">Primary — receives invitation email</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => updateField('clientName', e.target.value)}
                  className={errors.clientName ? 'border-destructive' : ''}
                />
                {errors.clientName && <p className="text-xs text-destructive">{errors.clientName}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientEmail">Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={formData.clientEmail}
                  onChange={(e) => updateField('clientEmail', e.target.value)}
                  className={errors.clientEmail ? 'border-destructive' : ''}
                />
                {errors.clientEmail && <p className="text-xs text-destructive">{errors.clientEmail}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientPhone">Phone</Label>
                <Input
                  id="clientPhone"
                  value={formData.clientPhone}
                  onChange={(e) => updateField('clientPhone', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientCompanyName">Company Name</Label>
                <Input
                  id="clientCompanyName"
                  value={formData.clientCompanyName}
                  onChange={(e) => updateField('clientCompanyName', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Additional Clients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Additional Clients</h3>
              <Button type="button" variant="outline" size="sm" onClick={addAdditionalClient}>
                <UserPlus className="h-4 w-4 mr-1" />
                Add Client
              </Button>
            </div>
            {formData.additionalClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No additional clients. Click "Add Client" to include more recipients.</p>
            ) : (
              <div className="space-y-3">
                {formData.additionalClients.map((client, index) => (
                  <AdditionalClientForm
                    key={index}
                    index={index}
                    client={client}
                    errors={errors}
                    onChange={updateAdditionalClient}
                    onRemove={removeAdditionalClient}
                    onMakePrimary={makePrimary}
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Project Information */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Project Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="projectName">Project Name *</Label>
                <Input
                  id="projectName"
                  value={formData.projectName}
                  onChange={(e) => updateField('projectName', e.target.value)}
                  className={errors.projectName ? 'border-destructive' : ''}
                />
                {errors.projectName && <p className="text-xs text-destructive">{errors.projectName}</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="projectAddress">Address</Label>
                <Input
                  id="projectAddress"
                  value={formData.projectAddress}
                  onChange={(e) => updateField('projectAddress', e.target.value)}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label>Generation Input</Label>
                <ToggleGroup
                  type="single"
                  value={formData.generationInputMode}
                  onValueChange={(v) => v && updateMode(v as GenerationInputMode)}
                  className="justify-start"
                >
                  <ToggleGroupItem value="kwp" aria-label="System size kWp">System Size (kWp)</ToggleGroupItem>
                  <ToggleGroupItem value="kwh" aria-label="Annual kWh">Annual kWh (per year)</ToggleGroupItem>
                </ToggleGroup>
              </div>

              {formData.isMultiPhase ? (
                <>
                  <div className="sm:col-span-2 space-y-4">
                    <h4 className="text-sm font-medium text-foreground">Project Phases</h4>
                    {formData.phases.map((phase, i) => (
                      <div key={i} className="rounded-md border border-border p-3 space-y-3">
                        <p className="text-sm font-medium">{phase.phaseName}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {!isKwh && (
                            <div className="space-y-1.5">
                              <Label htmlFor={`phase-size-${i}`}>Size (kWp) *</Label>
                              <Input
                                id={`phase-size-${i}`}
                                type="number"
                                min="0"
                                step="0.01"
                                value={phase.sizeKWp}
                                onChange={(e) => updatePhase(i, 'sizeKWp', e.target.value)}
                                className={errors[`phase_${i}_size`] ? 'border-destructive' : ''}
                              />
                              {errors[`phase_${i}_size`] && (
                                <p className="text-xs text-destructive">{errors[`phase_${i}_size`]}</p>
                              )}
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <Label htmlFor={`phase-date-${i}`}>Commission Date{isKwh ? ' *' : ''}</Label>
                            <Input
                              id={`phase-date-${i}`}
                              type="date"
                              value={phase.commissionDate}
                              onChange={(e) => updatePhase(i, 'commissionDate', e.target.value)}
                              className={errors[`phase_${i}_date`] ? 'border-destructive' : ''}
                            />
                            {errors[`phase_${i}_date`] && (
                              <p className="text-xs text-destructive">{errors[`phase_${i}_date`]}</p>
                            )}
                          </div>
                        </div>
                        {isKwh && (
                          <div className="pt-2">
                            <AnnualKwhGrid
                              idPrefix={`phase-${i}-kwh`}
                              value={phase.annualKwhByYear}
                              onChange={(next) => updatePhaseAnnualKwh(i, next)}
                              compact
                            />
                            {errors[`phase_${i}_kwh`] && (
                              <p className="text-xs text-destructive mt-1">{errors[`phase_${i}_kwh`]}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {!isKwh && (
                      <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                        <span className="text-sm text-muted-foreground">Total System Size</span>
                        <span className="text-sm font-semibold">{computedTotalSize().toFixed(2)} kWp</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {!isKwh && (
                    <div className="space-y-1.5">
                      <Label htmlFor="systemSize">System Size (kWp) *</Label>
                      <Input
                        id="systemSize"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.systemSize}
                        onChange={(e) => updateField('systemSize', e.target.value)}
                        className={errors.systemSize ? 'border-destructive' : ''}
                      />
                      {errors.systemSize && <p className="text-xs text-destructive">{errors.systemSize}</p>}
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="commissionDate">Commission Date{isKwh ? ' *' : ''}</Label>
                    <Input
                      id="commissionDate"
                      type="date"
                      value={formData.commissionDate}
                      onChange={(e) => updateField('commissionDate', e.target.value)}
                      className={errors.commissionDate ? 'border-destructive' : ''}
                    />
                    {errors.commissionDate && <p className="text-xs text-destructive">{errors.commissionDate}</p>}
                  </div>
                  {isKwh && (
                    <div className="sm:col-span-2">
                      <AnnualKwhGrid
                        idPrefix="single-kwh"
                        value={formData.annualKwhByYear}
                        onChange={updateAnnualKwh}
                      />
                      {errors.annualKwh && (
                        <p className="text-xs text-destructive mt-1">{errors.annualKwh}</p>
                      )}
                    </div>
                  )}
                </>
              )}


              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Input
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => updateField('additionalNotes', e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
