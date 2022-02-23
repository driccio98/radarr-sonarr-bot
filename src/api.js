import axios from "axios";
import { Markup } from "telegraf";
import { v4 as uuid } from 'uuid';
import escapeRegExp from "./utils/EscapeString.js";

export async function handleSearch(searchTerm) {
    if (searchTerm && searchTerm.length > 0) {
        const apiUrl = `https://daniflix.ddns.net/radarr/api/v3/movie/lookup?term=${searchTerm}&apiKey=e4e7e0e212044fbdbbccc837a1a3bfba`;
        const response = await axios.get(apiUrl);
        const results = response.data;
        let movies = [];

        results.map((movieObject) => {

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

            movies.push({
                id: movieObject.id,
                photo: movieObject.remotePoster || "",
                caption: `*${escapeRegExp(movieObject.title)}* \\- _${movieObject.year}_`,
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
                    ]
                ]),
            });
        });

        return Promise.resolve({moviesArray: results, messages: movies});
    }
    return;
}