/*jslint browser: true */
/*global console, $ */

(function () {
    "use strict";
    
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
                    $.ajax({
                        dataType: 'json',
                        url: '/cams/' + alias,
                        success: function (data, status, xhr) {
                            try {
                                if (status !== 'success') {
                                    console.log("bad response for alias '%s' ==> %s", alias, status);
                                }
                                loadImageThen(data.image, function () {
                                    $img.css("background-image", "url(" + data.image + ")");
                                });
                                $a.attr("href", data.player);
                                $cam.data('player', data.player);
                                $cam.data('score', data.score);
                            } catch (e) {
                                console.error('error in execution of cam update (' + alias + ') ==> ' + e);
                            }
                        },
                        error: function (xhr, status, err) {
                            console.error('error in ajax retrieval for cam update (' + alias + ') ==> ' + err);
                            setTimeout(update, 10 * UPDATE_PERIOD); // wait longer for retry
                        }
                    });
                };
            
            $cam.html('');
            $cam.append($a.append($img));
            update();
            setInterval(update, UPDATE_PERIOD);
        });
        
        // do something to let each player in turn get focus
        function toggleFocus() {
            var prevState, prevIndex, index, player =  '', label = '??', score = '*', newState;
            try {
                prevIndex = $focus.data('index');
                prevState = $focus.data('state');

                newState = !prevState;

                if (newState) {
                    index = prevIndex;
                    // find next cam with available player
                    while (player.length === 0) {
                        index = (index + 1) % numcams;
                        player = $cams.eq(index).data('player');
                        if (index === prevIndex) { // looped around in vain
                            throw "no new focus cams available have to skip";
                        }
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
        }
        
        setInterval(toggleFocus, FOCUS_PERIOD);
    });
}());
