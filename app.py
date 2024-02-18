import uuid
from flask import Flask, redirect, render_template, request, jsonify
from collections import namedtuple

app = Flask(__name__)

boards = {}

class Board:

    def __init__(self, id, pid=None):
        self.id = id
        self.pid = pid

    def __repr__(self):
        return f'Board(id={self.id}, pid={self.pid})'


@app.route('/')
def hello_world():
    return redirect('/board/' + str(uuid.uuid4())[:8])


@app.route('/board/<bid>')
def board(bid):
    if bid not in boards:
        boards[bid] = Board(bid)
    return render_template('board.html', board=boards[bid])


@app.route('/api/report/pid', methods=['POST'])
def report_pid():
    data = request.json
    print(data)
    bid, pid = data['bid'], data['pid']
    boards[bid].pid = pid
    return jsonify({'status': 'OK'})


@app.route('/debug/all_boards')
def debug_all_boards():
    return '\n'.join([str(b) for b in boards.values()])
