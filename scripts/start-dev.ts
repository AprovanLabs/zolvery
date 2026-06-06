#!/usr/bin/env node
/**
 * Development server starter with dynamic port allocation.
 *
 * Allocates consecutive ports for all services and starts them together.
 */

import { spawn, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { allocatePorts, PROJECT_BASES } from "@aprovan/copilot-proxy";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

async function main() {
  console.log("\n🎮 Starting Zolvery dev services...\n");

  const { base, ports } = await allocatePorts({
    base: PROJECT_BASES.zolvery,
    count: 4,
    increment: 10,
  });

  const [clientPort, stitcheryPort, serverPort, turnPort] = ports;

  console.log(`📍 Allocated port range: ${base}-${base + 3}`);
  console.log(`   Client:     http://127.0.0.1:${clientPort}`);
  console.log(`   Stitchery:  http://127.0.0.1:${stitcheryPort}`);
  console.log(`   Server:     http://127.0.0.1:${serverPort}`);
  console.log(`   TURN:       ${turnPort}\n`);

  // Export ports for child processes
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CLIENT_PORT: String(clientPort),
    STITCHERY_PORT: String(stitcheryPort),
    SERVER_PORT: String(serverPort),
    PORT: String(serverPort),
    TURN_PORT: String(turnPort),
    STITCHERY_URL: `http://127.0.0.1:${stitcheryPort}`,
  };

  // Start docker services
  console.log("🐳 Starting Docker services...");
  try {
    execSync("docker compose up -d", { cwd: rootDir, stdio: "inherit" });
  } catch {
    console.warn("⚠️  Docker compose failed, continuing without it");
  }

  const children: ReturnType<typeof spawn>[] = [];

  // Start Stitchery
  console.log("\n🧵 Starting Stitchery...");
  const stitchery = spawn(
    "pnpm",
    ["dlx", "@aprovan/stitchery", "serve", "-p", String(stitcheryPort), "--strict"],
    { stdio: "pipe", env, cwd: rootDir }
  );
  stitchery.stdout?.on("data", (d) => process.stdout.write(`[stitchery] ${d}`));
  stitchery.stderr?.on("data", (d) => process.stderr.write(`[stitchery] ${d}`));
  children.push(stitchery);

  // Start TURN server
  console.log("🔄 Starting TURN server...");
  const turn = spawn("node", [path.join(__dirname, "start-turn.js")], {
    stdio: "pipe",
    env: { ...env, TURN_PORT: String(turnPort) },
    cwd: rootDir,
  });
  turn.stdout?.on("data", (d) => process.stdout.write(`[turn] ${d}`));
  turn.stderr?.on("data", (d) => process.stderr.write(`[turn] ${d}`));
  children.push(turn);

  // Give services a moment to start
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // The actual turbo dev is run separately via package.json
  console.log("\n✅ Background services started. Run 'pnpm watch' to start the client & server.\n");
  console.log(`   Or set these env vars and run manually:`);
  console.log(`   export CLIENT_PORT=${clientPort}`);
  console.log(`   export SERVER_PORT=${serverPort}`);
  console.log(`   export STITCHERY_URL=http://127.0.0.1:${stitcheryPort}\n`);

  // Handle shutdown
  const cleanup = () => {
    console.log("\n🛑 Shutting down background services...");
    children.forEach((child) => child.kill());
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Keep running
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
