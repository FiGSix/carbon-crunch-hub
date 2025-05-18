
// This file now serves as a barrel file to re-export client operations
// for backwards compatibility and easier refactoring

import { processClientRequest as processClientRequestImpl } from "./client/client-processor.ts";
import { findExistingClient as findExistingClientImpl } from "./client/client-lookup.ts";
import { createClientContact as createClientContactImpl } from "./client/client-creation.ts";

// Re-export functions to maintain backward compatibility
export const processClientRequest = processClientRequestImpl;
export const findExistingClient = findExistingClientImpl;
export const createClientContact = createClientContactImpl;
