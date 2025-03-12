$(document).ready(function() {
    // Load team number, event, Nexus API key, and TBA API key from cookies if they exist
    var teamNumber = getCookie('teamNumber');
    var eventName = getCookie('eventName');
    var nexusApiKey = getCookie('nexusApiKey');
    var tbaApiKey = getCookie('tbaApiKey');
    var eventKey = null;
    var intervalId = null;
    var savedMatchData = {};
    var currentMatch = 'No upcoming match';
    var streamUrl = null;
    
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
        fetchMatches(eventKey, nexusApiKey, teamNumber);
        fetchStreamUrl(eventKey);
        scaleHeaderText();
        if (intervalId) {
            clearInterval(intervalId);
        }
        intervalId = setInterval(function() {
            fetchMatches(eventKey, nexusApiKey, teamNumber);
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

    $('#stream').click(function() {
        $('#streamContainer').toggle();
        $('#details-container').toggle();
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
                    fetchStreamUrl(event.event);
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
                savedMatchData = data; // Save the fetched data
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

    function fetchStreamUrl(eventKey) {
        var apiUrl = `https://api.statbotics.io/v3/event/${eventKey}`;
        
        $.getJSON(apiUrl, function(data) {
            streamUrl = data.video;
            if (streamUrl) {
                $('#streamContainer').html(`
                    <iframe src="${streamUrl}&parent=haklyne-dev.github.io" frameborder="0" allowfullscreen="true" scrolling="yes" height="100%" width="100%"></iframe>
                `);
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            console.error('Error fetching stream URL:', textStatus, errorThrown);
        });
    }

    function displayMatchDetails(match) {
        var currentYear = new Date().getFullYear();
        var redAlliance = match.redTeams;
        var blueAlliance = match.blueTeams;
        currentMatch = match.label;

        redAlliance.forEach(function(team, index) {
            fetchTeamMedia(team, currentYear, `#redTeam${index + 1}`, 'red');
        });

        blueAlliance.forEach(function(team, index) {
            fetchTeamMedia(team, currentYear, `#blueTeam${index + 1}`, 'blue');
        });

        // Highlight the current match in the matches list
        $('.match').each(function() {
            var matchLabel = $(this).find('h3').text();
            if (matchLabel === currentMatch) {
                $(this).addClass('highlight-current');
            } else {
                $(this).removeClass('highlight-current');
            }
        });
    }

    function fetchTeamMedia(teamNumber, year, elementId, allianceColor) {
        var mediaApiUrl = `https://www.thebluealliance.com/api/v3/team/frc${teamNumber}/media/${year}`;
        var teamApiUrl = `https://api.statbotics.io/v3/team/${teamNumber}`;

        $.ajax({
            url: mediaApiUrl,
            method: 'GET',
            headers: {
                'X-TBA-Auth-Key': tbaApiKey
            },
            success: function(mediaData) {
                var mediaUrl = 'default.png';
                for (var i = 0; i < mediaData.length; i++) {
                    if (mediaData[i].preferred) {
                        mediaUrl = mediaData[i].direct_url;
                        break;
                    }
                }

                $.getJSON(teamApiUrl, function(teamData) {
                    var teamName = teamData.name || `Team ${teamNumber}`;
                    var nextMatch = 'No upcoming match';

                    // Find the next match from the saved data
                    if (savedMatchData.matches) {
                        for (var i = 0; i < savedMatchData.matches.length; i++) {
                            var match = savedMatchData.matches[i];
                            if ((match.redTeams.includes(teamNumber) || match.blueTeams.includes(teamNumber)) && match.status !== "On field") {
                                nextMatch = "Next Match: "+match.label;
                                break;
                            }
                        }
                    }

                    // Check if the next match is the same as the currently displayed one
                    if (nextMatch === "Next Match: "+currentMatch) {
                        nextMatch = '<br>';
                    }

                    $(elementId).html(`
                        <div class="team-card ${allianceColor}">
                            <span class="team-number">${teamNumber}</span>
                            <span class="team-name">${teamName}</span>
                            <img src="${mediaUrl}" alt="Team ${teamNumber}">
                            <span class="next-match">${nextMatch}</span>
                        </div>
                    `);
                }).fail(function() {
                    $(elementId).html(`
                        <div class="team-card ${allianceColor}">
                            <span class="team-number">${teamNumber}</span>
                            <img src="${mediaUrl}" alt="Team ${teamNumber}">
                            <span class="next-match">Next Match: No upcoming match</span>
                        </div>
                    `);
                });
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
            'color': 'white',
            'font-weight': 'bold'
        });
        $('.blue-alliance').css({
            'color': 'white',
            'font-weight': 'bold'
        });
    }

    scaleHeaderText();
    $(window).resize(scaleHeaderText);
});
