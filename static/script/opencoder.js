// var bid = '{{ board.id }}';
// var host = '{{ board.pid }}';

var peer = new Peer();
var main_conn = null;
var logging = true;

function oc_log(s) {
    if (logging) {
        console.log(s);
    }
}

function oc_report_pid(id) {
    fetch('/api/report/pid', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            bid: bid,
            pid: id
        })  // JSON data to send in the request body
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();  // Parse the response body as JSON
    })
    .then(data => {
        oc_log('Response from Flask server:', data);
        // Handle the response data here
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

function oc_send(payload) {
    if (main_conn === null) {
        oc_log('connection not established.');
        return;
    }
    main_conn.send(payload);
}

class CodeLine {
    constructor(type, content) {
        this.type = type;
        this.content = content;
    }
}

function codeline_to_html(cl) {
    if (cl.type === 'text') {
        return document.createTextNode(cl.content);
    }
    if (cl.type == 'br') {
        return document.createElement('br');
    }
    return null;
}

class CodeBoard {

    constructor() {
        this.data = [new CodeLine('text', 'print("hello")')];
        this._ele = null;
    }

    ele() {
        if (this._ele == null) {
            this._ele = $("#board")[0];
        }
        return this._ele;
    }

    parse() {
        var new_data = []
        this.ele().childNodes.forEach(function(e) {
            if (e.nodeName === '#text') {
                new_data.push(new CodeLine('text', e.data));
            } else if (e.nodeName === 'BR') {
                new_data.push(new CodeLine('br', '<br>'));
            }
        });
        // oc_log("new_data", new_data);
        return new_data;
    }

    refresh() {
        var new_data = this.parse();
        var update = {};
        var max_n = Math.max(new_data.length, this.data.length);
        for (var i = 0; i < max_n; i++) {
            if (i >= new_data.length) {
                update[i] = new CodeLine('text', '');
            } else if (i >= this.data.length) {
                update[i] = new_data[i];
            } else if (new_data[i].type !== this.data[i].type
                    || new_data[i].content !== this.data[i].content) {
                update[i] = new_data[i];
            }
        }
        // oc_log("update", update);
        this.data = new_data;
        return update;
    }

    update(new_lines) {
        var cnt = 0;
        for (var i = 0; i < this.data.length; i++) {
            var cl = new_lines[i];
            var node = this.ele().childNodes[i];
            if (cl == null) continue;
            cnt += 1;
            this.data[i] = cl;
            if (cl.type === 'text') {
                if (node.nodeName === 'BR') {
                    this.ele().replaceChild(
                        document.createTextNode(cl.content), node);
                } else {
                    node.data = cl.content;
                }
            } else if (cl.type === 'br') {
                this.ele().replaceChild(document.createElement('br'), node);
            }
        }
        var i = this.data.length;
        while (cnt < Object.keys(new_lines).length) {
            this.data.push(new_lines[i]);
            this.ele().appendChild(codeline_to_html(new_lines[i]));
            cnt += 1;
            i += 1;
        }
    }
}

var cb = new CodeBoard();

peer.on('open', function(id) {
    oc_log('My peer ID is: ' + id);
    if (host == 'None') {
        // This client is the host, send current pid back to server.
        oc_report_pid(id);
        
        // Listen for connection.
        oc_log('host listening for connection...');
        peer.on('connection', function(conn) {
            oc_log('connection established!');
            main_conn = conn;
            // Listen for update from client.
            conn.on('data', function(data) {
                oc_log('received', data);
                cb.update(data);
            });
            // Update client with host data
            setTimeout(function() {
                oc_log('Update client with host data')
                oc_send(cb.parse());
            }, 500);
        });
    } else {
        // Connect to host.
        main_conn = peer.connect(host);
        main_conn.on('data', function(data) {
            oc_log('received', data)
            cb.update(data);
        });
    }
});

window.onload = function() {
    $('#board')[0].addEventListener('input', function() {
        var payload = cb.refresh();
        if (!(payload == null) && Object.keys(payload).length > 0) {
            oc_log("sending", payload);
            oc_send(payload);
        }
    });
}