$(document).ready(function() {
    // Load team number from cookie if it exists
    var teamNumber = getCookie('teamNumber');
    console.log('Team number:', teamNumber);
    if (teamNumber) {
        $('#teamNumberInput').val(teamNumber);
        $('#teamnum').text(teamNumber);
        fetchTeamEvents(teamNumber);
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

    $('#closeSettings').click(function() {
        $('#settingsPage').hide();
    });

    function fetchTeamEvents(teamNumber) {
        var currentYear = new Date().getFullYear();
        var apiUrl = `https://api.statbotics.io/v3/team_events?team=${teamNumber}&year=${currentYear}`;
        
        $.getJSON(apiUrl, function(data) {
            var eventDropdown = $('#eventDropdown');
            eventDropdown.empty();
            eventDropdown.append(new Option('Select an event', '', true, true));
            data.forEach(function(event) {
                eventDropdown.append(new Option(event.event_name, event.event));
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
});
