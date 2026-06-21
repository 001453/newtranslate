#!/usr/bin/env node
/**
 * Export docs/GRANT.md → docs/GlobalBridge-Grant-Proposal.pdf
 * Fallback: opens print-ready HTML for Chrome → Save as PDF
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mdPath = join(root, "docs", "GRANT.md");
const htmlPath = join(root, "docs", "GlobalBridge-Grant-Proposal.html");
const pdfPath = join(root, "docs", "GlobalBridge-Grant-Proposal.pdf");

const md = readFileSync(mdPath, "utf8");

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s) {
  return escapeHtml(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function renderTable(tableLines) {
  const rows = tableLines
    .filter((l) => !/^\|[-:\s|]+\|$/.test(l.trim()))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()));
  if (!rows.length) return "";
  let html = "<table>";
  rows.forEach((cells, idx) => {
    html += "<tr>";
    cells.forEach((c) => {
      html += idx === 0 ? `<th>${inline(c)}</th>` : `<td>${inline(c)}</td>`;
    });
    html += "</tr>";
  });
  return html + "</table>";
}

function processBody(body) {
  const lines = body.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line === "---") {
      out.push("<hr/>");
      i++;
      continue;
    }
    if (line.startsWith("```")) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++;
      out.push(`<pre><code>${codeLines.join("\n")}</code></pre>`);
      continue;
    }
    if (line.startsWith("|")) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      out.push(renderTable(tableLines));
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (line.startsWith("- ")) {
      const items = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(`<li>${inline(lines[i].slice(2))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    out.push(`<p>${inline(line)}</p>`);
    i++;
  }
  return out.join("\n");
}

function mdToHtmlFull(text) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n(?=#{1,3} )/);
  const parts = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("# ")) {
      parts.push(`<h1>${inline(trimmed.slice(2).split("\n")[0])}</h1>`);
      const rest = trimmed.split("\n").slice(1).join("\n").trim();
      if (rest) parts.push(processBody(rest));
      continue;
    }
    if (trimmed.startsWith("## ")) {
      const nl = trimmed.indexOf("\n");
      parts.push(`<h2>${inline(nl === -1 ? trimmed.slice(3) : trimmed.slice(3, nl))}</h2>`);
      if (nl !== -1) parts.push(processBody(trimmed.slice(nl + 1)));
      continue;
    }
    if (trimmed.startsWith("### ")) {
      const nl = trimmed.indexOf("\n");
      parts.push(`<h3>${inline(nl === -1 ? trimmed.slice(4) : trimmed.slice(4, nl))}</h3>`);
      if (nl !== -1) parts.push(processBody(trimmed.slice(nl + 1)));
      continue;
    }
    parts.push(processBody(trimmed));
  }
  return parts.join("\n");
}

const body = mdToHtmlFull(md);

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>GlobalBridge AI — Tether Grant Proposal</title>
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body {
      font-family: "Segoe UI", system-ui, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      color: #111;
    }
    h1 { font-size: 20pt; margin: 0 0 8pt; color: #0f172a; }
    h2 { font-size: 13pt; margin: 16pt 0 6pt; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 4pt; }
    h3 { font-size: 11pt; margin: 12pt 0 4pt; color: #334155; }
    p { margin: 4pt 0 8pt; }
    a { color: #2563eb; word-break: break-all; }
    code, pre { font-family: Consolas, monospace; font-size: 9pt; background: #f1f5f9; }
    pre { padding: 8pt 10pt; border-radius: 4pt; white-space: pre-wrap; border: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 12pt; font-size: 9.5pt; }
    th, td { border: 1px solid #cbd5e1; padding: 5pt 7pt; text-align: left; vertical-align: top; }
    th { background: #f8fafc; font-weight: 600; }
    hr { border: none; border-top: 1px solid #e2e8f0; margin: 12pt 0; }
    ul, ol { margin: 4pt 0 10pt 18pt; }
    li { margin-bottom: 3pt; }
    .cover {
      margin-bottom: 20pt; padding: 14pt; background: #f0f9ff;
      border: 1px solid #bae6fd; border-radius: 6pt;
    }
    .cover p { margin: 3pt 0; font-size: 10pt; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <p class="no-print" style="background:#fef3c7;padding:8pt;border-radius:4pt;">
    Chrome: <strong>Ctrl+P</strong> → Destination: <strong>Save as PDF</strong> → Save
  </p>
  <div class="cover">
    <p><strong>Applicant:</strong> Nihat Cetinkaya · nihatcetinkaya077@gmail.com · Turkey</p>
    <p><strong>Repository:</strong> <a href="https://github.com/001453/newtranslate">github.com/001453/newtranslate</a></p>
    <p><strong>Demo:</strong> <a href="https://youtu.be/1cxwP5S7-1A">youtu.be/1cxwP5S7-1A</a> · <strong>Request:</strong> 7,500 USD₮</p>
  </div>
  ${body}
</body>
</html>`;

writeFileSync(htmlPath, html, "utf8");
console.log("HTML:", htmlPath);

async function tryPuppeteer() {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle0" });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
  });
  await browser.close();
}

async function tryChromeHeadless() {
  if (process.platform !== "win32") return false;
  const candidates = [
    join(process.env.ProgramFiles || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env.LOCALAPPDATA || "", "Google", "Chrome", "Application", "chrome.exe"),
  ];
  const chrome = candidates.find((p) => p && existsSync(p));
  if (!chrome) return false;
  execFileSync(
    chrome,
    [
      "--headless",
      "--disable-gpu",
      "--no-pdf-header-footer",
      `--print-to-pdf=${pdfPath}`,
      `file:///${htmlPath.replace(/\\/g, "/")}`,
    ],
    { stdio: "pipe" },
  );
  return existsSync(pdfPath);
}

try {
  if (await tryChromeHeadless()) {
    console.log("PDF:", pdfPath);
    process.exit(0);
  }
  await tryPuppeteer();
  console.log("PDF:", pdfPath);
} catch {
  try {
    execFileSync("npx", ["--yes", "puppeteer", "browsers", "install", "chrome"], {
      cwd: root,
      stdio: "ignore",
      shell: true,
      timeout: 180000,
    });
    if (await tryChromeHeadless()) {
      console.log("PDF:", pdfPath);
      process.exit(0);
    }
    await tryPuppeteer();
    console.log("PDF:", pdfPath);
  } catch {
    console.log("\nOpen HTML in Chrome → Ctrl+P → Save as PDF:\n", htmlPath);
    process.exit(0);
  }
}
