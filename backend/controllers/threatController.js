// Threat Controller - Mock data for threat map visualization

/**
 * Generate mock threat data based on time range
 * @param {string} timeRange - '1h', '24h', or '7d'
 * @returns {Array} Array of threat objects
 */
function generateMockThreats(timeRange) {
  const now = new Date();
  const threats = [];
  const count = timeRange === '1h' ? 5 : timeRange === '24h' ? 25 : 100;

  // Common scam types and countries
  const scamTypes = ['Phishing', 'Malware', 'Ransomware', 'DDoS', 'SQL Injection', 'XSS', 'Credential Stuffing'];
  const countries = [
    { name: 'United States', lat: 39.8283, lng: -98.5795 },
    { name: 'China', lat: 35.8617, lng: 104.1954 },
    { name: 'Russia', lat: 61.5240, lng: 105.3188 },
    { name: 'India', lat: 20.5937, lng: 78.9629 },
    { name: 'Brazil', lat: -14.2350, lng: -51.9253 },
    { name: 'Nigeria', lat: 9.0820, lng: 8.6753 },
    { name: 'Germany', lat: 51.1657, lng: 10.4515 },
    { name: 'Japan', lat: 36.2048, lng: 138.2529 },
    { name: 'United Kingdom', lat: 55.3781, lng: -3.4360 },
    { name: 'South Korea', lat: 35.9078, lng: 127.7669 }
  ];

  for (let i = 0; i < count; i++) {
    const origin = countries[Math.floor(Math.random() * countries.length)];
    let target;
    do {
      target = countries[Math.floor(Math.random() * countries.length)];
    } while (target === origin); // Ensure origin and target are different

    const timestamp = new Date(now.getTime() - Math.random() * getTimeRangeMs(timeRange));
    const severity = Math.random() < 0.1 ? 'critical' : Math.random() < 0.3 ? 'high' : 'medium';

    threats.push({
      id: i + 1,
      type: scamTypes[Math.floor(Math.random() * scamTypes.length)],
      origin: origin.name,
      originLat: origin.lat + (Math.random() - 0.5) * 10, // Add some randomness
      originLng: origin.lng + (Math.random() - 0.5) * 10,
      target: target.name,
      targetLat: target.lat + (Math.random() - 0.5) * 10,
      targetLng: target.lng + (Math.random() - 0.5) * 10,
      timestamp: timestamp.toISOString(),
      severity,
      description: `Detected ${severity} severity threat from ${origin.name} targeting ${target.name}`,
      targetedSectors: ['Finance', 'Healthcare', 'Government', 'Retail'][Math.floor(Math.random() * 4)]
    });
  }

  return threats.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * Get time range in milliseconds
 * @param {string} timeRange
 * @returns {number} milliseconds
 */
function getTimeRangeMs(timeRange) {
  switch (timeRange) {
    case '1h': return 60 * 60 * 1000;
    case '24h': return 24 * 60 * 60 * 1000;
    case '7d': return 7 * 24 * 60 * 60 * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

/**
 * Get threat statistics
 * @param {string} timeRange
 * @returns {Object} Statistics object
 */
function getThreatStats(timeRange) {
  const threats = generateMockThreats(timeRange);

  const severityCount = threats.reduce((acc, threat) => {
    acc[threat.severity] = (acc[threat.severity] || 0) + 1;
    return acc;
  }, {});

  const typeCount = threats.reduce((acc, threat) => {
    acc[threat.type] = (acc[threat.type] || 0) + 1;
    return acc;
  }, {});

  const topOrigins = threats.reduce((acc, threat) => {
    acc[threat.origin] = (acc[threat.origin] || 0) + 1;
    return acc;
  }, {});

  const topTargets = threats.reduce((acc, threat) => {
    acc[threat.target] = (acc[threat.target] || 0) + 1;
    return acc;
  }, {});

  return {
    total: threats.length,
    severity: severityCount,
    types: typeCount,
    topOrigins: Object.entries(topOrigins).sort(([,a], [,b]) => b - a).slice(0, 5),
    topTargets: Object.entries(topTargets).sort(([,a], [,b]) => b - a).slice(0, 5),
    timeRange
  };
}

/**
 * Get threats controller
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getThreatsController(request, reply) {
  try {
    const { timeRange = '24h' } = request.query;
    const threats = generateMockThreats(timeRange);

    return reply.code(200).send({
      success: true,
      data: threats,
      count: threats.length,
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getThreatsController:', error);
    return reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get threat details controller
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getThreatDetailsController(request, reply) {
  try {
    const { threatId } = request.params;
    const threats = generateMockThreats('24h');
    const threat = threats.find(t => t.id === parseInt(threatId));

    if (!threat) {
      return reply.code(404).send({
        success: false,
        message: 'Threat not found'
      });
    }

    return reply.code(200).send({
      success: true,
      data: threat
    });
  } catch (error) {
    console.error('Error in getThreatDetailsController:', error);
    return reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
}

/**
 * Get threat statistics controller
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function getThreatsStatsController(request, reply) {
  try {
    const { timeRange = '24h' } = request.query;
    const stats = getThreatStats(timeRange);

    return reply.code(200).send({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in getThreatsStatsController:', error);
    return reply.code(500).send({
      success: false,
      message: 'Internal server error'
    });
  }
}