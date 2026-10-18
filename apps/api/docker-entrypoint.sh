#!/bin/sh
set -eu
cd /app/apps/api
bunx prisma migrate deploy
USERS=$(bun -e 'const {PrismaClient}=require("@prisma/client"); const p=new PrismaClient(); p.user.count().then((n)=>{console.log(n); return p.$disconnect();}).catch((e)=>{console.error(e); process.exit(1);})')
if [ "$USERS" = "0" ]; then
  echo "Empty database. Seeding."
  bun prisma/seed.ts
fi
exec bun dist/main.js
