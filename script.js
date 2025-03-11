$(document).ready(function() {
    // Load team number, event, Nexus API key, and TBA API key from cookies if they exist
    var teamNumber = getCookie('teamNumber');
    var eventName = getCookie('eventName');
    var nexusApiKey = getCookie('nexusApiKey');
    var tbaApiKey = getCookie('tbaApiKey');
    var eventKey = null;
    var intervalId = null;
    
    console.log('Team number:', teamNumber);
    if (teamNumber) {
        $('#teamNumberInput').val(teamNumber);
        $('#teamnum').text(teamNumber);
        fetchTeamEvents(teamNumber, eventName);
    }

    if (nexusApiKey) {
        $('#nexusApiKey').val(nexusApiKey);
    }

    if (tbaApiKey) {
        $('#tbaApiKey').val(tbaApiKey);
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
        eventKey = $(this).val();
        nexusApiKey = $('#nexusApiKey').val();
        tbaApiKey = $('#tbaApiKey').val();
        teamNumber = $('#teamNumberInput').val();
        $('#eventname').text(eventName);
        setCookie('eventName', eventName, 365);
        fetchMatches("demo9369", nexusApiKey, teamNumber);
        scaleHeaderText();
        if (intervalId) {
            clearInterval(intervalId);
        }
        intervalId = setInterval(function() {
            fetchMatches("demo9369", nexusApiKey, teamNumber);
        }, 15000);
    });

    $('#nexusApiKey').on('change', function() {
        var nexusApiKey = $(this).val();
        setCookie('nexusApiKey', nexusApiKey, 365);
    });

    $('#tbaApiKey').on('change', function() {
        var tbaApiKey = $(this).val();
        setCookie('tbaApiKey', tbaApiKey, 365);
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
                    fetchMatches(event.event, nexusApiKey, teamNumber);
                }
                eventDropdown.append(option);
            });
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error fetching team events:', textStatus, errorThrown);
        });
    }

    function fetchMatches(eventKey, apiKey, teamNumber) {
        var apiUrl = `https://frc.nexus/api/v1/event/${eventKey}`;
        
        $.ajax({
            url: apiUrl,
            method: 'GET',
            headers: {
                'Nexus-Api-Key': apiKey
            },
            success: function(data) {
                var matchesList = $('#matches');
                matchesList.empty();
                var isQueuing = false;
                var isOnDeck = false;
                var firstMatch = null;
                data.matches.forEach(function(match) {
                    var matchItem = $('<li class="match"></li>');
                    if (match.redTeams.includes(teamNumber) || match.blueTeams.includes(teamNumber)) {
                        matchItem.append(`<h3>${match.label}</h3>`);
                        matchItem.append(`<p class="red-alliance">${match.redTeams.join(', ')}</p>`);
                        matchItem.append(`<p class="blue-alliance">${match.blueTeams.join(', ')}</p>`);
                        matchesList.append(matchItem);
                        if (match.status === "Now queuing") {
                            $('#alertContainer').removeClass('on-deck').text(`Now Queuing ${match.label}`).show();
                            $('body').css('padding-top', '40px');
                            $('#header').css('top', '40px');
                            matchItem.addClass('highlight');
                            isQueuing = true;
                        } else if (match.status === "On deck") {
                            $('#alertContainer').addClass('on-deck').text(`On Deck for ${match.label}`).show();
                            $('body').css('padding-top', '40px');
                            $('#header').css('top', '40px');
                            matchItem.addClass('highlight');
                            isOnDeck = true;
                        }
                        if (!firstMatch && match.status !== "On field") {
                            firstMatch = match;
                        }
                    }
                });
                if (!isQueuing && !isOnDeck) {
                    $('#alertContainer').hide();
                    $('body').css('padding-top', '0');
                    $('#header').css('top', '0');
                }
                if (firstMatch) {
                    displayMatchDetails(firstMatch);
                }
                applyMatchStyles();
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Error fetching matches:', textStatus, errorThrown);
            }
        });
    }

    function displayMatchDetails(match) {
        var currentYear = new Date().getFullYear();
        var redAlliance = match.redTeams;
        var blueAlliance = match.blueTeams;

        redAlliance.forEach(function(team, index) {
            fetchTeamMedia(team, currentYear, `#redTeam${index + 1}`);
        });

        blueAlliance.forEach(function(team, index) {
            fetchTeamMedia(team, currentYear, `#blueTeam${index + 1}`);
        });
    }

    function fetchTeamMedia(teamNumber, year, elementId) {
        var apiUrl = `https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/media/${year}`;
        
        $.ajax({
            url: apiUrl,
            method: 'GET',
            headers: {
                'X-TBA-Auth-Key': tbaApiKey
            },
            success: function(data) {
                var mediaUrl = data.length > 0 ? data[0].direct_url : 'default_image.png';
                $(elementId).html(`<img src="${mediaUrl}" alt="Team ${teamNumber}"><span>${teamNumber}</span>`);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.error('Error fetching team media:', textStatus, errorThrown);
            }
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

    function applyMatchStyles() {
        $('.match').css({
            'border': '1px solid #ccc'
        });
        $('.red-alliance').css({
            'color': 'black',
            'font-weight': 'bold'
        });
        $('.blue-alliance').css({
            'color': 'black',
            'font-weight': 'bold'
        });
    }

    scaleHeaderText();
    $(window).resize(scaleHeaderText);
});
