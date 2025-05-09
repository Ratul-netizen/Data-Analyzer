# Social Media Analytics Dashboard

A comprehensive dashboard for analyzing social media posts across multiple platforms, including sentiment analysis, virality metrics, and engagement statistics.

## Features

- Real-time data updates using WebSocket
- Sentiment analysis visualization
- Virality score tracking
- Post engagement metrics
- Platform-wise data breakdown
- Responsive design

## Prerequisites

- Python 3.8+
- Node.js 14+
- npm or yarn

## Setup

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the Flask server:
   ```bash
   python app.py
   ```

The backend server will start on http://localhost:5000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

The frontend application will start on http://localhost:3000

## API Configuration

The backend is configured to connect to the following API endpoints:
- Facebook: http://192.168.100.35:8051/post/list/?platform=F
- Instagram: http://192.168.100.35:8051/post/list/?platform=I
- X (Twitter): http://192.168.100.35:8051/post/list/?platform=X
- YouTube: http://192.168.100.35:8051/post/list/?platform=Y
- Telegram: http://192.168.100.35:8051/post/list/?platform=T

Update these endpoints in `backend/app.py` if needed.

## Development

- Backend code is in Python using Flask and Flask-SocketIO
- Frontend is built with React, Chart.js, and Bootstrap
- Real-time updates are handled through Socket.IO

## License

MIT #   D a t a - A n a l y z e r  
 