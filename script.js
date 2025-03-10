$(document).ready(function() {
    // Load team number and event from cookies if they exist
    var teamNumber = getCookie('teamNumber');
    var eventName = getCookie('eventName');
    
    console.log('Team number:', teamNumber);
    if (teamNumber) {
        $('#teamNumberInput').val(teamNumber);
        $('#teamnum').text(teamNumber);
        fetchTeamEvents(teamNumber, eventName);
    }

    $('#settings').click(function() {
        $('#settingsPage').toggle();
    });

    $('#teamNumberInput').on('change', function() {
        var teamNumber = $(this).val();
        $('#teamnum').text(teamNumber);
        setCookie('teamNumber', teamNumber, 365);
        fetchTeamEvents(teamNumber);
    });

    $('#eventDropdown').on('change', function() {
        var eventName = $(this).find('option:selected').text();
        $('#eventname').text(eventName);
        setCookie('eventName', eventName, 365);
        scaleHeaderText();
    });

    $('#closeSettings').click(function() {
        $('#settingsPage').hide();
    });

    function fetchTeamEvents(teamNumber, selectedEventName) {
        var currentYear = new Date().getFullYear();
        var apiUrl = `https://api.statbotics.io/v3/team_events?team=${teamNumber}&year=${currentYear}`;
        
        $.getJSON(apiUrl, function(data) {
            var eventDropdown = $('#eventDropdown');
            eventDropdown.empty();
            eventDropdown.append(new Option('Select an event', '', true, true));
            data.forEach(function(event) {
                var option = new Option(event.event_name, event.event);
                if (event.event_name === selectedEventName) {
                    option.selected = true;
                    $('#eventname').text(event.event_name);
                }
                eventDropdown.append(option);
            });
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error fetching team events:', textStatus, errorThrown);
        });
    }

    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function scaleHeaderText() {
        var header = $('#header');
        var headerText = header.find('h2');
        headerText.css('font-size', ''); // Reset font size
        headerText.each(function() {
            var $this = $(this);
            while ($this[0].scrollWidth > $this.innerWidth()) {
                var fontSize = parseInt($this.css('font-size')) - 1;
                $this.css('font-size', fontSize + 'px');
            }
        });
    }

    scaleHeaderText();
    $(window).resize(scaleHeaderText);
});
