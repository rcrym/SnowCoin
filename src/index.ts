import { commandIs, fromBot, logStats} from "./helpers";
import Discord, { PresenceData } from "discord.js";
import { wallet_command } from "./commands/wallet";
import { pay_command } from "./commands/pay";
import { networth_command } from "./commands/networth";
// import { buy_commmand } from "./commands/buy";
import 'dotenv/config'
import { buy_commmand } from "./commands/buy";
import { sell_command } from "./commands/sell";
import { ping_command } from "./commands/ping";


// Discord wants to know what data the bot needs
const bot = new Discord.Client(<Discord.ClientOptions>{
    intents: ["GUILDS", "GUILD_MESSAGES"],
});

// On start-up...
bot.on("ready", () => {
    // let time = new Date();
    // (bot.channels.cache.get('913651004187213865') as TextChannel ).send('Successful restarted at ' + time.toLocaleTimeString)
    logStats(bot)
    bot?.user?.setPresence({
        activity: {
            name: `!wallet`,
        },
        status: "online",
    } as PresenceData);

    setTimeout(() => {
        // update stock positions
    })
});

// On any message in server...
bot.on("message", (msg) => {
    console.log(msg.content); // for debug
    if (fromBot(msg)) {
        return;
        // Bot shouldn't reply to itself or other bots
    }
    // Handle commands accordingly:
    if (commandIs("!wallet", msg) || commandIs("!w", msg)) {
        wallet_command(msg)
    }
    if (commandIs("!pay", msg) || commandIs("!p", msg)) {
        pay_command(msg)
    }
    if (commandIs("!buy", msg) || commandIs("!b", msg)) {
        buy_commmand(msg)
    }
    if (commandIs("!sell", msg) || commandIs("!s", msg)) {
        sell_command(msg)
    }
    if (commandIs("!networth", msg) || commandIs("!nw", msg) || commandIs("!n", msg)) {
        networth_command(msg)
    }
    if (commandIs("!ping", msg)) {
        ping_command(msg)
    }
});

//BOT_TOKEN is the Client Secret
bot.login(process.env.BOT_TOKEN);
