from flask import Flask, Blueprint, render_template

sub_app = Blueprint('opencoder', __name__, template_folder='templates', static_folder='static')

@sub_app.route('/')
def index():
    return render_template('oc_index.html')


@sub_app.route('/board/')
def board():
    return render_template('oc_board.html')

app = Flask(__name__)
app.register_blueprint(sub_app, url_prefix='/opencoder')
