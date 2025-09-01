from flask import Flask, render_template, send_from_directory, jsonify, send_file, Response
import os
import json
from pathlib import Path

def error_response(message, status_code=500):
    """Helper to create consistent error responses."""
    return jsonify({'error': message}), status_code

def create_app():
    # Calculate paths relative to new directory structure
    backend_dir = Path(__file__).parent
    project_root = backend_dir.parent
    template_folder = str(project_root / 'frontend' / 'templates')
    static_folder = str(project_root / 'frontend')
    
    app = Flask(__name__, 
                template_folder=template_folder,
                static_folder=static_folder)
    
    @app.route('/')
    def index():
        return render_template('index.html')
    
    @app.route('/api/sc2-data')
    def get_sc2_data():
        """Serve SC2 comprehensive data as JSON API endpoint."""
        try:
            data_path = project_root / 'assets' / 'sc2_comprehensive_data.json'
            with open(data_path, 'r') as f:
                data = json.load(f)
            return jsonify(data)
        except Exception as e:
            return error_response(str(e))
    
    @app.route('/static/<path:filename>')
    def serve_static(filename):
        return send_from_directory(app.static_folder, filename)
    
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        """Serve assets like icons and data files."""
        assets_folder = str(project_root / 'assets')
        return send_from_directory(assets_folder, filename)
    
    @app.route('/download/sc2-data')
    def download_sc2_data():
        """Download SC2 comprehensive data as JSON file."""
        try:
            data_path = project_root / 'assets' / 'sc2_comprehensive_data.json'
            return send_file(
                data_path,
                as_attachment=True,
                download_name='sc2_comprehensive_data.json',
                mimetype='application/json'
            )
        except Exception as e:
            return error_response(str(e))
    
    @app.route('/download/sc2-data/<race>')
    def download_race_data(race):
        """Download data for a specific race as JSON file."""
        try:
            data_path = project_root / 'assets' / 'sc2_comprehensive_data.json'
            with open(data_path, 'r') as f:
                data = json.load(f)
            
            if race not in data.get('races', {}):
                return error_response(f'Race "{race}" not found', 404)
            
            race_data = {
                'race': race,
                'data': data['races'][race]
            }
            
            response = Response(
                json.dumps(race_data, indent=2),
                mimetype='application/json'
            )
            response.headers['Content-Disposition'] = f'attachment; filename=sc2_{race}_data.json'
            return response
            
        except Exception as e:
            return error_response(str(e))
    
    @app.route('/export/build-order', methods=['POST'])
    def export_build_order():
        """Export build order data as JSON file."""
        from flask import request
        try:
            build_order = request.get_json()
            if not build_order:
                return error_response('No build order data provided', 400)
            
            response = Response(
                json.dumps(build_order, indent=2),
                mimetype='application/json'
            )
            response.headers['Content-Disposition'] = 'attachment; filename=build_order.json'
            return response
            
        except Exception as e:
            return error_response(str(e))
    
    return app

def run_app():
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)

if __name__ == '__main__':
    run_app()