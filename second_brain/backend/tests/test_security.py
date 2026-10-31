"""Tests for security module: SSRF prevention, untrusted wrapper, and PII redaction."""
import pytest
from app.security import is_safe_url, redact_pii, safe_memory_text, wrap_untrusted


def test_wrap_untrusted():
    wrapped = wrap_untrusted("deck_text", "Some pitch deck content")
    assert wrapped == "<untrusted_deck_text>\nSome pitch deck content\n</untrusted_deck_text>"


def test_redact_pii_emails_and_phones():
    text = "Reach me at founder@bolbot.ai or harsh@gmail.com, phone +91 9876543210 or 9876543210."
    redacted = redact_pii(text)
    assert "[EMAIL_REDACTED]" in redacted
    assert "founder@bolbot.ai" not in redacted
    assert "harsh@gmail.com" not in redacted
    assert "[PHONE_REDACTED]" in redacted
    assert "9876543210" not in redacted


def test_safe_memory_text():
    raw = "Founder contact ceo@bolbot.ai\x00 with phone 9822012345"
    cleaned = safe_memory_text(raw)
    assert "[EMAIL_REDACTED]" in cleaned
    assert "[PHONE_REDACTED]" in cleaned
    assert "\x00" not in cleaned


@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1",
        "http://127.0.0.1:8000/admin",
        "http://localhost",
        "http://localhost:3000",
        "http://169.254.169.254/latest/meta-data/",
        "https://169.254.169.254",
        "http://10.0.0.1/internal",
        "http://172.16.0.1",
        "http://192.168.1.1",
        "file:///etc/passwd",
        "ftp://internal.server",
        "javascript:alert(1)",
        "http://0.0.0.0:8000",
    ],
)
def test_ssrf_blocked_urls(url):
    assert is_safe_url(url, check_redirects=False) is False


def test_safe_public_url():
    # Public domain names should pass the safety check
    assert is_safe_url("https://example.com", check_redirects=False) is True
    assert is_safe_url("https://inc42.com", check_redirects=False) is True
