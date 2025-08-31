#!/usr/bin/env python3
"""Fix href format to match asset filenames (levelX not level_X)."""

import json
from pathlib import Path

def fix_level_hrefs():
    """Fix href paths to use levelX format instead of level_X."""
    
    data_path = Path("src/sc2_gantt/assets/sc2_comprehensive_data.json")
    
    # Load the data
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    updated_count = 0
    
    # Process each race's upgrades
    for race, race_data in data['races'].items():
        for upgrade_key, upgrade_data in race_data.get('upgrades', {}).items():
            if 'href' in upgrade_data:
                old_href = upgrade_data['href']
                # Replace level_ with level in the href path
                new_href = old_href.replace('level_', 'level')
                if old_href != new_href:
                    upgrade_data['href'] = new_href
                    updated_count += 1
                    print(f"Updated {upgrade_data['name']}: {old_href} -> {new_href}")
    
    # Save the updated data
    with open(data_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Updated {updated_count} upgrade href paths")
    print(f"✅ Fixed data saved to {data_path}")

if __name__ == "__main__":
    fix_level_hrefs()