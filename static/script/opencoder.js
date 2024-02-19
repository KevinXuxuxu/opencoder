var main_conn = null;

function oc_url_arg(key) {
    var queryParams = new URLSearchParams(window.location.search);
    return queryParams.get(key);
}

var logging = oc_url_arg('logging');

function oc_log() {
    if (logging === 'on') {
        console.log.apply(null, arguments);
    }
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
            if (cl == null) continue;
            cnt += 1;
            this.data[i] = cl;
            this.ele().replaceChild(codeline_to_html(cl), this.ele().childNodes[i])
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

function oc_send(payload) {
    if (main_conn === null) {
        oc_log('connection not established.');
        return;
    }
    main_conn.send(payload);
}

function oc_receive(payload) {
    if (payload.type === "update") {
        cb.update(payload.data);
    } else if (payload.type === "run") {
        $('codapi-toolbar')[0].dispatchEvent(new Event('run'));
    } else {
        oc_log("Unrecognized payload:", payload);
    }
}

function oc_listen() {
    main_conn.on('data', function(payload) {
        oc_log('received', payload);
        oc_receive(payload);
    });
}

function oc_add_error_handler(peer) {
    peer.on('error', function(err) {
        oc_log('peer error', err);
    });
    peer.on('disconnected', function() {
        oc_log('peer disconnected');
    });
}

var host_peer = null;
var host_pid = oc_url_arg('pid');

function oc_host() {
    host_peer = new Peer(host_pid);
    oc_add_error_handler(host_peer);
    host_peer.on('open', function(id) {
        // Listen for connection.
        oc_log('host listening for connection...');
        host_peer.on('connection', function(conn) {
            oc_log('connection established!');
            main_conn = conn;
            // Listen for update from client.
            oc_listen();
            // Update client with host data
            setTimeout(function() {
                oc_log('Update client with host data')
                oc_send({
                    type: 'update',
                    data: cb.parse()
                });
            }, 500);
        });
    });
}

var client_peer = new Peer();

client_peer.on('open', function() {
    client_peer.on('error', function(err) {
        oc_log('peer error');
        if (err.message.startsWith('Could not connect to peer')) {
            client_peer.destroy();
            oc_host();
        }
    });
    client_peer.on('disconnected', function() {
        oc_log('peer disconnected');
    });

    oc_log('trying to connect to', host_pid);
    main_conn = client_peer.connect(host_pid);
    oc_listen();
})

window.onload = function() {
    $('#board')[0].addEventListener('input', function() {
        var update = cb.refresh();
        if (!(update == null) && Object.keys(update).length > 0) {
            var payload = {
                type: "update",
                data: update
            }
            oc_log("sending", payload);
            oc_send(payload);
        }
    });
    // Only listen the click event on button instead of run event on codapi-toolbar
    // to prevent infinite trigger.
    $('codapi-toolbar button')[0].addEventListener('click', function() {
        oc_send({type: 'run'});
    })
}