
# Security Guidelines for Profile and Data Access

## Overview

This document outlines security best practices for handling user data access, particularly profile information, to prevent unauthorized data exposure.

## Key Security Principles

### 1. Authorization Before Access
- **Never** fetch user data without proper authorization checks
- Always verify the current user's identity and role
- Implement role-based access control (RBAC)

### 2. Principle of Least Privilege
- Users should only access data they need for their role
- Filter sensitive fields based on user relationship and role
- Admins get full access, users get limited access to others' data

### 3. Audit and Logging
- Log all data access attempts, both successful and failed
- Include user ID, target resource, timestamp, and success status
- Monitor for unusual access patterns

## Secure Patterns

### ✅ Correct: Secure Profile Access
```typescript
// Always require current user context
async function getProfileById(
  targetProfileId: string,
  currentUserId: string,
  currentUserRole: UserRole
) {
  // 1. Check authorization
  if (!canAccessProfile(currentUserId, currentUserRole, targetProfileId)) {
    logSecurityEvent('unauthorized_profile_access', currentUserId, targetProfileId);
    return { profile: null, error: 'Unauthorized' };
  }

  // 2. Fetch data
  const profile = await fetchProfile(targetProfileId);
  
  // 3. Filter fields based on relationship
  const filteredProfile = filterProfileFields(profile, currentUserId, currentUserRole);
  
  // 4. Log successful access
  logSecurityEvent('profile_access', currentUserId, targetProfileId);
  
  return { profile: filteredProfile };
}
```

### ❌ Incorrect: Insecure Profile Access
```typescript
// Never do this - no authorization checks
async function getProfileById(profileId: string) {
  return await supabase
    .from('profiles')
    .select('*')  // Exposes all fields
    .eq('id', profileId)
    .single();
}
```

## Authorization Patterns

### Role-Based Access Control
```typescript
function canAccessProfile(currentUserId: string, currentUserRole: UserRole, targetProfileId: string): boolean {
  // Self-access always allowed
  if (currentUserId === targetProfileId) return true;
  
  // Admin access always allowed
  if (currentUserRole === 'admin') return true;
  
  // Agent access to client profiles (if business logic allows)
  // Add specific business rules here
  
  // Default deny
  return false;
}
```

### Field-Level Filtering
```typescript
function filterProfileFields(
  profile: UserProfile,
  currentUserId: string,
  currentUserRole: UserRole,
  targetProfileId: string
): Partial<UserProfile> {
  // Full access for self and admin
  if (currentUserId === targetProfileId || currentUserRole === 'admin') {
    return profile;
  }
  
  // Limited public fields for others
  return {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    company_name: profile.company_name,
    role: profile.role
    // Exclude: email, phone, avatar_url, etc.
  };
}
```

## Security Checklist

Before implementing any data access function, verify:

- [ ] **Authentication**: Does the function verify the user is logged in?
- [ ] **Authorization**: Does the function check if the user can access this data?
- [ ] **Data Scoping**: Is the data properly filtered to the user's access level?
- [ ] **Field Filtering**: Are sensitive fields hidden from unauthorized users?
- [ ] **Audit Logging**: Are access attempts logged for security monitoring?
- [ ] **Error Handling**: Do errors avoid leaking sensitive information?
- [ ] **Rate Limiting**: Is the function protected against abuse?

## Common Vulnerabilities to Avoid

### 1. Missing Authorization
```typescript
// BAD: No auth check
async function getUserData(userId: string) {
  return await db.getUser(userId);
}

// GOOD: With auth check
async function getUserData(userId: string, currentUser: User) {
  if (!canAccess(currentUser, userId)) throw new Error('Unauthorized');
  return await db.getUser(userId);
}
```

### 2. Data Over-Exposure
```typescript
// BAD: Returns all fields
return {
  id: user.id,
  email: user.email,        // Sensitive!
  password_hash: user.hash, // Very sensitive!
  phone: user.phone         // Sensitive!
};

// GOOD: Returns only necessary fields
return {
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name
};
```

### 3. Missing Audit Trails
```typescript
// BAD: No logging
async function accessSensitiveData(id: string) {
  return await getData(id);
}

// GOOD: With logging
async function accessSensitiveData(id: string, currentUser: User) {
  logAccess('sensitive_data', currentUser.id, id);
  return await getData(id);
}
```

## Using the Secure Profile Service

Always use `SecureProfileService` instead of direct database queries:

```typescript
import { SecureProfileService } from '@/services/profile/SecureProfileService';

// In your component or service
const { profile, error } = await SecureProfileService.getProfileById(
  targetUserId,
  currentUser.id,  
  currentUser.role
);

if (error) {
  // Handle authorization error
  console.error('Profile access denied:', error);
  return;
}

// Use filtered profile data
console.log('Accessible profile data:', profile);
```

## Security Audit

Use the `SecurityAudit` utility to identify potential vulnerabilities:

```typescript
import { SecurityAudit } from '@/services/security/SecurityAudit';

// Generate security report
const report = SecurityAudit.generateReport();
console.log('Security vulnerabilities found:', report.summary.total);

// Report new vulnerabilities
SecurityAudit.reportVulnerability({
  severity: 'high',
  type: 'unauthorized_access',
  description: 'Function lacks proper authorization',
  location: 'src/components/UserProfile.tsx',
  recommendation: 'Add role-based access control'
});
```

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do not** commit the vulnerable code
2. Report it immediately to the security team
3. Document the issue with:
   - Location of vulnerable code
   - Potential impact
   - Recommended fix
   - Steps to reproduce

## Regular Security Reviews

- Conduct monthly security audits of data access patterns
- Review new functions for authorization checks
- Monitor audit logs for suspicious activity
- Update security guidelines as new patterns emerge

Remember: **Security is everyone's responsibility**. Always err on the side of caution when handling user data.
