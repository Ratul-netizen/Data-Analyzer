# Social Media Analytics Dashboard Backend

This is the backend server for the Social Media Analytics Dashboard. It provides sample social media data and real-time updates through WebSocket connections.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows:
```bash
venv\Scripts\activate
```
- Unix/MacOS:
```bash
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the server:
```bash
python app.py
```

The server will start on http://localhost:5000

## API Endpoints

- GET `/fetch_posts`: Returns current social media data
- WebSocket: Connects to real-time updates (event: 'data_update') 