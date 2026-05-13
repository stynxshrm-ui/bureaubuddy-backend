// ── Simple in-memory storage for rate limiting ──
// In production, use Redis or a database
// For now, in-memory works — Vercel caches between requests

const usageMap = new Map();

/**
 * Check if user has exceeded their monthly quota
 * @param {string} deviceId - Device UUID
 * @returns {object} { allowed: boolean, used: number, limit: number }
 */
function checkRateLimit(deviceId, limit = 5) {
  const now = Date.now();
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  if (!usageMap.has(deviceId)) {
    usageMap.set(deviceId, []);
  }

  const timestamps = usageMap.get(deviceId);

  // Remove timestamps older than 30 days
  const recentTimestamps = timestamps.filter(ts => now - ts < THIRTY_DAYS);
  usageMap.set(deviceId, recentTimestamps);

  const allowed = recentTimestamps.length < limit;

  if (allowed) {
    recentTimestamps.push(now);
  }

  return {
    allowed,
    used: recentTimestamps.length,
    limit,
    resetDate: recentTimestamps.length > 0 
      ? new Date(recentTimestamps[0] + THIRTY_DAYS).toISOString()
      : null
  };
}

module.exports = {
  checkRateLimit
};
