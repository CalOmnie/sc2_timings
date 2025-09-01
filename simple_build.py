#!/usr/bin/env python3
"""
Simplified build script for GitHub Pages that handles common deployment issues.
"""

import os
import sys
import json
import shutil
from pathlib import Path

def build_simple_static():
    """Build a simplified static site that works reliably on GitHub Pages."""
    
    # Create dist directory
    dist_dir = Path('dist')
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    dist_dir.mkdir()
    
    print("Building simplified static site...")
    
    # Copy static files first
    frontend_dir = Path('src/sc2_gantt/frontend')
    
    # Copy CSS
    css_src = frontend_dir / 'css'
    css_dst = dist_dir / 'css'
    if css_src.exists():
        shutil.copytree(css_src, css_dst)
        print(f"✓ Copied CSS files")
    
    # Copy and modify JS
    js_src = frontend_dir / 'js' / 'gantt.js'
    js_dst = dist_dir / 'js'
    js_dst.mkdir()
    
    if js_src.exists():
        with open(js_src, 'r', encoding='utf-8') as f:
            js_content = f.read()
        
        # Get the repository name from environment or default
        repo_name = os.environ.get('GITHUB_REPOSITORY', '').split('/')[-1] if os.environ.get('GITHUB_REPOSITORY') else ''
        base_path = f'/{repo_name}' if repo_name else ''
        
        print(f"Using base path: '{base_path}'")
        
        # Replace API calls with the correct GitHub Pages path
        js_content = js_content.replace(
            "fetch('/api/sc2-data')", 
            f"fetch('{base_path}/api/sc2-data.json')"
        )
        js_content = js_content.replace(
            "fetch('api/sc2-data.json')", 
            f"fetch('{base_path}/api/sc2-data.json')"
        )
        
        # Fix asset paths - use more specific patterns to avoid double replacement
        # Only replace the path in the getIconPath function return statement
        js_content = js_content.replace(
            'return `/assets/icons/${race}/${entityType}s/${name}.jpg`;',
            f'return `{base_path}/assets/icons/${{race}}/${{entityType}}s/${{name}}.jpg`;'
        )
        
        # Fix export functionality for static hosting
        export_old = '''// Send to export endpoint
            const response = await fetch('/export/build-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(buildOrder)
            });
            
            if (response.ok) {
                // Trigger download
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'build_order.json';
                link.style.display = 'none';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
                
                console.log('Build order exported successfully');
            } else {
                throw new Error(`Export failed: ${response.statusText}`);
            }'''
        
        export_new = '''// Static hosting - export as client-side download
            const blob = new Blob([JSON.stringify(buildOrder, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'build_order.json';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            console.log('Build order exported successfully');'''
        
        js_content = js_content.replace(export_old, export_new)
        
        # Add initialization debugging
        js_content = js_content.replace(
            "window.addEventListener('load', () => {",
            """console.log('GitHub Pages SC2 Gantt Chart starting...');
console.log('Base path:', window.location.pathname);
console.log('Repository detected:', '""" + repo_name + """');

window.addEventListener('load', () => {
    console.log('Window loaded, initializing Gantt Chart...');"""
        )
        
        with open(js_dst / 'gantt.js', 'w', encoding='utf-8') as f:
            f.write(js_content)
        print(f"✓ Modified and copied JavaScript")
    
    # Copy assets
    assets_src = Path('src/sc2_gantt/assets')
    assets_dst = dist_dir / 'assets'
    if assets_src.exists():
        shutil.copytree(assets_src, assets_dst)
        print(f"✓ Copied assets")
    
    # Create API directory and copy data
    api_dir = dist_dir / 'api'
    api_dir.mkdir()
    
    data_file = Path('src/sc2_gantt/assets/sc2_comprehensive_data.json')
    if data_file.exists():
        shutil.copy2(data_file, api_dir / 'sc2-data.json')
        print(f"✓ Copied SC2 data to API endpoint")
    else:
        print(f"✗ Warning: Could not find data file at {data_file}")
    
    # Create simplified HTML
    html_content = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>StarCraft II Build Order Gantt Chart</title>
    <link rel="stylesheet" href="{base_path}/css/gantt.css">
    <script>
        // GitHub Pages debugging
        console.log('HTML loaded, base path: {base_path}');
        console.log('Current URL:', window.location.href);
        console.log('Repository: {repo_name}');
        
        // Test if files are accessible
        window.addEventListener('DOMContentLoaded', () => {{
            console.log('DOM loaded, testing file access...');
            
            // Test CSS
            const cssLink = document.querySelector('link[rel="stylesheet"]');
            if (cssLink) {{
                console.log('CSS link found:', cssLink.href);
            }}
            
            // Test JS will be loaded
            console.log('JavaScript will load from:', '{base_path}/js/gantt.js');
            
            // Test API endpoint
            console.log('API endpoint will be:', '{base_path}/api/sc2-data.json');
        }});
    </script>
</head>
<body>
    <div class="container">
        <div class="toolbar">
            <div class="tab-container">
                <div class="tab-group race-tabs">
                    <div class="tab-header">Race</div>
                    <div class="tabs">
                        <div class="tab race-tab" data-race="protoss">
                            <span class="tab-icon">⚡</span>
                            <span class="tab-label">Protoss</span>
                        </div>
                        <div class="tab race-tab" data-race="terran">
                            <span class="tab-icon">🔧</span>
                            <span class="tab-label">Terran</span>
                        </div>
                        <div class="tab race-tab" data-race="zerg">
                            <span class="tab-icon">🦠</span>
                            <span class="tab-label">Zerg</span>
                        </div>
                    </div>
                </div>
                
                <div class="tab-group type-tabs">
                    <div class="tab-header">Type</div>
                    <div class="tabs">
                        <div class="tab type-tab" data-type="units">
                            <span class="tab-icon">👥</span>
                            <span class="tab-label">Units</span>
                        </div>
                        <div class="tab type-tab" data-type="buildings">
                            <span class="tab-icon">🏗️</span>
                            <span class="tab-label">Buildings</span>
                        </div>
                        <div class="tab type-tab" data-type="upgrades">
                            <span class="tab-icon">⬆️</span>
                            <span class="tab-label">Upgrades</span>
                        </div>
                    </div>
                </div>
                
                <div class="search-container">
                    <div class="search-header">Search</div>
                    <input type="text" id="entitySearch" placeholder="Search entities..." class="search-input">
                    <div class="entity-count">
                        Found: <span id="entityCount">0</span>
                    </div>
                </div>
                
                <div class="toolbar-actions">
                    <button id="addRow" class="toolbar-btn">Add Row</button>
                    <button id="downloadData" class="toolbar-btn">Download Data</button>
                    <button id="exportBuildOrder" class="toolbar-btn">Export Build Order</button>
                    <div id="timeScaleDisplay" class="time-scale-display">Scale: 3.0x</div>
                </div>
            </div>
            
            <div class="entity-palette" id="entityPalette">
                <div class="palette-header">
                    <h3>Entities</h3>
                </div>
                <div class="palette-content" id="paletteContent">
                    <!-- Entity icons will be populated here -->
                </div>
            </div>
        </div>
        
        <div class="main-content">
            <div class="chart-container">
                <div class="time-index" id="timeIndex"></div>
                <div class="chart" id="chart">
                    <div class="grid-lines" id="gridLines"></div>
                    <!-- Rows will be added dynamically -->
                    <div class="row" data-row="0">
                        <div class="row-label">Row 1</div>
                        <div class="row-stats">
                            <div class="row-end-time">End: 0:00</div>
                            <div class="row-total-cost">Cost: 0/0</div>
                        </div>
                        <div class="row-controls">
                            <button class="row-control-btn delete-row" title="Delete Row">❌</button>
                            <button class="row-control-btn clear-row" title="Clear Row">🗑️</button>
                            <button class="row-control-btn align-left" title="Align Left">⇤</button>
                            <button class="row-control-btn align-right" title="Align with Row Above End">⇥</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="info-panel" id="infoPanel">
                <div class="info-header">
                    <h3 id="infoTitle">Entity Information</h3>
                    <button id="closeInfoPanel" class="close-btn">×</button>
                </div>
                <div class="info-content" id="infoContent">
                    <!-- Entity information will be populated here -->
                </div>
            </div>
        </div>
    </div>

    <script src="{base_path}/js/gantt.js"></script>
</body>
</html>'''
    
    with open(dist_dir / 'index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    # Create 404.html
    with open(dist_dir / '404.html', 'w', encoding='utf-8') as f:
        f.write(f'''<!DOCTYPE html>
<html>
<head>
    <title>404 - Page Not Found</title>
    <meta http-equiv="refresh" content="0; url={base_path}/">
</head>
<body>
    <p>Redirecting to <a href="{base_path}/">SC2 Gantt Chart</a>...</p>
</body>
</html>''')
    
    print(f"\n✓ Static site built successfully in {dist_dir.absolute()}")
    print(f"✓ Base path configured as: '{base_path}'")
    
    # Verify key files
    key_files = ['index.html', 'css/gantt.css', 'js/gantt.js', 'api/sc2-data.json']
    for file in key_files:
        path = dist_dir / file
        if path.exists():
            print(f"  ✓ {file} ({path.stat().st_size} bytes)")
        else:
            print(f"  ✗ {file} missing!")

if __name__ == '__main__':
    build_simple_static()