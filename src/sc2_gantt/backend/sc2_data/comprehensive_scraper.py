import os
import requests
import json
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from pathlib import Path
import re
from typing import Dict, List, Optional, Any, Tuple
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import io


class SC2ComprehensiveScraper:
    """Comprehensive scraper for all SC2 entities (units, buildings, upgrades) across all races."""
    
    BASE_PAGE_URL = "https://liquipedia.net/starcraft2/"
    BASE_IMAGE_URL = "https://liquipedia.net"
    
    HEADERS = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    
    STATISTICS_PAGES = {
        'units': 'Unit_Statistics_(Legacy_of_the_Void)',
        'buildings': 'Building_Statistics_(Legacy_of_the_Void)'
    }
    
    # Upgrades are extracted from individual unit/building pages, not separate pages
    
    def __init__(self, output_dir: str = None, max_workers: int = 5, delay: float = 1.0):
        if output_dir is None:
            package_dir = Path(__file__).parent.parent.parent
            self.output_dir = package_dir / "assets"
        else:
            self.output_dir = Path(output_dir)
            
        self.icons_dir = self.output_dir / "icons"
        self.icons_dir.mkdir(parents=True, exist_ok=True)
        
        self.max_workers = max_workers
        self.delay = delay  # Delay between requests to be respectful
        
    def extract_entities_from_statistics(self, page_name: str, entity_type: str) -> Dict[str, List[Dict[str, str]]]:
        """Extract all entities from a statistics page."""
        url = urljoin(self.BASE_PAGE_URL, page_name)
        print(f"Extracting {entity_type} from: {url}")
        
        try:
            response = requests.get(url, headers=self.HEADERS)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return {}
            
        soup = BeautifulSoup(response.text, 'html.parser')
        tables = soup.find_all("table", class_="wikitable")
        
        races = ["Protoss", "Terran", "Zerg"]
        all_entities = {}
        
        for i, table in enumerate(tables):
            if i >= len(races):
                break
                
            race = races[i]
            entities = []
            rows = table.find_all("tr")[1:]  # Skip header row
            
            for row in rows:
                cells = row.find_all(["td", "th"])
                if cells:
                    first_cell = cells[0]
                    link = first_cell.find("a")
                    
                    if link:
                        entity_name = link.get_text().strip()
                        entity_href = link.get('href', '')
                        
                        # Filter out non-entity links and sub-abilities
                        if (entity_name and len(entity_name) > 1 and 
                            not entity_href.startswith('#') and
                            not any(skip in entity_name.lower() for skip in ['mode', 'battery', 'burst', 'rockets', 'torpedoes', 'coil', 'talons', 'hammer'])):
                            
                            entities.append({
                                'name': entity_name,
                                'href': entity_href,
                                'page_name': entity_href.split('/')[-1] if entity_href else None,
                                'type': entity_type.lower().rstrip('s'),  # 'unit' or 'building'
                                'race': race.lower()
                            })
            
            all_entities[race.lower()] = entities
            print(f"Found {len(entities)} {entity_type.lower()} for {race}")
        
        return all_entities
    
    def extract_upgrades_from_entity_page(self, soup: BeautifulSoup, entity: Dict[str, str]) -> List[Dict[str, Any]]:
        """Extract upgrades from an individual entity page including tiered upgrades."""
        upgrades = []
        
        # Look for upgrade headings
        headings = soup.find_all(["h1", "h2", "h3", "h4", "h5"])
        upgrade_headings = [h for h in headings if "upgrade" in h.get_text().lower()]
        
        if not upgrade_headings:
            return []
        
        for heading in upgrade_headings:
            # Get content after the upgrade heading until next heading
            current = heading.find_next_sibling()
            upgrade_elements = []
            
            while current:
                if current.name in ["h1", "h2", "h3", "h4", "h5"]:
                    break
                    
                if current.name in ["p", "div"] and current.get_text().strip():
                    upgrade_elements.append(current)
                elif current.name == "table":
                    # Handle tabular upgrade data
                    rows = current.find_all("tr")[1:]  # Skip header
                    for row in rows:
                        upgrade_elements.append(row)
                
                current = current.find_next_sibling()
                if len(upgrade_elements) > 20:  # Increased limit for tiered upgrades
                    break
            
            # Parse upgrade data from collected elements - handle both individual and tiered upgrades
            parsed_upgrades = self._parse_upgrade_elements_for_tiered(upgrade_elements, entity)
            upgrades.extend(parsed_upgrades)
        
        return upgrades
    
    def _parse_upgrade_elements_for_tiered(self, upgrade_elements, entity: Dict[str, str]) -> List[Dict[str, Any]]:
        """Parse upgrade elements, specifically handling tiered upgrades like Level 1-3."""
        upgrades = []
        
        for element in upgrade_elements:
            text = element.get_text().strip()
            
            # Enhanced pattern for tiered upgrades - look for "Name Level X" format
            tiered_pattern = r'([A-Z][A-Za-z\s]*?)\s+Level\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)(?:Hotkey:\s*([A-Z]))?'
            matches = re.findall(tiered_pattern, text)
            
            if matches:
                # Handle tiered upgrades
                for match in matches:
                    upgrade_base_name = match[0].strip()
                    level = match[1]
                    minerals = int(match[2])
                    gas = int(match[3])
                    research_time = int(match[4])
                    hotkey = match[5] if len(match) > 5 and match[5] else None
                    
                    # Create full upgrade name with level
                    full_upgrade_name = f"{upgrade_base_name} Level {level}"
                    
                    # Find level-specific icon
                    upgrade_icon_url = self._extract_tiered_upgrade_icon(element, upgrade_base_name, level)
                    
                    upgrade_data = {
                        'name': full_upgrade_name,
                        'base_name': upgrade_base_name,  # For grouping related upgrades
                        'level': int(level),
                        'type': 'upgrade',
                        'race': entity['race'],
                        'minerals': minerals,
                        'gas': gas,
                        'research_time': research_time,
                        'affects_units': [entity['name']],
                        'research_building': entity['name'],
                        'hotkey': hotkey,
                        'key': f"{upgrade_base_name.lower().replace(' ', '_')}_level_{level}_{entity['race']}"
                    }
                    
                    if upgrade_icon_url:
                        upgrade_data['icon_url'] = upgrade_icon_url
                    
                    upgrades.append(upgrade_data)
            else:
                # Fall back to original pattern for non-tiered upgrades
                upgrade_pattern = r'([A-Z][A-Za-z\s]*?)\s+(\d+)\s+(\d+)\s+(\d+)(?:Hotkey:\s*([A-Z]))?'
                matches = re.findall(upgrade_pattern, text)
                
                for match in matches:
                    upgrade_name = match[0].strip()
                    if 'level' in upgrade_name.lower():  # Skip if it has level but didn't match tiered pattern
                        continue
                        
                    minerals = int(match[1])
                    gas = int(match[2])
                    research_time = int(match[3])
                    hotkey = match[4] if len(match) > 4 and match[4] else None
                    
                    # Skip if this doesn't look like a real upgrade name
                    if len(upgrade_name) < 3:
                        continue
                    
                    upgrade_icon_url = self._extract_upgrade_icon_from_element(element)
                    
                    upgrade_data = {
                        'name': upgrade_name,
                        'type': 'upgrade',
                        'race': entity['race'],
                        'minerals': minerals,
                        'gas': gas,
                        'research_time': research_time,
                        'affects_units': [entity['name']],
                        'research_building': entity['name'],
                        'hotkey': hotkey,
                        'key': f"{upgrade_name.lower().replace(' ', '_')}_{entity['race']}"
                    }
                    
                    if upgrade_icon_url:
                        upgrade_data['icon_url'] = upgrade_icon_url
                    
                    upgrades.append(upgrade_data)
        
        return upgrades
    
    def _extract_tiered_upgrade_icon(self, element, base_name: str, level: str) -> Optional[str]:
        """Extract level-specific upgrade icon from an HTML element."""
        if not element:
            return None
            
        # Find all images in this element
        images = element.find_all("img") if hasattr(element, 'find_all') else []
        
        for img in images:
            src = img.get('src', '')
            
            # Skip common non-upgrade images
            skip_patterns = [
                'minerals.gif', 'vespene', 'buildtime', 'hotkey',
                'edit', 'information', 'commons/thumb/a/a4'
            ]
            
            if any(skip in src.lower() for skip in skip_patterns):
                continue
            
            # Look for level-specific upgrade icons
            if (src and 
                ('/commons/images/thumb/' in src or '/commons/images/' in src) and
                src.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))):
                
                # Check if the filename contains the level number
                filename = os.path.basename(src).lower()
                base_keywords = base_name.lower().replace(' ', '_').split('_')
                
                # Look for level indicator in filename
                if level in filename and any(keyword in filename for keyword in base_keywords if len(keyword) > 2):
                    return urljoin(self.BASE_IMAGE_URL, src)
        
        return None
    
    def _parse_upgrade_elements_with_icon_matching(self, upgrade_elements, entity: Dict[str, str]) -> List[Dict[str, Any]]:
        """Parse upgrade elements and intelligently match icons to upgrade names."""
        upgrades = []
        upgrade_icons = {}
        
        # First pass: collect all upgrade icons from all elements
        all_upgrade_icons = []
        for element in upgrade_elements:
            images = element.find_all("img") if hasattr(element, 'find_all') else []
            for img in images:
                src = img.get('src', '')
                skip_patterns = ['minerals.gif', 'vespene', 'buildtime', 'hotkey', 'edit', 'information', 'commons/thumb/a/a4']
                
                if any(skip in src.lower() for skip in skip_patterns):
                    continue
                    
                if (src and ('/commons/images/thumb/' in src or '/commons/images/' in src) 
                    and src.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))):
                    icon_filename = os.path.basename(src).lower()
                    full_url = urljoin(self.BASE_IMAGE_URL, src)
                    all_upgrade_icons.append((icon_filename, full_url))
        
        # Second pass: extract upgrade names and match them to icons by filename similarity
        for element in upgrade_elements:
            text = element.get_text().strip()
            
            # Look for upgrade patterns - updated to handle "Level X" in upgrade names
            upgrade_pattern = r'([A-Z][A-Za-z\s]*(?:Level\s+\d+)?[A-Za-z\s]*?)\s+(\d+)\s+(\d+)\s+(\d+)(?:Hotkey:\s*([A-Z]))?.*?(?:Researched from:\s*([^A-Z][^.]+?)(?:[A-Z]|$))?'
            matches = re.findall(upgrade_pattern, text)
            
            for match in matches:
                upgrade_name = match[0].strip()
                minerals = int(match[1]) if match[1] else 0
                gas = int(match[2]) if match[2] else 0
                research_time = int(match[3]) if match[3] else 0
                hotkey = match[4] if match[4] else None
                research_building = match[5].strip() if match[5] else None
                
                # Skip if this doesn't look like a real upgrade name
                if len(upgrade_name) < 3 or upgrade_name.lower() in ['the', 'and', 'for']:
                    continue
                
                # Find matching icon by filename similarity
                upgrade_icon_url = self._find_matching_icon(upgrade_name, all_upgrade_icons)
                
                upgrade_data = {
                    'name': upgrade_name,
                    'type': 'upgrade',
                    'race': entity['race'],
                    'minerals': minerals,
                    'gas': gas,
                    'research_time': research_time,
                    'affects_units': [entity['name']],
                    'research_building': research_building,
                    'hotkey': hotkey,
                    'key': f"{upgrade_name.lower().replace(' ', '_')}_{entity['race']}"
                }
                
                if upgrade_icon_url:
                    upgrade_data['icon_url'] = upgrade_icon_url
                
                upgrades.append(upgrade_data)
        
        return upgrades
    
    def _find_matching_icon(self, upgrade_name: str, all_icons: List[Tuple[str, str]]) -> Optional[str]:
        """Find the best matching icon for an upgrade name by filename similarity."""
        upgrade_words = upgrade_name.lower().replace(' ', '_').split('_')
        best_match = None
        best_score = 0
        
        # Extract level number if present
        level_number = None
        level_match = re.search(r'level\s+(\d+)', upgrade_name.lower())
        if level_match:
            level_number = level_match.group(1)
        
        for icon_filename, icon_url in all_icons:
            # Remove file extension for matching
            icon_name = os.path.splitext(icon_filename)[0].lower()
            
            # Count how many words from upgrade name appear in icon filename
            score = 0
            for word in upgrade_words:
                if word != 'level' and len(word) > 2 and word in icon_name:
                    score += 1
            
            # Level-specific matching bonus
            if level_number and level_number in icon_name:
                score += 5  # High bonus for correct level
            
            # Special handling for common patterns
            if 'glial' in upgrade_name.lower() and 'glial' in icon_name:
                score += 2
            if 'tunneling' in upgrade_name.lower() and ('tunneling' in icon_name or 'claw' in icon_name):
                score += 2
            if 'weapons' in upgrade_name.lower() and 'weapons' in icon_name:
                score += 2
            if 'armor' in upgrade_name.lower() and 'armor' in icon_name:
                score += 2
            if 'carapace' in upgrade_name.lower() and 'carapace' in icon_name:
                score += 2
            if 'attacks' in upgrade_name.lower() and 'attacks' in icon_name:
                score += 2
            
            if score > best_score:
                best_score = score
                best_match = icon_url
        
        return best_match
    
    def _parse_upgrade_element(self, element, entity: Dict[str, str]) -> List[Dict[str, Any]]:
        """Parse upgrade information from HTML elements (text + images)."""
        upgrades = []
        
        text = element.get_text().strip()
        
        # Look for upgrade patterns like "Upgrade Name Level X 100 100 50Hotkey: X"
        upgrade_pattern = r'([A-Z][A-Za-z\s]*(?:Level\s+\d+)?[A-Za-z\s]*?)\s+(\d+)\s+(\d+)\s+(\d+)(?:Hotkey:\s*([A-Z]))?.*?(?:Researched from:\s*([^A-Z][^.]+?)(?:[A-Z]|$))?'
        matches = re.findall(upgrade_pattern, text)
        
        # Find upgrade icon in this element
        upgrade_icon_url = self._extract_upgrade_icon_from_element(element)
        
        for match in matches:
            upgrade_name = match[0].strip()
            minerals = int(match[1]) if match[1] else 0
            gas = int(match[2]) if match[2] else 0
            research_time = int(match[3]) if match[3] else 0
            hotkey = match[4] if match[4] else None
            research_building = match[5].strip() if match[5] else None
            
            # Skip if this doesn't look like a real upgrade name
            if len(upgrade_name) < 3 or upgrade_name.lower() in ['the', 'and', 'for']:
                continue
            
            upgrade_data = {
                'name': upgrade_name,
                'type': 'upgrade',
                'race': entity['race'],
                'minerals': minerals,
                'gas': gas,
                'research_time': research_time,
                'affects_units': [entity['name']],  # Will aggregate later
                'research_building': research_building,
                'hotkey': hotkey,
                # Generate a unique key for aggregation
                'key': f"{upgrade_name.lower().replace(' ', '_')}_{entity['race']}"
            }
            
            # Add icon URL if found
            if upgrade_icon_url:
                upgrade_data['icon_url'] = upgrade_icon_url
            
            upgrades.append(upgrade_data)
        
        return upgrades
    
    def _extract_upgrade_icon_from_element(self, element) -> Optional[str]:
        """Extract upgrade icon URL from an HTML element."""
        if not element:
            return None
            
        # Find all images in this element
        images = element.find_all("img") if hasattr(element, 'find_all') else []
        
        for img in images:
            src = img.get('src', '')
            
            # Skip common non-upgrade images
            skip_patterns = [
                'minerals.gif', 'vespene', 'buildtime', 'hotkey',
                'edit', 'information', 'commons/thumb/a/a4'
            ]
            
            if any(skip in src.lower() for skip in skip_patterns):
                continue
            
            # Look for upgrade-specific images (PNG, JPG, or GIF files)
            if (src and 
                ('/commons/images/thumb/' in src or '/commons/images/' in src) and
                src.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))):
                
                return urljoin(self.BASE_IMAGE_URL, src)
        
        return None
    
    def extract_entity_data(self, entity: Dict[str, str]) -> Tuple[Optional[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract detailed data for a single entity and its upgrades."""
        if not entity.get('href'):
            return None, []
            
        page_name = entity['page_name']
        if not page_name:
            return None, []
            
        url = urljoin(self.BASE_PAGE_URL, page_name)
        
        try:
            response = requests.get(url, headers=self.HEADERS)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"Error fetching {url}: {e}")
            return None, []
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Extract upgrades from this page
        upgrades = self.extract_upgrades_from_entity_page(soup, entity)
        
        # Find the infobox
        infobox = soup.find("div", class_="fo-nttax-infobox-wrapper infobox-lotv")
        if not infobox:
            infobox = soup.find("div", class_=lambda x: x and "infobox" in str(x).lower())
            
        if not infobox:
            print(f"No infobox found for {entity['name']}")
            return None, upgrades
            
        entity_data = {
            'name': entity['name'],
            'type': entity['type'],
            'race': entity['race'],
            'page_url': url
        }
        
        # Extract icon URL
        icon_url = self._extract_icon_url(infobox)
        if icon_url:
            entity_data['icon_url'] = icon_url
            
        # Extract cost data
        cost_data = self._extract_cost_data(infobox)
        
        # Fix incorrect costs for specific entities
        if entity['name'] == 'Orbital Command':
            cost_data['minerals'] = 150
            cost_data['gas'] = 0
            cost_data['build_time'] = 35  # Correct build time for orbital command
        elif entity['name'] == 'Planetary Fortress':
            cost_data['minerals'] = 150
            cost_data['gas'] = 150
            cost_data['build_time'] = 60  # Correct build time for planetary fortress
        
        entity_data.update(cost_data)
        
        # Extract other fields
        requirements = self._extract_requirements(infobox)
        if requirements:
            entity_data['requirements'] = requirements
            
        produces = self._extract_produces(infobox)
        if produces:
            entity_data['produces'] = produces
            
        unlocks = self._extract_unlocks(infobox)
        if unlocks:
            entity_data['unlocks'] = unlocks
            
        # For units, try to extract additional combat stats
        if entity['type'] == 'unit':
            combat_data = self._extract_combat_data(infobox)
            entity_data.update(combat_data)
            
        return entity_data, upgrades
    
    def aggregate_upgrades(self, all_upgrades: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """Aggregate upgrades by their key, combining affected units."""
        aggregated = {}
        
        for upgrade in all_upgrades:
            key = upgrade['key']
            
            if key in aggregated:
                # Merge with existing upgrade
                existing = aggregated[key]
                existing['affects_units'].extend(upgrade['affects_units'])
                existing['affects_units'] = list(set(existing['affects_units']))  # Remove duplicates
                
                # Keep icon_url if we don't have one yet
                if not existing.get('icon_url') and upgrade.get('icon_url'):
                    existing['icon_url'] = upgrade['icon_url']
            else:
                # Add new upgrade
                aggregated[key] = upgrade.copy()
        
        return aggregated
    
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
    
    def _extract_combat_data(self, infobox) -> Dict[str, Any]:
        """Extract combat-related data for units."""
        combat_data = {}
        
        full_text = infobox.get_text()
        
        # Extract health/shields
        health_match = re.search(r'(\d+)\s*\+?\s*(\d*)\s*Health', full_text, re.IGNORECASE)
        if health_match:
            combat_data['health'] = int(health_match.group(1))
            if health_match.group(2):
                combat_data['shields'] = int(health_match.group(2))
        
        # Extract armor
        armor_match = re.search(r'(\d+)\s*(?:\(\+\d+\))?\s*Armor', full_text, re.IGNORECASE)
        if armor_match:
            combat_data['armor'] = int(armor_match.group(1))
            
        return combat_data
    
    def _extract_field_from_infobox(self, infobox, field_keywords: List[str]) -> Optional[List[str]]:
        """Extract field data from infobox using specific element targeting."""
        descriptions = infobox.find_all("div", class_="infobox-description")
        
        for desc in descriptions:
            desc_text = desc.get_text().lower().strip()
            if any(keyword in desc_text for keyword in field_keywords):
                full_text = infobox.get_text()
                
                field_start = full_text.lower().find(desc_text)
                if field_start != -1:
                    text_after = full_text[field_start + len(desc_text):]
                    
                    next_field_pos = len(text_after)
                    for other_desc in descriptions:
                        other_text = other_desc.get_text().strip()
                        if other_text != desc.get_text().strip():
                            pos = text_after.find(other_text)
                            if pos > 0 and pos < next_field_pos:
                                next_field_pos = pos
                    
                    field_content = text_after[:next_field_pos].strip()
                    items = self._parse_field_content(field_content)
                    if items:
                        return items
        
        return None
    
    def _parse_field_content(self, content: str) -> List[str]:
        """Parse field content into a list of items."""
        if not content:
            return []
            
        lines = [line.strip() for line in content.split('\n') if line.strip()]
        
        items = []
        for line in lines:
            if line.endswith(':') or len(line) < 3:
                continue
                
            if any(sep in line for sep in [',', '•', '·']):
                parts = re.split(r'[,•·]', line)
                items.extend([part.strip() for part in parts if part.strip() and len(part.strip()) > 2])
            else:
                items.append(line)
        
        return items
        
    def _extract_requirements(self, infobox) -> Optional[List[str]]:
        """Extract requirements from infobox structure."""
        return self._extract_field_from_infobox(infobox, ["requirement", "requires"])
        
    def _extract_produces(self, infobox) -> Optional[List[str]]:
        """Extract what the entity produces/builds."""
        return self._extract_field_from_infobox(infobox, ["builds", "trains", "produces"])
        
    def _extract_unlocks(self, infobox) -> Optional[List[str]]:
        """Extract what the entity unlocks."""
        return self._extract_field_from_infobox(infobox, ["unlocked tech", "unlocks", "allows", "enables"])
    
    def download_icon(self, icon_url: str, name: str, race: str, entity_type: str) -> bool:
        """Download icon, convert to JPG, and save to race-specific and type-specific subfolder."""
        try:
            response = requests.get(icon_url, headers=self.HEADERS)
            response.raise_for_status()
            
            # Convert image to JPG using PIL
            image = Image.open(io.BytesIO(response.content))
            
            # Convert to RGB if necessary (for transparency handling)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparency
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            race_dir = self.icons_dir / race.lower()
            type_dir = race_dir / f"{entity_type}s"  # 'units' or 'buildings'
            type_dir.mkdir(parents=True, exist_ok=True)
            
            # Always save as .jpg
            save_path = type_dir / f"{name.lower().replace(' ', '_')}.jpg"
            
            # Save as JPG with high quality
            image.save(save_path, 'JPEG', quality=95)
                
            return True
            
        except Exception as e:
            print(f"Error downloading {icon_url}: {e}")
            return False
    
    def download_upgrade_icon(self, icon_url: str, upgrade_name: str, race: str) -> bool:
        """Download upgrade icon, convert to JPG, and save to race-specific upgrades subfolder."""
        try:
            response = requests.get(icon_url, headers=self.HEADERS)
            response.raise_for_status()
            
            # Convert image to JPG using PIL
            image = Image.open(io.BytesIO(response.content))
            
            # Convert to RGB if necessary (for transparency handling)
            if image.mode in ('RGBA', 'LA', 'P'):
                # Create white background for transparency
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
            
            race_dir = self.icons_dir / race.lower()
            upgrades_dir = race_dir / "upgrades"
            upgrades_dir.mkdir(parents=True, exist_ok=True)
            
            # Create filename - handle level-specific names properly
            filename = upgrade_name.lower().replace(' ', '_').replace('level_', 'level')
            save_path = upgrades_dir / f"{filename}.jpg"
            
            # Save as JPG with high quality
            image.save(save_path, 'JPEG', quality=95)
                
            return True
            
        except Exception as e:
            print(f"Error downloading upgrade icon {icon_url}: {e}")
            return False
    
    def scrape_all_entities(self) -> Dict[str, Any]:
        """Scrape all entities (units, buildings, upgrades) for all races."""
        print("Starting comprehensive SC2 data scraping...")
        
        all_data = {
            'metadata': {
                'scrape_timestamp': time.time(),
                'total_entities': 0
            },
            'races': {}
        }
        
        # First, collect all entity references
        print("\n=== Collecting Entity References ===")
        
        # Get units and buildings from statistics pages
        units = self.extract_entities_from_statistics(
            self.STATISTICS_PAGES['units'], 'Units'
        )
        buildings = self.extract_entities_from_statistics(
            self.STATISTICS_PAGES['buildings'], 'Buildings'
        )
        
        # Combine entities by race (upgrades will be extracted from entity pages)
        for race in ['protoss', 'terran', 'zerg']:
            race_entities = []
            race_entities.extend(units.get(race, []))
            race_entities.extend(buildings.get(race, []))
            
            print(f"{race.capitalize()}: {len(race_entities)} entities")
            all_data['races'][race] = {
                'entities': race_entities, 
                'detailed_data': {},
                'upgrades': {}
            }
        
        # Now scrape detailed data for each entity
        print("\n=== Scraping Detailed Entity Data ===")
        
        total_entities = sum(len(data['entities']) for data in all_data['races'].values())
        all_data['metadata']['total_entities'] = total_entities
        processed = 0
        
        # Collect all upgrades from all races for aggregation
        all_upgrades_by_race = {'protoss': [], 'terran': [], 'zerg': []}
        
        for race, race_data in all_data['races'].items():
            print(f"\nProcessing {race.capitalize()} entities...")
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit all scraping tasks
                future_to_entity = {
                    executor.submit(self.extract_entity_data, entity): entity
                    for entity in race_data['entities']
                }
                
                for future in as_completed(future_to_entity):
                    entity = future_to_entity[future]
                    processed += 1
                    
                    try:
                        entity_data, entity_upgrades = future.result()
                        
                        if entity_data:
                            entity_key = entity['name'].lower().replace(' ', '_')
                            race_data['detailed_data'][entity_key] = entity_data
                            
                            # Download icon if available
                            if entity_data.get('icon_url'):
                                self.download_icon(
                                    entity_data['icon_url'], 
                                    entity['name'], 
                                    race,
                                    entity['type']  # 'unit' or 'building'
                                )
                            
                            print(f"✅ ({processed}/{total_entities}) {entity['name']}")
                        else:
                            print(f"❌ ({processed}/{total_entities}) {entity['name']} - No data extracted")
                        
                        # Collect upgrades for later aggregation
                        if entity_upgrades:
                            all_upgrades_by_race[race].extend(entity_upgrades)
                            print(f"   Found {len(entity_upgrades)} upgrades")
                            
                    except Exception as e:
                        print(f"❌ ({processed}/{total_entities}) {entity['name']} - Error: {e}")
                    
                    # Respectful delay
                    time.sleep(self.delay)
        
        # Aggregate upgrades by race
        print(f"\n=== Aggregating Upgrades ===")
        for race in ['protoss', 'terran', 'zerg']:
            race_upgrades = all_upgrades_by_race[race]
            if race_upgrades:
                aggregated = self.aggregate_upgrades(race_upgrades)
                all_data['races'][race]['upgrades'] = aggregated
                print(f"{race.capitalize()}: {len(aggregated)} unique upgrades from {len(race_upgrades)} instances")
                
                # Download upgrade icons
                print(f"  Downloading {race} upgrade icons...")
                for upgrade_key, upgrade_data in aggregated.items():
                    if upgrade_data.get('icon_url'):
                        success = self.download_upgrade_icon(
                            upgrade_data['icon_url'],
                            upgrade_data['name'],
                            race
                        )
                        if success:
                            print(f"  ✅ {upgrade_data['name']}")
                        else:
                            print(f"  ❌ {upgrade_data['name']}")
        
        return all_data
    
    def save_comprehensive_data(self, data: Dict[str, Any], filename: str = "sc2_comprehensive_data.json"):
        """Save comprehensive SC2 data to JSON file."""
        json_path = self.output_dir / filename
        
        # Create a clean copy for JSON serialization
        clean_data = json.loads(json.dumps(data, default=str))
        
        with open(json_path, 'w') as f:
            json.dump(clean_data, f, indent=2)
            
        print(f"\n✅ Comprehensive data saved to {json_path}")
        return json_path
    
    def run(self):
        """Run the complete comprehensive scraping process."""
        data = self.scrape_all_entities()
        json_path = self.save_comprehensive_data(data)
        
        print(f"\n{'='*50}")
        print("SCRAPING COMPLETE!")
        print(f"{'='*50}")
        print(f"✅ Icons: {self.icons_dir}/")
        print(f"✅ Data: {json_path}")
        print(f"✅ Total entities: {data['metadata']['total_entities']}")
        
        for race, race_data in data['races'].items():
            detailed_count = len(race_data['detailed_data'])
            total_count = len(race_data['entities'])
            upgrade_count = len(race_data.get('upgrades', {}))
            print(f"✅ {race.capitalize()}: {detailed_count}/{total_count} entities, {upgrade_count} upgrades")
        
        return data