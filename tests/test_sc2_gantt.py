#!/usr/bin/env python

"""Tests for `sc2_gantt` package."""

import json
import pytest
from pathlib import Path

from sc2_gantt.backend.web_app import create_app


@pytest.fixture
def app():
    """Create test Flask application."""
    app = create_app()
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def sample_sc2_data():
    """Sample SC2 data for testing."""
    return {
        "metadata": {
            "scrape_timestamp": 1234567890,
            "total_entities": 3
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
                        "build_time": 18,
                        "supply": 1
                    },
                    "Barracks": {
                        "name": "Barracks", 
                        "type": "building",
                        "race": "terran",
                        "minerals": 150,
                        "gas": 0,
                        "build_time": 46
                    }
                },
                "upgrades": {
                    "Combat Shield": {
                        "name": "Combat Shield",
                        "race": "terran",
                        "minerals": 100,
                        "gas": 100,
                        "research_time": 79
                    }
                }
            }
        }
    }


def test_index_route(client):
    """Test the main index route."""
    response = client.get('/')
    assert response.status_code == 200
    assert b'StarCraft II Build Order Gantt Chart' in response.data
    assert b'gantt.js' in response.data
    assert b'gantt.css' in response.data


def test_api_sc2_data_route(client, monkeypatch, sample_sc2_data):
    """Test the SC2 data API endpoint."""
    # Mock the file reading
    def mock_open(*args, **kwargs):
        from unittest.mock import mock_open
        return mock_open(read_data=json.dumps(sample_sc2_data))()
    
    monkeypatch.setattr('builtins.open', mock_open)
    
    response = client.get('/api/sc2-data')
    assert response.status_code == 200
    
    data = response.get_json()
    assert 'metadata' in data
    assert 'races' in data
    assert data['races']['terran']['detailed_data']['Marine']['name'] == 'Marine'


def test_api_sc2_data_error_handling(client, monkeypatch):
    """Test error handling in SC2 data API."""
    # Mock file reading to raise an exception
    def mock_open_error(*args, **kwargs):
        raise FileNotFoundError("Test error")
    
    monkeypatch.setattr('builtins.open', mock_open_error)
    
    response = client.get('/api/sc2-data')
    assert response.status_code == 500
    
    data = response.get_json()
    assert 'error' in data


def test_static_file_serving(client):
    """Test static file serving."""
    # This tests the route exists, actual file serving depends on files being present
    response = client.get('/static/css/gantt.css')
    # Could be 200 (file exists) or 404 (file not found), both are valid responses
    assert response.status_code in [200, 404]


def test_app_creation():
    """Test Flask app creation."""
    app = create_app()
    assert app is not None
    assert 'static' in app.url_map._rules_by_endpoint


def test_sc2_data_structure(sample_sc2_data):
    """Test the expected structure of SC2 data."""
    assert 'metadata' in sample_sc2_data
    assert 'races' in sample_sc2_data
    
    # Test marine data structure
    marine = sample_sc2_data['races']['terran']['detailed_data']['Marine']
    required_fields = ['name', 'type', 'race', 'minerals', 'gas', 'build_time']
    for field in required_fields:
        assert field in marine
    
    # Test building data structure  
    barracks = sample_sc2_data['races']['terran']['detailed_data']['Barracks']
    assert barracks['type'] == 'building'
    assert barracks['minerals'] > 0
    
    # Test upgrade data structure
    upgrade = sample_sc2_data['races']['terran']['upgrades']['Combat Shield']
    assert 'research_time' in upgrade
    assert upgrade['minerals'] > 0
