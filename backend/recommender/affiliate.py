"""
Affiliate store URL resolver.

Reads affiliate template URLs from env vars, plugs in the game name.
If a template isn't configured, that store is skipped (returned only if
non-empty). Steam is always returned as final fallback.

Env vars (set as HF Space secrets after affiliate approval):
    FANATICAL_TRACKING_URL — Awin deep-link template with %DEEP_LINK% placeholder
    HUMBLE_TRACKING_URL    — Impact.com template with %DEEP_LINK% placeholder
    GMG_TRACKING_URL       — Green Man Gaming (Awin) template with %DEEP_LINK% placeholder

Example FANATICAL_TRACKING_URL from Awin dashboard:
    https://www.awin1.com/cread.php?awinmid=17708&awinaffid=YOUR_ID&clickref=&p=%DEEP_LINK%

The %DEEP_LINK% placeholder gets replaced with a URL-encoded search URL
pointing at the specific game on the destination store.
"""
import os
from urllib.parse import quote_plus
from typing import Dict


def _fanatical_search(name: str) -> str:
    return f"https://www.fanatical.com/en/search?search={quote_plus(name)}"


def _humble_search(name: str) -> str:
    return f"https://www.humblebundle.com/store/search?search={quote_plus(name)}"


def _gmg_search(name: str) -> str:
    return f"https://www.greenmangaming.com/search?query={quote_plus(name)}"


def _wrap(template_env: str, deep_link: str) -> str:
    """
    Wrap a destination URL in the affiliate tracking template.
    If no template is configured, return the raw deep link.
    """
    template = os.environ.get(template_env, "").strip()
    if not template:
        return deep_link
    return template.replace("%DEEP_LINK%", quote_plus(deep_link))


def store_urls_for_game(name: str, app_id: int) -> Dict[str, str]:
    """
    Returns a dict of store name → URL.
    Skips stores with no affiliate configured (except Steam, always included).
    """
    urls: Dict[str, str] = {}

    fan = _wrap("FANATICAL_TRACKING_URL", _fanatical_search(name))
    if fan and os.environ.get("FANATICAL_TRACKING_URL"):
        urls["fanatical"] = fan

    hum = _wrap("HUMBLE_TRACKING_URL", _humble_search(name))
    if hum and os.environ.get("HUMBLE_TRACKING_URL"):
        urls["humble"] = hum

    gmg = _wrap("GMG_TRACKING_URL", _gmg_search(name))
    if gmg and os.environ.get("GMG_TRACKING_URL"):
        urls["gmg"] = gmg

    # Steam — always included, no affiliate program exists
    urls["steam"] = f"https://store.steampowered.com/app/{app_id}"

    return urls
