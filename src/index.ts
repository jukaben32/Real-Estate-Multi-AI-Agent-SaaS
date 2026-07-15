import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/db";

async function main() {
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`🚀 EstateCall API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
