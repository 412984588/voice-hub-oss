#!/usr/bin/env node

/**
 * Voice Hub Doctor
 * 诊断项目配置和依赖问题
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const checks = [];

// 颜色输出
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${colors.reset} ${message}`);
}

// 检查 Node.js 版本
checks.push({
  name: "Node.js Version",
  check: () => {
    const version = process.version;
    const major = parseInt(version.slice(1).split(".")[0]);
    return {
      pass: major >= 22,
      message: `Node.js ${version} ${major >= 22 ? "(✓)" : "(✗ 需要 >= 22.12.0)"}`,
    };
  },
});

// 检查 pnpm 版本
checks.push({
  name: "pnpm Version",
  check: async () => {
    try {
      const { execSync } = await import("node:child_process");
      const output = execSync("pnpm --version", { encoding: "utf8" });
      const version = output.trim();
      const major = parseInt(version.split(".")[0]);
      return {
        pass: major >= 9,
        message: `pnpm ${version} ${major >= 9 ? "(✓)" : "(✗ 需要 >= 9.0.0)"}`,
      };
    } catch {
      return {
        pass: false,
        message: "pnpm 未安装 (✗)",
      };
    }
  },
});

// 检查 .env 文件
checks.push({
  name: "Environment Configuration",
  check: () => {
    const envPath = join(__dirname, "../.env");
    const envExamplePath = join(__dirname, "../.env.example");

    if (!existsSync(envPath)) {
      if (existsSync(envExamplePath)) {
        return {
          pass: false,
          message: ".env 文件不存在，但有 .env.example (请复制并配置)",
        };
      }
      return {
        pass: false,
        message: ".env 文件不存在",
      };
    }

    const envContent = readFileSync(envPath, "utf-8");
    const requiredVars = [
      "DISCORD_BOT_TOKEN",
      "DISCORD_GUILD_ID",
      "DISCORD_VOICE_CHANNEL_ID",
    ];

    const missing = [];
    for (const v of requiredVars) {
      if (!envContent.includes(`${v}=`) || envContent.includes(`${v}=''`)) {
        missing.push(v);
      }
    }

    if (missing.length > 0) {
      return {
        pass: false,
        message: `.env 缺少必需变量: ${missing.join(", ")}`,
      };
    }

    return {
      pass: true,
      message: ".env 配置完整 (✓)",
    };
  },
});

// 检查依赖安装
checks.push({
  name: "Dependencies",
  check: () => {
    const nodeModulesPath = join(__dirname, "../node_modules");
    return {
      pass: existsSync(nodeModulesPath),
      message: existsSync(nodeModulesPath)
        ? "依赖已安装 (✓)"
        : "依赖未安装 (运行 pnpm install)",
    };
  },
});

// 检查数据目录
checks.push({
  name: "Data Directory",
  check: () => {
    const dataPath = join(__dirname, "../data");
    return {
      pass: existsSync(dataPath) || !existsSync(dataPath), // 目录不存在也算通过（会自动创建）
      message: existsSync(dataPath)
        ? "数据目录存在 (✓)"
        : "数据目录不存在（会在首次运行时创建）",
    };
  },
});

// 运行所有检查
async function runDoctor() {
  console.log("Voice Hub Doctor\n");

  let allPassed = true;

  for (const check of checks) {
    const result = await check.check();

    if (result.pass) {
      log(colors.green, "✓", `[${check.name}] ${result.message}`);
    } else {
      log(colors.red, "✗", `[${check.name}] ${result.message}`);
      allPassed = false;
    }
  }

  console.log("");

  if (allPassed) {
    log(colors.green, "✓", "所有检查通过！");
    console.log("\n运行以下命令启动服务:");
    console.log(`  ${colors.blue}pnpm start${colors.reset}`);
  } else {
    log(colors.red, "✗", "发现问题，请修复后重试");
    process.exit(1);
  }
}

runDoctor().catch((error) => {
  console.error("Doctor 运行失败:", error);
  process.exit(1);
});
