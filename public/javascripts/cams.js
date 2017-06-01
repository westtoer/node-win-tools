/*jslint browser: true */
/*global console, $ */

(function () {
    "use strict";
    
    // unclear do we need registration?
    
    // http://new.ipcamlive.com/player/registerviewer.php?_=1495632543070&alias=nieuwpoort&type=HTML5 ==> {"result":"ok","data":{"viewerid":125284173}}
    // http://new.ipcamlive.com/player/getcamerastreamstate.php?_=1495632603332&token=&alias=nieuwpoort ==> 
    
    var UPDATE_PERIOD = 15 * 1000,
        FOCUS_PERIOD = 60 * 1000;
    
    function loadImageThen(src, cntFn) {
        if (src === null || src === undefined || src.length === 0) {
            return;
        } //else
        var ldr = new Image();
        ldr.onload = cntFn;
        ldr.src = src;
    }
    
    $(function () {
        var $cams = $('.cam'),
            numcams = $cams.length,
            $focus = $('#focus');
        $focus.data('state', false);
        $focus.data('index', numcams - 1);
        $focus.hide();
        $cams.each(function () {
            var $cam = $(this),
                alias = $cam.data('alias'),
                $img = $('<div class="row imgframe"></div>'),
                $a = $('<a>'),
                update = function () {
                    $.getJSON('/cams/' + alias, function (data, status, xhr) {
                        try {
                            if (status !== 'success') {
                                console.log("bad response for alias '%s' ==> %s", alias, status);
                            }
                            console.log("data for alias '%s'", alias, data);
                            loadImageThen(data.image, function () {
                                $img.css("background-image", "url(" + data.image + ")");
                            });
                            $a.attr("href", data.player);
                            $cam.data('player', data.player);
                            $cam.data('score', data.score);
                        } catch (e) {
                            console.error('error in execution of cam update (' + alias + ') ==> ' + e);
                        }
                        
                        setTimeout(update, UPDATE_PERIOD);
                    });
                };
            
            $cam.html('');
            $cam.append($a.append($img));
            update();
        });
        
        // do something to let each player in turn get focus
        function toggleFocus() {
            var prevState, index, player =  '', label = '??', score = '*', newState;
            try {
                prevState = $focus.data('state');
                index = $focus.data('index');
                player =  '';
                label = '';
                score = '*';
                newState = !prevState;

                if (newState) {
                    // find next cam with available player
                    while (player.length === 0) {
                        index = (index + 1) % numcams;
                        player = $cams.eq(index).data('player');
                    }

                    label = $cams.eq(index).data('label');
                    score = $cams.eq(index).data('score');
                    // TODO inject alias in fixed position banner... 
                    $focus.html('<div class="bar col-xs-12">&nbsp;' + label + '&nbsp;'
                              + '<span class="pull-right">' + score + '</span></div>'
                              + '<iframe class="embed-responsive-item" src="' + player + '">');
                    $focus.show();
                    $('.overlay').hide(); // had to do this because z-index stuff kreeps above iframe?
                } else {
                    $focus.html(''); // empty that player code
                    $focus.hide();
                    $('.overlay').show(); // had to do this because z-index stuff kreeps above iframe?
                }

                $focus.data('state', newState);
                $focus.data('index', index);

            } catch (e) {
                console.error('error in execution of focus switch ==> ' + e);
            }
            
            setTimeout(toggleFocus, FOCUS_PERIOD);
        }
        
        setTimeout(toggleFocus, FOCUS_PERIOD);
    });
}());
