import axios from "axios";
import { Message } from "discord.js";
import { Coin } from "../types/coin";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { downloadFileThen } from "../helpers";

let coin_logo_urls = {
    ETH: "https://cdn.discordapp.com/attachments/915764943314374656/915765389022097448/ETH.png",
    HEX: "https://cdn.discordapp.com/attachments/915764943314374656/915765389303099392/HEX.png",
    LUNA: "https://cdn.discordapp.com/attachments/915764943314374656/915765389542195241/LUNA.png",
    SHIB: "https://cdn.discordapp.com/attachments/915764943314374656/915765389768675388/SHIB.png",
    SOL: "https://cdn.discordapp.com/attachments/915764943314374656/915765390020337704/SOL.png",
    USDT: "https://cdn.discordapp.com/attachments/915764943314374656/915765390188097546/USDT.png",
    WBTC: "https://cdn.discordapp.com/attachments/915764943314374656/915765390402002944/WBTC.png",
    XRP: "https://cdn.discordapp.com/attachments/915764943314374656/915765390586576916/XRP.png",
    ADA: "https://cdn.discordapp.com/attachments/915764943314374656/915765475844190218/ADA.png",
    AVAX: "https://cdn.discordapp.com/attachments/915764943314374656/915765476162928701/AVAX.png",
    BNB: "https://cdn.discordapp.com/attachments/915764943314374656/915765477282824263/BNB.png",
    BTC: "https://cdn.discordapp.com/attachments/915764943314374656/915765477656121394/BTC.png",
    CRO: "https://cdn.discordapp.com/attachments/915764943314374656/915765477966512198/CRO.png",
    DOGE: "https://cdn.discordapp.com/attachments/915764943314374656/915765478314622997/DOGE.png",
    DOT: "https://cdn.discordapp.com/attachments/915764943314374656/915765478524330014/DOT.png",
};

export const buy_commmand = (msg: Message) => {
    (async () => {
        console.log("buy command");
        msg.content = msg.content.trim(); // just in case they put a space at the end
        var isDoingWorthOf = false;
        var amount: number;
        var ticker: string;
        if (
            msg.content.toLowerCase().includes("swc") ||
            msg.content.includes("worth of")
        ) {
            isDoingWorthOf = true;
        }
        amount = parseFloat(msg.content.split(" ")[1]);
        if (amount <= 0) {
            msg.channel.send("Number must be more than zero.");
            return;
        }
        ticker = msg.content.split(" ")[msg.content.split(" ").length - 1];
        let { data } = await axios.get(
            `https://api.nomics.com/v1/currencies/ticker?key=${
                process.env.STOCK_TOKEN
            }&ids=${ticker.toLocaleUpperCase()}`
        );
        if (data.length == 0) {
            msg.channel.send(
                "Sorry, I can't find that coin. Please check your spelling and try again."
            );
            return;
        }

        const coin: Coin = data[0];
        coin.symbol = coin.id;

        const docRef_payer = doc(db, "users", msg.author.id);
        var docSnap_payer = await getDoc(docRef_payer);
        const balance_payer = await docSnap_payer.data()?.balance;

        if (docSnap_payer.exists()) {
            var coins_to_buy = isDoingWorthOf
                ? amount / parseFloat(coin.price)
                : amount;
            var snow_coin_paid = isDoingWorthOf
                ? amount
                : amount * parseFloat(coin.price);
            var spend_all = false;
            if (snow_coin_paid > balance_payer) {
                spend_all = true;
            }
            if (balance_payer <= 0) {
                msg.channel.send(
                    "You have no SnowCoin to spend. Consider selling other coins if you have some, and re-investing."
                );
                return;
            }
            if (spend_all) {
                snow_coin_paid = balance_payer;
                coins_to_buy = balance_payer / parseFloat(coin.price);
                msg.channel.send(
                    "You don't have enough funds for that, but I'll do as much as I can."
                );
            }
            // has investments already
            const new_portfolio = docSnap_payer.data().investments
                ? [...docSnap_payer.data().investments]
                : [];
            var found = false;
            for (let investment of new_portfolio) {
                if (investment.symbol == coin.symbol) {
                    investment.coins_owned += coins_to_buy;
                    found = true;
                }
            }
            if (!found) {
                //you're buying coin that you have none of right now
                new_portfolio.push({
                    symbol: coin.symbol,
                    coins_owned: coins_to_buy,
                });
            }
            await setDoc(
                doc(db, "users", msg.author.id),
                {
                    balance: balance_payer - snow_coin_paid,
                    investments: new_portfolio,
                },
                { merge: true }
            );
            docSnap_payer = await getDoc(docRef_payer);
            let it_updated_correctly = false;

            for (let investment of docSnap_payer.data()?.investments) {
                // just check it's there and updated
                if (investment.symbol == coin.symbol) {
                    if ((coin_logo_urls as any)[coin.symbol]) {
                        // console.log("using url ____________")
                        // need_to_download = false;
                        msg.channel.send({
                            embeds: [
                                {
                                    title: `**${coins_to_buy} ${investment.symbol}** successfully bought by ${msg.author.username}`,
                                    description: `(Equal to ${snow_coin_paid} SWC)`,
                                    color: 7237887,
                                    footer: {
                                        text: `${coin.name}`,
                                    },
                                    thumbnail: {
                                        url: (coin_logo_urls as any)[
                                            coin.symbol
                                        ],
                                    },
                                    fields: [
                                        {
                                            name: "SWC in !wallet now:",
                                            value: `${
                                                docSnap_payer.data()?.balance
                                            }`,
                                        },
                                        {
                                            name: `${coin.name} owned now:`,
                                            value: `${investment.coins_owned}`,
                                        },
                                    ],
                                },
                            ],
                        });
                    } else {
                        downloadFileThen(coin, () => {
                            msg.channel.send({
                                embeds: [
                                    {
                                        title: `**${coins_to_buy} ${investment.symbol}** successfully bought by ${msg.author.username}`,
                                        description: `(Equal to ${snow_coin_paid} SWC)`,
                                        color: 7237887,
                                        footer: {
                                            text: `${coin.name}`,
                                        },
                                        thumbnail: {
                                            url: `attachment://${coin.symbol}.png`,
                                        },
                                        fields: [
                                            {
                                                name: "SWC in !wallet now:",
                                                value: `${
                                                    docSnap_payer.data()
                                                        ?.balance
                                                }`,
                                            },
                                            {
                                                name: `${coin.name} owned now:`,
                                                value: `${investment.coins_owned}`,
                                            },
                                        ],
                                    },
                                ],
                                files: [`./${coin.symbol}.png`],
                            });
                        });
                    }
                }

                it_updated_correctly = true;
            }

            if (!it_updated_correctly) {
                msg.channel.send("Something went wrong. Transaction failed.");
            }
        } else {
            msg.channel.send(
                "Transaction failed. Have you initialized a wallet with **!wallet** yet?"
            );
        }
})();
};
