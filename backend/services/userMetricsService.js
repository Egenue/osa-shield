import { Scam, ScamScan } from "../config/db.js";
import { Op } from "sequelize";

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

  const scanIds = scans.map((scan) => scan.scan_id);
  const communityReports = scanIds.length
    ? await Scam.findAll({
        attributes: ["scam_id", "source_scan_id"],
        where: {
          reporter_user_id: userId,
          source_scan_id: {
            [Op.in]: scanIds,
          },
        },
        raw: true,
      })
    : [];
  const reportByScanId = new Map(
    communityReports.map((report) => [report.source_scan_id, report.scam_id])
  );

  const scanActivities = scans.map((scan) => {
    const score = Number(scan.spam_probability ?? 0);
    const threshold = Number(scan.threshold ?? 0.3);
    const isRisky = scan.prediction === "spam" || score >= threshold;
    const postedToCommunity = reportByScanId.has(scan.scan_id);

    return {
      id: scan.scan_id,
      type: "scan",
      label:
        scan.input_type === "url" ? "Analyzed suspicious URL" : "Analyzed suspicious message",
      status: isRisky ? "High Risk" : "Low Risk",
      riskLevel: isRisky ? "high" : "low",
      inputType: scan.input_type,
      details: scan.explanation || null,
      contentPreview:
        scan.content.length > 180 ? `${scan.content.slice(0, 177)}...` : scan.content,
      postedToCommunity,
      communityScamId: reportByScanId.get(scan.scan_id) ?? null,
      canPostToCommunity: isRisky && !postedToCommunity,
      createdAt: scan.created_at,
    };
  });

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
