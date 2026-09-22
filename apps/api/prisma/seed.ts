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

  console.log(`Seeded ${zoneData.length} zones and ${facilityData.length} facilities, ${9} users.`);
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
