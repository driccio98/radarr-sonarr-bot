import { handleSearch, getQualityProfiles } from "./src/handleRequests.js";
import { Telegraf, Markup } from "telegraf";
import _ from "lodash";
import escapeRegExp from "./src/utils/EscapeString.js";


const token = "5235453953:AAFoO5vAQx_ukqNELXzjBqkxuxLms89upO0";
const bot = new Telegraf(token);

//#########################---Commands---##########################

bot.command("start", (ctx) => {
    console.log(ctx.from);
    bot.telegram.sendMessage(
        ctx.chat.id,
        "hello there! Welcome to my new telegram bot.",
        {}
    );
});


//let debouncedHandleSearch = _.debounce(handleSearch, 5000, {leading: true, trailing: false})

let currentQuery = [];
bot.command("search", (ctx) => {

    let commandArguments = _.drop(ctx.update.message.text.split(" "), 1).join(" ");
    handleSearch(commandArguments).then((moviesArray) => {

        currentQuery = moviesArray;

        moviesArray.messages.map((photoObject) => {
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

//#########################---Commands---##########################

//#########################---Descriptions---##########################

let openDescriptionRegex = /openDescriptionId[0-9]*/;
bot.action(openDescriptionRegex, (ctx) => {

    if (!currentQuery || currentQuery.length < 1) {
        return;
    }

    let currentItemId = ctx.update.callback_query.data.split("Id")[1];
    let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

    ctx.editMessageCaption(escapeRegExp(ctx.update.callback_query.message.caption + `\n📙Description: ${movieObject.overview}`), {
        parse_mode: "MarkdownV2"
    });

    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentButtonIndex = _.findIndex(replyMarkup[0], function (o) {
        return openDescriptionRegex.test(o.callback_data);
    });
    let newButton = Markup.button.callback(
        "🛑 Close Description",
        `closeDescriptionId${movieObject.id}`
    );

    replyMarkup[0].splice(currentButtonIndex, 1, newButton);
    console.log("replyMarkup", replyMarkup);
    ctx.editMessageReplyMarkup(...Markup.inlineKeyboard([replyMarkup ]));

    return;
});

let closeDescriptionRegex = /closeDescriptionId[0-9]*/;
bot.action(closeDescriptionRegex, (ctx) => {

    if (!currentQuery || currentQuery.length < 1) {
        return;
    }

    let currentItemId = ctx.update.callback_query.data.split("Id")[1];
    let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

    //Title of movie
    let caption = `*${escapeRegExp(movieObject.title)}* \\- _${movieObject.year}_`;
    //Ratings
    caption += escapeRegExp(`\n📈Ratings: ${movieObject.ratings.imdb ? movieObject.ratings.imdb.value : "0"} IMDb`);
    caption += escapeRegExp(` ${movieObject.ratings.rottenTomatoes ? movieObject.ratings.rottenTomatoes.value : "0"} Rotten Tomatoes`);
    //Genres
    caption += escapeRegExp(`\n🎭Genres: ${movieObject.genres.join(", ")}`);

    ctx.editMessageCaption(caption, { parse_mode: "MarkdownV2" });

    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentButtonIndex = _.findIndex(replyMarkup[0], function (o) {
        return closeDescriptionRegex.test(o.callback_data);
    });
    let newButton = Markup.button.callback(
        "➕ Open Description",
        `openDescriptionId${movieObject.id}`
    )

    replyMarkup[0].splice(currentButtonIndex, 1, newButton);
    console.log("replyMarkup", replyMarkup);
    ctx.editMessageReplyMarkup({ inline_keyboard: replyMarkup });

    return;
});

//#########################---Descriptions---##########################

//#########################---Quality Profiles---##########################
let showQualityProfilesRegex = /showQualityProfilesId[0-9]*/;
bot.action(showQualityProfilesRegex, async (ctx) => {
    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentItemId = ctx.update.callback_query.data.split("Id")[1];
    let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

    let currentButtonIndex = _.findIndex(replyMarkup[2], function (o) {
        return showQualityProfilesRegex.test(o.callback_data);
    });
    let newButton = Markup.button.callback(
        "👁 Hide Quality Profiles",
        `hideQualityProfilesId${movieObject.id}`
    )
    replyMarkup[2].splice(currentButtonIndex, 1, newButton);

    let qualityProfiles = await getQualityProfiles();

    let qualityProfilesButtons = [];

    qualityProfiles.map((qualityProfile) => {

        let qualityProfileName = qualityProfile.id == movieObject.qualityProfileId ?
        qualityProfile.name + " ✔" :
        qualityProfile.name

        qualityProfilesButtons.push(Markup.button.callback(
            `${qualityProfileName}`,
            `setQualityProfileId${movieObject.id}Id${qualityProfile.id}`
        ));
        if(qualityProfilesButtons.length > 2){
            replyMarkup.push(qualityProfilesButtons);
            qualityProfilesButtons = [];
        }
    });
    
    ctx.editMessageReplyMarkup({ inline_keyboard: replyMarkup });

    return;
});

//#########################---Quality Profiles---##########################

//#########################---Monitoring---##########################

let removeMonitoredRegex = /removeMonitoredId[0-9]*/;
bot.action(removeMonitoredRegex, (ctx) => {
    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let monitoringButtonIndex = _.findIndex(replyMarkup[1], function (o) { //following the replyMarkup array of arrays
        return removeMonitoredRegex.test(o.callback_data);
    });
    let newMonitoringButton = Markup.button.callback(
        "🛑 Unmonitored",
        "addMonitoredId"
    );

    replyMarkup[0].splice(monitoringButtonIndex, 1, newMonitoringButton);
    ctx.editMessageReplyMarkup({ inline_keyboard: replyMarkup });

    ctx.reply("Removed from Monitored");
    return;
});

let addMonitoredId = /addMonitoredId[0-9]*/;
bot.action(addMonitoredId, (ctx) => {
    let replyMarkup =
        ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let monitoringButtonIndex = _.findIndex(replyMarkup[1], function (o) { //following the replyMarkup array of arrays
        return addMonitoredId.test(o.callback_data);
    });

    let newMonitoringButton = Markup.button.callback(
        "✔ Monitored",
        "removeMonitoredId"
    );

    replyMarkup[0].splice(monitoringButtonIndex, 1, newMonitoringButton);
    ctx.editMessageReplyMarkup({ inline_keyboard: replyMarkup });

    ctx.reply("Added to Monitored");
    return
});

//#########################---Monitoring---##########################

//#########################---Bot Process---##########################

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

//#########################---Bot Process---##########################