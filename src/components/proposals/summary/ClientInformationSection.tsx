
import React from "react";
import { ClientInformation } from "../types";

interface ClientInformationSectionProps {
  clientInfo: ClientInformation;
}

export function ClientInformationSection({ clientInfo }: ClientInformationSectionProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3 text-carbon-gray-900">Client Information</h3>
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
    </div>
  );
}
