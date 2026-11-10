-- Anonymous cases keep the confessor's featuring choice from when they were filed (audit 46 D3).
ALTER TABLE "Case" ADD COLUMN "featurable" BOOLEAN NOT NULL DEFAULT true;
UPDATE "Case" c SET "featurable" = u."allowFeaturing" FROM "User" u WHERE u."id" = c."accusedId";
