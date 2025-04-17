
export const rolesHierarchy = {
    ADMIN: 5,
    GM: 4,
    LM: 3,
    DR: 2,
    HR: 1,
    R: 0,
};

export function canAccessHigherRole(userRole, targetRole) {
    return rolesHierarchy[userRole] > rolesHierarchy[targetRole];
}

