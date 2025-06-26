
// Main profile module exports - centralized access point
export { getProfile, updateProfile } from './profileOperations';
export { synchronizeUserRole, getUserRoleFromMetadata } from './roleSyncService';
export { createProfileWithCorrectRole } from './profileCreationService';
export { getProfileById } from './profileSecurity';
