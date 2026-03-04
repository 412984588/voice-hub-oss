import { extname } from 'node:path';

const MAX_SNIPPET_LENGTH = 80;

export const PATTERNS = [
  {
    name: 'Discord Bot Token',
    pattern: /['"`]([A-Za-z\d]{24,}\.[A-Za-z\d]{6,}\.[A-Za-z\d_-]{27,})['"`]/,
  },
  {
    name: 'API Key',
    pattern: /(?:api[_-]?key|apikey)['":\s]*['"`]([A-Za-z0-9_-]{20,})['"`]/i,
  },
  {
    name: 'Secret',
    pattern: /(?:secret|password|token)['":\s]*['"`]([A-Za-z0-9_-]{16,})['"`]/i,
  },
  {
    name: 'Bearer Token',
    pattern: /bearer\s+([A-Za-z0-9_.-]{20,})/i,
  },
  {
    name: 'JWT',
    pattern: /['"`](eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)['"`]/,
  },
];

const INCLUDED_EXTENSIONS = new Set(['.ts', '.js', '.json', '.md']);
const INCLUDED_FILES = new Set(['.env', '.env.example']);
const TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/;

function toGlobalRegex(regex) {
  const flags = regex.flags.includes('g') ? regex.flags : `${regex.flags}g`;
  return new RegExp(regex.source, flags);
}

function getLineMetadata(content, matchIndex) {
  const prefix = content.slice(0, matchIndex);
  const line = prefix.split('\n').length;
  const lineContent = content.split('\n')[line - 1] ?? '';

  return {
    line,
    content: lineContent.trim().slice(0, MAX_SNIPPET_LENGTH),
  };
}

export function shouldScanFileName(fileName) {
  // 排除测试文件
  if (TEST_FILE_PATTERN.test(fileName)) {
    return false;
  }

  if (INCLUDED_FILES.has(fileName)) {
    return true;
  }

  return INCLUDED_EXTENSIONS.has(extname(fileName));
}

export function scanText(content) {
  const issues = [];

  for (const entry of PATTERNS) {
    const regex = toGlobalRegex(entry.pattern);
    let match;

    while ((match = regex.exec(content)) !== null) {
      const metadata = getLineMetadata(content, match.index);
      issues.push({
        pattern: entry.name,
        line: metadata.line,
        content: metadata.content,
      });

      if (match[0].length === 0) {
        regex.lastIndex += 1;
      }
    }
  }

  return issues;
}
