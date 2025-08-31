#!/usr/bin/env python3
"""Command-line interface for SC2 data scraping."""

import argparse
import sys
from pathlib import Path

from .scraper import TerranBuildingScraper
from .comprehensive_scraper import SC2ComprehensiveScraper


def main():
    """Main entry point for sc2_data CLI."""
    parser = argparse.ArgumentParser(
        description="Scrape StarCraft 2 Terran building data from Liquipedia"
    )
    
    parser.add_argument(
        "-o", "--output",
        type=str,
        help="Output directory for data and icons (defaults to package static dir)"
    )
    
    parser.add_argument(
        "-f", "--filename",
        type=str,
        default="terran_buildings_data.json",
        help="JSON filename for building data (default: terran_buildings_data.json)"
    )
    
    parser.add_argument(
        "--buildings",
        nargs="+",
        help="Specific buildings to scrape (defaults to all Terran buildings)"
    )
    
    parser.add_argument(
        "--comprehensive",
        action="store_true",
        help="Run comprehensive scraper for all races, units, buildings, and upgrades"
    )
    
    parser.add_argument(
        "--max-workers",
        type=int,
        default=5,
        help="Maximum number of concurrent workers for comprehensive scraping (default: 5)"
    )
    
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Delay between requests in seconds (default: 1.0)"
    )
    
    args = parser.parse_args()
    
    try:
        if args.comprehensive:
            # Run comprehensive scraper
            scraper = SC2ComprehensiveScraper(
                output_dir=args.output,
                max_workers=args.max_workers,
                delay=args.delay
            )
            
            data = scraper.run()
            
        else:
            # Run original Terran building scraper
            scraper = TerranBuildingScraper(output_dir=args.output)
            
            if args.buildings:
                # Scrape specific buildings
                buildings_data = {}
                for building in args.buildings:
                    name = building.split("_")[0].lower()
                    print(f"Processing {building}...")
                    
                    building_data = scraper.extract_building_data(building)
                    if building_data:
                        buildings_data[name] = building_data
                        
                        if 'icon_url' in building_data:
                            scraper.download_image(building_data['icon_url'], name)
            else:
                # Scrape all buildings
                buildings_data = scraper.scrape_all_buildings()
                
            # Save data
            json_path = scraper.save_data(buildings_data, args.filename)
            
            print(f"\n✅ Scraping complete!")
            print(f"✅ Icons: {scraper.icons_dir}/")
            print(f"✅ Data: {json_path}")
            print(f"✅ Processed: {len(buildings_data)} buildings")
        
    except KeyboardInterrupt:
        print("\n❌ Scraping interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error during scraping: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()