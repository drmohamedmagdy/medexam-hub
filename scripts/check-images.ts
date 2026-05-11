import { prisma } from "../src/lib/db";

async function main() {
  // Most recent exams created with withImages = true.
  const recent = await prisma.exam.findMany({
    where: { withImages: true },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      questions: {
        select: {
          id: true,
          prompt: true,
          imageUrl: true,
          imageDescription: true,
        },
        orderBy: { orderIndex: "asc" },
      },
    },
  });

  if (recent.length === 0) {
    console.log(
      "No exams found with withImages=true. The checkbox may not be sending its value, OR the column default kicked in."
    );
    return;
  }

  for (const e of recent) {
    console.log(`\n📚 ${e.title}`);
    console.log(`   ${e.createdAt.toISOString()}  id=${e.id}`);
    console.log(
      `   Total questions: ${e.questions.length}  |  With description: ${e.questions.filter((q) => q.imageDescription).length}  |  With image URL: ${e.questions.filter((q) => q.imageUrl).length}`
    );
    for (const q of e.questions.slice(0, 5)) {
      console.log(`    Q: ${q.prompt.slice(0, 60)}…`);
      console.log(`      desc:  ${q.imageDescription ?? "(null)"}`);
      console.log(`      url:   ${q.imageUrl ?? "(null)"}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => process.exit(0));
