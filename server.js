var global_chan = "itp_test_channel_nodejs";
var private_chan = "";
var client_uuid = PUBNUB.uuid();
var client_username = null;
var serverOnline = false;
var appInitialized = false;
var loggedIn = false;
var verifyTimeout;

var pubnub = PUBNUB({
    subscribe_key: 'sub-c-a91c35f6-ca98-11e5-a9b2-02ee2ddab7fe', // always required
    publish_key: 'pub-c-0932089b-8fc7-4329-b03d-7c47fe828971', // only required if publishing
    uuid: client_uuid,
    heartbeat: 30,
    ssl: true
});

console.log("Your UUID: " + client_uuid);
write("Your UUID: " + client_uuid);

/* Handle messages from the GLOBAL CHANNEL */
function initialize_app() {
    clearTimeout(verifyTimeout);
    appInitialized = false;
    console.log("<br/> > <==========[INITIALIZING APP]==========>");
    write("<br/> > <==========[INITIALIZING APP]==========>");
    console.log("Connecting to GLOBAL CHANNEL");
    write("Connecting to GLOBAL CHANNEL");

    pubnub.here_now({
        channel: global_chan,
        callback: function(m) {
            serverOnline = false;
            for (i = 0; i < m.uuids.length; i++) {
                if ((m.uuids[i] === "SERVER") && !serverOnline) {
                    console.log("SERVER connected!");
                    write("SERVER connected!");
                    serverOnline = true;
                    break;
                }
            }
            if (!serverOnline) {
                console.log("SERVER offline! Please try again later!");
                write("SERVER offline! Please try again later!");
                pubnub.unsubscribe({
                    channel: private_chan
                });
            }
            connect_to_global();
        }
    });

    function connect_to_global() {
        pubnub.subscribe({
            channel: global_chan,
            callback: function(m) {
                //console.log("Received message: " + JSON.stringify(m));
                //write("Received message: " + JSON.stringify(m));
                if (m.m_type === "i_connect" && m.uuid === client_uuid) {
                    if (!serverOnline) {
                        console.log("SERVER connected!");
                        write("SERVER connected!");
                        serverOnline = true;
                    }
                    private_chan = m.channel;

                    /* Handle messages from the PRIVATE CHANNEL */
                    pubnub.subscribe({
                        channel: private_chan,
                        callback: function(m) {
                            if (m.m_type === "server_shutdown") {
                                serverOnline = false;
                                appInitialized = false;
                                console.log("SERVER shutdown message received");
                                write("SERVER shutdown message received");
                                pubnub.unsubscribe({
                                    channel: private_chan,
                                    callback: function() {
                                        initialize_app();
                                    }
                                });
                            }
                            else if(m.m_type === "usr_login_reply") {
                                write("YOUR USERNAME IS: " + m.username + " | LOGIN SUCCESSFUL");
                                console.log("YOUR USERNAME IS: " + m.username + " | LOGIN SUCCESSFUL");
                                loggedIn = true;
                                client_username = m.username;
                            }
                        },
                        connect: function() {
                            console.log("Connected to: " + private_chan);
                            write("Connected to: " + private_chan);
                            verifyTimeout = setTimeout(function() {
                                verify_server_connection()
                            }, 5000);
                        },
                        presence: function(m) {
                            //console.log("Presence event: " + JSON.stringify(m));
                            //write("Presence event: " + JSON.stringify(m));
                            if (m.uuid === "SERVER" && m.action === "join" && !appInitialized) {
                                pubnub.unsubscribe({
                                    channel: global_chan,
                                    callback: function(m) {
                                        write("Disconnected from GLOBAL CHANNEL!");
                                        write("App Initialized!");
                                        console.log("Disconnected from GLOBAL CHANNEL!");
                                        console.log("App Initialized!");
                                        appInitialized = true;
                                    }
                                });
                            }

                            if ((m.uuid === "SERVER" && (m.action === "leave" || m.action === "timeout")) && serverOnline) {
                                console.log("SERVER offline! Disconnecting from: " + private_chan);
                                write("SERVER offline! Disconnecting from: " + private_chan);
                                pubnub.unsubscribe({
                                    channel: private_chan
                                });
                                initialize_app();
                            }
                        }
                    });
                } else if (m.m_type === "server_shutdown") {
                    if (m.m_type === "server_shutdown") {
                        serverOnline = false;
                        appInitialized = false;
                        console.log("SERVER shutdown message received");
                        write("SERVER shutdown message received");
                        pubnub.unsubscribe({
                            channel: private_chan,
                            callback: function() {
                                initialize_app();
                            }
                        });
                    }
                }
            },
            presence: function(m) {
                console.log(JSON.stringify(m));
                if ((m.uuid === "SERVER" && (m.action === "leave" || m.action === "timeout")) && serverOnline) {
                    console.log("SERVER offline! Please try again later!");
                    write("SERVER offline! Please try again later!");
                    serverOnline = false;
                    pubnub.unsubscribe({
                        channel: private_chan
                    });
                }
            }
        });
    }


    //Verify that the client has connected with the server on the private channel
    function verify_server_connection() {
        if (appInitialized === false) {
            pubnub.here_now({
                channel: private_chan,
                callback: function(m) {
                    for (i = 0; i < m.uuids.length; i++) {
                        if (m.uuids[i] === "SERVER") {
                            appInitialized = true;
                        }
                    }

                    if (appInitialized === false) {
                        console.log("SERVER offline! Please try again later!");
                        write("SERVER offline! Please try again later!");
                        serverOnline = false;
                        private_chan = "";
                        pubnub.unsubscribe({
                            channel: private_chan
                        });
                    } else {
                        pubnub.unsubscribe({
                            channel: global_chan,
                            callback: function(m) {
                                write("Disconnected from GLOBAL CHANNEL!");
                                write("App Initialized!");
                                console.log("Disconnected from GLOBAL CHANNEL!");
                                console.log("App Initialized!");
                                appInitialized = true;
                            }
                        });
                    }
                }
            });
        }
    }
}

/* DEBUG LOG FUNCTION */
function write(msg) {
    $("#output").append("<br/> > " + msg);
}

//START OF SCRIPT
initialize_app();

$("#btn_send").click(function(){
    if(!serverOnline)
    {
        write("ERROR! Can not send message: Server offline!");
        console.log("ERROR! Can not send message: Server offline!");
    } 
    else if(!appInitialized)
    {
        write("ERROR! Can't send message: App not yet initialized!");
        console.log("ERROR! Can't send message: App not yet initialized!");
    }
    else if(!loggedIn)
    {
        
        msg = {
            "m_type": "usr_login",
            "uuid": client_uuid,
            "contents": $("#in_test").val()
        };
        
        pubnub.publish({
            channel: private_chan,
            message: msg,
            callback: function(m){
                if (m[0] == "1")
                {
                    write("MESSAGE SENT SUCCESSFULLY: " + m);
                    console.log("MESSAGE SENT SUCCESSFULLY: " + m);
                }
                else
                {
                    write("MESSAGE SENT FAILED: " + m);
                    console.log("MESSAGE SENT FAILED: " + m);
                }
            }
        });
    }
});