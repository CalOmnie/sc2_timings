# SC2 Gantt API Documentation

## Overview

The SC2 Gantt web application provides a REST API for accessing StarCraft II game data and interacting with the Gantt chart functionality.

## Base URL

When running locally: `http://localhost:5001`

## Endpoints

### GET /api/sc2-data

Returns comprehensive StarCraft II game data including units, buildings, and upgrades for all races.

**Response Format:**
```json
{
  "metadata": {
    "scrape_timestamp": 1756499358.2820857,
    "total_entities": 114
  },
  "races": {
    "protoss": {
      "entities": [...],
      "detailed_data": {...},
      "upgrades": {...}
    },
    "terran": {
      "entities": [...],
      "detailed_data": {...},
      "upgrades": {...}
    },
    "zerg": {
      "entities": [...],
      "detailed_data": {...},
      "upgrades": {...}
    }
  }
}
```

**Entity Structure:**
```json
{
  "name": "Marine",
  "type": "unit",
  "race": "terran",
  "minerals": 50,
  "gas": 0,
  "build_time": 18,
  "supply": 1,
  "built_from": ["Barracks"],
  "requires": []
}
```

**Building Structure:**
```json
{
  "name": "Barracks",
  "type": "building",
  "race": "terran", 
  "minerals": 150,
  "gas": 0,
  "build_time": 46,
  "built_from": ["SCV"],
  "requires": ["Supply Depot"]
}
```

**Upgrade Structure:**
```json
{
  "name": "Combat Shield",
  "type": "upgrade",
  "race": "terran",
  "minerals": 100,
  "gas": 100,
  "research_time": 79,
  "researched_from": ["Barracks"],
  "requires": ["Barracks"]
}
```

### GET /static/<path:filename>

Serves static files including:
- CSS stylesheets (`css/gantt.css`)
- JavaScript files (`js/gantt.js`) 
- Entity icons (`icons/<race>/<type>/<entity_name>.jpg`)

**Example:**
- `/static/icons/terran/units/marine.jpg`
- `/static/icons/protoss/buildings/nexus.jpg`
- `/static/css/gantt.css`

## Data Structure Details

### Race Data

Each race contains:
- `entities`: List of all units/buildings for the race
- `detailed_data`: Detailed stats and requirements for each entity
- `upgrades`: Available upgrades with research requirements

### Entity Types

- **unit**: Combat and worker units
- **building**: Structures that can be built
- **upgrade**: Research improvements

### Resource Costs

All entities include:
- `minerals`: Mineral cost (0 if none)
- `gas`: Gas cost (0 if none) 
- `build_time` or `research_time`: Time in seconds
- `supply`: Supply cost/provided (units/buildings)

### Requirements

- `built_from`: What can produce this entity
- `requires`: Prerequisites needed before building/researching
- `researched_from`: Where upgrades are researched

## Error Responses

### 500 Internal Server Error
```json
{
  "error": "Error message description"
}
```

Occurs when:
- SC2 data file cannot be loaded
- File system errors accessing static content

## Usage Examples

### JavaScript/Fetch
```javascript
// Get all SC2 data
const response = await fetch('/api/sc2-data');
const data = await response.json();

// Access Protoss units
const protossUnits = Object.values(data.races.protoss.detailed_data)
  .filter(entity => entity.type === 'unit');

// Get Marine stats
const marine = data.races.terran.detailed_data['Marine'];
console.log(`Marine costs: ${marine.minerals}/${marine.gas}, builds in ${marine.build_time}s`);
```

### Python/Requests
```python
import requests

# Get SC2 data
response = requests.get('http://localhost:5001/api/sc2-data')
data = response.json()

# Find all Zerg buildings
zerg_buildings = [
    entity for entity in data['races']['zerg']['detailed_data'].values()
    if entity['type'] == 'building'
]
```

## Rate Limits

No rate limits are currently implemented for local development usage.

## Caching

Static files are served with standard HTTP caching headers. The SC2 data is loaded from disk on each request.