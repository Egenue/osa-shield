import dns from "node:dns/promises";
import net from "node:net";
import { domainToASCII } from "node:url";

const URL_ANALYSIS_THRESHOLD = Number(process.env.URL_ANALYSIS_THRESHOLD || 0.55);
const URL_ANALYSIS_TIMEOUT_MS = Number(process.env.URL_ANALYSIS_TIMEOUT_MS || 4000);
const URL_ANALYSIS_MAX_REDIRECTS = Number(process.env.URL_ANALYSIS_MAX_REDIRECTS || 4);
const HTTP_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const SUSPICIOUS_TLDS = new Set([
  "zip",
  "top",
  "click",
  "shop",
  "xyz",
  "info",
  "live",
  "country",
  "gq",
  "cf",
  "tk",
  "buzz",
  "rest",
]);
const URL_SHORTENER_DOMAINS = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "is.gd",
  "buff.ly",
  "cutt.ly",
  "rebrand.ly",
  "shorturl.at",
  "tiny.cc",
  "rb.gy",
]);
const COMPOUND_PUBLIC_SUFFIXES = new Set([
  "co.ke",
  "or.ke",
  "ac.ke",
  "go.ke",
  "co.uk",
  "org.uk",
  "gov.uk",
  "ac.uk",
  "com.au",
  "net.au",
  "org.au",
  "co.za",
  "com.br",
  "com.mx",
  "co.jp",
  "com.sg",
  "com.ng",
]);
const BRAND_PROFILES = [
  { brand: "paypal", domains: ["paypal.com"] },
  { brand: "microsoft", domains: ["microsoft.com", "office.com", "live.com"] },
  { brand: "google", domains: ["google.com", "gmail.com"] },
  { brand: "apple", domains: ["apple.com", "icloud.com"] },
  { brand: "facebook", domains: ["facebook.com", "fb.com"] },
  { brand: "instagram", domains: ["instagram.com"] },
  { brand: "whatsapp", domains: ["whatsapp.com"] },
  { brand: "amazon", domains: ["amazon.com"] },
  { brand: "bankofamerica", domains: ["bankofamerica.com"] },
  { brand: "chase", domains: ["chase.com"] },
  { brand: "safaricom", domains: ["safaricom.co.ke"] },
  { brand: "mpesa", domains: ["mpesa.co.ke", "safaricom.co.ke"] },
  { brand: "equitybank", domains: ["equitybank.co.ke"] },
  { brand: "kcb", domains: ["kcbgroup.com"] },
];
const SUSPICIOUS_PATH_KEYWORDS = [
  "login",
  "verify",
  "verification",
  "signin",
  "sign-in",
  "secure",
  "update",
  "account",
  "wallet",
  "payment",
  "bank",
  "password",
  "reset",
  "recover",
  "confirm",
  "unlock",
  "suspended",
  "invoice",
];

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function createServiceError(message, statusCode = 500) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutHandle;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      const timeoutError = new Error(message);
      timeoutError.code = "TIMEOUT";
      reject(timeoutError);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutHandle);
  });
}

function looksLikeBareDomain(value) {
  return /^[^\s/:?#]+\.[^\s]+(?:[/?#].*)?$/i.test(value);
}

function normalizeUrlInput(rawValue) {
  const trimmed = String(rawValue ?? "").trim();
  if (!trimmed) {
    throw createServiceError("A URL is required for analysis.", 400);
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : looksLikeBareDomain(trimmed)
      ? `https://${trimmed}`
      : trimmed;

  try {
    return new URL(candidate);
  } catch {
    throw createServiceError("Enter a valid URL or domain name to analyze.", 400);
  }
}

function createTrigger(weight, key, label, icon, description, matches = []) {
  return {
    weight,
    key,
    label,
    icon,
    description,
    matches,
  };
}

function normalizeLeetspeak(value) {
  return value
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/5/g, "s")
    .replace(/7/g, "t")
    .replace(/8/g, "b")
    .replace(/[^a-z]/g, "");
}

function levenshteinDistance(left, right) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;

    for (let column = 1; column <= right.length; column += 1) {
      const top = previous[column];
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      previous[column] = Math.min(
        previous[column] + 1,
        previous[column - 1] + 1,
        diagonal + cost
      );
      diagonal = top;
    }
  }

  return previous[right.length];
}

function isPrivateIpAddress(ipAddress) {
  if (!ipAddress) return false;

  if (ipAddress === "::1") return true;

  if (ipAddress.includes(":")) {
    return ipAddress.toLowerCase().startsWith("fc") || ipAddress.toLowerCase().startsWith("fd");
  }

  const [firstOctet, secondOctet] = ipAddress.split(".").map(Number);
  if ([10, 127].includes(firstOctet)) return true;
  if (firstOctet === 192 && secondOctet === 168) return true;
  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) return true;
  return false;
}

function extractRegistrableDomain(hostname) {
  if (!hostname || net.isIP(hostname)) {
    return hostname || null;
  }

  const segments = hostname.split(".").filter(Boolean);
  if (segments.length <= 2) {
    return hostname;
  }

  const tail = segments.slice(-2).join(".");
  if (COMPOUND_PUBLIC_SUFFIXES.has(tail) && segments.length >= 3) {
    return segments.slice(-3).join(".");
  }

  return segments.slice(-2).join(".");
}

function listAsSentence(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

async function lookupDomain(hostname) {
  try {
    const records = await withTimeout(
      dns.lookup(hostname, { all: true }),
      URL_ANALYSIS_TIMEOUT_MS,
      "DNS lookup timed out."
    );

    return {
      dnsStatus: records.length ? "resolved" : "unresolved",
      dnsResolved: records.length > 0,
      resolvedAddresses: records.map((record) => record.address),
      dnsMessage: records.length
        ? `Resolved to ${records.map((record) => record.address).join(", ")}.`
        : "No address records were returned.",
    };
  } catch (error) {
    if (["ENOTFOUND", "EAI_AGAIN", "ENODATA", "ESERVFAIL", "TIMEOUT"].includes(error.code)) {
      return {
        dnsStatus: "unresolved",
        dnsResolved: false,
        resolvedAddresses: [],
        dnsMessage: "The hostname did not resolve during analysis.",
      };
    }

    return {
      dnsStatus: "lookup_failed",
      dnsResolved: false,
      resolvedAddresses: [],
      dnsMessage: "DNS verification could not be completed.",
    };
  }
}

async function fetchWithTimeout(resource, init) {
  const abortController = new AbortController();
  const timeoutHandle = setTimeout(() => abortController.abort(), URL_ANALYSIS_TIMEOUT_MS);

  try {
    return await fetch(resource, {
      ...init,
      signal: abortController.signal,
      headers: {
        "User-Agent": "OSA Shield URL Analyzer",
        ...(init?.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeoutHandle);
  }
}

async function requestRedirectStep(currentUrl) {
  const initialResponse = await fetchWithTimeout(currentUrl, {
    method: "HEAD",
    redirect: "manual",
  }).catch((error) => {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Timed out while checking live redirects.");
      timeoutError.code = "TIMEOUT";
      throw timeoutError;
    }
    throw error;
  });

  if (initialResponse.status === 405) {
    return fetchWithTimeout(currentUrl, {
      method: "GET",
      redirect: "manual",
    });
  }

  return initialResponse;
}

async function traceRedirects(startUrl) {
  const redirectChain = [];
  let currentUrl = startUrl;

  for (let hop = 0; hop < URL_ANALYSIS_MAX_REDIRECTS; hop += 1) {
    try {
      const response = await requestRedirectStep(currentUrl);
      if (!HTTP_REDIRECT_STATUSES.has(response.status)) {
        return {
          redirectChain,
          finalUrl: currentUrl,
          redirectMessage: redirectChain.length
            ? `The link eventually lands on ${new URL(currentUrl).hostname}.`
            : "The link did not redirect during the live check.",
        };
      }

      const location = response.headers.get("location");
      if (!location) {
        return {
          redirectChain,
          finalUrl: currentUrl,
          redirectMessage: "A redirect response was returned without a target location.",
        };
      }

      const nextUrl = new URL(location, currentUrl).toString();
      redirectChain.push({
        from: currentUrl,
        to: nextUrl,
        status: response.status,
      });
      currentUrl = nextUrl;
    } catch (error) {
      return {
        redirectChain,
        finalUrl: currentUrl,
        redirectMessage:
          error.code === "TIMEOUT"
            ? "Live redirect verification timed out."
            : "Live redirect verification could not be completed.",
      };
    }
  }

  return {
    redirectChain,
    finalUrl: currentUrl,
    redirectMessage: "The redirect chain exceeded the safety limit.",
  };
}

function buildUrlExplanation({
  isScam,
  triggers,
  hostname,
  dnsInfo,
  redirectInfo,
}) {
  const topLabels = triggers.slice(0, 3).map((trigger) => trigger.label.toLowerCase());
  const summary = isScam
    ? "This URL shows phishing or abuse signals and should be treated as unsafe."
    : "This URL did not show strong phishing indicators in the checks that completed.";
  const triggerSummary = topLabels.length
    ? `The strongest signals were ${listAsSentence(topLabels)}.`
    : "No high-confidence phishing signals were triggered.";

  return [
    summary,
    triggerSummary,
    `Hostname checked: ${hostname}.`,
    dnsInfo.dnsMessage,
    redirectInfo.redirectMessage,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildVerdictText({ isScam, riskLevel, triggers, dnsInfo, redirectInfo, hostname }) {
  const triggerLabels = triggers.slice(0, 2).map((trigger) => trigger.label.toLowerCase());

  if (isScam) {
    return {
      verdictTitle: riskLevel === "high" ? "High-risk phishing link detected" : "Suspicious link detected",
      verdictSummary: triggerLabels.length
        ? `This link looks unsafe because it showed ${listAsSentence(triggerLabels)}.`
        : "This link looks unsafe based on the checks that ran.",
    };
  }

  if (!dnsInfo.dnsResolved || redirectInfo.redirectChain.length) {
    return {
      verdictTitle: "Link needs caution",
      verdictSummary: !dnsInfo.dnsResolved
        ? `The link did not resolve cleanly during analysis, so ${hostname} should be treated with caution.`
        : "The link did not show strong phishing indicators, but it does redirect and still needs a manual check.",
    };
  }

  return {
    verdictTitle: "No strong phishing evidence found",
    verdictSummary: "The link resolved normally and did not show strong phishing indicators in the checks that completed.",
  };
}

function determineRiskLevel(score, threshold) {
  if (score >= Math.max(0.75, threshold + 0.15)) {
    return "high";
  }

  if (score >= Math.max(0.3, threshold - 0.2)) {
    return "medium";
  }

  return "low";
}

export async function analyzeUrlThreat(rawUrl) {
  const parsedUrl = normalizeUrlInput(rawUrl);
  const hostname = parsedUrl.hostname.toLowerCase();
  const asciiHostname = domainToASCII(hostname) || hostname;
  const registrableDomain = extractRegistrableDomain(asciiHostname);
  const protocol = parsedUrl.protocol.toLowerCase();
  const pathAndQuery = `${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();
  const coreDomainLabel = (registrableDomain || asciiHostname || "")
    .split(".")[0]
    .toLowerCase();
  const normalizedCoreLabel = normalizeLeetspeak(coreDomainLabel);
  const usesIpHost = net.isIP(hostname) > 0;
  const hasUnsafeAuth = Boolean(parsedUrl.username || parsedUrl.password);
  const triggerSet = [];

  if (!["http:", "https:"].includes(protocol)) {
    triggerSet.push(
      createTrigger(
        0.95,
        "unsafe_protocol",
        "Unsafe protocol",
        "🚫",
        "The link uses a non-web protocol that can launch local scripts or unsafe handlers.",
        [protocol.replace(":", "")]
      )
    );
  }

  if (protocol === "http:") {
    triggerSet.push(
      createTrigger(
        0.12,
        "no_https",
        "No HTTPS protection",
        "🔓",
        "The destination uses plain HTTP, so the connection is easier to tamper with.",
        [parsedUrl.origin]
      )
    );
  }

  if (hasUnsafeAuth) {
    triggerSet.push(
      createTrigger(
        0.22,
        "embedded_credentials",
        "Embedded credentials in URL",
        "🪤",
        "Links that include a username or password often try to hide the true destination.",
        [`${parsedUrl.username || "hidden-user"}@${hostname}`]
      )
    );
  }

  if (usesIpHost) {
    triggerSet.push(
      createTrigger(
        isPrivateIpAddress(hostname) ? 0.85 : 0.34,
        "ip_address_host",
        isPrivateIpAddress(hostname) ? "Private IP target" : "Raw IP address host",
        "📍",
        isPrivateIpAddress(hostname)
          ? "The link points to a private or local network address."
          : "Attackers often use raw IP addresses to avoid recognizable domains.",
        [hostname]
      )
    );
  }

  if (!usesIpHost && asciiHostname.startsWith("xn--")) {
    triggerSet.push(
      createTrigger(
        0.28,
        "punycode_hostname",
        "Punycode hostname",
        "🈲",
        "The hostname uses punycode, which can be used to mimic trusted brands with deceptive characters.",
        [asciiHostname]
      )
    );
  }

  if (!usesIpHost && hostname !== asciiHostname) {
    triggerSet.push(
      createTrigger(
        0.18,
        "unicode_hostname",
        "Unicode hostname",
        "🔤",
        "The hostname contains non-standard characters and should be checked carefully.",
        [hostname]
      )
    );
  }

  if (parsedUrl.port && !["80", "443"].includes(parsedUrl.port)) {
    triggerSet.push(
      createTrigger(
        0.12,
        "non_standard_port",
        "Non-standard port",
        "🧭",
        "The link uses an unusual port number that is uncommon for normal websites.",
        [parsedUrl.port]
      )
    );
  }

  const hostnameSegments = asciiHostname.split(".").filter(Boolean);
  if (hostnameSegments.length >= 5) {
    triggerSet.push(
      createTrigger(
        0.12,
        "many_subdomains",
        "Deep subdomain chain",
        "🧬",
        "Long subdomain chains are often used to disguise the real domain.",
        [asciiHostname]
      )
    );
  }

  const topLevelDomain = hostnameSegments.at(-1) || "";
  if (SUSPICIOUS_TLDS.has(topLevelDomain)) {
    triggerSet.push(
      createTrigger(
        0.15,
        "high_risk_tld",
        "High-risk top-level domain",
        "🌐",
        "This top-level domain appears frequently in disposable or abusive campaigns.",
        [topLevelDomain]
      )
    );
  }

  if (URL_SHORTENER_DOMAINS.has(registrableDomain)) {
    triggerSet.push(
      createTrigger(
        0.25,
        "url_shortener",
        "URL shortener",
        "🪄",
        "Shortened links hide the final destination and make phishing harder to spot.",
        [registrableDomain]
      )
    );
  }

  const keywordMatches = SUSPICIOUS_PATH_KEYWORDS.filter((keyword) => pathAndQuery.includes(keyword));
  if (keywordMatches.length) {
    triggerSet.push(
      createTrigger(
        keywordMatches.length >= 3 ? 0.18 : 0.1,
        "credential_keywords",
        "Credential bait language",
        "🎣",
        "The path or query contains words commonly used in account takeover or payment scams.",
        keywordMatches.slice(0, 5)
      )
    );
  }

  const encodedTokenCount = (parsedUrl.pathname.match(/%[0-9A-F]{2}/gi) || []).length;
  if (encodedTokenCount >= 3 || parsedUrl.toString().length > 140) {
    triggerSet.push(
      createTrigger(
        0.08,
        "encoded_or_long_url",
        "Obfuscated URL structure",
        "🧩",
        "The link is unusually long or heavily encoded, which can be used to conceal its intent.",
        [parsedUrl.toString().slice(0, 80)]
      )
    );
  }

  for (const brandProfile of BRAND_PROFILES) {
    const isOfficialDomain = brandProfile.domains.includes(registrableDomain);
    if (isOfficialDomain) {
      continue;
    }

    const normalizedBrand = normalizeLeetspeak(brandProfile.brand);
    if (!normalizedBrand) {
      continue;
    }

    const looksLikeBrand =
      normalizedCoreLabel.includes(normalizedBrand) ||
      levenshteinDistance(normalizedCoreLabel, normalizedBrand) <= 2;

    if (looksLikeBrand && normalizedCoreLabel.length >= Math.max(3, normalizedBrand.length - 1)) {
      triggerSet.push(
        createTrigger(
          0.36,
          "brand_impersonation",
          "Possible brand impersonation",
          "🛑",
          "The domain resembles a well-known brand but does not appear to use that brand's official domain.",
          [brandProfile.brand, registrableDomain || asciiHostname]
        )
      );
      break;
    }
  }

  const dnsInfo =
    ["http:", "https:"].includes(protocol) && asciiHostname && !usesIpHost
      ? await lookupDomain(asciiHostname)
      : {
          dnsStatus: "not_applicable",
          dnsResolved: usesIpHost,
          resolvedAddresses: usesIpHost ? [hostname] : [],
          dnsMessage: usesIpHost
            ? "The link uses a direct IP address, so DNS resolution does not apply."
            : "DNS verification was skipped for this protocol.",
        };

  if (!dnsInfo.dnsResolved && dnsInfo.dnsStatus === "unresolved") {
    triggerSet.push(
      createTrigger(
        0.3,
        "dns_unresolved",
        "Destination did not resolve",
        "📡",
        "The hostname did not resolve during DNS verification, which is common for broken or disposable phishing infrastructure.",
        [asciiHostname]
      )
    );
  }

  const redirectInfo =
    ["http:", "https:"].includes(protocol)
      ? await traceRedirects(parsedUrl.toString())
      : {
          redirectChain: [],
          finalUrl: parsedUrl.toString(),
          redirectMessage: "Live redirect verification was skipped for this protocol.",
        };

  if (redirectInfo.redirectChain.length > 0) {
    const finalHostname = new URL(redirectInfo.finalUrl).hostname.toLowerCase();
    const finalAsciiHostname = domainToASCII(finalHostname) || finalHostname;
    const finalDomain = extractRegistrableDomain(finalAsciiHostname);

    if (finalDomain !== registrableDomain) {
      triggerSet.push(
        createTrigger(
          0.18,
          "cross_domain_redirect",
          "Redirects to another domain",
          "↗️",
          "The link redirects somewhere else, which can hide the final destination from the user.",
          [registrableDomain || asciiHostname, finalDomain || finalAsciiHostname]
        )
      );
    }
  }

  const weightedRisk = clamp(
    triggerSet.reduce((total, trigger) => total + trigger.weight, 0),
    0,
    0.99
  );
  const isScam = weightedRisk >= URL_ANALYSIS_THRESHOLD;
  const riskLevel = determineRiskLevel(weightedRisk, URL_ANALYSIS_THRESHOLD);
  const triggers = triggerSet
    .sort((left, right) => right.weight - left.weight)
    .map(({ weight, ...trigger }) => trigger);
  const explanation = buildUrlExplanation({
    isScam,
    triggers,
    hostname: asciiHostname,
    dnsInfo,
    redirectInfo,
  });
  const { verdictTitle, verdictSummary } = buildVerdictText({
    isScam,
    riskLevel,
    triggers,
    dnsInfo,
    redirectInfo,
    hostname: asciiHostname,
  });

  return {
    prediction: isScam ? "spam" : "ham",
    spamProbability: weightedRisk,
    threshold: URL_ANALYSIS_THRESHOLD,
    triggers,
    explanation,
    isScam,
    riskLevel,
    verdictTitle,
    verdictSummary,
    analysisMode: "url",
    urlDetails: {
      normalized_url: parsedUrl.toString(),
      hostname,
      ascii_hostname: asciiHostname,
      registrable_domain: registrableDomain,
      protocol: protocol.replace(":", ""),
      port: parsedUrl.port || null,
      path: parsedUrl.pathname || "/",
      has_https: protocol === "https:",
      uses_ip_host: usesIpHost,
      dns_status: dnsInfo.dnsStatus,
      dns_resolved: dnsInfo.dnsResolved,
      dns_message: dnsInfo.dnsMessage,
      resolved_addresses: dnsInfo.resolvedAddresses,
      redirect_chain: redirectInfo.redirectChain,
      redirect_message: redirectInfo.redirectMessage,
      final_url: redirectInfo.finalUrl,
    },
  };
}
