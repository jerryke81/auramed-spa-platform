-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "memberId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LoyaltyTransaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Member" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "middleName" TEXT,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "dob" DATETIME NOT NULL,
    "nationality" TEXT NOT NULL,
    "profilePhotoUrl" TEXT,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "physicalAddress" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "healthConditions" TEXT NOT NULL,
    "interestedServices" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "emergencyContactRelationship" TEXT NOT NULL,
    "emergencyContactPhone" TEXT NOT NULL,
    "membershipTier" TEXT NOT NULL,
    "marketingOptIn" BOOLEAN NOT NULL,
    "agreedToTerms" BOOLEAN NOT NULL,
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Member" ("agreedToTerms", "createdAt", "dob", "email", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship", "firstName", "gender", "healthConditions", "id", "interestedServices", "lastName", "marketingOptIn", "membershipTier", "middleName", "mobile", "nationality", "passwordHash", "physicalAddress", "profilePhotoUrl") SELECT "agreedToTerms", "createdAt", "dob", "email", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelationship", "firstName", "gender", "healthConditions", "id", "interestedServices", "lastName", "marketingOptIn", "membershipTier", "middleName", "mobile", "nationality", "passwordHash", "physicalAddress", "profilePhotoUrl" FROM "Member";
DROP TABLE "Member";
ALTER TABLE "new_Member" RENAME TO "Member";
CREATE UNIQUE INDEX "Member_email_key" ON "Member"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
