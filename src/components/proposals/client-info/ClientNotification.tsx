
import React from "react";
import { Info } from "lucide-react";

interface ClientNotificationProps {
  isExistingClient: boolean;
}

export function ClientNotification({ isExistingClient }: ClientNotificationProps) {
  return (
    <div className="mt-6 p-4 rounded-lg bg-carbon-blue-50 border border-carbon-blue-200">
      <div className="flex items-start">
        <Info className="h-5 w-5 text-carbon-blue-500 mr-3 mt-0.5" />
        <div>
          <h3 className="font-medium text-carbon-gray-900">Client Notification</h3>
          <p className="text-sm text-carbon-gray-600 mt-1">
            {isExistingClient ? 
              "The client will be notified about this proposal through their CrunchCarbon dashboard." : 
              "A new account will be created for this client, and they will receive an email invitation to view this proposal."
            }
          </p>
        </div>
      </div>
    </div>
  );
}
