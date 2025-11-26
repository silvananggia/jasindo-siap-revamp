const DEFAULT_GEOSPATIAL_BASE_URL = "http://service-dev-jasindo-revampsiap-be.apps.okd.asuransijasindo.co.id/siap-geospatial-service/api/v1/geospatial";

const GEOSPATIAL_BASE_URL = process.env.GEOSPATIAL_BASE_URL || DEFAULT_GEOSPATIAL_BASE_URL;

const FALLBACK_BASE_URL_V2 = 'http://service-dev-jasindo-revampsiap-be.apps.okd.asuransijasindo.co.id/siap-geospatial-service/api/v2/geospatial';

/**
 * Some deployments accidentally set BASE_URL_V2 to an empty string or a value
 * with whitespace. Trim it so we only honor a truly usable absolute URL.
 */
const resolvedBaseUrlV2 = (process.env.BASE_URL_V2 || "").trim();
const BASE_URL_V2 = resolvedBaseUrlV2 || FALLBACK_BASE_URL_V2;

/**
 * Build a uniform unauthorized payload so consumers get a consistent message.
 */
const buildUnauthorizedResponse = (message = "Authentication required. Please provide a valid Bearer token.") => ({
  status: 401,
  message,
  error: {
    code: "UNAUTHORIZED",
    message
  },
  timestamp: new Date().toISOString()
});

/**
 * Validates Authorization header presence and returns bearer token.
 * Sends a 401 response if the header is missing or malformed.
 */
const getBearerToken = (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(buildUnauthorizedResponse("Authentication required. Please include an Authorization Bearer token."));
    return null;
  }

  return authHeader.substring(7);
};

module.exports = {
  GEOSPATIAL_BASE_URL,
  BASE_URL_V2,
  getBearerToken,
  buildUnauthorizedResponse
};

