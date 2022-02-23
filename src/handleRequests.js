
import { Markup } from "telegraf";
import { v4 as uuid } from 'uuid';
import escapeRegExp from "./utils/EscapeString.js";
import _ from "lodash";
import Api from "./api.js"

const RADARR_APIKEY = "e4e7e0e212044fbdbbccc837a1a3bfba";
const api = new Api(RADARR_APIKEY);

export async function handleSearch(searchTerm) {
    if (searchTerm && searchTerm.length > 0) {
        
        let results = await api.moviesLookup(searchTerm);

        //we sort the results by year of release
        let sortedResults = _.sortBy(results,[function(o) { return o.year; }])
        
        let messagesArray = [];
        sortedResults.map((movieObject) => {

            //When movies are not in the database they have no id;
            if (!movieObject.id) { movieObject.id = uuid(); }

            let monitoringButton;
            if (movieObject.monitored) {
                monitoringButton = Markup.button.callback(
                    "✔ Monitored",
                    `removeMonitoredId${movieObject.id}`
                );
            } else {
                monitoringButton = Markup.button.callback(
                    "🛑 Unmonitored",
                    `addMonitoredId${movieObject.id}`
                );
            }
            //Title of movie
            let caption = `*${escapeRegExp(movieObject.title)}* \\- _${movieObject.year}_`;
            
            //Ratings
            caption += escapeRegExp(`\n📈Ratings: ${movieObject.ratings.imdb ? movieObject.ratings.imdb.value : "0"} IMDb`);
            caption += escapeRegExp(` ${movieObject.ratings.rottenTomatoes ? movieObject.ratings.rottenTomatoes.value : "0"} Rotten Tomatoes`);
            
            //Genres
            caption += escapeRegExp(`\n🎭Genres: ${movieObject.genres.join(", ")}`);

            //Is it downloaded
            caption += escapeRegExp(`\n🚩Downloaded: ${movieObject.hasFile ? "Yes": "No"}`);

            messagesArray.push({
                id: movieObject.id,
                photo: movieObject.remotePoster || "",
                caption,
                ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback(
                            "➕ Open Description",
                            `openDescriptionId${movieObject.id}`
                        )
                    ],
                    [
                        monitoringButton,
                        {
                            text: "🔗 Open on IMDb",
                            url: `https://www.imdb.com/title/${movieObject.imdbId}/`,
                        }
                    ],
                    [
                        Markup.button.callback(
                            "👁 Show Quality Profiles",
                            `showQualityProfilesId${movieObject.id}`
                        )
                    ]
                ]),
            });
        });

        return Promise.resolve({moviesArray: results, messages: messagesArray});
    }
    return;
}

export async function getQualityProfiles(){
    return await api.getQualityProfiles();
}