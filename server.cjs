const express = require('express');
const bodyParser = require('body-parser');
const {Bot, InlineKeyboard} = require('grammy');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const token = process.env.BOT_TOKEN;
const bot = new Bot(token);

app.use(compression());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Serve the game
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

bot.command("game", async (ctx) => {
    // You can get the chat identifier of the user to send your game to with `ctx.from.id`.
    // which gives you the chat identifier of the user who invoked the start command.
    const keyboard = new InlineKeyboard().game("DO PUSH-UPS");
    const chatId = ctx.chat.id;

    await ctx.api.sendGame(chatId, "pushups", {reply_markup: keyboard});
});

bot.on("callback_query:game_short_name", async (ctx) => {
    const chatId = ctx.chat.id;
    const userId = ctx.from.id;
    const messageId = ctx.callbackQuery.message.message_id;
    const url = `${process.env.APP_URL}?chat_id=${chatId}&user_id=${userId}&message_id=${messageId}`;
    await ctx.answerCallbackQuery({url: url});
});

app.post('/send-pushups', async (req, res) => {
    const {chatId, userId, pushUpCount, messageId} = req.body;

    try {
        await bot.api.setGameScore(chatId, messageId, userId, pushUpCount)
    } catch (error) {
        console.error(error);
    }

    return res.sendStatus(200);
});


// Start the bot
bot.start();

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
