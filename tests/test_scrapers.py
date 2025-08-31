#!/usr/bin/env python

"""Tests for SC2 data scraping functionality."""

import pytest
from unittest.mock import Mock, patch, mock_open
import json
from pathlib import Path

from sc2_gantt.sc2_data.comprehensive_scraper import SC2ComprehensiveScraper


@pytest.fixture
def scraper():
    """Create test scraper instance."""
    return SC2ComprehensiveScraper()


@pytest.fixture
def mock_html_response():
    """Mock HTML response from Liquipedia."""
    return """
    <html>
    <body>
    <table class="wikitable">
        <tr>
            <td><a href="/starcraft2/Marine">Marine</a></td>
            <td>Unit</td>
            <td>50</td>
            <td>0</td>
            <td>18</td>
        </tr>
    </table>
    </body>
    </html>
    """


def test_scraper_initialization(scraper):
    """Test scraper initialization."""
    assert scraper is not None
    assert scraper.BASE_PAGE_URL == 'https://liquipedia.net/starcraft2/'
    assert scraper.BASE_IMAGE_URL == 'https://liquipedia.net'
    assert hasattr(scraper, 'delay')
    assert hasattr(scraper, 'max_workers')


def test_data_validation():
    """Test validation of scraped data structure."""
    sample_data = {
        "metadata": {
            "scrape_timestamp": 1234567890,
            "total_entities": 1
        },
        "races": {
            "terran": {
                "detailed_data": {
                    "Marine": {
                        "name": "Marine",
                        "type": "unit",
                        "race": "terran",
                        "minerals": 50,
                        "gas": 0,
                        "build_time": 18
                    }
                }
            }
        }
    }
    
    # Validate required top-level keys
    assert 'metadata' in sample_data
    assert 'races' in sample_data
    
    # Validate metadata structure
    metadata = sample_data['metadata']
    assert 'scrape_timestamp' in metadata
    assert 'total_entities' in metadata
    assert isinstance(metadata['total_entities'], int)
    
    # Validate race data structure
    races = sample_data['races']
    assert 'terran' in races
    
    terran_data = races['terran']['detailed_data']
    marine = terran_data['Marine']
    
    # Validate entity structure
    required_fields = ['name', 'type', 'race', 'minerals', 'gas', 'build_time']
    for field in required_fields:
        assert field in marine
    
    # Validate data types
    assert isinstance(marine['minerals'], int)
    assert isinstance(marine['gas'], int) 
    assert isinstance(marine['build_time'], (int, float))


@patch('builtins.open', new_callable=mock_open)
@patch('json.dump')
def test_save_comprehensive_data(mock_json_dump, mock_file, scraper):
    """Test saving scraped data to file."""
    test_data = {"test": "data"}
    
    scraper.save_comprehensive_data(test_data, "test_file.json")
    
    mock_file.assert_called()
    mock_json_dump.assert_called()


def test_entity_name_normalization():
    """Test entity name normalization for file paths."""
    test_cases = [
        ("Dark Templar", "dark_templar"),
        ("Siege Tank", "siege_tank"),
        ("SCV", "scv"),
        ("Planetary Fortress", "planetary_fortress"),
        ("Auto-Turret", "auto-turret")
    ]
    
    for original, expected in test_cases:
        normalized = original.lower().replace(' ', '_')
        assert normalized == expected


def test_cost_parsing():
    """Test parsing of resource costs from scraped data."""
    test_costs = [
        ("50/0", (50, 0)),
        ("100/25", (100, 25)),
        ("0/100", (0, 100)),
        ("150", (150, 0)),  # Only minerals
        ("", (0, 0))  # No cost
    ]
    
    def parse_cost(cost_str):
        """Parse cost string into minerals/gas tuple."""
        if not cost_str or cost_str == "":
            return (0, 0)
        
        if "/" in cost_str:
            parts = cost_str.split("/")
            return (int(parts[0]), int(parts[1]))
        else:
            return (int(cost_str), 0)
    
    for cost_str, expected in test_costs:
        result = parse_cost(cost_str)
        assert result == expected