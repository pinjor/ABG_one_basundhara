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

export interface BookingDto {
  id: string;
  facilityId: string;
  facility?: Pick<FacilityDto, "id" | "name" | "type">;
  customerName: string;
  memberId: string | null;
  type: string;
  date: string;
  timeSlotStart: string;
  timeSlotEnd: string;
  status: string;
  amount: string | number;
  paymentStatus: string;
  qrConfirmationCode: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDto {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: string;
  joinDate: string;
  expiryDate: string;
  status: string;
  checkInCount: number;
  lastCheckIn: string | null;
  lockerId: string | null;
  billingCycle: string;
  createdAt: string;
  updatedAt: string;
}

export interface GateDto {
  id: string;
  name: string;
  zoneId: string;
  zone?: Pick<ZoneDto, "id" | "name" | "type">;
  type: string;
  status: string;
  entriesToday: number;
  createdAt: string;
  updatedAt: string;
}

export interface AccessLogEntryDto {
  id: string;
  gateId: string;
  gate?: Pick<GateDto, "id" | "name" | "type">;
  personRef: string;
  credentialRef: string | null;
  method: string;
  result: string;
  timestamp: string;
}

export interface VisitorDto {
  id: string;
  name: string;
  host: string;
  purpose: string;
  category: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: string;
  escortRequired: boolean;
  qrPassCode: string;
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
