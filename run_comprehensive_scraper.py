#!/usr/bin/env python3
"""Simple script to run the comprehensive SC2 scraper during development."""

import sys
import os

# Add the src directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sc2_gantt.sc2_data.comprehensive_scraper import SC2ComprehensiveScraper

if __name__ == '__main__':
    # Run with limited scope for testing
    scraper = SC2ComprehensiveScraper(max_workers=2, delay=0.5)
    
    print("Running comprehensive SC2 scraper...")
    print("This will scrape ALL units, buildings, and upgrades for all 3 races!")
    print("This may take a while - be patient and respectful to Liquipedia servers.")
    
    try:
        data = scraper.run()
        print(f"\nSUCCESS! Scraped {data['metadata']['total_entities']} entities total.")
    except KeyboardInterrupt:
        print("\nScraping interrupted by user.")
    except Exception as e:
        print(f"\nError during scraping: {e}")