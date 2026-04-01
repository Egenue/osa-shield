import { Scam, ScamScan } from "../config/db.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export async function getUserSummary(userId) {
  const [totalScans, totalReports] = await Promise.all([
    ScamScan.count({
      where: { user_id: userId },
    }),
    Scam.count({
      where: { reporter_user_id: userId },
    }),
  ]);

  const trustScore = clamp(50 + Math.min(totalScans, 20) + totalReports * 2, 0, 100);

  return {
    totalScans,
    totalReports,
    trustScore,
  };
}

export async function getUserActivityHistory(userId, limit = 12) {
  const [scans, reports] = await Promise.all([
    ScamScan.findAll({
      where: { user_id: userId },
      order: [["created_at", "DESC"]],
      limit,
      raw: true,
    }),
    Scam.findAll({
      where: { reporter_user_id: userId },
      order: [["created_at", "DESC"]],
      limit,
      raw: true,
    }),
  ]);

  const scanActivities = scans.map((scan) => ({
    id: scan.scan_id,
    type: "scan",
    label:
      scan.input_type === "url" ? "Analyzed suspicious URL" : "Analyzed suspicious message",
    status: scan.prediction === "spam" ? "High Risk" : "Low Risk",
    details: scan.explanation || null,
    createdAt: scan.created_at,
  }));

  const reportActivities = reports.map((report) => ({
    id: report.scam_id,
    type: "report",
    label:
      report.source === "analysis"
        ? "Shared flagged content with community feed"
        : `Reported ${report.type.toLowerCase()} scam`,
    status: report.verified ? "Verified" : "Pending Review",
    details: report.explanation || null,
    createdAt: report.created_at,
  }));

  return [...scanActivities, ...reportActivities]
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}
