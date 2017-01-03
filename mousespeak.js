(function(){

/*
    www.pubnub.com - PubNub realtime push service in the cloud.
    http://www.pubnub.com/blog/mouse-speak - Mouse Speak

    PubNub Real Time Push APIs and Notifications Framework
    Copyright (c) 2010 Stephen Blum
    http://www.google.com/profiles/blum.stephen

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/


var db     = this['localStorage'],
    cookie = {
    get : function(key) {
        if (db) return db.getItem(key);
        if (document.cookie.indexOf(key) == -1) return null;
        return ((document.cookie||'').match(
            RegExp(key+'=([^;]+)')
        )||[])[1] || null;
    },
    set : function( key, value ) {
        if (db) return db.setItem( key, value );
        document.cookie = key + '=' + value +
            '; expires=Thu, 1 Aug 2030 20:00:00 UTC; path=/';
    }
};



var createTextbox = function(){
   tb = document.createElement("input");
   $(tb).attr("id","messageSend");
   $(tb).css( {
     background: "#e6e6e6"
   });

   return tb;
}

var publishCallback = function(status, message){
/*  console.log("published message callback: " + JSON.stringify(status)
                                             + "\n"
                                             + "message: "
                                             + JSON.stringify(message)); */
}

//163222,

var bind        =  function(eventn,node, cb){$(node).on(eventn,cb);}
,   css         =  function(node, css){$(node).css(css);}
,   body        =  document.getElementsByTagName("body")[0]
,   doc         =  document.documentElement
,   now         =  function(){return(new Date()); }
,   mice        = {}
,   channel     = 'mouse-speakv0.26'
,   mousefade   = 9000 // Time before user is considered Inactive
,   textbox     = createTextbox()
,   focused     = 0    // Focused on Textbox?
,   lastpos     = []   // Last Sent Position
,   lasttxt     = ''   // Last Sent Text
,   sentcnt     = 0    // Number of Messages Sent
,   uuid        = 0    // User Identification
,   wait        = 100  // Publish Rate Limit (Time Between Data Push)
,   maxmsg      = 34   // Max Message Length
,   moffset     = 10   // Offset of Mouse Position
,   timed       = 0    // Timeout for Publish Limiter
,   lastsent    = 0    // Last Sent Timestamp
,   nohtml      = /[<>]/g;


var Sprite = {
    /**
     * Adds to screen and creates DOM Object
     */
    create : function(sprite) {
        sprite.intervals = {
            animate : 1,
            move    : {}
        };

        sprite.cell.size = Math.floor(sprite.image.width / sprite.cell.count);
        sprite.node = document.createElement('div');

        sprite.opacity = sprite.opacity || 1.0;

        css( sprite.node, {
            opacity : sprite.opacity,
            position : 'absolute',
            top : sprite.top,
            left : sprite.left ,
            width : sprite.cell.size,
            height : sprite.image.height,
            backgroundRepeat: 'no-repeat',
            backgroundImage: 'url(' + sprite.image.url + ')'
        } );

        Sprite.setframe( sprite, 0 );
        Sprite.append(sprite.node);

        return sprite;
    },

    ground : document.getElementsByTagName('body')[0],
    append : function(node) {
        Sprite.ground.appendChild(node);
    },

    setframe : function( sprite, cell, offset ) {
        var offset = offset || {};
        if (typeof offset.top == 'number')
            sprite.image.offset.top = offset.top;
        if (typeof offset.left == 'number')
            sprite.image.offset.left = offset.left;

        css( sprite.node, {
            backgroundPosition : '-' +
                (sprite.cell.size * cell + sprite.image.offset.left) +
                'px -' + sprite.image.offset.top + 'px'
        });
    },

    /**
     * sprite.animate( [[frame, duration], []...] )
     * sprite.animate( [[], [], []] )
     * sprite.animate( [[0, .2], [1, .4], [2, .5]] )
     */
    animate : function( sprite, pattern, loop, callback, position ) {
        // Clear Any Other Animation
        if (!position) {
            position = 0;
            Sprite.stop_animate(sprite);
        }

        // if last frame, and no loop, then leave, else restart
        if (position === pattern.length) {
            if (loop === 0) return callback && callback();
            else {
                loop--;
                position = 0;
            }
        }

        // Multi format compatibility ([frame, delay]) or (frame)
        var frame = pattern[position][0] || pattern[position]
        ,   delay = pattern[position][1] || .1;

        sprite.intervals.animate = setTimeout( function() {
            // Update Current Frame
            Sprite.setframe( sprite, frame );

            // Next Frame
            Sprite.animate( sprite, pattern, loop, callback, position + 1 );
        }, delay * 1000 );
    },


    /**
     * Move and Animate Combined!!!
     *
     * sprite.animate( [ [left, top, duration, [animate] ], []...] )
     * sprite.animate( [[], [], []] )
     * sprite.animate( [[10, 10, .2, [ANIMATEPARAMS], loopanimate ], ... )
     * sprite.animate( [[10, 10, .2, [[frame,dur], ...], loopanimate ], ... )
     */
    movie : function( sprite, pattern, loop, callback, position ) {
        // Clear Any Other Animation
        if (!position) {
            position = 0;
            Sprite.stop_all(sprite);
        }

        // if last frame, and no loop, then leave, else restart
        if (position === pattern.length) {
            if (loop === 0) return callback && callback();
            else {
                loop--;
                position = 0;
            }
        }

        // Update Animator
        if (pattern[position][2]) Sprite.animate(
            sprite,
            pattern[position][2],
            pattern[position][3] || 0
        );

        // [{top:0,opacity:.5}, 500, 0, 0],
        // Update Mover
        Sprite.move(
            sprite,
            pattern[position][0],
            pattern[position][1],
            function() {
                Sprite.movie( sprite, pattern, loop, callback, position + 1 );
            }
        );
    },

    /**
     * move sprite from one place to another.
     */
    move : function( sprite, properties, duration, callback ) {
        var start_time   = now();
        console.log("inside sprite move");
                Sprite.stop_all(sprite);

        _.each( properties, function(value,property) {
            console.log("iterating property: " + property + ", " + value);
            var current_time = start_time
            ,   end_time     = start_time + duration
            ,   start_prop   = sprite[property] || 0
            ,   distance     = value - start_prop
            ,   update       = {}
            ,   ikey         = property + value;

            Sprite.stop_move( sprite, ikey );
            sprite.intervals.move[ikey] = setInterval( function() {
                current_time = now();

                sprite[property] = (
                    end_time <= current_time
                    ? value
                    : ( distance * (current_time - start_time)
                        / duration + start_prop )
                );

                update[property] = sprite[property];
                css( sprite.node, update );

                if ( end_time <= current_time && sprite.intervals.move ) {
                    Sprite.stop_move( sprite, ikey );
                    callback && callback();
                }

            }, Math.ceil(1000 / sprite.framerate) );
        } );
    },

    /**
     * Stop movie
     */
    stop_all : function(sprite) {
        clearTimeout(sprite.intervals.animate);
        _.each( sprite.intervals.move, function( ikey ) {
            clearInterval(sprite.intervals.move[ikey]);
        } );
    },

    /**
     * Stop move.
     */
    stop_move : function( sprite, ikey ) {
        clearInterval(sprite.intervals.move[ikey]);
    },

    /**
     * Stop animate.
     */
    stop_animate : function(sprite) {
        clearTimeout(sprite.intervals.animate);
    }
};


/*
    Get Mouse/Touch Position
    ------------------------
    Return Touch or Mouse Position... :-)
*/
function get_pos(e) {
    var posx = 0
    ,   posy = 0;

    if (!e) return [100,100];

    var tch  = e.touches && e.touches[0]
    ,   tchp = 0;

    if (tch) {
        _.each( e.touches, function(touch) {
            posx = touch.pageX;
            posy = touch.pageY;

            // Send Normal Touch on First Touch
            if (!tchp) return;

            // Must be more touches!
            // send({ 'pageX' : posx, 'pageY' : posy, 'uuid' : uuid+tchp++ });
        } );
    }
    else if (e.pageX) {
        posx = e.pageX;
        posy = e.pageY;
    }
    else {try{
        posx = e.clientX + body.scrollLeft + doc.scrollLeft;
        posy = e.clientY + body.scrollTop  + doc.scrollTop;
    }catch(e){}}

    posx += moffset*2;
    posy += moffset;

    if (posx <= moffset*2) posx = 0;
    if (posy <= moffset) posy = 0;

    return [posx, posy];
}


/*
    Send (Publish)
    --------------
    Publishes user's state to the group.
    Only send what was changed.
*/
function send(e) {

    textbox.focus();

    // Leave if no UUID yet.
    if (!uuid) return;

    // Get Local Timestamp
    var right_now = now()
    ,   mouse     = mice[uuid];

    // Capture User Input
    var pos   = get_pos(e)
    ,   txt   = get_txt()
    //,   xuuid = e['uuid']
    ,   msg   = { 'uuid' : /*xuuid ||*/ uuid };

    if (!mouse) return user_joined(msg);

    if (pos[0] >= 320) {
        pos[0] = 250;
    }
    if (pos[1] >= 200) {
        pos[1] = 175;
    }

    // Don't continue if too soon (but check back)
    if (lastsent + wait > right_now) {
        // Come back and check after waiting.
        clearTimeout(timed);
        timed = setTimeout( function() {send(e)}, wait );

        return 1;
    }

    // Set Last Sent to Right Now.
    lastsent = right_now;

    // Don't send if no change in Position.
    if (!(
        lastpos[0] == pos[0] &&
        lastpos[1] == pos[1] ||
        !pos[0]              ||
        !pos[1]
    )) {


        // Update Last Position
        lastpos[0] = pos[0];
        lastpos[1] = pos[1];
        msg['pos'] = pos;
    }

    // Check Last Sent Text
    if (lasttxt != txt || !(sentcnt++ % 3)) {
        lasttxt    = txt;
        msg['txt'] = txt || ' ';
        cookie.set( 'mtxt', msg['txt'] );
    }

    // No point sending nothing.
    if (!(msg['txt'] || msg['pos'])) return 1;

    // Set so we won't get jittery mice.
    msg['c'] = (mice[uuid].last||1) + 2;

    pubnub.publish({
        channel : channel,
        message : msg
    }, publishCallback);

    msg['force'] = 1;
    user_updated(msg);

    return 1;
}

// User Joined
function user_joined(message) {
    console.log("a user has joined");
    var pos   = message['pos'] || [100,100]
    ,   mouse = Sprite.create({
        image : {
            // url : '/static/images/mousespeak-cursor.png',
            url : '/static/cursor.png',
            width : 260,
            height : 30,
            offset : {
                top : 36,
                left : 0
            }
        },
        cell : {
            count : 1 // horizontal cell count
        },

        left : pos[1],
        top : pos[0],

        framerate : 50
    });

    // Do something when you mouseover.
    if (uuid != message['uuid']) bind( 'mouseover', mouse.node, function() {
        Sprite.move( mouse, {
            'opacity' : 0.5,
            'top'     : Math.ceil(Math.random()*150),
            'left'    : Math.ceil(Math.random()*150)
        }, wait );
    } );

    // Set Prettier Text
    css( mouse.node, {
        'fontWeight' : 'bold',
        'padding'    : '5px 0 0 20px',
        'fontSize'   : '30px',
        'fontFamily' : '"proxima-nova","Helvetica Neue",Helvetica,Arial,sans-serif',
        'color'      : "#d34"
    } );

    // Save UUID
    //PUBNUB.attr( mouse.node, 'uuid', message['uuid'] );
    $(mouse.node).attr('uuid',message['uuid']);

    // Save User
    mice[message['uuid']] = mouse;

    // Update User
    user_updated(message);
}

// User has Moved Mouse or Typed
function user_updated(message) {
    console.log("message received in user_updated:\n" + JSON.stringify(message) + "\n");
    var pos   = message['pos']
    ,   txt   = message['txt']
    ,   last  = message['c']
    ,   force = message['force']
    ,   tuuid = message['uuid']
    ,   mouse = mice[tuuid];




    if (!mouse) {
      return user_joined(message);
    }

    // Common to reset value if page reloaded
    if (last && (mouse.last||0) - last > 100)
        mouse.last = last;

    // Self
    if (force){
      mouse.last = last;
      console.log("force move");
    }
    // Prevent Jitter from Early Publish

    console.log("");
    if (!force     &&
        last       &&
        mouse.last &&
        mouse.last > last
    ){
      console.log("jitter?");
      return;
    }

    // Set last for the future.
    if (last) mouse.last = last;

    // Update Text Display
    if (txt) mouse.node.innerHTML = txt.replace( nohtml, '' );

    // Set Delay to Fade User Out on No Activity.
    mouse.timerfade && clearTimeout(mouse.timerfade);
    mouse.timerfade = setTimeout( function() {
        css( mouse.node, { 'opacity' : 0.4 } );
        clearTimeout(mouse.timerfade);

        mouse.timerfade = setTimeout( function() {
            css( mouse.node, { 'display' : 'none' } );
        }, mousefade );
    }, mousefade );

    // Reshow if hidden.
    css( mouse.node, {
        'display' : 'block',
        'opacity' : 1.0
    } );

    // Move Player.
    if (pos) {
        console.log("pos");
        Sprite.move( mouse, {
            'top'  : pos[1],
            'left' : pos[0]
        }, wait - 10 );

        // Change Direction
        if (pos[0] > mouse.left)
            Sprite.setframe( mouse, 0, { top : 36 } );
        else if (pos[0] < mouse.left)
            Sprite.setframe( mouse, 0, { top : 1 } );
    }
}

// Receive Mice Friends
pubnub.addListener({
  message: function(m){
    user_updated(m.message);
  },
  presence: function(m){
    console.log("presence message: " + JSON.stringify(m));
  }

});

console.log("subscribing to channel: " + channel);
pubnub.subscribe( { channels : [channel], withPresence: true });

// Capture Text Journey
function keystroke( e, key ) {setTimeout(function(){
    if (',13,27,'.indexOf(','+key+',') !== -1) textbox.value = ' ';
    send(e);
},20);return 1}

var ignore_keys = ',18,37,38,39,40,20,17,35,36,33,34,16,9,91,';
function focusize() {focused = 1;return 1}
function monopuff(e) {
    var key = e.keyCode;

    if (ignore_keys.indexOf(','+key+',') !== -1)
        return 1;

    if (!focused)
        textbox.focus();

    keystroke( e, key );
    return 1
}
function get_txt() {
    var val = (textbox.value||'')
    ,   len = val.length;

    if (len > maxmsg) {
        textbox.value = val = '...' + val.slice( -maxmsg );
    }
    else if(val.indexOf(init_text) != -1 && len > init_text.length) {
        textbox.value = val = val.replace( init_text, '' );
    }

    return val;
}

// Add Input Textbox
css( textbox, {
    'position' : 'absolute',
    'top'      : -40,
    'left'     : 0
} );
var init_text = 'Type a message...';
textbox.value = init_text;
body.appendChild(textbox);

// Setup Events
bind( 'mousemove',  document, send );
bind( 'touchmove',  document, send );
bind( 'touchstart', document, send );
bind( 'touchend',   document, send );
bind( 'keydown',    document, monopuff );

// Setup For Any Input Event.
_.each( document.getElementsByTagName('input'), function(input) {
    bind( 'focus', input, focusize );
} );

// Load UUID and Send First Message
if (!uuid){
  uuid = PubNub.generateUUID();
}




})()
