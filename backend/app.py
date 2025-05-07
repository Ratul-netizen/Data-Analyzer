from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO
from datetime import datetime, timedelta
import random
import time
from threading import Thread
import requests

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Platform codes and info
PLATFORMS = {
    'F': 'Facebook',
    'I': 'Instagram',
    'X': 'X',
    'Y': 'YouTube',
    'T': 'Telegram'
}

# Sample data structure with timestamps and correct fields

def generate_sample_data(start_date=None, end_date=None):
    if not start_date:
        start_date = datetime.now() - timedelta(days=30)
    if not end_date:
        end_date = datetime.now()

    data = {}
    for code in PLATFORMS.keys():
        posts = []
        current_date = start_date
        while current_date <= end_date:
            for _ in range(random.randint(1, 2)):
                post = {
                    '_id': f'{code}_{current_date.strftime("%Y%m%d")}_{_}',
                    'post_text': f'Sample post {_} from {PLATFORMS[code]} on {current_date.strftime("%Y-%m-%d")}',
                    'post_url': f'https://{PLATFORMS[code].lower()}.com/post/{code}_{current_date.strftime("%Y%m%d")}_{_}',
                    'web_url': f'https://{PLATFORMS[code].lower()}.com/post/{code}_{current_date.strftime("%Y%m%d")}_{_}',
                    'reactions': {
                        'Like': random.randint(0, 100),
                        'Love': random.randint(0, 50),
                        'Sad': random.randint(0, 10),
                        'Haha': random.randint(0, 10),
                        'Wow': random.randint(0, 10),
                        'Angry': random.randint(0, 5),
                        'Care': random.randint(0, 5),
                        'Total': 0  # Will sum below
                    },
                    'total_comments': random.randint(0, 50),
                    'total_shares': random.randint(0, 30),
                    'total_views': random.randint(100, 10000),
                    'vitality_score': round(random.uniform(0.1, 10.0), 2),
                    'featured_image': [],
                    'url_screenshot': None,
                    'source': PLATFORMS[code],
                    'source_id': f'{code}_source',
                    'ner_entities': [],
                    'posted_at': current_date.isoformat(),
                    'author': {
                        'name': f'Author {code}',
                        'followers': random.randint(100, 10000)
                    }
                }
                # Calculate total reactions
                post['reactions']['Total'] = sum([
                    post['reactions']['Like'],
                    post['reactions']['Love'],
                    post['reactions']['Sad'],
                    post['reactions']['Haha'],
                    post['reactions']['Wow'],
                    post['reactions']['Angry'],
                    post['reactions']['Care']
                ])
                posts.append(post)
            current_date += timedelta(days=1)
        data[code] = {
            'posts': posts
        }
    return data

@app.route('/post/list/', methods=['GET'])
def fetch_posts():
    platform = request.args.get('platform')
    if not platform:
        return jsonify({'error': 'platform is required'}), 400

    real_api_url = f'http://192.168.100.35:8051/post/list/?platform={platform}'
    try:
        resp = requests.get(real_api_url, timeout=10)
        print(resp.json())
        resp.raise_for_status()
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Background task to emit updates
def background_task():
    while True:
        socketio.emit('data_update', generate_sample_data())
        time.sleep(30)  # Update every 30 seconds

if __name__ == '__main__':
    Thread(target=background_task, daemon=True).start()
    socketio.run(app, port=5000, debug=True) 