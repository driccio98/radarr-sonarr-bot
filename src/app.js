const { Telegraf, Markup } = require("telegraf");
const fetch = require("node-fetch").default;
const _ = require("lodash");
const { v4: uuid } = require('uuid');

const token = "5235453953:AAFoO5vAQx_ukqNELXzjBqkxuxLms89upO0";
const bot = new Telegraf(token);

bot.command("start", (ctx) => {
    console.log(ctx.from);
    bot.telegram.sendMessage(
        ctx.chat.id,
        "hello there! Welcome to my new telegram bot.",
        {}
    );
});

function escapeRegExp(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#]/g, "\\$&");
}

let currentQuery = [];

async function handleSearch(searchTerm) {
    if (searchTerm && searchTerm.length > 0) {
        const apiUrl = `https://daniflix.ddns.net/radarr/api/v3/movie/lookup?term=${searchTerm}&apiKey=e4e7e0e212044fbdbbccc837a1a3bfba`;
        const response = await fetch(apiUrl);
        const results = await response.json();
        let movies = [];

        results.map((movieObject) => {

            //When movies are not in the database they have no id;
            if(!movieObject.id){ movieObject.id = uuid(); } 

            let monitoringButton;
            if (movieObject.monitored) {
                monitoringButton = Markup.button.callback(
                    "❌ Remove From Monitored",
                    `removeMonitoredId${movieObject.id}`
                );
            } else {
                monitoringButton = Markup.button.callback(
                    "➕ Add To Monitored",
                    `addMonitoredId${movieObject.id}`
                );
            }

            movies.push({
                id: movieObject.id,
                photo: movieObject.remotePoster || "",
                caption: `*${escapeRegExp(movieObject.title)}* \\- _${movieObject.year}_\nDescription: ${escapeRegExp(movieObject.overview)}`,
                ...Markup.inlineKeyboard([
                    monitoringButton,
                    {
                        text: "🔗 Open on IMDb",
                        url: `https://www.imdb.com/title/${movieObject.imdbId}/`,
                    },
                ]),
            });

            currentQuery = movies;
        });

        return Promise.resolve(movies);
    }
    return;
}

//let debouncedHandleSearch = _.debounce(handleSearch, 5000, {leading: true, trailing: false})

bot.command("search", (ctx) => {
    let commandArguments = _.drop(ctx.update.message.text.split(" "), 1).join(" ");
    handleSearch(commandArguments).then((moviesArray) => {
        moviesArray.map((photoObject) => {
            if (photoObject.photo) {
                photoObject.chat_id = ctx.chat.id;

                bot.telegram.sendPhoto(photoObject.chat_id, photoObject.photo, {
                    caption: photoObject.caption.slice(0, 1024),
                    parse_mode: "MarkdownV2",
                    reply_markup: photoObject.reply_markup,
                });
            }
        });
    });
});

bot.action("removeMonitoredId[0-9]*", (ctx, next) => {
    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let monitoringButtonIndex = _.findIndex(replyMarkup[0], function (o) {
        return o.callback_data == "removeMonitored";
    });
    let newMonitoringButton = Markup.button.callback(
        "➕ Add To Monitored",
        "addMonitored"
    );

    replyMarkup[0].splice(monitoringButtonIndex, 1, newMonitoringButton);
    ctx.editMessageReplyMarkup({ inline_keyboard: replyMarkup });

    return ctx.reply("Removed from Monitored").then(() => next());
});

bot.action("addMonitored", (ctx, next) => {
    let replyMarkup =
        ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let monitoringButtonIndex = _.findIndex(replyMarkup[0], function (o) {
        return o.callback_data == "removeMonitored";
    });

    let newMonitoringButton = Markup.button.callback(
        "➕ Add To Monitored",
        "addMonitored"
    );

    replyMarkup[0].splice(monitoringButtonIndex, 1, newMonitoringButton);
    ctx.editMessageReplyMarkup({ inline_keyboard: replyMarkup });

    return ctx.reply("Added to Monitored").then(() => next());
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
