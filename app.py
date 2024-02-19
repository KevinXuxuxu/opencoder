from flask import render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/board')
def board():
    return render_template('board.html')
