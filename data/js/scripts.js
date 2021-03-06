
const app = new Vue({
    el: '#app',
    components: {
        "date-picker": DatePicker,
    },
    data: {
        site_settings: {
            site_name: "Offico score",
            site_url: "https://cdn.akamai.steamstatic.com/steamcommunity/public/images/avatars/4a/4a236972a7e48a22dba9c60397d106d9053249c4_full.jpg",
        },
        timeframe: Date.now(),
        settings: {
            steam_id: "76561198020969037",
            matches_count: "35",
            hours_minus: 14,
        },
        endpoints: {
            "last_matches": "https://aoe2.net/api/player/matches?game=aoe2de",
        },
        last_matches: [],
        score: {
            wins: 0,
            losses: 0,
            missing: false,
            elo_change: 0,
        },
        is_loading = false,
        current_match: {
            active: false,
            players: [],
        },
        periodic_check: {
            timer: false,
            interval: 60 * 1000, // 1 minute
        },
    },
    created() {

        this.get_url_info();

        this.change_hours();

        this.get_score();
        this.start_periodic_check();

    },
    computed: {
        last_matches_url: function() {
            return `${this.endpoints.last_matches}&steam_id=${this.settings.steam_id}&count=${this.settings.matches_count}`;
        },
    },
    methods: {
        get_url_info() {
            const current_url = new URL(window.location.href);
            const search_params = new URLSearchParams(current_url.search);

            const params = ["steam_id", "hours_minus", "matches_count"];

            // Apply found url params to settings.
            for (let param of params) {
                if (search_params.has(param)) {
                    this.settings[param] = search_params.get(param);
                }
            }

        },
        convert_unix_to_date(unix_time, multiply) {

            let milliseconds = unix_time;

            if (multiply) {
                milliseconds = unix_time * 1000;
            }

            let date = new Date(milliseconds)

            let date_string = date.toLocaleString();

            return date_string;
        },
        change_hours() {
                
            const hours_minus = this.settings.hours_minus;

            const timeframe_object = new Date(this.timeframe);
            timeframe_object.setHours(timeframe_object.getHours() - hours_minus);
            this.timeframe = Date.parse(timeframe_object);
        },
        async get_last_matches() {

            // Get last matches from API.
            const result = await fetch(this.last_matches_url);
            const result_json = await result.json();

            // Store last matches from API.
            this.last_matches = result_json;

            return result_json;
        },
        get_score() {

            this.get_last_matches().then(last_matches => {
            
                if (last_matches.length < 1) {
                    console.log("matches not found")
                    return;
                }
    
                for (let i = 0; i < last_matches.length; i++) {
                    const match = last_matches[i];
    
                    const started_unix = match.started * 1000;
                    const finished_unix = match.finished * 1000;
                    const players = match.players;
    
                    // Skip currently played game.
                    if (finished_unix == 0) {
                        this.current_match.active = true;
                        this.current_match.players = players;
                        continue;
                    }
    
                    // Skip games before timeframe.
                    if (finished_unix < this.timeframe) {
                        continue;
                    }
    
                    // Skip finished game without score data.
                    if (players[0].won == null) {
                        this.score.missing = true;
                        continue;
                    }
    
                    // Update score.
                    for (let j = 0; j < players.length; j++) {
                        const player = players[j];
    
                        if (player.steam_id == this.settings.steam_id) {

                            this.score.elo_change += player.rating_change;
    
                            if (player.won) {
                                this.score.wins++;
                            } else {
                                this.score.losses++;
                            }
                            
                        }
    
                    }
    
                }

                this.loading = false;
    
            });

        },
        refresh_data() {

            if (this.loading) {
                return;
            }

            this.loading = true;

            // Reset data.
            this.score.wins = 0;
            this.score.losses = 0;
            this.score.elo_change = 0;
            this.score.missing = false;
            this.current_match.active = false;

            this.get_score();

        },
        start_periodic_check() {

            if (this.periodic_check.timer) {
                return;
            }

            // Refresh data on interval.
            this.periodic_check.timer = setInterval(() => {
                this.refresh_data();
            }, this.periodic_check.interval);

        },
        stop_periodic_check() {

            clearInterval(this.periodic_check.timer);
            this.periodic_check.timer = false;

        },
        slide_toggle(context) {
            
            if (context == "timeframe") {
                document.querySelector('.timeframe.slide-toggle').classList.toggle('-active');
            }

        }
    },
});
