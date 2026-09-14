-- AlterTable
ALTER TABLE `Booking` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `Product` MODIFY `description` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Specialist` MODIFY `academicBackground` TEXT NOT NULL,
    MODIFY `workExperience` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `Treatment` MODIFY `description` TEXT NOT NULL,
    MODIFY `historyOfProcedure` TEXT NULL,
    MODIFY `patientRequirements` TEXT NULL;
