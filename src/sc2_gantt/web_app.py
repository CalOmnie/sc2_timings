from flask import Flask, render_template, send_from_directory, jsonify
import os
import json
from pathlib import Path

def create_app():
    app = Flask(__name__, 
                template_folder=str(Path(__file__).parent / 'templates'),
                static_folder=str(Path(__file__).parent / 'static'))
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/api/sc2-data')
    def get_sc2_data():
        """Serve SC2 comprehensive data as JSON API endpoint."""
        try:
            data_path = Path(__file__).parent / 'static' / 'sc2_comprehensive_data.json'
            with open(data_path, 'r') as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        return send_from_directory(app.static_folder, filename)
    
    return app

def run_app():
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)

if __name__ == '__main__':
    run_app()