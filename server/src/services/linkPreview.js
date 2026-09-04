const dns = require('dns');
const http = require('http');
const https = require('https');
const net = require('net');
const { URL } = require('url');

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 6000;
const MAX_BYTES = 256 * 1024; // metadata lives in <head>; 256KB is plenty
const USER_AGENT = 'Cortex/1.0 (+link preview)';

/**
 * Is this address one we must never connect to on a user's behalf?
 *
 * The attack this blocks is SSRF: someone drops
 * http://169.254.169.254/latest/meta-data/ on a canvas, and the *server*
 * fetches it - from inside the network, with whatever access the server has.
 * Cloud metadata endpoints, your router's admin page and localhost services are
 * all reachable from the server but not from the attacker. So we allow only
 * public addresses.
 */
function isBlockedAddress(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);

    if (a === 0) return true; // "this network"
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 192 && b === 0) return true; // IETF protocol assignments
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a >= 224) return true; // multicast and reserved

    return false;
  }

  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();

    // ::ffff:10.0.0.1 is an IPv4 address wearing a hat - check it as one.
    const mapped = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (mapped) return isBlockedAddress(mapped[1]);

    if (lower === '::1' || lower === '::') return true; // loopback / unspecified
    if (/^f[cd]/.test(lower)) return true; // unique local
    if (lower.startsWith('fe80')) return true; // link-local
    if (lower.startsWith('ff')) return true; // multicast

    return false;
  }

  return true; // not an address we recognise - refuse
}

/**
 * DNS lookup that filters private results, passed to the HTTP agent.
 *
 * Checking the URL up front and then letting Node resolve it separately leaves
 * a DNS-rebinding window: the name resolves to a public IP for the check and a
 * private one for the connection. Doing the validation inside the lookup the
 * socket actually uses closes that gap.
 */
function guardedLookup(hostname, options, callback) {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);

    const list = Array.isArray(addresses) ? addresses : [addresses];
    const safe = list.filter((entry) => !isBlockedAddress(entry.address));

    if (!safe.length) {
      const blocked = new Error(`Refusing to fetch ${hostname}: it resolves to a private address`);
      blocked.statusCode = 400;
      return callback(blocked);
    }

    if (options && options.all) return callback(null, safe);
    return callback(null, safe[0].address, safe[0].family);
  });
}

/** One hop. Resolves to { body, finalUrl } or a redirect instruction. */
function fetchOnce(targetUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(targetUrl);
    const client = url.protocol === 'https:' ? https : http;

    const req = client.request(
      url,
      {
        method: 'GET',
        lookup: guardedLookup,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en',
        },
      },
      (res) => {
        const { statusCode, headers } = res;

        if (statusCode >= 300 && statusCode < 400 && headers.location) {
          res.resume(); // drain, or the socket stays open
          return resolve({ redirect: new URL(headers.location, url).toString() });
        }

        if (statusCode >= 400) {
          res.resume();
          return reject(new Error(`The page returned ${statusCode}`));
        }

        const contentType = String(headers['content-type'] || '');
        if (!/text\/html|application\/xhtml/i.test(contentType)) {
          res.resume();
          // Not HTML - still a valid link, just nothing to scrape.
          return resolve({ body: '', finalUrl: url.toString() });
        }

        let body = '';
        let bytes = 0;

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          bytes += Buffer.byteLength(chunk);
          body += chunk;
          // Stop reading once we have the head; a 4GB "HTML" file is a DoS.
          if (bytes >= MAX_BYTES) {
            res.destroy();
          }
        });
        res.on('end', () => resolve({ body, finalUrl: url.toString() }));
        res.on('close', () => resolve({ body, finalUrl: url.toString() }));
        return undefined;
      }
    );

    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error('The page took too long to respond')));
    req.on('error', reject);
    req.end();
  });
}

function decodeEntities(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

/** Pulls a meta tag's content, tolerating attribute order and quote style. */
function metaContent(html, property) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeEntities(match[1]).trim();
  }

  return '';
}

function absolute(candidate, base) {
  if (!candidate) return '';
  try {
    const resolved = new URL(candidate, base);
    // Only ever hand the client an http(s) URL - never javascript: or data:.
    return /^https?:$/.test(resolved.protocol) ? resolved.toString() : '';
  } catch {
    return '';
  }
}

function parseMetadata(html, finalUrl) {
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const iconTag = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*href=["']([^"']+)["']/i);

  const title =
    metaContent(html, 'og:title') ||
    metaContent(html, 'twitter:title') ||
    (titleTag ? decodeEntities(titleTag[1]).replace(/\s+/g, ' ').trim() : '');

  const description =
    metaContent(html, 'og:description') ||
    metaContent(html, 'twitter:description') ||
    metaContent(html, 'description');

  const image =
    absolute(metaContent(html, 'og:image'), finalUrl) ||
    absolute(metaContent(html, 'twitter:image'), finalUrl);

  const host = new URL(finalUrl).hostname;

  return {
    title: title.slice(0, 300),
    description: description.slice(0, 500),
    image,
    siteName: (metaContent(html, 'og:site_name') || host).slice(0, 120),
    favicon: absolute(iconTag ? iconTag[1] : '/favicon.ico', finalUrl),
    domain: host.replace(/^www\./, ''),
  };
}

/**
 * Fetches title/description/preview image for a URL.
 *
 * Never throws for network reasons: a link that can't be scraped is still a
 * perfectly good link, so we fall back to the domain and let the user rename
 * it. Only a genuinely invalid or unsafe URL is rejected.
 */
async function fetchLinkPreview(rawUrl) {
  const trimmed = String(rawUrl || '').trim();
  // Bare "example.com" is what people actually paste.
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url;
  try {
    url = new URL(withScheme);
  } catch {
    const err = new Error('That does not look like a valid URL');
    err.statusCode = 400;
    throw err;
  }

  if (!/^https?:$/.test(url.protocol)) {
    const err = new Error('Only http and https links are supported');
    err.statusCode = 400;
    throw err;
  }

  const fallback = {
    url: url.toString(),
    title: '',
    description: '',
    image: '',
    favicon: '',
    siteName: url.hostname,
    domain: url.hostname.replace(/^www\./, ''),
  };

  try {
    let current = url.toString();
    let result = null;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetchOnce(current);
      if (!response.redirect) {
        result = response;
        break;
      }
      current = response.redirect;
      // Each hop is re-validated: protocol here, address in guardedLookup.
      if (!/^https?:$/.test(new URL(current).protocol)) break;
    }

    if (!result || !result.body) return fallback;

    return { ...fallback, url: result.finalUrl, ...parseMetadata(result.body, result.finalUrl) };
  } catch (err) {
    // A deliberately blocked address is worth surfacing; everything else isn't.
    if (err.statusCode === 400) throw err;
    console.warn(`[link] preview failed for ${url.hostname}: ${err.message}`);
    return fallback;
  }
}

module.exports = { fetchLinkPreview, isBlockedAddress };
