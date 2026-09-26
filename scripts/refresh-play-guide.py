"""Compatibility entry point: reviewed article sources now live in scripts/content."""
from pathlib import Path
import runpy

if __name__ == "__main__":
    runpy.run_path(str(Path(__file__).with_name("refresh-blog.py")), run_name="__main__")
