import * as handleRequests from "./src/handleRequests.js";
import { removeRegExp } from "./src/utils/utils.js";
import { Telegraf, Markup } from "telegraf";
import _ from "lodash";


const token = "5235453953:AAFoO5vAQx_ukqNELXzjBqkxuxLms89upO0";
const bot = new Telegraf(token);

//#########################---Utils---##########################

//the keyboard is a matrix of buttons
function replaceMarkupButton(replyMarkup, rowIndex, columnIndex, itemToReplace) {
    let newReplyMarkup = _.cloneDeep(replyMarkup);
    newReplyMarkup[rowIndex].splice(columnIndex, 1, itemToReplace);
    return newReplyMarkup;
}

//#########################---Utils---##########################

//#########################---Commands---##########################

bot.command("start", (ctx) => {
    bot.telegram.sendMessage(
        ctx.chat.id,
        "Hello there\\!, This is Radarr bot\\!",
        {
            parse_mode: "MarkdownV2"
        }
    );
});

let currentQuery = [];
bot.command("search", (ctx) => {

    let commandArguments = _.drop(ctx.update.message.text.split(" "), 1).join(" ");
    if (!commandArguments) {
        return ctx.reply("Please enter a search term e.g `/search the batman`",
            {
                parse_mode: "MarkdownV2"
            });
    }

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
    }).catch(error => {
        handleError(error, ctx);
    });
});

bot.command("viewMonitored", (ctx) => {
    handleRequests.getMonitoredMovies().then((requestResult) => {
        currentQuery = requestResult;

        requestResult.messages.map((photoObject) => {
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
let imdbIdRegex = /tt[0-9]{1,}/
bot.hears(imdbIdRegex, (ctx) => {
    let imdbId = ctx.update.message.text.match(imdbIdRegex);
    if(imdbId && imdbId.length > 0){
        //only the first match
        handleRequests.searchMovieByImdbId(imdbId[0]).then((moviesArray) => {
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
        }).catch(error => {
            handleError(error, ctx);
        });
    }
});

//#########################---Commands---##########################

//#########################---Descriptions---##########################

let openDescriptionRegex = /openDescriptionId[0-9]*/;
bot.action(openDescriptionRegex, (ctx) => {
    try {
        if (!currentQuery || currentQuery.length < 1) {
            return;
        }
        let currentItemId = ctx.update.callback_query.data.split("Id")[1];
        let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

        let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

        let currentButtonIndex = _.findIndex(replyMarkup[0], function (o) {
            return openDescriptionRegex.test(o.callback_data);
        });
        let newButton = Markup.button.callback(
            "🛑 Hide Description",
            `closeDescriptionId${movieObject.id}`
        );

        replyMarkup = replaceMarkupButton(replyMarkup, 0, currentButtonIndex, newButton);
        ctx.editMessageCaption(handleRequests.getCaption(movieObject, true), { //We get the long caption
            parse_mode: "MarkdownV2",
            ...Markup.inlineKeyboard(replyMarkup)
        });

        return;
    } catch (error) {
        handleError(error, ctx);
    }
});

let closeDescriptionRegex = /closeDescriptionId[0-9]*/;
bot.action(closeDescriptionRegex, (ctx) => {
    try {
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
            "➕ View Description",
            `openDescriptionId${movieObject.id}`
        )

        replyMarkup = replaceMarkupButton(replyMarkup, 0, currentButtonIndex, newButton);
        let caption = handleRequests.getCaption(movieObject, false); //We get the short caption
        ctx.editMessageCaption(caption, {
            parse_mode: "MarkdownV2",
            ...Markup.inlineKeyboard(replyMarkup)
        });

        return;
    } catch (error) {
        handleError(error, ctx);
    }
});

//#########################---Descriptions---##########################

//#########################---Quality Profiles---##########################

async function getQualityProfilesKeyboard(movieObject, replyMarkup) {
    let newMarkup = _.cloneDeep(replyMarkup);

    let qualityProfiles = await handleRequests.getQualityProfiles();
    let qualityProfilesButtons = [];

    qualityProfiles.map((qualityProfile, index) => {

        let qualityProfileName = qualityProfile.name;
        if (qualityProfile.id == movieObject.qualityProfileId) {
            qualityProfileName = qualityProfile.name + " ✔"
        }

        qualityProfilesButtons.push(Markup.button.callback(
            `${qualityProfileName}`,
            `setQualityProfileId${movieObject.id}Id${qualityProfile.id}`
        ));

        if (qualityProfilesButtons.length > 1 ||
            (index === qualityProfiles.length - 1 && qualityProfilesButtons.length > 0)) {
            newMarkup.push(qualityProfilesButtons);
            qualityProfilesButtons = [];
        }
    });
    return newMarkup;
}

let showQualityProfilesRegex = /showQualityProfilesId[0-9]*/;
bot.action(showQualityProfilesRegex, async (ctx) => {
    try {
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
        replyMarkup = replaceMarkupButton(replyMarkup, 2, currentButtonIndex, newButton);

        let newReplyMarkup = await getQualityProfilesKeyboard(movieObject, replyMarkup);
        ctx.editMessageReplyMarkup(Markup.inlineKeyboard(newReplyMarkup).reply_markup);

        return;
    } catch (error) {
        handleError(error, ctx);
    }
});

let hideQualityProfilesRegex = /hideQualityProfilesId[0-9]*/;
bot.action(hideQualityProfilesRegex, async (ctx) => {
    try {
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
        replyMarkup = replaceMarkupButton(replyMarkup, 2, currentButtonIndex, newButton); //We always know where this button is
        replyMarkup.splice(3, replyMarkup.length - 1); //And we always know where this row of buttons opens

        let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
        ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

        return;
    } catch (error) {
        handleError(error, ctx);
    }
});

let setQualityProfileRegex = /setQualityProfileId[0-9]*Id[0-9]*/;
bot.action(setQualityProfileRegex, async (ctx) => {
    try {
        let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

        let currentItemId = ctx.update.callback_query.data.split("Id")[1];
        let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

        let selectedQualityProfile = ctx.update.callback_query.data.split("Id")[2]; //We modify the movie object

        movieObject.qualityProfileId = selectedQualityProfile; //With the new quality profile

        if (movieObject.path) { //We need to check that the movie already exists
            handleRequests.editExistingMovie(movieObject).catch(error => {
                handleError(error, ctx);
                return;
            });
        }

        replyMarkup.splice(3, replyMarkup.length - 1); //We will replace these with new buttons

        let newReplyMarkup = await getQualityProfilesKeyboard(movieObject, replyMarkup);
        ctx.editMessageReplyMarkup(Markup.inlineKeyboard(newReplyMarkup).reply_markup);

        return;
    } catch (error) {
        handleError(error, ctx);
    }
});


//#########################---Quality Profiles---##########################

//#########################---Monitoring---##########################

let removeMonitoredRegex = /removeMonitoredId[0-9]*/;
bot.action(removeMonitoredRegex, (ctx) => {
    try {
        let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;

        let currentItemId = ctx.update.callback_query.data.split("Id")[1];
        let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });

        movieObject.monitored = false;
        handleRequests.editExistingMovie(movieObject).catch(error => {
            handleError(error, ctx);
            return;
        });

        let currentButtonIndex = _.findIndex(replyMarkup[1], function (o) { //following the replyMarkup array of arrays
            return removeMonitoredRegex.test(o.callback_data);
        });

        let newButton = Markup.button.callback(
            "🛑 Unmonitored",
            "addMonitoredId"
        );

        replyMarkup = replaceMarkupButton(replyMarkup, 1, currentButtonIndex, newButton);

        let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
        ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

        ctx.reply("Removed from Monitored");
        return;
    } catch (error) {
        handleError(error, ctx);
    }
});

let addMonitoredRegex = /addMonitoredId[0-9]*/;
bot.action(addMonitoredRegex, (ctx) => {
    try {
        let replyMarkup = ctx.update.callback_query.message.reply_markup.inline_keyboard;
        let currentItemId = ctx.update.callback_query.data.split("Id")[1];
        let movieObject = _.find(currentQuery.moviesArray, function (o) { return o.id == currentItemId; });
        
        console.log("movieObject", movieObject);
        
        if (!movieObject.path || movieObject.path.length < 1) { //Is the movie already in the database
            sendPathSelector(ctx).then((selectedPath) => {
                movieObject.path = `${selectedPath}${removeRegExp(movieObject.title)} (${movieObject.year})`;
                handleRequests.addNewMovie(movieObject).catch(error => {
                    handleError(error, ctx);
                    return;
                });
            });
        } else {
            movieObject.monitored = true;
            handleRequests.editExistingMovie(movieObject).catch(error => {
                handleError(error, ctx);
                return;
            });
        }

        let currentButtonIndex = _.findIndex(replyMarkup[1], function (o) { //following the replyMarkup array of arrays
            return addMonitoredRegex.test(o.callback_data);
        });

        let newButton = Markup.button.callback(
            "✔ Monitored",
            "removeMonitoredId"
        );

        replyMarkup = replaceMarkupButton(replyMarkup, 1, currentButtonIndex, newButton);
        let newReplyMarkup = Markup.inlineKeyboard(replyMarkup);
        ctx.editMessageReplyMarkup(newReplyMarkup.reply_markup);

        ctx.reply("Added to Monitored");
        return;
    } catch (error) {
        handleError(error, ctx);
    }
});

function sendPathSelector(ctx) {
    return new Promise((resolve, reject) => {
        let keyboardButtons = [];
        handleRequests.getPaths()
            .then(rootFolders => {
                if (rootFolders < 1) {
                    return reject("No folder paths");
                }
                rootFolders.map(rootFolder => {
                    keyboardButtons.push({
                        text: rootFolder.path
                    })
                });
                keyboardButtons.push({text: "Cancel"});
                let keyboard = Markup.keyboard(keyboardButtons);
                ctx.reply("Please select a path", keyboard);
                
                let pathRegex = /^\/|(\/[\w-]+)+$/
                bot.hears(pathRegex, (context) => {
                    context.reply("Path Selected",
                        {
                            reply_markup: JSON.stringify({
                                hide_keyboard: true
                            })
                        })
                    return resolve(context.update.message.text);
                });
            })
    })
}

//#########################---Monitoring---##########################

//#########################---Error Handling---##########################

function handleError(errorMessage, ctx = null) {
    if (!ctx) {
        console.error(errorMessage);
    }
    ctx.reply(errorMessage.toString())
}

//#########################---Error Handling---##########################

//#########################---Bot Process---##########################

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

//#########################---Bot Process---##########################