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

export const sell_command = (msg: Message) => {
    (async () => {
        console.log("sell command");
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
        if (typeof amount !== "number") {
            // Guess what, it's a bloody number!
            msg.channel.send(
                "I don't understand that amount value. Please check your format."
            );
            return;
        }
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

        var coins_owned: number = 0;
        var found = false;
        for (let investment of await docSnap_payer.data()?.investments) {
            if (investment.symbol == coin.symbol) {
                found = true;
                coins_owned = investment.coins_owned;
            }
        }
        if (!found) {
            //you're trying to sell a coin that you have none of right now
            msg.channel.send("You don't have any of that coin to sell.");
            return;
        }

        if (docSnap_payer.exists()) {
            // coins to sell = isDoingWorthOf ? (amount / coin price)

            // spend all?

            var coins_to_sell = isDoingWorthOf
                ? amount / parseFloat(coin.price)
                : amount;
            var snow_coin_earned = isDoingWorthOf
                ? amount
                : amount * parseFloat(coin.price);

            var sell_all = false;
            if (coins_to_sell > coins_owned) {
                sell_all = true;
            }

            if (sell_all) {
                coins_to_sell = coins_owned;
                snow_coin_earned = coins_owned * parseFloat(coin.price);
                msg.channel.send(
                    "You don't have enough funds for that, but I'll do as much as I can."
                );
            }

            console.log(
                snow_coin_earned,
                coins_to_sell,
                isDoingWorthOf,
                sell_all
            );

            // has investments already
            const new_portfolio = docSnap_payer.data().investments
                ? [...docSnap_payer.data().investments]
                : [];
            const roll_back = docSnap_payer.data();

            var found = false;
            for (let investment of new_portfolio) {
                if (investment.symbol == coin.symbol) {
                    investment.coins_owned -= coins_to_sell;
                    found = true;
                }
            }

            await setDoc(
                doc(db, "users", msg.author.id),
                {
                    balance: balance_payer + snow_coin_earned,
                    investments: new_portfolio,
                },
                { merge: true }
            );
            docSnap_payer = await getDoc(docRef_payer);
            // let it_updated_correctly = false;
            let NaN_detected = false;
            if (!isFinite(docSnap_payer.data()?.balance)) {
                NaN_detected = true;
            }
            for (let investment of docSnap_payer.data()?.investments) {
                if (!isFinite(investment.coins_owned) || NaN_detected) {
                    NaN_detected = true;
                    break;
                }
                // just check it's there and updated
                if (!NaN_detected) {
                    if (investment.symbol == coin.symbol) {
                        // let need_to_download = true;
                        if ((coin_logo_urls as any)[coin.symbol]) {
                            // console.log("using url ____________")
                            // need_to_download = false;
                            msg.channel.send({
                                embeds: [
                                    {
                                        title: `**${coins_to_sell} ${investment.symbol}** sold by ${msg.author.username}`,
                                        description: `(Equal to ${snow_coin_earned} SWC)`,
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
                            });
                        } else {
                            downloadFileThen(coin, () => {
                                msg.channel.send({
                                    embeds: [
                                        {
                                            title: `**${coins_to_sell} ${investment.symbol}** sold by ${msg.author.username}`,
                                            description: `(Equal to ${snow_coin_earned} SWC)`,
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
                }

                // it_updated_correctly = true;
            }

            if (NaN_detected) {
                await setDoc(doc(db, "users", msg.author.id), roll_back);
                msg.channel.send("Something went wrong, resulting in a NaN or Infinite balance or coin amount. Please try something different.");
                return;
            }
            // if (!it_updated_correctly) {
            //     msg.channel.send("Something went wrong. Transaction failed.");
            // }
        } else {
            msg.channel.send(
                "Transaction failed. Have you initialized a wallet with **!wallet** yet?"
            );
        }
    })();
};
