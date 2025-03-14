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
    var alliances = [["none"],["none"],["none"],["none"],["none"],["none"],["none"],["none"]];

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
                    if (match.label == 'Playoff 1') {alliances[0] = match.redTeams; alliances[7] = match.blueTeams;}
                    else if (match.label == 'Playoff 2') {alliances[3] = match.redTeams; alliances[4] = match.blueTeams;}
                    else if (match.label == 'Playoff 3') {alliances[1] = match.redTeams; alliances[6] = match.blueTeams;}
                    else if (match.label == 'Playoff 4') {alliances[2] = match.redTeams; alliances[5] = match.blueTeams;}
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
            streamUrl = data.video.replace(/^https?:\/\/www.twitch.tv\//, '');
            if (streamUrl) {
                $('#streamContainer').html(`
                    <iframe src="https://player.twitch.tv/?channel=${streamUrl}&parent=haklyne-dev.github.io" frameborder="0" allowfullscreen scrolling="no" height="80%" width="95%"></iframe>
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

        // Check if the next match is a playoff match
        if (match.label.includes('Playoff') || match.label.includes('Final')) {
            displayDoubleEliminationBracket();
        }
    }

    function displayDoubleEliminationBracket() {
        // Replace match details with double elimination bracket
        console.log(alliances);
        $('#details-container').html(`
            <table id="alliances">
                <tr>
                    <td>Alliance 1</td>
                    <td>Alliance 2</td>
                    <td>Alliance 3</td>
                    <td>Alliance 4</td>
                    <td>Alliance 5</td>
                    <td>Alliance 6</td>
                    <td>Alliance 7</td>
                    <td>Alliance 8</td>
                </tr>
                <tr>
                    <td>${alliances[0].join(', ')}</td>
                    <td>${alliances[1].join(', ')}</td>
                    <td>${alliances[2].join(', ')}</td>
                    <td>${alliances[3].join(', ')}</td>
                    <td>${alliances[4].join(', ')}</td>
                    <td>${alliances[5].join(', ')}</td>
                    <td>${alliances[6].join(', ')}</td>
                    <td>${alliances[7].join(', ')}</td>
                </tr>
            </table>
            <div class="bracket">
                <div class="round" id="playoff1">
                    <table>
                        <thead>Playoff 1</thead>
                        <tbody>
                            <tr class="red">
                                <td>Alliance 1</td>
                            </tr>
                            <tr class="blue">
                                <td>Alliance 8</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <svg viewBox="0 0 10 10" id="line1">
                    <line x1="0" y1="0" x2="5" y2="0" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="10" x2="10" y2="10" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff2">
                    <table>
                        <thead>Playoff 2</thead>
                        <tbody>
                            <tr class="red">
                                <td>Alliance 3</td>
                            </tr>
                            <tr class="blue">
                                <td>Alliance 6</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <svg viewBox="0 0 10 10" id="line2">
                    <line x1="0" y1="10" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="10" x2="5" y2="0" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff3">
                    <table>
                        <thead>Playoff 3</thead>
                        <tbody>
                            <tr class="red">
                                <td>Alliance 2</td>
                            </tr>
                            <tr class="blue">
                                <td>Alliance 7</td>
                            </tr>
                        </tbody>
                    </table>
                </div><svg viewBox="0 0 10 10" id="line3">
                    <line x1="0" y1="0" x2="5" y2="0" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="10" x2="10" y2="10" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff4">
                    <table>
                        <thead>Playoff 4</thead>
                        <tbody>
                            <tr class="red">
                                <td>Alliance 4</td>
                            </tr>
                            <tr class="blue">
                                <td>Alliance 5</td>
                            </tr>
                        </tbody>
                    </table>
                </div><svg viewBox="0 0 10 10" id="line4">
                    <line x1="0" y1="10" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff5">
                    <table>
                        <thead>Playoff 5</thead>
                        <tbody>
                            <tr class="red">
                                <td>Loser of M1</td>
                            </tr>
                            <tr class="blue">
                                <td>Loser of M2</td>
                            </tr>
                    </table>
                </div><svg viewBox="0 0 10 10" id="line5">
                    <line x1="0" y1="10" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff6">
                    <table>
                        <thead>Playoff 6</thead>
                        <tbody>
                            <tr class="red">
                                <td>Loser of M3</td>
                            </tr>
                            <tr class="blue">
                                <td>Loser of M4</td>
                            </tr>
                    </table>
                </div><svg viewBox="0 0 10 10" id="line6">
                    <line x1="0" y1="10" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff7">
                    <table>
                        <thead>Playoff 7</thead>
                        <tbody>
                            <tr class="red">
                                <td>Winner of M1</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M2</td>
                            </tr>
                    </table>
                </div><svg viewBox="0 0 50 20" id="line7">
                    <line x1="0" y1="0" x2="25" y2="0" stroke="black" stroke-width="0.5" />
                    <line x1="25" y1="0" x2="25" y2="20" stroke="black" stroke-width="0.5" />
                    <line x1="25" y1="20" x2="50" y2="20" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff8">
                    <table>
                        <thead>Playoff 8</thead>
                        <tbody>
                            <tr class="red">
                                <td>Winner of M3</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M4</td>
                            </tr>
                        </tbody>
                    </table>
                </div><svg viewBox="0 0 50 20" id="line8">
                    <line x1="0" y1="20" x2="25" y2="20" stroke="black" stroke-width="0.5" />
                    <line x1="25" y1="0" x2="25" y2="20" stroke="black" stroke-width="0.5" />
                    <line x1="25" y1="0" x2="50" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff9">
                    <table>
                        <thead>Playoff 9</thead>
                        <tbody>
                            <tr class="red">
                                <td>Loser of M7</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M6</td>
                            </tr>
                        </tbody>
                    </table>
                </div><svg viewBox="0 0 10 10" id="line9">
                    <line x1="0" y1="10" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff10">
                    <table>
                        <thead>Playoff 10</thead>
                        <tbody>
                            <tr class="red">
                                <td>Loser of M8</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M5</td>
                            </tr>
                        </tbody>
                    </table>
                </div><svg viewBox="0 0 10 10" id="line10">
                    <line x1="0" y1="0" x2="5" y2="0" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="10" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="10" x2="10" y2="10" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff11">
                    <table>
                        <thead>Playoff 11</thead>
                        <tbody>
                            <tr class="red">
                                <td>Winner of M7</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M8</td>
                            </tr>
                        </tbody>
                    </table>
                </div><svg viewBox="0 0 50 30" id="line11">
                    <line x1="0" y1="0" x2="45" y2="0" stroke="black" stroke-width="0.5" />
                    <line x1="45" y1="0" x2="45" y2="30" stroke="black" stroke-width="0.5" />
                    <line x1="45" y1="30" x2="50" y2="30" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff12">
                    <table>
                        <thead>Playoff 12</thead>
                        <tbody>
                            <tr class="red">
                                <td>Winner of M10</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M9</td>
                            </tr>
                        </tbody>
                    </table>
                </div><svg viewBox="0 0 10 5" id="line12">
                    <line x1="0" y1="5" x2="5" y2="5" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="5" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="playoff13">
                    <table>
                        <thead>Playoff 13</thead>
                        <tbody>
                            <tr class="red">
                                <td>Loser of M11</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M12</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <svg viewBox="0 0 10 30" id="line13">
                    <line x1="0" y1="30" x2="5" y2="30" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="5" y2="30" stroke="black" stroke-width="0.5" />
                    <line x1="5" y1="0" x2="10" y2="0" stroke="black" stroke-width="0.5" />
                </svg>
                <div class="round" id="final1">
                    <table>
                        <thead>Finals</thead>
                        <tbody>
                            <tr class="red">
                                <td>Winner of M11</td>
                            </tr>
                            <tr class="blue">
                                <td>Winner of M13</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `);
        $('#alliances').css({
            'position': 'absolute',
            'width': '70vw',
            'height': '50px',
            'border-collapse': 'collapse',
            'top': '60px',
            'left': '28vw',
        });
        $('#alliances td').css({
            'width': '12.5vw',
            'border': '1px solid #ccc',
            'padding': '5px',
            'text-align': 'center',
            'font-size': '2vh'
        });
        $('.bracket').css({
            'display': 'flex',
            'justify-content': 'space-around',
            'align-items': 'center',
            'margin-top': '20px'
        });
        $('.round').css({
            'width': '9vw',
            'margin': '0 10px',
            'background-color': '#f9f9f9',
            'color': 'black',
            'font-size': 'fit-content'
        });
        $('.round table').css({
            'width': '100%',
            'border-collapse': 'collapse'
        });
        $('.round table thead').css({
            'background-color': '#ccc',
            'color': 'black',
            'font-weight': 'bold',
            'text-align': 'center'
        });
        $('.round table tbody').css({
            'border': '1px solid #ccc'
        });
        $('.round table tr').css({
            'height': '20px'
        });
        $('.round table td').css({
            'text-align': 'center'
        });
        $('.round table tr.red').css({
            'background-color': 'red',
            'color': 'white'
        });
        $('.round table tr.blue').css({
            'background-color': 'blue',
            'color': 'white'
        });

        $('#playoff1').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(0, 0)'
        });
        $('#playoff2').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(0, 80px)'
        });
        $('#playoff3').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(0, 160px)'
        });
        $('#playoff4').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(0, 240px)'
        });
        $('#playoff5').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(12vw, 360px)'
        });
        $('#playoff6').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(12vw, 440px)'
        });
        $('#playoff7').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(12vw, 40px)'
        });
        $('#playoff8').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(12vw, 200px)'
        });
        $('#playoff9').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(24vw, 400px)'
        });
        $('#playoff10').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(24vw, 320px)'
        });
        $('#playoff11').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(36vw, 120px)'
        });
        $('#playoff12').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(36vw, 360px)'
        });
        $('#playoff13').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(48vw, 340px)'
        });
        $('#final1').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26%',
            'transform': 'translate(60vw, 240px)'
        });

        $('#line1').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(10vw, 40px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line2').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(10vw, 80px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line3').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(10vw, 200px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line4').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(10vw, 240px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line5').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(22vw, 360px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line6').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(22vw, 440px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line7').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(22vw, 80px)',
            'width': '15vw',
            'height': '80px'
        });
        $('#line8').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(22vw, 160px)',
            'width': '15vw',
            'height': '80px'
        });
        $('#line9').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(34vw, 400px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line10').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(34vw, 360px)',
            'width': '3vw',
            'height': '40px'
        });
        $('#line11').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(46vw, 160px)',
            'width': '15vw',
            'height': '120px'
        });
        $('#line12').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(46vw, 380px)',
            'width': '3vw',
            'height': '20px'
        });
        $('#line13').css({
            'position': 'absolute',
            'top': '150px',
            'left': '26vw',
            'transform': 'translate(58vw, 280px)',
            'width': '3vw',
            'height': '100px'
        });

        const allianceNames = ["Alliance 1", "Alliance 2", "Alliance 3", "Alliance 4", "Alliance 5", "Alliance 6", "Alliance 7", "Alliance 8"];
        const matchLabels = ["Playoff 5", "Playoff 6", "Playoff 7", "Playoff 8", "Playoff 9", "Playoff 10", "Playoff 11", "Playoff 12", "Playoff 13", "Final 1"];
        
        data.matches.forEach(function(match) {
            if (matchLabels.includes(match.label)) {
            let redAlliance = "Undetermined";
            let blueAlliance = "Undetermined";
            
            alliances.forEach((alliance, index) => {
                if (match.redTeams === alliance) redAlliance = allianceNames[index];
                if (match.blueTeams === alliance) blueAlliance = allianceNames[index];
            });
            
            $(`#${match.label.toLowerCase().replace(' ', '')} tbody`).html(
                `<tr class="red">
                <td>${redAlliance}</td>
                </tr>
                <tr class="blue">
                <td>${blueAlliance}</td>
                </tr>`
            );
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
