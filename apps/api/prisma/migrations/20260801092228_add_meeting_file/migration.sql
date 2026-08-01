-- CreateEnum
CREATE TYPE "MeetingFileStatus" AS ENUM ('pending', 'processed');

-- CreateTable
CREATE TABLE "MeetingFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "MeetingFileStatus" NOT NULL DEFAULT 'pending',
    "meetingId" TEXT NOT NULL,

    CONSTRAINT "MeetingFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MeetingFile" ADD CONSTRAINT "MeetingFile_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
