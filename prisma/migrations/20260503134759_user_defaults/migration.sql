-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultDifficulty" "Difficulty",
ADD COLUMN     "defaultExamType" TEXT,
ADD COLUMN     "defaultGenerationMode" TEXT,
ADD COLUMN     "defaultLanguage" TEXT,
ADD COLUMN     "defaultMode" "ExamMode",
ADD COLUMN     "defaultNumQuestions" INTEGER,
ADD COLUMN     "defaultSpecialty" TEXT,
ADD COLUMN     "defaultTopic" TEXT;
