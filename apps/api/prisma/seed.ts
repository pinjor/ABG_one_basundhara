import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  await prisma.user.createMany({
    data: [
      { name: "Farhan Ahmed", email: "admin@bsc.com.bd", role: "SUPER_ADMIN", passwordHash },
      { name: "Nusrat Jahan", email: "venue.manager@bsc.com.bd", role: "VENUE_FACILITY_MANAGER", passwordHash },
      { name: "Tanvir Hasan", email: "bookings@bsc.com.bd", role: "BOOKINGS_OFFICER", passwordHash },
      { name: "Rakib Hossain", email: "gate.officer@bsc.com.bd", role: "GATE_SECURITY_OFFICER", passwordHash },
      { name: "Ishrat Zaman", email: "protocol@bsc.com.bd", role: "PROTOCOL_OFFICER", passwordHash },
      { name: "Mahin Chowdhury", email: "hospitality@bsc.com.bd", role: "HOSPITALITY_LEAD", passwordHash },
      { name: "Sabbir Rahman", email: "parking@bsc.com.bd", role: "PARKING_MARSHAL", passwordHash },
      { name: "Jannatul Ferdous", email: "fleet@bsc.com.bd", role: "FLEET_DISPATCHER", passwordHash },
      { name: "Shahriar Kabir", email: "executive@bsc.com.bd", role: "READ_ONLY_EXECUTIVE", passwordHash },
    ],
    skipDuplicates: true,
  });

  const admin = await prisma.user.findUniqueOrThrow({ where: { email: "admin@bsc.com.bd" } });

  const zoneData = [
    { name: "Central Stadium Complex", type: "Stadium", capacity: 45000, liveOccupancy: 3200, mapX: 0.5, mapY: 0.3 },
    { name: "Cricket Ground & Pavilion", type: "Stadium", capacity: 18000, liveOccupancy: 900, mapX: 0.68, mapY: 0.28 },
    { name: "Aquatic Centre", type: "Facility", capacity: 1200, liveOccupancy: 180, mapX: 0.3, mapY: 0.45 },
    { name: "Racquet Sports Pavilion", type: "Facility", capacity: 600, liveOccupancy: 95, mapX: 0.4, mapY: 0.55 },
    { name: "Futsal & Hockey Arena", type: "Facility", capacity: 2500, liveOccupancy: 310, mapX: 0.55, mapY: 0.6 },
    { name: "VIP Pavilion & Protocol Wing", type: "Hospitality", capacity: 400, liveOccupancy: 40, mapX: 0.6, mapY: 0.25 },
    { name: "Retail Boulevard", type: "Commercial", capacity: 5000, liveOccupancy: 1100, mapX: 0.2, mapY: 0.65 },
    { name: "North Training Grounds", type: "Facility", capacity: 800, liveOccupancy: 60, mapX: 0.75, mapY: 0.5 },
    { name: "Parking Precinct A", type: "Parking", capacity: 2000, liveOccupancy: 850, mapX: 0.15, mapY: 0.2 },
    { name: "Parking Precinct B (VIP)", type: "Parking", capacity: 300, liveOccupancy: 90, mapX: 0.82, mapY: 0.18 },
    { name: "Broadcast & Media Compound", type: "Restricted", capacity: 150, liveOccupancy: 22, mapX: 0.88, mapY: 0.35 },
    { name: "Back-of-House Services Yard", type: "Restricted", capacity: 100, liveOccupancy: 18, mapX: 0.1, mapY: 0.85 },
  ];

  for (const z of zoneData) {
    const existing = await prisma.zone.findFirst({ where: { name: z.name } });
    if (!existing) {
      await prisma.zone.create({ data: { ...z, status: "Operational" } });
    }
  }

  const zones = await prisma.zone.findMany();
  const zoneByName = (name: string) => zones.find((z) => z.name === name)!;

  const facilityData = [
    { name: "Main Stadium Pitch", zone: "Central Stadium Complex", type: "Football Pitch", capacity: 45000, status: "Available" },
    { name: "Stadium Warm-up Field", zone: "Central Stadium Complex", type: "Training Ground", capacity: 200, status: "Available" },
    { name: "International Cricket Ground", zone: "Cricket Ground & Pavilion", type: "Cricket Ground", capacity: 18000, status: "Reserved" },
    { name: "Indoor Pool Hall", zone: "Aquatic Centre", type: "Swimming Pool", capacity: 300, status: "Available" },
    { name: "Diving Pool", zone: "Aquatic Centre", type: "Swimming Pool", capacity: 80, status: "Maintenance" },
    { name: "Padel Court 1", zone: "Racquet Sports Pavilion", type: "Padel Court", capacity: 8, status: "In Use" },
    { name: "Padel Court 2", zone: "Racquet Sports Pavilion", type: "Padel Court", capacity: 8, status: "Available" },
    { name: "Squash Court A", zone: "Racquet Sports Pavilion", type: "Squash Court", capacity: 4, status: "Available" },
    { name: "Tennis Court 1", zone: "Racquet Sports Pavilion", type: "Tennis Court", capacity: 20, status: "Reserved" },
    { name: "Badminton Hall", zone: "Racquet Sports Pavilion", type: "Badminton Court", capacity: 60, status: "Available" },
    { name: "Futsal Arena 1", zone: "Futsal & Hockey Arena", type: "Turf", capacity: 150, status: "In Use" },
    { name: "Hockey Turf", zone: "Futsal & Hockey Arena", type: "Turf", capacity: 500, status: "Available" },
    { name: "Elite Performance Gym", zone: "North Training Grounds", type: "Gym", capacity: 120, status: "Available" },
    { name: "VIP Lounge Deck", zone: "VIP Pavilion & Protocol Wing", type: "Lounge", capacity: 250, status: "Available" },
    { name: "Media Briefing Room", zone: "Broadcast & Media Compound", type: "Media Room", capacity: 80, status: "Available" },
  ];

  for (const f of facilityData) {
    const existing = await prisma.facility.findFirst({ where: { name: f.name } });
    if (!existing) {
      await prisma.facility.create({
        data: {
          name: f.name,
          zoneId: zoneByName(f.zone).id,
          type: f.type,
          capacity: f.capacity,
          status: f.status,
          lastInspectionDate: new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000),
        },
      });
    }
  }

  const facilities = await prisma.facility.findMany();
  const facilityByName = (name: string) => facilities.find((f) => f.name === name)!;

  const gateData = [
    { name: "Main Gate North", zone: "Central Stadium Complex", type: "Main" },
    { name: "Main Gate South", zone: "Central Stadium Complex", type: "Main" },
    { name: "VIP Gate 1", zone: "VIP Pavilion & Protocol Wing", type: "VIP" },
    { name: "Team Entrance", zone: "North Training Grounds", type: "Team" },
    { name: "Media Accreditation Gate", zone: "Broadcast & Media Compound", type: "Media" },
    { name: "Service Gate — Back of House", zone: "Back-of-House Services Yard", type: "Service" },
    { name: "Cricket Ground Turnstile A", zone: "Cricket Ground & Pavilion", type: "Main" },
  ];
  for (const g of gateData) {
    const existing = await prisma.gate.findFirst({ where: { name: g.name } });
    if (!existing) {
      await prisma.gate.create({
        data: { name: g.name, zoneId: zoneByName(g.zone).id, type: g.type, entriesToday: Math.floor(Math.random() * 400) },
      });
    }
  }
  const gates = await prisma.gate.findMany();
  const gateByName = (name: string) => gates.find((g) => g.name === name)!;

  const memberData = [
    { name: "Rezaul Karim", email: "rezaul.karim@example.com", tier: "Individual", status: "Active", checkInCount: 42 },
    { name: "Farah Diba", email: "farah.diba@example.com", tier: "Family", status: "Active", checkInCount: 18 },
    { name: "Anisur Rahman", email: "anisur.rahman@example.com", tier: "Corporate", status: "Active", checkInCount: 63 },
    { name: "Tasnia Islam", email: "tasnia.islam@example.com", tier: "Individual", status: "Frozen", checkInCount: 7 },
    { name: "Kamrul Hasan", email: "kamrul.hasan@example.com", tier: "Individual", status: "Expired", checkInCount: 120 },
    { name: "Nabila Yasmin", email: "nabila.yasmin@example.com", tier: "Family", status: "Active", checkInCount: 29 },
  ];
  for (const m of memberData) {
    const existing = await prisma.member.findUnique({ where: { email: m.email } });
    if (!existing) {
      const expiryOffsetDays = m.status === "Expired" ? -10 : 300;
      await prisma.member.create({
        data: {
          name: m.name,
          email: m.email,
          tier: m.tier,
          status: m.status,
          checkInCount: m.checkInCount,
          expiryDate: new Date(Date.now() + expiryOffsetDays * 86400000),
          lockerId: `L-${Math.floor(100 + Math.random() * 900)}`,
        },
      });
    }
  }
  const members = await prisma.member.findMany();

  const visitorData = [
    { name: "David Chen", host: "Nusrat Jahan", purpose: "Facility tour", category: "Tour", status: "Expected" },
    { name: "Ayesha Siddiqua", host: "Mahin Chowdhury", purpose: "Vendor meeting", category: "Supplier", status: "Checked In" },
    { name: "St. Joseph School Group", host: "Rakib Hossain", purpose: "School sports visit", category: "School Group", status: "Checked In" },
    { name: "Jamal Uddin", host: "Farhan Ahmed", purpose: "HVAC maintenance", category: "Contractor", status: "Checked Out" },
    { name: "Priya Nair", host: "Ishrat Zaman", purpose: "Broadcast setup", category: "Media", status: "Expected" },
  ];
  for (const v of visitorData) {
    const existing = await prisma.visitor.findFirst({ where: { name: v.name, host: v.host } });
    if (!existing) {
      await prisma.visitor.create({
        data: {
          name: v.name,
          host: v.host,
          purpose: v.purpose,
          category: v.category,
          status: v.status,
          escortRequired: v.category === "Contractor" || v.category === "Media",
          checkInTime: v.status !== "Expected" ? new Date(Date.now() - 3600_000) : undefined,
          checkOutTime: v.status === "Checked Out" ? new Date() : undefined,
        },
      });
    }
  }

  const bookingData = [
    { facility: "Padel Court 2", customerName: "Rezaul Karim", memberIdx: 0, type: "Member", daysFromNow: 0, start: "18:00", end: "19:00", status: "Confirmed", amount: 1500 },
    { facility: "Squash Court A", customerName: "Anisur Rahman", memberIdx: 2, type: "Member", daysFromNow: 0, start: "19:00", end: "20:00", status: "Pending", amount: 1200 },
    { facility: "Badminton Hall", customerName: "Dhaka Corporate League", memberIdx: null, type: "Corporate", daysFromNow: 1, start: "17:00", end: "19:00", status: "Confirmed", amount: 8000 },
    { facility: "Hockey Turf", customerName: "Bashundhara Youth Academy", memberIdx: null, type: "Academy", daysFromNow: 2, start: "08:00", end: "10:00", status: "Pending", amount: 6000 },
    { facility: "Tennis Court 1", customerName: "Farah Diba", memberIdx: 1, type: "Member", daysFromNow: -1, start: "07:00", end: "08:00", status: "Completed", amount: 1000 },
  ];
  for (const b of bookingData) {
    const existing = await prisma.booking.findFirst({ where: { customerName: b.customerName, timeSlotStart: b.start } });
    if (!existing) {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() + b.daysFromNow);
      await prisma.booking.create({
        data: {
          facilityId: facilityByName(b.facility).id,
          customerName: b.customerName,
          memberId: b.memberIdx !== null ? members[b.memberIdx]?.id : undefined,
          type: b.type,
          date,
          timeSlotStart: b.start,
          timeSlotEnd: b.end,
          status: b.status,
          amount: b.amount,
          paymentStatus: b.status === "Completed" ? "Paid" : "Deposit Paid",
          createdById: admin.id,
        },
      });
    }
  }

  const accessLogData = [
    { gate: "Main Gate North", personRef: "Member #A104", method: "QR", result: "Approved" },
    { gate: "Main Gate North", personRef: "Visitor #V22", method: "QR", result: "Approved" },
    { gate: "VIP Gate 1", personRef: "VIP: Ishrat Zaman party", method: "Face", result: "Approved" },
    { gate: "Media Accreditation Gate", personRef: "Press Badge #M8", method: "RFID", result: "Denied" },
    { gate: "Service Gate — Back of House", personRef: "Contractor: Jamal Uddin", method: "Biometric", result: "Approved" },
  ];
  for (const a of accessLogData) {
    const existing = await prisma.accessLogEntry.findFirst({ where: { personRef: a.personRef } });
    if (!existing) {
      await prisma.accessLogEntry.create({
        data: { gateId: gateByName(a.gate).id, personRef: a.personRef, method: a.method, result: a.result },
      });
    }
  }

  console.log(
    `Seeded ${zoneData.length} zones, ${facilityData.length} facilities, ${gateData.length} gates, ` +
      `${memberData.length} members, ${visitorData.length} visitors, ${bookingData.length} bookings, 9 users.`,
  );
  console.log("All seed users share the password: Password123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
