#!/usr/bin/env python3
"""
Build script to generate static files for GitHub Pages deployment.
This converts the Flask app into a static site that can be hosted on GitHub Pages.
"""

import os
import json
import shutil
from pathlib import Path
from flask import Flask
from src.sc2_gantt.backend.web_app import create_app

def build_static_site():
    """Build the static site for GitHub Pages deployment."""
    
    # Create dist directory
    dist_dir = Path('dist')
    dist_dir.mkdir(exist_ok=True)
    
    # Clean dist directory
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    dist_dir.mkdir()
    
    # Create the Flask app
    app = create_app()
    
    # Copy static HTML template
    print("Copying static HTML template...")
    static_template_path = Path('src/sc2_gantt/frontend/templates/static_index.html')
    if static_template_path.exists():
        shutil.copy2(static_template_path, dist_dir / 'index.html')
    else:
        # Fallback to dynamic template if static doesn't exist
        with app.test_client() as client:
            response = client.get('/')
            content = response.get_data(as_text=True)
            # Replace Flask url_for calls with static paths
            content = content.replace("{{ url_for('static', filename='css/gantt.css') }}", "./css/gantt.css")
            content = content.replace("{{ url_for('static', filename='js/gantt.js') }}", "./js/gantt.js")
            with open(dist_dir / 'index.html', 'w', encoding='utf-8') as f:
                f.write(content)
        
    # Generate API data as static JSON
    print("Generating sc2-data.json...")
    with app.test_client() as client:
        response = client.get('/api/sc2-data')
        api_dir = dist_dir / 'api'
        api_dir.mkdir()
        with open(api_dir / 'sc2-data.json', 'w', encoding='utf-8') as f:
            f.write(response.get_data(as_text=True))
    
    # Copy static files
    print("Copying static files...")
    
    # Copy frontend files (CSS, JS)
    frontend_dir = Path('src/sc2_gantt/frontend')
    
    # Copy CSS
    css_src = frontend_dir / 'css'
    css_dst = dist_dir / 'css'
    if css_src.exists():
        shutil.copytree(css_src, css_dst)
    
    # Copy JS
    js_src = frontend_dir / 'js'
    js_dst = dist_dir / 'js'
    if js_src.exists():
        shutil.copytree(js_src, js_dst)
    
    # Copy assets
    assets_src = Path('src/sc2_gantt/assets')
    assets_dst = dist_dir / 'assets'
    if assets_src.exists():
        shutil.copytree(assets_src, assets_dst)
    
    # Update API endpoints in JavaScript for static hosting
    print("Updating API endpoints for static hosting...")
    gantt_js_path = dist_dir / 'js' / 'gantt.js'
    if gantt_js_path.exists():
        with open(gantt_js_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace API endpoints with static file paths
        content = content.replace("'/api/sc2-data'", "'./api/sc2-data.json'")
        content = content.replace('"/api/sc2-data"', '"./api/sc2-data.json"')
        
        # Update asset paths to be relative
        content = content.replace('/assets/', './assets/')
        
        # Update export functionality for static hosting
        export_replacement = '''
        // Static hosting - export as client-side download
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
        
        # Replace the server-side export with client-side export
        if '/export/build-order' in content:
            # Find and replace the fetch call for export
            import re
            content = re.sub(
                r"const response = await fetch\('/export/build-order'.*?\n.*?console\.log\('Build order exported successfully'\);",
                export_replacement.strip(),
                content,
                flags=re.DOTALL
            )
        
        with open(gantt_js_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    # Create a simple 404.html for GitHub Pages
    print("Creating 404.html...")
    with open(dist_dir / '404.html', 'w', encoding='utf-8') as f:
        f.write("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 - Page Not Found | SC2 Gantt Chart</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            margin-top: 50px; 
            background: #1e1e2e;
            color: #cdd6f4;
        }
        a { 
            color: #89b4fa; 
            text-decoration: none; 
        }
        a:hover { 
            text-decoration: underline; 
        }
    </style>
</head>
<body>
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <p><a href="./">Return to SC2 Gantt Chart</a></p>
</body>
</html>""")
    
    # Create README for the built site
    print("Creating README...")
    with open(dist_dir / 'README.md', 'w', encoding='utf-8') as f:
        f.write("""# SC2 Gantt Chart - Static Build

This is the static build of the SC2 Gantt Chart application, automatically generated for GitHub Pages deployment.

## About

The SC2 Gantt Chart is a web application for planning and visualizing StarCraft II build orders using an interactive timeline interface.

## Features

- Interactive timeline for build order planning
- Support for all three races (Protoss, Terran, Zerg)
- Drag and drop entity placement
- Chronoboost support for Protoss units
- Export/import functionality
- Real-time cost and timing calculations

## Source Code

The source code for this application is available in the main repository.
""")
    
    print(f"Static site built successfully in {dist_dir.absolute()}")
    
    # List files in dist for verification
    print("\nGenerated files:")
    for file in dist_dir.rglob('*'):
        if file.is_file():
            print(f"  {file.relative_to(dist_dir)}")

if __name__ == '__main__':
    build_static_site()