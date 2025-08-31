#!/usr/bin/env python3
"""Command-line interface for SC2 data scraping."""

import argparse
import sys
from pathlib import Path

from .comprehensive_scraper import SC2ComprehensiveScraper


def main():
    """Main entry point for sc2_data CLI."""
    parser = argparse.ArgumentParser(
        description="Scrape StarCraft 2 comprehensive data from Liquipedia"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        help="Output directory for data and icons (defaults to package assets dir)"
    )
    
    parser.add_argument(
        "--max-workers",
        type=int,
        default=5,
        help="Maximum number of concurrent workers for scraping (default: 5)"
    )
    
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay between requests in seconds (default: 1.0)"
    )
    
    args = parser.parse_args()
    
    try:
        # Run comprehensive scraper
        scraper = SC2ComprehensiveScraper(
            output_dir=args.output,
            max_workers=args.max_workers,
            delay=args.delay
        )
        
        data = scraper.run()
        print(f"\n✅ Comprehensive scraping complete!")
        print(f"✅ Total entities: {data['metadata']['total_entities']}")
        
    except KeyboardInterrupt:
        print("\n❌ Scraping interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error during scraping: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()