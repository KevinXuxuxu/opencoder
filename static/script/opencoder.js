// var bid = '{{ board.id }}';
// var host = '{{ board.pid }}';

var peer = new Peer();
var main_conn = null;

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
        console.log('Response from Flask server:', data);
        // Handle the response data here
    })
    .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
    });
}

function oc_send() {
    if (main_conn === null) {
        console.log("connection not established.");
        return;
    }
    var payload = $('#input-test').val();
    main_conn.send(payload);
}

peer.on('open', function(id) {
    console.log('My peer ID is: ' + id);
    if (host == 'None') {
        // This client is the host, send current pid back to server.
        oc_report_pid(id);
        
        // Listen for connection.
        console.log('host listening for connection...');
        peer.on('connection', function(conn) {
            console.log('connection established!');
            main_conn = conn;
            conn.on('data', function(data) {
                console.log("received", data);
            });
        });
    } else {
        // Connect to host.
        main_conn = peer.connect(host);
        main_conn.on('data', function(data) {
            console.log("received", data)
        });
    }
});