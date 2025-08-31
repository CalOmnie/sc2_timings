import os
import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
import re
from typing import Dict, List, Optional, Any


class TerranBuildingScraper:
    """Scraper for Terran building data from Liquipedia."""
    
    TERRAN_BUILDINGS = [
        "Barracks_(Legacy_of_the_Void)",
        "Factory",
        "Starport", 
        "Engineering_Bay",
        "Bunker",
        "Missile_Turret",
        "Sensor_Tower",
        "Armory",
        "Fusion_Core",
        "Tech_Lab",
        "Reactor",
        "Command_Center_(Legacy_of_the_Void)",
        "Orbital_Command",
        "Planetary_Fortress"
    ]
    
    BASE_PAGE_URL = "https://liquipedia.net/starcraft2/"
    BASE_IMAGE_URL = "https://liquipedia.net"
    
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    def __init__(self, output_dir: str = None):
        if output_dir is None:
            # Default to static directory relative to package
            package_dir = Path(__file__).parent.parent
            self.output_dir = package_dir / "static"
        else:
            self.output_dir = Path(output_dir)
            
        self.icons_dir = self.output_dir / "icons"
        self.icons_dir.mkdir(parents=True, exist_ok=True)
        
    def extract_building_data(self, building_page: str) -> Optional[Dict[str, Any]]:
        """Extract building data from Liquipedia page using specific element targeting."""
        url = urljoin(self.BASE_PAGE_URL, building_page)
        print(f"Scraping: {url}")
        
        try:
            response = requests.get(url, headers=self.HEADERS)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Find the infobox
        infobox = soup.find("div", class_="fo-nttax-infobox-wrapper infobox-lotv")
        if not infobox:
            print(f"No infobox found for {building_page}")
            return None
            
        building_data = {}
        
        # Extract icon URL
        icon_url = self._extract_icon_url(infobox)
        if icon_url:
            building_data['icon_url'] = icon_url
            
        # Extract cost data from specific infobox elements
        cost_data = self._extract_cost_data(infobox)
        building_data.update(cost_data)
        
        # Extract requirements from infobox structure
        requirements = self._extract_requirements(infobox)
        if requirements:
            building_data['requirements'] = requirements
            
        # Extract what it produces/builds
        produces = self._extract_produces(infobox)
        if produces:
            building_data['produces'] = produces
            
        # Extract what it unlocks
        unlocks = self._extract_unlocks(infobox)
        if unlocks:
            building_data['unlocks'] = unlocks
            
        return building_data
    
    def _extract_icon_url(self, infobox) -> Optional[str]:
        """Extract icon URL from infobox image wrapper."""
        img_wrapper = infobox.find("div", class_="infobox-image-wrapper")
        if img_wrapper:
            img_tag = img_wrapper.find("img")
            if img_tag and img_tag.get('src'):
                return urljoin(self.BASE_IMAGE_URL, img_tag['src'])
        return None
        
    def _extract_cost_data(self, infobox) -> Dict[str, int]:
        """Extract cost data from infobox using specific element targeting."""
        cost_data = {}
        
        # Look for cost in description divs
        descriptions = infobox.find_all("div", class_="infobox-description")
        
        for desc in descriptions:
            if "cost" in desc.get_text().lower():
                # Get the next sibling or look for numbers in nearby elements
                next_div = desc.find_next_sibling()
                if next_div:
                    cost_text = next_div.get_text().strip()
                    numbers = re.findall(r'\d+', cost_text)
                    if len(numbers) >= 3:
                        cost_data['minerals'] = int(numbers[0])
                        cost_data['gas'] = int(numbers[1]) 
                        cost_data['build_time'] = int(numbers[2])
                    elif len(numbers) >= 2:
                        cost_data['minerals'] = int(numbers[0])
                        cost_data['gas'] = int(numbers[1])
                    break
        
        # Fallback: use regex on full infobox text
        if not cost_data:
            full_text = infobox.get_text()
            cost_match = re.search(r'Cost[:\s]*(\d+)[^\d]*(\d+)[^\d]*(\d+)', full_text)
            if cost_match:
                cost_data['minerals'] = int(cost_match.group(1))
                cost_data['gas'] = int(cost_match.group(2))
                cost_data['build_time'] = int(cost_match.group(3))
                
        return cost_data
        
    def _extract_list_from_cell(self, cell) -> List[str]:
        """Extract list items from a table cell, handling different list formats."""
        items = []
        
        # Try to find list items first
        list_items = cell.find_all("li")
        if list_items:
            items = [li.get_text().strip() for li in list_items if li.get_text().strip()]
        else:
            # Fall back to looking for links or divs
            links = cell.find_all("a")
            if links:
                items = [link.get_text().strip() for link in links if link.get_text().strip()]
            else:
                # Last resort: split by common delimiters
                text = cell.get_text().strip()
                if text:
                    # Split by bullet points, newlines, or commas
                    items = [item.strip() for item in re.split(r'[•\n,]', text) if item.strip()]
                    
        return [item for item in items if len(item) > 2]
        
    def _extract_requirements(self, infobox) -> Optional[List[str]]:
        """Extract requirements from infobox structure."""
        return self._extract_field_from_infobox(infobox, ["requirement", "requires"])
        
    def _extract_produces(self, infobox) -> Optional[List[str]]:
        """Extract what the building produces/builds."""
        return self._extract_field_from_infobox(infobox, ["builds", "trains", "produces"])
        
    def _extract_unlocks(self, infobox) -> Optional[List[str]]:
        """Extract what the building unlocks."""
        return self._extract_field_from_infobox(infobox, ["unlocked tech", "unlocks", "allows", "enables"])
        
    def _extract_field_from_infobox(self, infobox, field_keywords: List[str]) -> Optional[List[str]]:
        """Extract field data from infobox using specific element targeting."""
        # Look for field in description divs
        descriptions = infobox.find_all("div", class_="infobox-description")
        
        for desc in descriptions:
            desc_text = desc.get_text().lower().strip()
            if any(keyword in desc_text for keyword in field_keywords):
                # Get the content after this description
                # Look at the full infobox text and find the section
                full_text = infobox.get_text()
                
                # Find the position of this field in the text
                field_start = full_text.lower().find(desc_text)
                if field_start != -1:
                    # Extract text after the field name until the next field
                    text_after = full_text[field_start + len(desc_text):]
                    
                    # Look for the next field (another description div text)
                    next_field_pos = len(text_after)
                    for other_desc in descriptions:
                        other_text = other_desc.get_text().strip()
                        if other_text != desc.get_text().strip():
                            pos = text_after.find(other_text)
                            if pos > 0 and pos < next_field_pos:
                                next_field_pos = pos
                    
                    # Extract the relevant section
                    field_content = text_after[:next_field_pos].strip()
                    
                    # Parse the content into a list
                    items = self._parse_field_content(field_content)
                    if items:
                        return items
        
        return None
    
    def _parse_field_content(self, content: str) -> List[str]:
        """Parse field content into a list of items."""
        if not content:
            return []
            
        # Split by newlines and clean up
        lines = [line.strip() for line in content.split('\n') if line.strip()]
        
        items = []
        for line in lines:
            # Skip lines that look like other field headers
            if line.endswith(':') or len(line) < 3:
                continue
                
            # Handle multiple items on one line (separated by common delimiters)
            if any(sep in line for sep in [',', '•', '·']):
                parts = re.split(r'[,•·]', line)
                items.extend([part.strip() for part in parts if part.strip() and len(part.strip()) > 2])
            else:
                items.append(line)
        
        return items
        
    def download_image(self, img_url: str, name: str) -> bool:
        """Download image from URL and save to buildings directory."""
        try:
            response = requests.get(img_url, headers=self.HEADERS)
            response.raise_for_status()
            
            # Create terran/buildings directory structure
            terran_dir = self.icons_dir / 'terran'
            buildings_dir = terran_dir / 'buildings'
            buildings_dir.mkdir(parents=True, exist_ok=True)
            
            # Determine file extension
            ext = os.path.splitext(img_url)[1] or '.jpg'
            save_path = buildings_dir / f"{name}{ext}"
            
            with open(save_path, 'wb') as f:
                f.write(response.content)
                
            print(f"Downloaded: {save_path}")
            return True
            
        except Exception as e:
            print(f"Error downloading {img_url}: {e}")
            return False
            
    def scrape_all_buildings(self) -> Dict[str, Any]:
        """Scrape data for all Terran buildings."""
        buildings_data = {}
        
        for building in self.TERRAN_BUILDINGS:
            name = building.split("_")[0].lower()
            print(f"Processing {building}...")
            
            building_data = self.extract_building_data(building)
            if building_data:
                buildings_data[name] = building_data
                
                # Download icon if available
                if 'icon_url' in building_data:
                    self.download_image(building_data['icon_url'], name)
                    
                print(f"✅ Data extracted for {building}")
                print(f"   Cost: {building_data.get('minerals', 0)} minerals, {building_data.get('gas', 0)} gas")
                print(f"   Build time: {building_data.get('build_time', 'unknown')}s")
                print(f"   Requirements: {building_data.get('requirements', [])}")
                print(f"   Produces: {building_data.get('produces', [])}")
                print(f"   Unlocks: {building_data.get('unlocks', [])}")
            else:
                print(f"❌ Data not found for {building}")
                
        return buildings_data
        
    def save_data(self, data: Dict[str, Any], filename: str = "terran_buildings_data.json"):
        """Save building data to JSON file in static directory."""
        json_path = self.output_dir / filename
        
        with open(json_path, 'w') as f:
            json.dump(data, f, indent=2)
            
        print(f"✅ Building data saved to {json_path}")
        return json_path
        
    def run(self):
        """Run the complete scraping process."""
        print("Starting Terran building data scraping...")
        
        buildings_data = self.scrape_all_buildings()
        json_path = self.save_data(buildings_data)
        
        print(f"\n✅ Scraping complete!")
        print(f"✅ Icons downloaded to {self.icons_dir}/")
        print(f"✅ Data saved to {json_path}")
        print(f"✅ Processed {len(buildings_data)} buildings")
        
        return buildings_data