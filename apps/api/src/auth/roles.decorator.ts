import { SetMetadata } from "@nestjs/common";
import { Role } from "@bsc/shared";

export const ROLES_KEY = "roles";
/** Restricts an endpoint to the given roles. SUPER_ADMIN always passes (enforced in RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const READ_ONLY_KEY = "allowReadOnlyExecutive";
/** Marks a GET endpoint as visible to the Read-only Executive role even outside its normal module scope. */
export const AllowReadOnlyExecutive = () => SetMetadata(READ_ONLY_KEY, true);
