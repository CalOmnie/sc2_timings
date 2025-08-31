# Backward compatibility - import from backend module
from .backend.web_app import create_app, run_app

if __name__ == '__main__':
    run_app()