import os
from flask import Flask, Blueprint, render_template

sub_app = Blueprint('opencoder', __name__, template_folder='templates', static_folder='static')
url_prefix = os.environ.get('OPENCODER_URL_PREFIX', '')

@sub_app.route('/')
def index():
    return render_template('oc_index.html', prefix=url_prefix)


@sub_app.route('/board/')
def board():
    return render_template('oc_board.html', prefix=url_prefix)

app = Flask(__name__)
app.register_blueprint(sub_app, url_prefix=url_prefix)
