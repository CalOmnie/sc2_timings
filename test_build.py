#!/usr/bin/env python3
"""
Test script to verify the static build works correctly.
"""

import json
from pathlib import Path
import subprocess
import sys

def test_build():
    """Test that the build produces the expected files."""
    
    # Run the build
    print("Running build_static.py...")
    result = subprocess.run([sys.executable, 'build_static.py'], 
                          capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Build failed with return code {result.returncode}")
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        return False
    
    print("Build completed successfully!")
    print(result.stdout)
    
    # Check that required files exist
    dist_dir = Path('dist')
    required_files = [
        'index.html',
        'css/gantt.css',
        'js/gantt.js',
        'api/sc2-data.json',
        'assets/sc2_comprehensive_data.json'
    ]
    
    missing_files = []
    for file_path in required_files:
        full_path = dist_dir / file_path
        if not full_path.exists():
            missing_files.append(file_path)
        else:
            print(f"✓ {file_path} exists ({full_path.stat().st_size} bytes)")
    
    if missing_files:
        print(f"Missing files: {missing_files}")
        return False
    
    # Check that API data is valid JSON
    api_file = dist_dir / 'api' / 'sc2-data.json'
    try:
        with open(api_file, 'r') as f:
            data = json.load(f)
        print(f"✓ API data is valid JSON with {len(str(data))} characters")
        
        # Check if data has the expected structure
        if 'races' in data:
            print(f"✓ API data has 'races' key with {len(data['races'])} races")
        else:
            print("⚠ API data doesn't have expected 'races' key")
            
    except json.JSONDecodeError as e:
        print(f"✗ API data is not valid JSON: {e}")
        return False
    
    # Check that JavaScript has been updated
    js_file = dist_dir / 'js' / 'gantt.js'
    with open(js_file, 'r') as f:
        js_content = f.read()
    
    if './api/sc2-data.json' in js_content:
        print("✓ JavaScript has been updated with static API paths")
    else:
        print("⚠ JavaScript may not have been updated correctly")
        print("Looking for fetch calls...")
        lines = js_content.split('\n')
        for i, line in enumerate(lines):
            if 'fetch(' in line and 'sc2-data' in line:
                print(f"  Line {i+1}: {line.strip()}")
    
    print("Build test completed!")
    return True

if __name__ == '__main__':
    success = test_build()
    sys.exit(0 if success else 1)