import re
from secrets import token_urlsafe

_slug_strip = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    s = _slug_strip.sub("-", value.lower()).strip("-")
    return s or token_urlsafe(6).lower()


def unique_slug(base: str, exists: callable) -> str:
    """Generate a slug derived from `base`. `exists(candidate)` returns truthy if taken."""
    candidate = slugify(base)
    if not exists(candidate):
        return candidate
    for i in range(2, 100):
        c = f"{candidate}-{i}"
        if not exists(c):
            return c
    return f"{candidate}-{token_urlsafe(4).lower()}"
