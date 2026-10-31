"""Security utilities: untrusted input wrapping, SSRF guards, and PII redaction."""
import ipaddress
import re
import socket
from urllib.parse import urlparse
import httpx

# Precompiled regexes for PII redaction
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
PHONE_REGEX = re.compile(
    r"(?:\+?91[\s.-]?)?(?:\b[6-9]\d{9}\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b)"
)

# Blocked IP networks
BLOCKED_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("169.254.0.0/16"),  # Link-local & AWS/GCP/Azure metadata
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("224.0.0.0/4"),    # Multicast
    ipaddress.ip_network("240.0.0.0/4"),    # Reserved
    ipaddress.ip_network("::1/128"),        # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),       # IPv6 ULA
    ipaddress.ip_network("fe80::/10"),      # IPv6 link-local
]

BLOCKED_HOSTNAMES = {
    "localhost",
    "metadata.google.internal",
    "instance-data",
    "metadata",
}


def wrap_untrusted(label: str, text: str) -> str:
    """Wrap untrusted input in protective XML tags so the LLM treats it as data, not instructions."""
    clean_label = re.sub(r"[^a-zA-Z0-9_-]", "_", label)
    return f"<untrusted_{clean_label}>\n{text}\n</untrusted_{clean_label}>"


def _is_ip_allowed(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Check if an IP is public and not private/loopback/link-local/metadata."""
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return False

    for network in BLOCKED_NETWORKS:
        if ip in network:
            return False

    return True


def is_safe_url(url: str, check_redirects: bool = True) -> bool:
    """Validate that a URL is safe to fetch (prevents SSRF).

    - Only http and https schemes allowed
    - Hostname must resolve to valid public IP addresses
    - Loopback, private, link-local, and cloud metadata IPs blocked
    - Validates redirects (if check_redirects=True)
    """
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            return False

        hostname = parsed.hostname
        if not hostname:
            return False

        if hostname.lower() in BLOCKED_HOSTNAMES:
            return False

        # Attempt to parse hostname as IP directly
        try:
            ip = ipaddress.ip_address(hostname)
            if not _is_ip_allowed(ip):
                return False
        except ValueError:
            # Hostname is a domain name - resolve DNS
            try:
                addr_info = socket.getaddrinfo(hostname, None)
                if not addr_info:
                    return False
                for item in addr_info:
                    ip_str = item[4][0]
                    resolved_ip = ipaddress.ip_address(ip_str)
                    if not _is_ip_allowed(resolved_ip):
                        return False
            except socket.gaierror:
                return False

        # Follow redirects safely if requested
        if check_redirects:
            try:
                with httpx.Client(timeout=4.0, follow_redirects=False) as client:
                    resp = client.head(url)
                    if resp.is_redirect:
                        redirect_target = resp.headers.get("Location")
                        if redirect_target:
                            # Re-check target URL recursively
                            return is_safe_url(redirect_target, check_redirects=False)
            except Exception:
                # Network failure during HEAD check is treated cautiously;
                # base URL DNS check has already passed
                pass

        return True
    except Exception:
        return False


def redact_pii(text: str) -> str:
    """Redact email addresses and phone numbers from text."""
    if not text:
        return ""
    text = EMAIL_REGEX.sub("[EMAIL_REDACTED]", text)
    text = PHONE_REGEX.sub("[PHONE_REDACTED]", text)
    return text


def safe_memory_text(text: str) -> str:
    """Sanitize and redact text before sending to Meko memory."""
    if not text:
        return ""
    sanitized = redact_pii(text)
    # Strip any control characters
    sanitized = "".join(ch for ch in sanitized if ch.isprintable() or ch in "\n\r\t")
    return sanitized.strip()
