#!/usr/bin/env python3
"""Fix upgrade image filenames that have double underscores due to whitespace normalization issues."""

import os
import re
from pathlib import Path

def fix_upgrade_image_filenames():
    """Fix upgrade image filenames by normalizing multiple underscores to single underscores."""
    
    # Find all upgrade directories
    assets_dir = Path("src/sc2_gantt/assets")
    
    for race_dir in assets_dir.glob("icons/*"):
        if race_dir.is_dir():
            upgrades_dir = race_dir / "upgrades"
            if upgrades_dir.exists():
                print(f"Fixing upgrade images in {upgrades_dir}")
                
                for image_file in upgrades_dir.glob("*.jpg"):
                    original_name = image_file.name
                    
                    # Fix multiple underscores
                    new_name = re.sub(r'_+', '_', original_name)
                    
                    # Fix specific naming issues
                    if new_name != original_name:
                        new_path = upgrades_dir / new_name
                        
                        # Avoid overwriting existing files
                        if new_path.exists():
                            print(f"  WARNING: {new_path} already exists, skipping {original_name}")
                            continue
                            
                        print(f"  Renaming: {original_name} -> {new_name}")
                        image_file.rename(new_path)
                    else:
                        print(f"  OK: {original_name}")

if __name__ == "__main__":
    fix_upgrade_image_filenames()
    print("✅ Upgrade image filename fixes complete!")