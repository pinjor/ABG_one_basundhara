import { SetMetadata } from "@nestjs/common";
import type { Capability } from "@abg-dispatch/shared";

export const PUBLIC_KEY = "isPublic";
/** No authentication (login, OTP request, provider webhooks). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

export const ALLOW_GUEST_KEY = "allowGuest";
/** Guest carrier sessions may call this route (object checks still apply). */
export const AllowGuest = () => SetMetadata(ALLOW_GUEST_KEY, true);

export const CAPABILITIES_KEY = "capabilities";
/** Caller must hold every listed capability. */
export const RequireCapability = (...caps: Capability[]) => SetMetadata(CAPABILITIES_KEY, caps);

export const ALLOW_READ_ONLY_KEY = "allowReadOnly";
/** Read-only roles (auditors) may call this non-GET route — e.g. marking their own notifications read. */
export const AllowReadOnly = () => SetMetadata(ALLOW_READ_ONLY_KEY, true);
