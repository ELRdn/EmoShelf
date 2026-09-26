import assert from "node:assert/strict";
import test from "node:test";
import { assessReadiness, requiredChecks } from "./release-readiness.mjs";

test("missing/manual-pending evidence never approves a release", () => {
  assert.ok(
    assessReadiness({}, "a".repeat(40), "b".repeat(64)).length >=
      requiredChecks.length,
  );
});
test("requires repetitions, timings, five separate weekdays and matching artifact", () => {
  const report = {
    distributionMode: "unsigned",
    updateMode: "manual",
    sourceClean: true,
    osBuild: "synthetic-windows-build",
    reviewer: "synthetic-reviewer",
    candidateBuiltAt: "2026-09-14T00:00:00Z",
    commit: "a".repeat(40),
    artifactSha256: "b".repeat(64),
    openCritical: 0,
    openCoreBugs: 0,
    checks: Object.fromEntries(
      requiredChecks.map((id) => [
        id,
        {
          status: "passed",
          evidence: "synthetic-test-fixture",
          appVersion: "synthetic-version",
          clickTrials: 30,
          enterTrials: 30,
          errors: 0,
          authenticode: "NotSigned",
          checksumMatches: true,
        },
      ]),
    ),
  };
  report.checks.performance = {
    status: "passed",
    evidence: "synthetic-test-fixture",
    revealSamples: 30,
    searchSamples: 30,
    revealP95Ms: 200,
    searchP95Ms: 80,
  };
  report.checks["five-business-days"].dates = [
    "2026-09-14",
    "2026-09-15",
    "2026-09-16",
    "2026-09-17",
    "2026-09-18",
  ];
  assert.deepEqual(
    assessReadiness(report, report.commit, report.artifactSha256),
    [],
  );
  const badDistribution = structuredClone(report);
  badDistribution.checks["distribution-arm64"].authenticode = "UnknownError";
  badDistribution.checks["distribution-x64"].checksumMatches = false;
  badDistribution.updateMode = "verified-updater";
  assert.equal(
    assessReadiness(badDistribution, report.commit, report.artifactSha256)
      .length,
    3,
  );
  assert.ok(
    assessReadiness(report, "c".repeat(40), report.artifactSha256).length,
  );
  report.checks.notepad.clickTrials = 1;
  report.checks.performance.searchP95Ms = 200;
  report.checks["five-business-days"].dates.fill("2026-09-14");
  assert.equal(
    assessReadiness(report, report.commit, report.artifactSha256).length,
    3,
  );
});
