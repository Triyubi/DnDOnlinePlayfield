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
var befehle=new Array();
befehle["Join"]={
	encode:function(ret,arguments){
		ret.name=arguments[0];
		ret.color=arguments[1];
		return ret;
	},
	decode:function(UserData,c){
		if($("#Player_"+UserData.id).length==0){
			var p=$("<div>").addClass("playerCharacters").attr("id","Player_"+UserData.id).attr("title","name:"+UserData.name);
			p.css("border-color",UserData.color).css("background",UserData.color);
			p.css("border-color",UserData.color).css("background",UserData.color);
			box.append(p);
			c.send(verpacken("Join",$('#name').val(),$('#favcolor').val()));
		}
	}
};
befehle["Position"]={
	encode:function(ret,arguments){
		ret.x=arguments[0];
		ret.y=arguments[1];
		return ret;
	},
	decode:function(UserData){
		var x=box.position().left;
		var y=box.position().top;
		$("#Player_"+UserData.id).css("left", Number(UserData.x)+x);
		$("#Player_"+UserData.id).css("top", Number(UserData.y)+y);
	}
};
befehle["Minion"]={
	encode:function(ret,arguments){
		ret.name=arguments[0];
		ret.minionId=arguments[1];
		return ret;
	},
	decode:function(UserData){
		var p=$("<div>").addClass("minion").attr("id","Player_"+UserData.id+"_"+UserData.minionId).attr("title","name:"+UserData.name);
		//p.css("border-color",UserData.color).css("background",UserData.color);
		//p.css("border-color",UserData.color).css("background",UserData.color);
		box.append(p);
		//c.send(verpacken("Join",$('#name').val(),$('#favcolor').val()));
	}
};
befehle["MinionMove"]={
	encode:function(ret,arguments){
		ret.x=arguments[0];
		ret.y=arguments[1];
		ret.minionId=arguments[2];
		return ret;
	},
	decode:function(UserData){
		var x=box.position().left;
		var y=box.position().top;
		var minion=$("#Player_"+UserData.id+"_"+UserData.minionId);
		minion.css("left", Number(UserData.x)+x);
		minion.css("top", Number(UserData.y)+y);
	}
};
befehle["JoinListe"]={
	encode:function(ret,arguments){
		ret.liste={};
		for(k in connectedPeers){
			ret.liste[k+""]=k+"";
		}
		return ret;
	},
	decode:function(UserData){
		var liste=UserData.liste;
		for(var key in liste){
			if(((typeof connectedPeers[key])==="undefined")&&(key!==peer.id)){
				requestConnection(key);
			}
		}
	}
};
befehle["Eval"]={
	encode:function(ret,arguments){
		ret.code=arguments[0];
		return ret;
	},
	decode:function(UserData){
		$.globalEval(UserData.code);
	}
};


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
	var a=new Array();
	for(var i=1;i<arguments.length;i++){
		a[i-1]=arguments[i];
	}
	var ret=new Object();
	ret.id=peer.id;
	ret.type=type;
	ret=befehle[type].encode(ret,a);
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
		if((typeof befehle[UserData.type]) !=="undefined"){
			befehle[UserData.type].decode(UserData,c);
		}
		
    });
    
	c.on('close', function() {
          //chatbox.remove();
          if ($('.connection').length === 0) {
            $('.filler').show();
          }
		  $("#Player_"+c.peer.id).remove();
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
	
	var mousePosX = 0;
	var mousePosY = 0;
	
	$("#Player").draggable({
		drag: function(event) {
			console.log("drag x: " + event.pageX + "-" + box.position().left);
			console.log("drag y: " + event.pageY + "-" + box.position().top);
			var o = $("#Player");//document.getElementById('Player');
			if(o){
				var x = o.top;
				var y = o.left;
				console.log("new x: " + x);
				console.log("new y: " + y);
			}
			var x=event.pageX-box.position().left;
			var y=event.pageY-box.position().top;

			eachActiveConnection(function(c) {
				if (c.label === 'chat') {
					c.send(verpacken("Position",x,y));
				}
			});
		}
	});
	
	
	/*$("#Player").onmousedown(function(){
		// X- und Y-Position des Mauscursors in Abhängigkeit des
		// Browsers ermitteln
		mousePosX = document.all ? event.offsetX : event.pageX;
		MousePosY = document.all ? event.offsetY : event.pageY;
		// Ausgabe im dafür vorgesehenen SPAN-Element
	});*/

  
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