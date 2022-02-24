
import { Markup } from "telegraf";
import { escapeRegExp, removeRegExp } from "./utils/escapeString.js";
import _ from "lodash";
import Api from "./api.js"

const RADARR_APIKEY = "e4e7e0e212044fbdbbccc837a1a3bfba";
const api = new Api(RADARR_APIKEY);

const MOVIES_ROOT_FOLDER = "/home/lix/Jellyfin/media/Movies/"

export function getCaption(movieObject, long = true) {

    //Title of movie
    let caption = `*${escapeRegExp(movieObject.title)}* \\- _${movieObject.year}_`;
    //Ratings
    caption += escapeRegExp(`\n📈Ratings:\n${movieObject.ratings.imdb ? movieObject.ratings.imdb.value : "0"} 🟨IMDb`);
    caption += escapeRegExp(`\n${movieObject.ratings.rottenTomatoes ? movieObject.ratings.rottenTomatoes.value : "0"} 🍅Rotten Tomatoes`);
    //Genres
    caption += escapeRegExp(`\n🎭Genres: ${movieObject.genres.join(", ")}`);
    //Is it downloaded
    caption += escapeRegExp(`\n🚩Downloaded: ${movieObject.hasFile ? "Yes" : "No"}`);

    if (long) {
        caption += escapeRegExp(`\n📙Description: ${movieObject.overview}`);
    }

    return caption;

}

export async function handleSearch(searchTerm) {
    if (searchTerm && searchTerm.length > 0) {

        let results = await api.getMoviesByTerm(searchTerm);

        //we sort the results by year of release
        let sortedResults = _.sortBy(results, [function (o) { return o.year; }])

        let messagesArray = [];

        let defaultQualityProfileId = 4;

        sortedResults.map((movieObject) => {

            //When movies are not in the database they have no id;
            if (!movieObject.id) {
                movieObject.id = Math.floor(Math.random()*90000) + 10000;
            }

            //If a quality profile hasn't been selected
            if (!movieObject.qualityProfileId) {
                movieObject.qualityProfileId = defaultQualityProfileId;
            }

            //Set movie's path
            if (!movieObject.path) {
                movieObject.path =
                    `${MOVIES_ROOT_FOLDER}${removeRegExp(movieObject.title)} (${movieObject.year})`;
            }


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

            let caption = getCaption(movieObject, false);

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

        return Promise.resolve({ moviesArray: results, messages: messagesArray });
    }
    return;
}

export async function getQualityProfiles() {
    return await api.getQualityProfiles();
}

export async function addNewMovie(movieObject) {
    return await api.addNewMovie(movieObject);
}

export async function editExistingMovie(movieObject){
    return await api.editMovie(movieObject);
}