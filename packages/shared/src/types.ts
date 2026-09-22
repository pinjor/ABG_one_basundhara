// type/status are stored and validated as plain strings against the enums in
// ./enums (see apps/api/prisma/schema.prisma header) rather than typed as the
// enum itself, so forms can hold an in-progress value while editing.

export interface ZoneDto {
  id: string;
  name: string;
  type: string;
  parentZoneId: string | null;
  building: string | null;
  floor: string | null;
  capacity: number;
  liveOccupancy: number;
  mapX: number | null;
  mapY: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacilityDto {
  id: string;
  name: string;
  zoneId: string;
  zone?: Pick<ZoneDto, "id" | "name" | "type">;
  type: string;
  capacity: number;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  status: string;
  currentBookingRef: string | null;
  nextBookingRef: string | null;
  lastInspectionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDto {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  userName: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface AuthUserDto {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface LoginResponseDto {
  accessToken: string;
  user: AuthUserDto;
}
