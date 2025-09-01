#!/usr/bin/env python3
"""
Simplified build script for GitHub Pages that only sets configuration parameters.
Does not modify any JavaScript or CSS code - uses parameterization instead.
"""

import os
import json
import shutil
from pathlib import Path

def build_static_site():
    """Build static site by copying files and setting configuration parameters."""
    
    # Create dist directory
    dist_dir = Path('dist')
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    dist_dir.mkdir()
    
    # Get repository info from environment
    repo_name = os.environ.get('GITHUB_REPOSITORY', '').split('/')[-1] if os.environ.get('GITHUB_REPOSITORY') else ''
    base_path = f'/{repo_name}' if repo_name else ''
    
    print(f"Building static site for repository: {repo_name}")
    print(f"Base path: {base_path}")
    
    # Copy static files without modification
    frontend_dir = Path('src/sc2_gantt/frontend')
    
    # Copy CSS
    css_src = frontend_dir / 'css'
    css_dst = dist_dir / 'css'
    if css_src.exists():
        shutil.copytree(css_src, css_dst)
        print("✓ Copied CSS files")
    
    # Copy JavaScript
    js_src = frontend_dir / 'js'
    js_dst = dist_dir / 'js'
    if js_src.exists():
        shutil.copytree(js_src, js_dst)
        print("✓ Copied JavaScript files")
    
    # Copy assets
    assets_src = Path('src/sc2_gantt/assets')
    assets_dst = dist_dir / 'assets'
    if assets_src.exists():
        shutil.copytree(assets_src, assets_dst)
        print("✓ Copied assets")
    
    # Create API directory and copy data
    api_dir = dist_dir / 'api'
    api_dir.mkdir()
    
    data_file = Path('src/sc2_gantt/assets/sc2_comprehensive_data.json')
    if data_file.exists():
        shutil.copy2(data_file, api_dir / 'sc2-data.json')
        print("✓ Created API endpoint")
    
    # Copy HTML template and only update Flask syntax
    flask_template = Path('src/sc2_gantt/frontend/templates/index.html')
    if flask_template.exists():
        with open(flask_template, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Only replace Flask url_for calls - no other modifications
        html_content = html_content.replace(
            "{{ url_for('static', filename='css/gantt.css') }}", 
            f"{base_path}/css/gantt.css"
        )
        html_content = html_content.replace(
            "{{ url_for('static', filename='js/gantt.js') }}", 
            f"{base_path}/js/gantt.js"
        )
        
        # Add configuration parameters before closing </head>
        config_script = f'''
    <script>
        // Configuration for GitHub Pages
        window.APP_BASE_PATH = '{base_path}';
        window.APP_API_URL = '{base_path}/api/sc2-data.json';
        window.APP_STATIC_MODE = true;
    </script>'''
        
        html_content = html_content.replace('</head>', config_script + '\n</head>')
        
        with open(dist_dir / 'index.html', 'w', encoding='utf-8') as f:
            f.write(html_content)
        print("✓ Created index.html with configuration")
    
    # Create simple 404 redirect
    with open(dist_dir / '404.html', 'w', encoding='utf-8') as f:
        f.write(f'<meta http-equiv="refresh" content="0; url={base_path}/">')
    
    print(f"\n✓ Static site built successfully in {dist_dir.absolute()}")
    
    # Verify key files
    key_files = ['index.html', 'css/gantt.css', 'js/gantt.js', 'api/sc2-data.json']
    for file in key_files:
        path = dist_dir / file
        if path.exists():
            print(f"  ✓ {file} ({path.stat().st_size} bytes)")
        else:
            print(f"  ✗ {file} missing!")

if __name__ == '__main__':
    build_static_site()