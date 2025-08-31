#!/usr/bin/env python3
"""Add href fields to existing SC2 data for local icon paths."""

import json
import re
from pathlib import Path

def add_icon_hrefs():
    """Add local href paths to all entities and upgrades in SC2 data."""
    
    data_path = Path("src/sc2_gantt/assets/sc2_comprehensive_data.json")
    
    # Load the data
    with open(data_path, 'r') as f:
        data = json.load(f)
    
    updated_count = 0
    
    # Process each race
    for race, race_data in data['races'].items():
        
        # Process detailed entity data (units/buildings)
        for entity_key, entity_data in race_data.get('detailed_data', {}).items():
            if 'icon_url' in entity_data and 'href' not in entity_data:
                # Generate local path
                entity_type = entity_data['type']
                entity_name = entity_data['name']
                local_name = entity_name.lower().replace(' ', '_')
                entity_data['href'] = f"/assets/icons/{race}/{entity_type}s/{local_name}.jpg"
                updated_count += 1
        
        # Process upgrades
        for upgrade_key, upgrade_data in race_data.get('upgrades', {}).items():
            if 'icon_url' in upgrade_data and 'href' not in upgrade_data:
                # Generate local path for upgrade
                upgrade_name = upgrade_data['name']
                local_name = re.sub(r'\s+', '_', upgrade_name.lower())
                upgrade_data['href'] = f"/assets/icons/{race}/upgrades/{local_name}.jpg"
                updated_count += 1
    
    # Save the updated data
    with open(data_path, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ Added href fields to {updated_count} entities/upgrades")
    print(f"✅ Updated data saved to {data_path}")

if __name__ == "__main__":
    add_icon_hrefs()