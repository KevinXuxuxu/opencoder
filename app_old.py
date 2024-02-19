import uuid
from flask import Flask, redirect, render_template, request, jsonify
from collections import namedtuple

app = Flask(__name__)

boards = {}

class Board:

    def __init__(self, id, pid=None, host_ip=None):
        self.id = id
        self.pid = pid
        self.host_ip = host_ip

    def __repr__(self):
        return f'Board(id={self.id}, pid={self.pid}, host_ip={self.host_ip})'


@app.route('/')
def hello_world():
    return redirect('/board?bid=' + str(uuid.uuid4())[:8])


@app.route('/board')
def board():
    bid = request.args['bid']
    if bid not in boards:
        boards[bid] = Board(bid)
    board = boards[bid]
    is_host = (board.host_ip is None and board.host_ip == request.remote_addr)
    return render_template('board.html', board=boards[bid], is_host=is_host)


@app.route('/api/board/update', methods=['POST'])
def report_pid():
    data = request.json
    bid, pid = data['bid'], data['pid']
    boards[bid].pid = pid
    boards[bid].host_ip = request.remote_addr
    return jsonify({'status': 'OK'})


@app.route('/debug/all_boards')
def debug_all_boards():
    return '\n\n'.join([str(b) for b in boards.values()])
