#!/usr/bin/env python3
"""Test script to verify tiered upgrades extraction."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sc2_gantt.sc2_data.comprehensive_scraper import SC2ComprehensiveScraper
import requests
from bs4 import BeautifulSoup

def test_tiered_upgrades():
    """Test extraction of tiered upgrades from specific buildings."""
    
    scraper = SC2ComprehensiveScraper()
    
    # Test buildings known to have tiered upgrades
    test_entities = [
        {
            'name': 'Engineering Bay',
            'type': 'building',
            'race': 'terran',
            'href': '/starcraft2/Engineering_Bay_(Legacy_of_the_Void)',
            'page_name': 'Engineering_Bay_(Legacy_of_the_Void)'
        },
        {
            'name': 'Evolution Chamber',
            'type': 'building',
            'race': 'zerg',
            'href': '/starcraft2/Evolution_Chamber_(Legacy_of_the_Void)',
            'page_name': 'Evolution_Chamber_(Legacy_of_the_Void)'
        }
    ]
    
    for test_entity in test_entities:
        print(f"\n{'='*60}")
        print(f"Testing tiered upgrade extraction from {test_entity['name']} ({test_entity['race'].capitalize()})")
        print(f"{'='*60}")
        
        try:
            entity_data, upgrades = scraper.extract_entity_data(test_entity)
            
            print(f"Extracted {len(upgrades)} upgrades:")
            for upgrade in upgrades:
                print(f"  - {upgrade['name']} (Level: {upgrade.get('level', 'N/A')}) - "
                      f"{upgrade['minerals']}/{upgrade['gas']}/{upgrade['research_time']}")
                if upgrade.get('icon_url'):
                    print(f"    Icon: {upgrade['icon_url']}")
            
            # Check specifically for tiered upgrades
            tiered_upgrades = [u for u in upgrades if 'level' in u and u['level'] is not None]
            print(f"\n✅ Found {len(tiered_upgrades)} tiered upgrades:")
            for upgrade in tiered_upgrades:
                print(f"  - {upgrade['name']} (Level {upgrade['level']})")
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_tiered_upgrades()