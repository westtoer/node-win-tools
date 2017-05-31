/*jslint browser: true */
/*global console, $ */

(function () {
    "use strict";
    
    // unclear do we need registration?
    
    // http://new.ipcamlive.com/player/registerviewer.php?_=1495632543070&alias=nieuwpoort&type=HTML5 ==> {"result":"ok","data":{"viewerid":125284173}}
    // http://new.ipcamlive.com/player/getcamerastreamstate.php?_=1495632603332&token=&alias=nieuwpoort ==> 
    
    var PERIOD = 15000;
    
    $(function () {
        $('.cam').each(function () {
            var $cam = $(this),
                alias = $cam.data('alias'),
                $img = $('<div class="row imgframe"></div>'),
                $a = $('<a>'),
                update = function () {
                    $.getJSON('/cams/' + alias, function (data, status, xhr) {
                        if (status !== 'success') {
                            console.log("bad response for alias '%s' ==> %s", alias, status);
                        }
                        console.log("data for alias '%s'", alias, data);
                        $img.css("background-image", "url(" + data.image + ")");
                        $a.attr("href", data.player);
                        
                        setTimeout(update, PERIOD);
                    });
                };
            
            $cam.html('');
            $cam.append($a.append($img));
            update();
        });
    });
}());
