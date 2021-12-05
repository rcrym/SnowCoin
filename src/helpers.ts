import axios from "axios";
import Discord, { Client, Message } from "discord.js";
import { doc, DocumentData, getDoc, QueryDocumentSnapshot, setDoc } from "firebase/firestore";
import sharp from "sharp";
import { Coin } from "./types/coin";
import path from "path";
import fs from "fs";
import { db } from "./firebase";

export function fromBot(message: Discord.Message) {
    return message.author.bot ? true : false;
}

export function showWallet(
    msg: Discord.Message,
    user: Discord.User,
    doc: QueryDocumentSnapshot<DocumentData>
) {
    (async () => {
        var investments_fields = [
            {
                name: "SWC Balance",
                value: `${doc.data().balance} SWC`,
            },
        ];
        msg.channel.send({
            embeds: [
                {
                    title: `${user?.username}'s Wallet`,
                    description: `${userIDToWalletID(doc.id)}`,
                    color: 3184310,
                    footer: {
                        text: `Do !networth to see your total wealth.`,
                    },
                    thumbnail: {
                        url: `${user?.displayAvatarURL()}`,
                    },
                    fields: investments_fields,
                },
            ],
        });
    })();
}

export function showNetWorth(
    msg: Discord.Message,
    user: Discord.User,
    document: QueryDocumentSnapshot<DocumentData>
) {
    (async () => {
        var investments_fields = [
            {
                name: "SWC (!pay-able)",
                value: `${document.data().balance}`,
            },
        ];


        await setDoc(
            doc(db, "users", user.id),
            {
              investments: document.data().investments.filter((item: any) => item.coins_owned !== 0)
            },
            { merge: true }
        );
        
        const docRef = doc(db, "users", user.id);
        let docSnap = await getDoc(docRef)
        let pruned_snap = docSnap.data()

        let total = pruned_snap?.balance;
        console.log(pruned_snap?.investments);
        if (pruned_snap?.investments && pruned_snap?.investments.length > 0) {
            msg.channel.send("Fetching current crypto prices...");

            for (let investment of pruned_snap?.investments) {
                let { data } = await axios.get(
                    `https://api.nomics.com/v1/currencies/ticker?key=${process.env.STOCK_TOKEN}&ids=${investment.symbol}`
                );
                let coin: Coin = data[0];
                coin.symbol = coin.id;
                let obj = {
                    name: investment.symbol,
                    value: `${investment.coins_owned} (equal to ${
                        parseFloat(investment.coins_owned) *
                        parseFloat(coin.price)
                    } SWC)`,
                };
                total += parseFloat(coin.price) * investment.coins_owned;
                console.log(obj);
                investments_fields.push(obj);
                if(pruned_snap?.investments.length > 1) await sleep(1000);
            }
        }



        msg.channel.send({
            embeds: [
                {
                    title: `${user?.username}'s Networth`,
                    description: `Combined value: ${total} SWC`,
                    color: 3184310,
                    thumbnail: {
                        url: `${user?.displayAvatarURL()}`,
                    },
                    fields: investments_fields,
                },
            ],
        });
    })();
}

export function userIDToWalletID(userID: string) {
    return "SWC_" + userID.slice(userID.length - 3, userID.length);
}

export function commandIs(command: string, msg: Message) {
    return msg.content.startsWith(command);
}

export function logStats(bot: Client) {
    console.log(`Logged in as ${bot?.user?.tag}!`);
    console.log(
        "Bot: Hosting " +
            `${bot.users.cache.size}` +
            " users, in " +
            `${bot.channels.cache.size}` +
            " channels of " +
            `${bot.guilds.cache.size}` +
            " guilds."
    );
}

export const downloadFileThen = async (coin: Coin, callback: any) => {
    // Get the file name
    const fileName = path.basename(`./${coin.symbol}.svg`);

    // The path of the downloaded file on our machine
    const localFilePath = path.resolve(__dirname, ".", fileName);
    try {
        const response = await axios({
            method: "GET",
            url: coin.logo_url,
            responseType: "stream",
        });

        const w = response.data.pipe(fs.createWriteStream(localFilePath));
        w.on("finish", () => {
            console.log("Successfully downloaded file!");

            console.log(localFilePath);
            sharp(localFilePath)
                .png()
                .toFile(`./${coin.symbol}.png`)
                .then(function (info) {
                    callback();
                    console.log(info);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });
    } catch (err) {
        throw new Error(err);
    }
};

export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
