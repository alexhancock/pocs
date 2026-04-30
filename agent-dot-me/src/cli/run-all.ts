#!/usr/bin/env tsx
import { spawnSync } from "node:child_process";
import { scenarios } from "../scenarios.js";

for (const id of Object.keys(scenarios)) {
  console.log("\n════════════════════════════════════════════════════════════");
  console.log(`  ${id}`);
  console.log("════════════════════════════════════════════════════════════");
  spawnSync("tsx", ["src/cli/run-scenario.ts", id, "--speed=0.1"], {
    stdio: "inherit",
  });
}
