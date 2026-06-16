
import { ClientInformation, AdditionalClient } from "@/types/proposals";

interface ClientInformationSectionProps {
  clientInfo: ClientInformation;
  additionalClients?: AdditionalClient[];
}

export function ClientInformationSection({ clientInfo, additionalClients }: ClientInformationSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Client Information</h3>
      
      {/* Primary Client */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-carbon-gray-500">Name</p>
          <p className="font-medium">{clientInfo.name}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Email</p>
          <p className="font-medium">{clientInfo.email}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Phone</p>
          <p className="font-medium">{clientInfo.phone || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-carbon-gray-500">Company</p>
          <p className="font-medium">{clientInfo.companyName || "—"}</p>
        </div>
      </div>

      {/* Additional Clients */}
      {additionalClients && additionalClients.length > 0 && (
        <div className="mt-4 space-y-3">
          {additionalClients.map((client, index) => (
            <div key={index} className="border border-border rounded-lg p-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">Additional Client {index + 1}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-carbon-gray-500">Name</p>
                  <p className="font-medium text-sm">{client.name}</p>
                </div>
                <div>
                  <p className="text-sm text-carbon-gray-500">Email</p>
                  <p className="font-medium text-sm">{client.email}</p>
                </div>
                {client.phone && (
                  <div>
                    <p className="text-sm text-carbon-gray-500">Phone</p>
                    <p className="font-medium text-sm">{client.phone}</p>
                  </div>
                )}
                {client.companyName && (
                  <div>
                    <p className="text-sm text-carbon-gray-500">Company</p>
                    <p className="font-medium text-sm">{client.companyName}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
