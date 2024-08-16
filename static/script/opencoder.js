var board_changed = false;

function getCaretCharacterOffsetWithin(element) {
    let caretOffset = 0;
    const doc = element.ownerDocument || element.document;
    const win = doc.defaultView || doc.parentWindow;
    const selection = win.getSelection();
    if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        caretOffset = preCaretRange.toString().length;
    }
    return caretOffset;
}

function setCaretPosition(element, offset) {
    const doc = element.ownerDocument || element.document;
    const win = doc.defaultView || doc.parentWindow;
    const selection = win.getSelection();

    let charIndex = 0;
    let range = doc.createRange();
    range.setStart(element, 0);
    range.collapse(true);

    const nodeStack = [element];
    let node;
    let found = false;

    while (!found && (node = nodeStack.pop())) {
        if (node.nodeType === 3) { // TEXT_NODE
            const nextCharIndex = charIndex + node.length;
            if (offset >= charIndex && offset <= nextCharIndex) {
                range.setStart(node, offset - charIndex);
                range.setEnd(node, offset - charIndex);
                found = true;
            }
            charIndex = nextCharIndex;
        } else {
            let i = node.childNodes.length;
            while (i--) {
                nodeStack.push(node.childNodes[i]);
            }
        }
    }

    if (found) {
        selection.removeAllRanges();
        selection.addRange(range);
    }
}

function oc_highlight() {
    if (!board_changed) {
        return;
    }
    let e = $('#board')[0];
    console.log('(', e.textContent, ')');
    let offset = getCaretCharacterOffsetWithin(e);
    e.removeAttribute('data-highlighted');
    hljs.highlightElement(e);
    setCaretPosition(e, offset);
    board_changed = false;
}



var main_conn = null;

function oc_copy_link() {
    navigator.clipboard.writeText(document.location.href);
    if (!$('#copy')[0].textContent.endsWith('✅')) {
        $('#copy')[0].textContent += ' ✅';
    }
}

function oc_attach_execute_listener() {
    // Only listen the click event on button instead of run event on codapi-toolbar
    // to prevent infinite trigger.
    $('codapi-toolbar span')[0].addEventListener('click', function() {
        oc_send({type: 'run'});
    })
}

function oc_new_codapi_snippet(lang) {
    var engine = lang === 'javascript' ? 'browser' : 'wasi';
    var snippet = document.createElement('codapi-snippet');
    snippet.setAttribute('engine', engine);
    snippet.setAttribute('sandbox', lang);
    snippet.setAttribute('editor', 'basic');
    return snippet;
}

function oc_change_lang(lang) {
    var snippet = $('codapi-snippet')[0];
    var main_div = $('#main_div')[0];
    snippet.snippet.unlisten();
    main_div.removeChild(snippet);
    main_div.appendChild(oc_new_codapi_snippet(lang));
    oc_attach_execute_listener();
}

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
    } else if (payload.type == "lang") {
        $('#select_lang')[0].value = payload.lang;
        oc_change_lang(payload.lang.toLowerCase().trim());
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

var prev_window_onload = window.onload;

window.onload = function() {
    oc_highlight();
    setInterval(oc_highlight, 2000);
    $('#board')[0].addEventListener('input', function() {
        board_changed = true;
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

    oc_attach_execute_listener();

    $('#select_lang')[0].addEventListener('change', function(e) {
        oc_change_lang(e.target.value.toLowerCase().trim());
        oc_send({type: 'lang', lang: e.target.value})
    })

    if (typeof(prev_window_onload) === 'function') {
        prev_window_onload();
    }
}