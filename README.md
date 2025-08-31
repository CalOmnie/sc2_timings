# SC2 Gantt

A web-based interactive Gantt chart tool for planning and visualizing StarCraft II build orders. This application allows you to create, edit, and analyze build sequences for all three SC2 races (Protoss, Terran, Zerg) with timing and resource calculations.

## Features

- **Interactive Gantt Chart Interface**: Drag-and-drop build order planning
- **Multi-Race Support**: Complete data for Protoss, Terran, and Zerg units, buildings, and upgrades  
- **Real-time Resource Tracking**: Automatic calculation of mineral/gas costs and timing
- **Visual Entity Selection**: Browse units/buildings/upgrades with images and stats
- **Flexible Positioning**: Smart alignment guides and sequential placement
- **Scalable Timeline**: Zoom in/out with Ctrl+scroll for detailed or overview planning

## Installation

Using uv (recommended):
```bash
uv add sc2_gantt
```

Using pip:
```bash
pip install sc2_gantt
```

## Usage

### Web Interface

Start the web application using uv:
```bash
uv run sc2_gantt_web
```

Or with pip installation:
```bash
sc2_gantt_web
```

Then open your browser to `http://localhost:5001`

### Command Line

```bash
uv run sc2_gantt --help
```

## Development

```bash
git clone https://github.com/Calomnie/sc2_gantt.git
cd sc2_gantt
uv sync --dev
```

Run tests:
```bash
uv run pytest
```

Run the web app in development:
```bash
uv run python -m sc2_gantt.web_app
```

## Project Structure

```
src/sc2_gantt/
├── web_app.py           # Flask web application
├── templates/           # HTML templates  
├── static/             
│   ├── js/gantt.js     # Frontend JavaScript
│   ├── css/gantt.css   # Styling
│   ├── icons/          # SC2 entity icons
│   └── sc2_comprehensive_data.json  # Game data
└── sc2_data/           # Data scraping utilities
```

## License

MIT License
