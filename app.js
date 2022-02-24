import * as handleRequests from "./src/handleRequests.js";
import { Telegraf, Markup } from "telegraf";
import _ from "lodash";


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
    handleRequests.handleSearch(commandArguments).then((moviesArray) => {

        currentQuery = moviesArray; //Save the query temporarily 

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

    console.log("movieObject", movieObject);

    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentButtonIndex = _.findIndex(replyMarkup[0], function (o) {
        return openDescriptionRegex.test(o.callback_data);
    });
    let newButton = Markup.button.callback(
        "🛑 Close Description",
        `closeDescriptionId${movieObject.id}`
    );

    replyMarkup[0].splice(currentButtonIndex, 1, newButton);
    ctx.editMessageCaption(handleRequests.getCaption(movieObject, true), { //We get the long caption
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard(replyMarkup)
    });

    return;
});

let closeDescriptionRegex = /closeDescriptionId[0-9]*/;
bot.action(closeDescriptionRegex, (ctx) => {

    if (!currentQuery || currentQuery.length < 1) {
        return;
    }

    let currentItemId = ctx.update.callback_query.data.split("Id")[1];
    let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentButtonIndex = _.findIndex(replyMarkup[0], function (o) {
        return closeDescriptionRegex.test(o.callback_data);
    });
    let newButton = Markup.button.callback(
        "➕ Open Description",
        `openDescriptionId${movieObject.id}`
    )

    replyMarkup[0].splice(currentButtonIndex, 1, newButton);
    let caption = handleRequests.getCaption(movieObject, false); //We get the short caption
    ctx.editMessageCaption(caption, {
        parse_mode: "MarkdownV2",
        ...Markup.inlineKeyboard(replyMarkup)
    });

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

    let qualityProfiles = await handleRequests.getQualityProfiles();

    let qualityProfilesButtons = [];

    qualityProfiles.map((qualityProfile) => {

        let qualityProfileName = qualityProfile.name;
        if (qualityProfile.id == movieObject.qualityProfileId) {
            qualityProfileName = qualityProfile.name + " ✔" 
        }
        
        qualityProfilesButtons.push(Markup.button.callback(
            `${qualityProfileName}`,
            `setQualityProfileId${movieObject.id}Id${qualityProfile.id}`
        ));
        if (qualityProfilesButtons.length > 2) {
            replyMarkup.push(qualityProfilesButtons);
            qualityProfilesButtons = [];
        }
    });

    let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
    ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

    return;
});

let hideQualityProfilesRegex = /hideQualityProfilesId[0-9]*/;
bot.action(hideQualityProfilesRegex, async (ctx) => {
    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentItemId = ctx.update.callback_query.data.split("Id")[1];
    let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

    let currentButtonIndex = _.findIndex(replyMarkup[2], function (o) {
        return hideQualityProfilesRegex.test(o.callback_data);
    });
    let newButton = Markup.button.callback(
        "👁 Show Quality Profiles",
        `showQualityProfilesId${movieObject.id}`
    )
    replyMarkup[2].splice(currentButtonIndex, 1, newButton); //We always know where this button is
    replyMarkup.splice(3, replyMarkup.length - 1); //And we always know where this row of buttons opens

    let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
    ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

    return;
});

let setQualityProfileRegex = /setQualityProfileId[0-9]*Id[0-9]*/;
bot.action(setQualityProfileRegex, async (ctx) => {
    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentItemId = ctx.update.callback_query.data.split("Id")[1];
    let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });
    
    let selectedQualityProfile = ctx.update.callback_query.data.split("Id")[2]; //We modify the movie object
    movieObject.qualityProfileId = selectedQualityProfile;                      //With the new quality profile

    replyMarkup.splice(3, replyMarkup.length - 1); //We will replace these with new buttons

    let qualityProfiles = await handleRequests.getQualityProfiles();
    let qualityProfilesButtons = [];

    qualityProfiles.map((qualityProfile) => {

        let qualityProfileName = qualityProfile.name;
        if (qualityProfile.id == movieObject.qualityProfileId) {
            qualityProfileName = qualityProfile.name + " ✔" 
        }
        
        qualityProfilesButtons.push(Markup.button.callback(
            `${qualityProfileName}`,
            `setQualityProfileId${movieObject.id}Id${qualityProfile.id}`
        ));
        if (qualityProfilesButtons.length > 2) {
            replyMarkup.push(qualityProfilesButtons);
            qualityProfilesButtons = [];
        }
    });

    let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
    ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

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

    replyMarkup[1].splice(monitoringButtonIndex, 1, newMonitoringButton);
    let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
    ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

    ctx.reply("Removed from Monitored");
    return;
});

let addMonitoredId = /addMonitoredId[0-9]*/;
bot.action(addMonitoredId, (ctx) => {
    let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

    let currentItemId = ctx.update.callback_query.data.split("Id")[1];
    let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

    handleRequests.addNewMovie(movieObject).catch(error => console.log(error));

    let monitoringButtonIndex = _.findIndex(replyMarkup[1], function (o) { //following the replyMarkup array of arrays
        return addMonitoredId.test(o.callback_data);
    });

    let newMonitoringButton = Markup.button.callback(
        "✔ Monitored",
        "removeMonitoredId"
    );

    replyMarkup[1].splice(monitoringButtonIndex, 1, newMonitoringButton);
    let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
    ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

    ctx.reply("Added to Monitored");
    return;
});

//#########################---Monitoring---##########################

//#########################---Bot Process---##########################

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

//#########################---Bot Process---##########################