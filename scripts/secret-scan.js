#!/usr/bin/env node

/**
 * Secret Scanner
 * 扫描代码中的硬编码密钥和敏感信息
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scanText, shouldScanFileName } from "./secret-scan-core.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 排除的文件
const EXCLUDED_DIRS = ["node_modules", "dist", ".git", ".claude"];

function scanFile(filePath) {
  const content = readFileSync(filePath, "utf-8");
  return scanText(content);
}

function scanDirectory(dir, results = []) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(file)) {
        scanDirectory(filePath, results);
      }
    } else if (shouldScanFileName(file)) {
      const issues = scanFile(filePath);
      if (issues.length > 0) {
        results.push({ file: filePath, issues });
      }
    }
  }

  return results;
}

export async function main(rootDir = join(__dirname, "..")) {
  console.log("Scanning for secrets...\n");

  const results = scanDirectory(rootDir, []);

  if (results.length === 0) {
    console.log("✓ No secrets found!");
    return;
  }

  console.log(`Found ${results.length} file(s) with potential secrets:\n`);

  for (const result of results) {
    console.log(`📁 ${result.file.replace(rootDir, "")}`);
    for (const issue of result.issues) {
      console.log(`  Line ${issue.line}: [${issue.pattern}]`);
      console.log(`    ${issue.content}`);
    }
    console.log("");
  }

  console.log("⚠️  Please remove sensitive data before committing!");
  process.exit(1);
}

function isMainModule() {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return import.meta.url === pathToFileURL(entry).href;
}

if (isMainModule()) {
  main().catch((error) => {
    console.error("Scan failed:", error);
    process.exit(1);
  });
}
