
// Main profile module - re-exports all profile functionality
export { 
  getProfile, 
  updateProfile 
} from './profile/profileOperations';

export { 
  synchronizeUserRole, 
  getUserRoleFromMetadata 
} from './profile/roleSyncService';

export { 
  createProfileWithCorrectRole 
} from './profile/profileCreationService';

export { 
  getProfileById 
} from './profile/profileSecurity';
