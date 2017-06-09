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
        var ldr = new Image(),
            sep = src.match('\\?') !== null ? '&' : '?';
        src = src + sep + new Date().getTime();
        ldr.onload = cntFn;
        ldr.src = src;
        return src;
    }
    
    $(function () {
        var $camcontainers = $('.cam'),
            $cams = $('[role="cam"]', $camcontainers),
            numcams = $cams.length,
            $focus = $('#focus'),
            $top = $('#top'),
            $bottom = $('#bottom');
        $focus.data('state', false);
        $focus.data('index', numcams - 1);
        $bottom.hide();
        
         // do something to let each player in turn get focus
        function toggleFocus(requestIndex) {
            var prevState, prevIndex, index, player =  '', label = '??', score = '*', newState;
            try {
                prevIndex = $focus.data('index');
                prevState = $focus.data('state');

                newState = !prevState;

                if (newState) {
                    index = requestIndex || prevIndex;
                    player = $cams.eq(index).data('player');
                    
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
                    (function () {
                        var $label = $('<div class="overlay col-xs-12">&nbsp;' + label + '&nbsp;</div>'),
                            $score = $('<span class="pull-right">' + score + '</span>'),
                            $iframe = $('<iframe class="embed-responsive-item" src="' + player + '">');
                        $label.append($score).unbind().click(toggleFocus);
                        $focus.html('').append($label).append($iframe);
                    }());
                    $top.slideUp();
                    $bottom.slideDown();
                } else {
                    $focus.html('');
                    $top.slideDown();
                    $bottom.slideUp(function () {
                        $focus.html(''); // empty that player code
                    });
                }

                $focus.data('state', newState);
                $focus.data('index', index);

            } catch (e) {
                console.error('error in execution of focus switch ==> ' + e);
            }
            return false;
        }
        
        $camcontainers.each(function (ndx) {
            var $camcontainer = $(this),
                $cam = $('[role="cam"]', $camcontainer),
                $lbl = $('[role="label"]', $camcontainer),
                $scr = $('[role="score"]', $camcontainer),
                alias = $cam.data('alias'),
                $img = $('<div class="row imgframe"></div>'),
                update = function () {
                    $.ajax({
                        dataType: 'json',
                        url: '/cams/' + alias,
                        success: function (data, status, xhr) {
                            try {
                                if (status !== 'success') {
                                    console.log("bad response for alias '%s' ==> %s", alias, status);
                                }
                                var src = loadImageThen(data.image, function () {
                                    $img.css("background-image", "url(" + src + ")");
                                });
                                $cam.data('player', data.player);
                                $cam.data('score', data.score);
                                if (data.player.length === 0) {
                                    $camcontainer.addClass('noplayer');
                                } else {
                                    $camcontainer.removeClass('noplayer');
                                }
                                $scr.html(data.score);
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
            $cam.unbind().click(function () { return toggleFocus(ndx); });
            
            $cam.html('');
            $cam.append($img);
            update();
            setInterval(update, UPDATE_PERIOD);
        });

        
        setInterval(toggleFocus, FOCUS_PERIOD);
    });
}());
