import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const requiredChecks = [
  "foreground",
  "notepad",
  "edge",
  "chrome",
  "claude-draft",
  "photoshop-text",
  "photoshop-image",
  "paint-image",
  "explorer-drag",
  "pinned",
  "failure-recovery",
  "persistence",
  "upgrade-recovery",
  "install-uninstall",
  "narrator",
  "display-scales",
  "multiple-monitors",
  "keyboard-ime",
  "performance",
  "five-business-days",
  "distribution-x64",
  "distribution-arm64",
];

/** Evidence lives outside tracked source so it can name the exact final commit. */
export function assessReadiness(report, commit, artifactHash) {
  const errors = [];
  if (!["unsigned", "authenticode"].includes(report?.distributionMode))
    errors.push("Declare the actual distribution mode");
  if (
    report?.updateMode !== "manual" &&
    report?.updateMode !== "verified-updater"
  )
    errors.push("Declare the actual update mode");
  if (
    report?.updateMode === "verified-updater" &&
    (report?.checks?.["updater-signatures"]?.status !== "passed" ||
      typeof report?.checks?.["updater-signatures"]?.evidence !== "string" ||
      !report?.checks?.["updater-signatures"]?.evidence?.trim())
  )
    errors.push("Verified updater signature evidence is required");
  for (const arch of ["x64", "arm64"]) {
    const check = report?.checks?.[`distribution-${arch}`];
    const expected =
      report?.distributionMode === "unsigned" ? "NotSigned" : "Valid";
    if (check?.authenticode !== expected || check?.checksumMatches !== true)
      errors.push(`Distribution status/checksum not verified: ${arch}`);
  }
  if (report?.sourceClean !== true)
    errors.push("Candidate source must be clean and frozen");
  for (const field of ["osBuild", "reviewer"]) {
    if (typeof report?.[field] !== "string" || !report[field].trim())
      errors.push(`Missing environment evidence: ${field}`);
  }
  const builtAt = Date.parse(report?.candidateBuiltAt);
  if (!Number.isFinite(builtAt) || builtAt > Date.now())
    errors.push("A valid candidate build timestamp is required");
  if (!/^[a-f0-9]{40}$/.test(commit ?? "") || report?.commit !== commit)
    errors.push("Exact source commit is missing or different");
  if (
    !/^[a-f0-9]{64}$/.test(artifactHash ?? "") ||
    report?.artifactSha256 !== artifactHash
  )
    errors.push("Artifact SHA-256 is missing or different");
  if (report?.openCritical !== 0 || report?.openCoreBugs !== 0)
    errors.push("Critical/core defect counts must both be zero");
  for (const id of requiredChecks) {
    const check = report?.checks?.[id];
    if (
      check?.status !== "passed" ||
      typeof check?.evidence !== "string" ||
      !check.evidence.trim()
    )
      errors.push(`Missing passed evidence: ${id}`);
  }
  for (const id of [
    "notepad",
    "edge",
    "chrome",
    "claude-draft",
    "photoshop-text",
  ]) {
    const check = report?.checks?.[id];
    if (
      !(
        Number.isInteger(check?.clickTrials) &&
        check.clickTrials >= 30 &&
        Number.isInteger(check?.enterTrials) &&
        check.enterTrials >= 30 &&
        typeof check?.appVersion === "string" &&
        check.appVersion.trim() &&
        check?.errors === 0
      )
    )
      errors.push(`Insufficient insertion trials: ${id}`);
  }
  const performance = report?.checks?.performance;
  if (
    !(
      Number.isInteger(performance?.revealSamples) &&
      performance.revealSamples >= 30 &&
      Number.isInteger(performance?.searchSamples) &&
      performance.searchSamples >= 30 &&
      Number.isFinite(performance?.revealP95Ms) &&
      Number.isFinite(performance?.searchP95Ms) &&
      performance?.revealP95Ms >= 0 &&
      performance?.revealP95Ms <= 300 &&
      performance?.searchP95Ms >= 0 &&
      performance?.searchP95Ms <= 100
    )
  )
    errors.push("Frame/focus performance gate not met");
  const days = report?.checks?.["five-business-days"]?.dates;
  if (
    !Array.isArray(days) ||
    new Set(days).size < 5 ||
    days.some((day) => {
      const date = new Date(`${day}T12:00:00Z`);
      return (
        !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        !Number.isFinite(date.getTime()) ||
        date.toISOString().slice(0, 10) !== day ||
        date.getTime() < builtAt ||
        date.getTime() > Date.now() ||
        [0, 6].includes(date.getUTCDay())
      );
    })
  )
    errors.push(
      "Five distinct weekday records required (review local holidays manually)",
    );
  return errors;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const [, , evidence, commit, artifact] = process.argv;
    if (!evidence || !commit || !artifact)
      throw Error(
        "Usage: node tools/release-readiness.mjs evidence.json COMMIT installer.exe",
      );
    const hash = createHash("sha256")
      .update(readFileSync(artifact))
      .digest("hex");
    const errors = assessReadiness(
      JSON.parse(readFileSync(evidence, "utf8")),
      commit,
      hash,
    );
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      "Evidence completeness passed. Reviewer must verify recordings, dates, distribution status, checksums and target versions before publishing.",
    );
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
