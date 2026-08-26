export function userBelongsToOrganization(
  user: { organizationId: string },
  organizationId: string
): boolean {
  return user.organizationId === organizationId;
}
