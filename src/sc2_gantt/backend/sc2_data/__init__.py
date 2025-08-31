"""SC2 data scraping and management module."""

from .scraper import TerranBuildingScraper
from .comprehensive_scraper import SC2ComprehensiveScraper

__all__ = ['TerranBuildingScraper', 'SC2ComprehensiveScraper']