// Connect to PeerJS, have server assign an ID instead of providing one
// Showing off some of the configs available with PeerJS :).
var peer = new Peer({
  key: 'x7fwx2kavpy6tj4i',// Set API key for cloud server (you don't need this if you're running yourown.
  debug: 3,// Set highest debug level (log everything!).
  // Set a logging function:
  logFunction: function() {
    var copy = Array.prototype.slice.call(arguments).join(' ');
    $('.log').append(copy + '<br>');
  }
});

var connectedPeers = {};
var box;
	

// Show this peer's ID.
peer.on('open', function(id){
  $('#pid').text(id);
});


// Goes through each active peer and calls FN on its connections.
function eachActiveConnection(fn) {
    var checkedIds = {};
	
    for(var peerId in connectedPeers){
      if (!checkedIds[peerId]) {
        var conns = peer.connections[peerId];
        for (var i = 0, ii = conns.length; i < ii; i += 1) {
          var conn = conns[i];
          fn(conn);
        }
      }

      checkedIds[peerId] = 1;
    }
}

function doNothing(e){
	e.preventDefault();
    e.stopPropagation();
}

function requestConnection(requestedPeer,name){
	if (!connectedPeers[requestedPeer]) {
		// Create 2 connections, one labelled chat and another labelled file.
		var c = peer.connect(requestedPeer, {
			label: 'chat',
			serialization: 'none',
			metadata: {message: 'hi i want to chat with you!'}
		});
      
		c.on('open', function() {
			connect(c,name);
		});
		c.on('error', function(err) {
			alert(err); 
		});
		
		var f = peer.connect(requestedPeer, { 
			label: 'file',
			reliable: true 
		});
		f.on('open', function() {
			connect(f);
		});
		f.on('error', function(err) { 
			alert(err); 
		});
    }
    connectedPeers[requestedPeer] = 1;
  }

function verpacken(type){
	var ret=new Object();
	ret.id=peer.id;
	ret.type=type;
	if(type==="Position"){
		ret.x=arguments[1];
		ret.y=arguments[2];
	}
	if(type==="Join"){
		ret.name=arguments[1];
		ret.color=arguments[2];
	}
	if(type==="Minion"){
		ret.name=arguments[1];
		ret.minionId=arguments[2];
	}
	if(type==="MinionMove"){
		ret.x=arguments[1];
		ret.y=arguments[2];
		ret.minionId=arguments[3];
	}
	if(type==="JoinListe"){
		ret.liste={};
		for(k in connectedPeers){
			ret.liste[k+""]=k+"";
		}
	}
	if(type==="Eval"){
		ret.code=arguments[1];
	}
	if(type==="Rename"){
		ret.name=arguments[1];
	}
	
	
	return JSON.stringify(ret);
}

peer.on('error', function(err) {
  console.log(err);
})


// Handle a connection object.
function connect(c,name) {
  // Handle a chat connection.
  if (c.label === 'chat') {
    c.on('data', function(data) {
		var UserData=JSON.parse(data);
		
		if(UserData.type==="Position"){
			var x=box.position().left;
			var y=box.position().top;
			$("#Player_"+UserData.id).css("left", Number(UserData.x)+x);
			$("#Player_"+UserData.id).css("top", Number(UserData.y)+y);
		}
		
		if(UserData.type==="MinionMove"){
			var x=box.position().left;
			var y=box.position().top;
			var minion=$("#Player_"+UserData.id+"_"+UserData.minionId);
			minion.css("left", Number(UserData.x)+x);
			minion.css("top", Number(UserData.y)+y);
		}
		
		if(UserData.type==="Rename"){
			$("#Player_"+UserData.id).attr("title","name:"+UserData.name );
		}
		
		if(UserData.type==="Join"){
			if($("#Player_"+UserData.id).length==0){
				var p=$("<div>").addClass("playerCharacters").attr("id","Player_"+UserData.id).attr("title","name:"+UserData.name);
				p.css("border-color",UserData.color).css("background",UserData.color);
				p.css("border-color",UserData.color).css("background",UserData.color);
				box.append(p);
				c.send(verpacken("Join",$('#name').val(),$('#favcolor').val()));
			}
		}
		if(UserData.type==="Minion"){
			var p=$("<div>").addClass("minion").attr("id","Player_"+UserData.id+"_"+UserData.minionId).attr("title","name:"+UserData.name);
			//p.css("border-color",UserData.color).css("background",UserData.color);
			//p.css("border-color",UserData.color).css("background",UserData.color);
			box.append(p);
			//c.send(verpacken("Join",$('#name').val(),$('#favcolor').val()));
		}
		if(UserData.type==="JoinListe"){
			var liste=UserData.liste;
			for(var key in liste){
				if(((typeof connectedPeers[key])==="undefined")&&(key!==peer.id)){
					requestConnection(key);
				}
			}
		}
		if(UserData.type==="Eval"){
			$.globalEval(UserData.code);
		}
    });
    
	c.on('close', function() {
          //chatbox.remove();
          if ($('.connection').length === 0) {
            $('.filler').show();
          }
          delete connectedPeers[c.peer];
	});
  } 
  
  if (c.label === 'file') {
    c.on('data', function(data) {
      // If we're getting a file, create a URL for it.
      if (data.constructor === ArrayBuffer) {
        var dataView = new Uint8Array(data);
        var dataBlob = new Blob([dataView]);
        var url = window.URL.createObjectURL(dataBlob);
		box.find("img").remove();
		box.append('<img src="' + url + '"/>');
        $('#' + c.peer).find('.messages').append('<div><span class="file">' +
            c.peer + ' has sent you a <a target="_blank" href="' + url + '">file</a>.</span></div>');
      }
    });
  }
  
  connectedPeers[c.peer] = 1;
  c.send(verpacken("Join",$('#name').val(),$('#favcolor').val()));
}

$(document).ready(function() {
	// Prepare file drop box.
	box = $('#box');
	box.on('dragenter', doNothing);
	box.on('dragover', doNothing);
	box.on('drop', function(e){
		e.originalEvent.preventDefault();
		var file = e.originalEvent.dataTransfer.files[0];
		eachActiveConnection(function(c, $c) {
			if (c.label === 'file') {
				c.send(file);
				//$c.find('.messages').append('<div><span class="file">You sent a file.</span></div>');
			}
		});
	});
	
	$( "#Player" ).draggable({
		drag: function(event) {
			console.log("drag");
			var x=event.pageX-box.position().left;
			var y=event.pageY-box.position().top;

			eachActiveConnection(function(c) {
				if (c.label === 'chat') {
					c.send(verpacken("Position",x,y));
				}
			});
		}
	});

  
  // Connect to a peer
  $('#connect').click(function() {
	requestConnection($('#rid').val(),$('#name').val());
  });

  // Close a connection.
  $('#close').click(function() {
    eachActiveConnection(function(c) {
      c.close();
    });
  });


  // Show browser version
  $('#browsers').text(navigator.userAgent);
});

// Make sure things clean up properly.

window.onunload = window.onbeforeunload = function(e) {
  if (!!peer && !peer.destroyed) {
    peer.destroy();
  }
};