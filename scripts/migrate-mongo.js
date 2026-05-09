#!/usr/bin/env node
/**
 * Migrate cert data from MongoDB NDJSON export to PostgreSQL via Prisma.
 *
 * Usage:
 *   node scripts/migrate-mongo.js --file /tmp/certs.json [--dry-run]
 *
 * Options:
 *   --file <path>   Path to the mongoexport NDJSON file (required)
 *   --dry-run       Parse and validate without writing to the database
 */

import fs from "fs";
import path from "path";
import readline from "readline";
import { PrismaClient } from "@prisma/client";
import { mapDoc } from "./migrate-mongo-helpers.js";

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const dryRun = args.includes("--dry-run");

if (fileIndex === -1 || !args[fileIndex + 1]) {
    console.error("Usage: node scripts/migrate-mongo.js --file <path> [--dry-run]");
    process.exit(1);
}

const filePath = path.resolve(args[fileIndex + 1]);
if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n📂 Reading: ${filePath}`);
    console.log(dryRun ? "🔍 DRY RUN — no data will be written\n" : "🚀 LIVE RUN — writing to database\n");

    const prisma = dryRun ? null : new PrismaClient();

    const rl = readline.createInterface({ input: fs.createReadStream(filePath) });

    let total = 0;
    let inserted = 0;
    let skipped = 0;
    let failed = 0;
    const allWarnings = [];
    const errors = [];

    for await (const line of rl) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        total++;
        let doc;
        try {
            doc = JSON.parse(trimmed);
        } catch {
            errors.push({ line: total, error: "invalid JSON" });
            failed++;
            continue;
        }

        const { data, warnings } = mapDoc(doc);

        if (warnings.length) {
            allWarnings.push({ certNum: data.certNum ?? `line ${total}`, warnings });
        }

        // Skip records missing required fields
        const missing = ["name", "idNum", "certNum", "expDate"].filter((f) => !data[f]);
        if (missing.length) {
            errors.push({ certNum: data.certNum ?? `line ${total}`, error: `missing required: ${missing.join(", ")}` });
            skipped++;
            continue;
        }

        if (!dryRun) {
            try {
                await prisma.cert.upsert({
                    where: { certNum: data.certNum },
                    update: data,
                    create: data,
                });
                inserted++;
            } catch (err) {
                errors.push({ certNum: data.certNum, error: err.message });
                failed++;
            }
        } else {
            inserted++;
        }

        if (total % 50 === 0) process.stdout.write(`  processed ${total}...\r`);
    }

    if (prisma) await prisma.$disconnect();

    // ── Report ──────────────────────────────────────────────────────────────

    console.log(`\n${"─".repeat(50)}`);
    console.log(`Total documents : ${total}`);
    console.log(`Inserted/updated: ${inserted}`);
    console.log(`Skipped         : ${skipped}`);
    console.log(`Failed          : ${failed}`);

    if (allWarnings.length) {
        console.log(`\n⚠️  Warnings (${allWarnings.length} records):`);
        for (const { certNum, warnings } of allWarnings.slice(0, 20)) {
            console.log(`  [${certNum}] ${warnings.join("; ")}`);
        }
        if (allWarnings.length > 20) console.log(`  ... and ${allWarnings.length - 20} more`);
    }

    if (errors.length) {
        console.log(`\n❌ Errors (${errors.length}):`);
        for (const { certNum, error } of errors) {
            console.log(`  [${certNum}] ${error}`);
        }
    }

    console.log(`\n${"─".repeat(50)}`);
    console.log(dryRun ? "Dry run complete. Re-run without --dry-run to write." : "Migration complete.");
}

main().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
});
