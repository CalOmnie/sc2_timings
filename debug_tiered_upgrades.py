#!/usr/bin/env python3
"""Debug script to analyze tiered upgrades like armor/weapon upgrades."""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

BASE_PAGE_URL = "https://liquipedia.net/starcraft2/"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

def analyze_tiered_upgrades():
    """Analyze how tiered upgrades are structured on building pages."""
    
    # Test buildings known to have tiered upgrades
    test_buildings = [
        ("Engineering_Bay_(Legacy_of_the_Void)", "Terran Engineering Bay"),
        ("Forge_(Legacy_of_the_Void)", "Protoss Forge"), 
        ("Evolution_Chamber_(Legacy_of_the_Void)", "Zerg Evolution Chamber")
    ]
    
    for page_name, description in test_buildings:
        print(f"\n{'='*60}")
        print(f"Analyzing: {description}")
        print(f"{'='*60}")
        
        url = urljoin(BASE_PAGE_URL, page_name)
        print(f"URL: {url}")
        
        response = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Look for upgrade headings
        headings = soup.find_all(["h1", "h2", "h3", "h4", "h5"])
        upgrade_headings = [h for h in headings if any(keyword in h.get_text().lower() 
                           for keyword in ['upgrade', 'research', 'improvement'])]
        
        if not upgrade_headings:
            print("❌ No upgrade headings found")
            continue
            
        for heading in upgrade_headings:
            print(f"\nFound section: {heading.get_text().strip()}")
            
            # Get content after the upgrade heading
            current = heading.find_next_sibling()
            upgrade_elements = []
            
            while current:
                if current.name in ["h1", "h2", "h3", "h4", "h5"]:
                    break
                if current.name in ["p", "div", "table"] and current.get_text().strip():
                    upgrade_elements.append(current)
                current = current.find_next_sibling()
                if len(upgrade_elements) > 20:  # Increase limit to catch more upgrades
                    break
            
            print(f"Found {len(upgrade_elements)} elements in this section")
            
            for i, element in enumerate(upgrade_elements):
                text = element.get_text().strip()
                
                # Look for armor/weapon upgrade patterns
                if any(keyword in text.lower() for keyword in ['armor', 'weapon', 'attack', 'carapace', 'ground']):
                    print(f"\n--- Element {i} (Potential Armor/Weapon Upgrade) ---")
                    print(f"Text: {text[:200]}{'...' if len(text) > 200 else ''}")
                    
                    # Look for level indicators
                    if any(level in text for level in ['Level 1', 'Level 2', 'Level 3', '+1', '+2', '+3']):
                        print("✅ Contains level indicators!")
                        
                        # Check for images
                        images = element.find_all("img")
                        print(f"Images found: {len(images)}")
                        
                        for j, img in enumerate(images):
                            src = img.get('src', '')
                            if '/commons/images/' in src and any(ext in src.lower() for ext in ['.png', '.jpg', '.gif']):
                                skip_patterns = ['minerals', 'vespene', 'buildtime', 'hotkey']
                                if not any(skip in src.lower() for skip in skip_patterns):
                                    print(f"  Upgrade icon {j}: {src}")
                    
                    # Also check if this might be a table with multiple levels
                    if element.name == "table":
                        rows = element.find_all("tr")
                        print(f"Table with {len(rows)} rows - checking for multi-level structure")
                        
                        for row_i, row in enumerate(rows[:5]):  # Check first 5 rows
                            row_text = row.get_text().strip()
                            if any(level in row_text for level in ['1', '2', '3', 'Level', '+']):
                                print(f"    Row {row_i}: {row_text[:100]}")

if __name__ == "__main__":
    analyze_tiered_upgrades()