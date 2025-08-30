#!/usr/bin/env python3
"""Test current extraction on Engineering Bay to see what's being captured."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from sc2_gantt.sc2_data.comprehensive_scraper import SC2ComprehensiveScraper

def test_engineering_bay_extraction():
    """Test current upgrade extraction on Engineering Bay."""
    scraper = SC2ComprehensiveScraper()
    
    engineering_bay = {
        'name': 'Engineering Bay',
        'race': 'terran',
        'type': 'building',
        'href': '/starcraft2/Engineering_Bay_(Legacy_of_the_Void)',
        'page_name': 'Engineering_Bay_(Legacy_of_the_Void)'
    }
    
    print("Testing current upgrade extraction on Engineering Bay...")
    
    try:
        entity_data, upgrades = scraper.extract_entity_data(engineering_bay)
        
        print(f"\nExtracted {len(upgrades)} upgrades:")
        for upgrade in upgrades:
            print(f"- {upgrade['name']}")
            print(f"  Cost: {upgrade['minerals']}m {upgrade['gas']}g {upgrade['research_time']}s")
            if upgrade.get('icon_url'):
                icon_name = os.path.basename(upgrade['icon_url'])
                print(f"  Icon: {icon_name}")
            else:
                print(f"  Icon: ❌ MISSING")
        
        # Count how many weapon/armor upgrades we got
        weapon_upgrades = [u for u in upgrades if 'weapon' in u['name'].lower()]
        armor_upgrades = [u for u in upgrades if 'armor' in u['name'].lower()]
        
        print(f"\n📊 Summary:")
        print(f"Weapon upgrades found: {len(weapon_upgrades)}")
        print(f"Armor upgrades found: {len(armor_upgrades)}")
        
        if len(weapon_upgrades) < 3:
            print("❌ Missing weapon upgrade levels!")
        if len(armor_upgrades) < 3:
            print("❌ Missing armor upgrade levels!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_engineering_bay_extraction()